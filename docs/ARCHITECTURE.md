# RescueRelay architecture

This document gives a brief overview of the components and the rescue lifecycle. For setup, see [HOW_TO_RUN.md](../HOW_TO_RUN.md). For the live API, see Swagger at `http://localhost:8000/docs` when the server is running.

## Components

```mermaid
flowchart LR
    Donor[Donor client<br/>caterer] -->|HTTPS + JWT| API[FastAPI app<br/>backend/app/main.py]
    Receiver[Receiver client<br/>NGO / kitchen / shelter] -->|HTTPS + JWT| API
    Admin[Admin client] -->|HTTPS + JWT| API
    API --> Services[Services<br/>rescue, matching, handoff,<br/>pickup, impact]
    Services --> DB[(SQLAlchemy 2 session)]
    DB --> SQLite[(SQLite<br/>backend/data/rescuerelay.db<br/>default)]
    DB --> PG[(PostgreSQL<br/>via DATABASE_URL)]
    Worker[Dispatch worker<br/>app.workers.dispatch_worker] --> Services
    API -.lazy expiry on<br/>offer list and rescue detail.-> Services
    Seed[Seed command<br/>app.seed.init_db] --> DB
    Alembic[Alembic<br/>no revision yet] -.future.-> PG
```

- **FastAPI app:** routes for authentication, rescues, offers, handoffs, pickup and donor impact. Authentication uses JWT tokens.
- **Services:** business logic for rescues, matching and dispatch, claims and handoffs, pickup and delivery, and impact.
- **Database:** SQLAlchemy 2 models. SQLite by default; PostgreSQL when `DATABASE_URL` is set.
- **Dispatch worker:** re-offers rescues whose offers have expired. Can run as a loop or once with `--once`.
- **Seed command:** creates the tables and demo data.
- **Frontend and Docker:** not built yet.

## Rescue state machine

```mermaid
stateDiagram-v2
    [*] --> POSTED
    POSTED --> MATCHING
    MATCHING --> OFFERED
    OFFERED --> CLAIMED: receiver claims offer
    OFFERED --> MATCHING: offer expires, re-dispatch
    CLAIMED --> COLLECTED: pickup code verified
    COLLECTED --> DELIVERED: receiver confirms delivery
    POSTED --> CANCELLED
    MATCHING --> CANCELLED
    OFFERED --> CANCELLED
    MATCHING --> EXPIRED: pickup_by reached
    OFFERED --> EXPIRED: pickup_by reached
    DELIVERED --> [*]
    CANCELLED --> [*]
    EXPIRED --> [*]
```

- **POSTED:** the donor has created the rescue.
- **MATCHING:** feasible receivers are being ranked.
- **OFFERED:** an offer is pending with the top-ranked feasible receiver.
- **CLAIMED:** a receiver has claimed the offer. The exact address and donor phone become visible to that receiver.
- **COLLECTED:** the pickup code was verified at collection.
- **DELIVERED:** the receiver confirmed delivery. Only delivered servings count toward impact.
- **EXPIRED** and **CANCELLED** are terminal side branches.

The diagram shows the intended lifecycle. Only creation through OFFERED and CLAIMED has been verified manually; collection, delivery and the expiry/re-dispatch paths are not yet verified.

## Atomic claim

A receiver claims a pending offer with a single conditional update: the offer changes to claimed only if it is still pending and still belongs to that receiver. If the update matches no row, the claim fails. A second claim on the same offer therefore returns 409 `OFFER_NOT_PENDING`, and a receiver who was not offered the rescue receives 404.

Because the decision is made in one database statement, two simultaneous claims cannot both succeed. A concurrency test for this has been written but not yet executed.

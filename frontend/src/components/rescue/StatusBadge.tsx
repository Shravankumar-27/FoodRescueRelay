import Chip from "../ui/Chip";
import { statusLabel } from "../../lib/format";

type Tone = "neutral" | "success" | "warn" | "danger" | "info";

function toneFor(status: string): Tone {
  switch (status) {
    case "DELIVERED":
      return "success";
    case "CLAIMED":
    case "COLLECTED":
      return "info";
    case "MATCHING":
    case "OFFERED":
      return "warn";
    case "EXPIRED":
    case "CANCELLED":
      return "danger";
    default:
      return "neutral";
  }
}

export default function StatusBadge({ status }: { status: string }) {
  return <Chip tone={toneFor(status)}>{statusLabel(status)}</Chip>;
}

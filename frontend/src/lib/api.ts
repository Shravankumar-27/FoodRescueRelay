import { API_BASE } from "./config";
import type { ApiSuccess } from "../types/api";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  token?: string | null;
}

interface ErrorEnvelope {
  success?: boolean;
  error?: { code?: string; message?: string };
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (opts.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }

  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError("OFFLINE", "You're offline. Your latest data may be outdated.", 0);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  const envelope = body as ErrorEnvelope | null;
  if (!res.ok || envelope?.success === false) {
    throw new ApiError(
      envelope?.error?.code ?? "HTTP_ERROR",
      envelope?.error?.message ?? "Something went wrong. Please try again.",
      res.status,
    );
  }

  return (body as ApiSuccess<T>).data;
}

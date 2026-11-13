import type { ApiError, ApiSuccess } from "../types";

export const TOKEN_KEY = import.meta.env.VITE_TOKEN_KEY ?? "teacher-portal-token";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class PortalError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "PortalError";
  }
}

export async function request<T>(
  path: string,
  token: string | null,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const body = options.body;
  const isFormData = body instanceof FormData;

  if (options.body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: isFormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new PortalError("Could not reach the server. Check your connection and try again.", 0);
  }

  const result = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiError | null;

  if (!response.ok || !result || result.success !== true) {
    const message = result && "message" in result
      ? result.message
      : `Request failed (${response.status}).`;
    throw new PortalError(message, response.status);
  }

  return result.data;
}

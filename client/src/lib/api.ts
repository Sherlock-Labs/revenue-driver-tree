/**
 * Typed fetch wrapper for the Revenue Driver Tree API.
 *
 * Uses same-origin cookies (Clerk session) — no Bearer token needed.
 * All requests go to /api/* which Vite proxies to Express in dev.
 */

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const config: RequestInit = {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(path, config);

  if (!response.ok) {
    let errorData: { error?: string; details?: unknown } = {};
    try {
      errorData = await response.json();
    } catch {
      // Response body is not JSON
    }
    throw new ApiError(
      response.status,
      errorData.error || `Request failed with status ${response.status}`,
      errorData.details
    );
  }

  return response.json() as Promise<T>;
}

export { ApiError };

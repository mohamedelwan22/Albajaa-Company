const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function apiRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  return response;
}

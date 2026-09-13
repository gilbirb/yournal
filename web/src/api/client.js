const BASE = import.meta.env.VITE_API_URL;
let token = null;

export function setToken(t) { token = t; }

export async function request(path, options = {}) {
  if (!BASE) throw new Error('VITE_API_URL is not set');

  const { body, ...rest } = options;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...rest.headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch only rejects when no response arrives: server down, wrong URL, or CORS
    throw new Error(`can't reach the server at ${BASE}`);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

const BASE = process.env.EXPO_PUBLIC_API_URL;
let token = null;

export function setToken(t) { token = t; }

export async function request(path, options = {}) {
  if (!BASE) throw new Error('EXPO_PUBLIC_API_URL is not set');

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
    // on a device this is usually the wrong host: localhost is the phone itself,
    // not your dev machine. see .env.example
    throw new Error(`can't reach the server at ${BASE}`);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

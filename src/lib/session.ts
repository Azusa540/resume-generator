const KEY = 'rb_session';
const TTL = 8 * 60 * 60 * 1000; // 8 hours in ms

interface Session {
  username: string;
  isAdmin: boolean;
  expiresAt: number;
}

export function saveSession(username: string, isAdmin = false) {
  const session: Session = { username, isAdmin, expiresAt: Date.now() + TTL };
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function getSession(): { username: string; isAdmin: boolean } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const session: Session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(KEY);
      return null;
    }
    return { username: session.username, isAdmin: session.isAdmin ?? false };
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

const KEY = 'rb_session';
const TTL = 8 * 60 * 60 * 1000; // 8 hours in ms

interface Session {
  username: string;
  isAdmin: boolean;
  isPremium: boolean;
  expiresAt: number;
}

export function saveSession(username: string, isAdmin = false, isPremium = false) {
  const session: Session = { username, isAdmin, isPremium, expiresAt: Date.now() + TTL };
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function getSession(): { username: string; isAdmin: boolean; isPremium: boolean } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const session: Session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(KEY);
      return null;
    }
    return { username: session.username, isAdmin: session.isAdmin ?? false, isPremium: session.isPremium ?? false };
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

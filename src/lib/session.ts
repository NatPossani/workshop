const SESSION_KEY = "workshop-chat-session-id";

function createId(): string {
  return crypto.randomUUID();
}

export function getSessionId(): string {
  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) return stored;

  const id = createId();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

export function resetSessionId(): string {
  const id = createId();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

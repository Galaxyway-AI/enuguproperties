import { safeNext } from "./domain";

export function authHref(mode: "login" | "register", next?: string | null) {
  return `/${mode}?next=${encodeURIComponent(safeNext(next || null))}`;
}

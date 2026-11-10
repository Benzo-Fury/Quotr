/** Small immutable helpers for editing arrays of items with ids. */

export function moveItem<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = arr.slice();
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

export function patchById<T extends { id: string }>(arr: T[], id: string, patch: Partial<T>): T[] {
  return arr.map((x) => (x.id === id ? { ...x, ...patch } : x));
}

export function removeById<T extends { id: string }>(arr: T[], id: string): T[] {
  return arr.filter((x) => x.id !== id);
}

export function insertAfter<T extends { id: string }>(arr: T[], id: string | null, item: T): T[] {
  if (id == null) return [...arr, item];
  const i = arr.findIndex((x) => x.id === id);
  if (i < 0) return [...arr, item];
  return [...arr.slice(0, i + 1), item, ...arr.slice(i + 1)];
}

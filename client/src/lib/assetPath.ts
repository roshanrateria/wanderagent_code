// Helper to produce a correct asset URL for both http(s) and file:// (electron offline) contexts.
export function asset(p: string) {
  if (!p) return p;
  // Leave remote / absolute URLs untouched
  if (/^https?:\/\//i.test(p)) return p;
  const isFile = typeof window !== 'undefined' && typeof location !== 'undefined' && location.protocol === 'file:';
  if (isFile) {
    // Strip leading slash so '/icon.png' -> 'icon.png' (relative to index.html directory)
    if (p.startsWith('/')) return p.slice(1);
  }
  return p;
}

export const ICON_SRC = asset('/icon.png');

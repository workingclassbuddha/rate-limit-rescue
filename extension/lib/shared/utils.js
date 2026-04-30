export function canonicalizeUrl(url) {
  try {
    const parsed = new URL(String(url || ''));
    parsed.hash = '';
    return parsed.toString();
  } catch (_) {
    return String(url || '').split('#')[0];
  }
}

export function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeWhitespace(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

export function parseIsoTime(value) {
  const stamp = Date.parse(value || '');
  return Number.isFinite(stamp) ? stamp : 0;
}

export function truncateText(text, limit = 12000) {
  const value = String(text || '').trim();
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit - 3).trim()}...`;
}

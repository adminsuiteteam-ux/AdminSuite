export function safeProp<T extends object, K extends keyof T>(obj: T, key: K): T[K] {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    throw new Error('Prototype pollution attempt detected');
  }
  return Reflect.get(obj, key);
}

/** Escape HTML special characters to prevent XSS. */
export function sanitizeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  // If somehow an object/array slips in, return empty string (never render raw objects)
  if (typeof str !== 'string') return typeof str === 'number' ? String(str) : '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

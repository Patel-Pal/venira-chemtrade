export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

/** Deterministic SKU: PREFIX-XXXX-<size>. Uniqueness is enforced by a DB unique index. */
export function generateSku(name: string, label = 'STD', seq = 1): string {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5)
    .padEnd(3, 'X');
  const size = label.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'STD';
  return `VC-${prefix}-${size}-${String(seq).padStart(3, '0')}`;
}

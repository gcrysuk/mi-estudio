const PAGINATION_KEYS = new Set(['ordering', 'page', 'page_size', 'pageSize']);

/**
 * Returns true if any filter value is non-empty and differs from its default.
 * Ignores ordering/pagination keys so a custom sort order never triggers the badge.
 *
 * @param {Object} filtros  - { key: currentValue, ... }
 * @param {Object} defaults - { key: defaultValue, ... }  (missing keys default to '')
 */
export function hayFiltrosActivos(filtros, defaults = {}) {
  for (const [key, value] of Object.entries(filtros)) {
    if (PAGINATION_KEYS.has(key)) continue;

    // Treat empty-ish values as inactive
    if (value === '' || value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;

    const defaultValue = key in defaults ? defaults[key] : '';
    if (value !== defaultValue) return true;
  }
  return false;
}

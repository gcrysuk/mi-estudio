import { useState, useRef, useEffect, useMemo } from 'react';

const OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, '0');
  const m = String((i % 4) * 15).padStart(2, '0');
  return `${h}:${m}`;
});

const shortForm = (hhmm) => {
  const [h, m] = hhmm.split(':');
  return `${parseInt(h, 10)}:${m}`;
};

const digitsOnly = (s) => s.replace(/\D/g, '');

const parseTimeInput = (text) => {
  const cleaned = text.trim();
  if (!cleaned) return null;
  const match = cleaned.match(/^(\d{1,2})[:.hH]?(\d{2})?$/);
  if (!match) return null;
  const hh = parseInt(match[1], 10);
  const mm = match[2] !== undefined ? parseInt(match[2], 10) : 0;
  if (Number.isNaN(hh) || hh > 23) return null;
  if (Number.isNaN(mm) || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const nearestOptionIndex = (hhmm) => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  const total = h * 60 + m;
  let bestIdx = 0;
  let bestDiff = Infinity;
  OPTIONS.forEach((opt, idx) => {
    const [oh, om] = opt.split(':').map(Number);
    const diff = Math.abs(oh * 60 + om - total);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = idx;
    }
  });
  return bestIdx;
};

const BASE_INPUT_CLASS = 'w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent disabled:opacity-60 disabled:cursor-not-allowed';

/**
 * Selector de hora tipeable estilo Google Calendar: input de texto + dropdown
 * con opciones cada 15 minutos. Valor y onChange trabajan con strings "HH:mm".
 */
const TimeSelect = ({ value, onChange, className = '', placeholder = '--:--', disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const listRef = useRef(null);
  const optionRefs = useRef([]);

  const filtered = useMemo(() => {
    if (!query) return OPTIONS;
    const q = query.trim().toLowerCase();
    const qDigits = digitsOnly(q);
    return OPTIONS.filter((opt) => {
      const short = shortForm(opt);
      if (opt.startsWith(q) || short.startsWith(q)) return true;
      if (qDigits && (digitsOnly(opt).startsWith(qDigits) || digitsOnly(short).startsWith(qDigits))) return true;
      return false;
    });
  }, [query]);

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, filtered.length);
  }, [filtered]);

  const scrollToIndex = (idx) => {
    const el = optionRefs.current[idx];
    const list = listRef.current;
    if (!el || !list) return;
    list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2;
  };

  const openDropdown = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    const idx = nearestOptionIndex(value);
    setHighlightIndex(idx);
    requestAnimationFrame(() => scrollToIndex(idx));
  };

  const commit = (v) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setQuery(text);
    if (!open) setOpen(true);
    setHighlightIndex(0);
    requestAnimationFrame(() => scrollToIndex(0));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { openDropdown(); return; }
      setHighlightIndex((i) => {
        const next = Math.min(i + 1, filtered.length - 1);
        scrollToIndex(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => {
        const next = Math.max(i - 1, 0);
        scrollToIndex(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightIndex]) {
        commit(filtered[highlightIndex]);
      } else {
        const parsed = parseTimeInput(query);
        if (parsed) commit(parsed);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const handleBlur = () => {
    // Delay para permitir que el onClick de una opción (con onMouseDown
    // preventDefault) se procese antes de cerrar el dropdown.
    setTimeout(() => {
      setOpen(false);
      const parsed = query ? parseTimeInput(query) : null;
      if (parsed) onChange(parsed);
      setQuery('');
    }, 120);
  };

  const displayValue = open ? query : (value || '');

  return (
    <div className="relative">
      <input
        type="text"
        value={displayValue}
        onFocus={openDropdown}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className={`${BASE_INPUT_CLASS} ${className}`.trim()}
      />
      {open && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-surface shadow-lg py-1"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">Sin coincidencias</div>
          ) : (
            filtered.map((opt, idx) => (
              <button
                key={opt}
                type="button"
                ref={(el) => { optionRefs.current[idx] = el; }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(opt)}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={`w-full text-left px-3 py-1 text-sm transition-colors ${
                  idx === highlightIndex
                    ? 'bg-accent text-white'
                    : opt === value
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TimeSelect;

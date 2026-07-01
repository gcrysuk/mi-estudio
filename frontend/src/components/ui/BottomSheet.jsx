import { useState, useEffect } from 'react';

// Bottom sheet estilo Mercado Libre: overlay + panel que sube desde abajo.
// Pensado para mobile (md:hidden) — el llamador decide cuándo montarlo
// (los botones que lo abren típicamente tampoco existen en desktop).
// Transición con clases Tailwind + estado React, sin librerías de UI externas.
const BottomSheet = ({ open, onClose, children }) => {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timeout = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(timeout);
  }, [open]);

  if (!mounted) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50 flex items-end">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`relative w-full bg-white dark:bg-dark-surface rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto transition-transform duration-200 ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default BottomSheet;

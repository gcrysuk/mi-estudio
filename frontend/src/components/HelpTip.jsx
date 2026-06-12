import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useHelp } from '../contexts/HelpContext';

const TOOLTIP_W = 250;

const HelpTip = ({ texto, children, className = '' }) => {
  const { ayudaActiva } = useHelp();
  const [show, setShow] = useState(false);
  const [pos, setPos]   = useState(null);
  const ref = useRef(null);

  // Ocultar si el usuario hace scroll mientras el tooltip está visible
  useEffect(() => {
    if (!show) return;
    const hide = () => setShow(false);
    window.addEventListener('scroll', hide, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', hide, { capture: true });
  }, [show]);

  if (!ayudaActiva) return children ?? null;

  const handleEnter = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();

    // Posición horizontal: centrar sobre el trigger, clampear dentro del viewport
    let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
    left = Math.max(8, Math.min(window.innerWidth - TOOLTIP_W - 8, left));

    // Posición de la flecha dentro del tooltip (apunta al centro del trigger)
    const arrowLeft = Math.max(8, Math.min(TOOLTIP_W - 18, rect.left + rect.width / 2 - left - 5));

    // Flip vertical: si hay menos de 150px arriba, mostrar abajo
    const above = rect.top > 150;

    setPos({
      left,
      arrowLeft,
      above,
      anchorBottom: window.innerHeight - rect.top + 8,
      anchorTop:    rect.bottom + 8,
    });
    setShow(true);
  };

  const inner = children ?? (
    <span
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold cursor-help leading-none flex-shrink-0 bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 ${className}`}
    >
      ?
    </span>
  );

  const tooltip = show && pos && createPortal(
    <span
      role="tooltip"
      style={{
        position:  'fixed',
        zIndex:    99999,
        left:      pos.left,
        maxWidth:  TOOLTIP_W,
        ...(pos.above
          ? { bottom: pos.anchorBottom }
          : { top:    pos.anchorTop }),
      }}
      className="w-max px-3 py-2 rounded-lg shadow-xl text-xs leading-relaxed whitespace-normal pointer-events-none bg-slate-800 text-slate-100 border border-slate-600 dark:bg-slate-700 dark:border-slate-500"
    >
      {texto}
      <span
        className={`absolute w-2.5 h-2.5 rotate-45 bg-slate-800 dark:bg-slate-700 ${
          pos.above
            ? 'bottom-[-5px] border-r border-b border-slate-600 dark:border-slate-500'
            : 'top-[-5px] border-l border-t border-slate-600 dark:border-slate-500'
        }`}
        style={{ left: pos.arrowLeft }}
      />
    </span>,
    document.body
  );

  return (
    <>
      <span
        ref={ref}
        className="inline-flex"
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        onFocus={handleEnter}
        onBlur={() => setShow(false)}
      >
        {inner}
      </span>
      {tooltip}
    </>
  );
};

export default HelpTip;

import { useState, useMemo, useRef } from 'react';
import {
  Search, ChevronDown, BookOpen,
  FolderOpen, ClipboardList, Calendar, Kanban, LayoutDashboard,
  LayoutList, Bell, BarChart3, CreditCard, User,
} from 'lucide-react';
import { MANUAL_AYUDA } from '../../constants/manualAyuda';

const ICONOS = {
  FolderOpen, ClipboardList, Calendar, Kanban, LayoutDashboard,
  LayoutList, Bell, BarChart3, CreditCard, User,
};

const stripHtml = (html) => html.replace(/<[^>]+>/g, ' ');

// Reemplaza el texto buscado por <mark>, respetando las etiquetas HTML del
// contenido (solo transforma los fragmentos de texto plano, nunca lo que
// está dentro de "<...>").
const highlightHtml = (html, query) => {
  if (!query) return html;
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${safeQuery})`, 'ig');
  return html
    .split(/(<[^>]+>)/g)
    .map((chunk) => (chunk.startsWith('<') ? chunk : chunk.replace(re, '<mark class="bg-yellow-200 dark:bg-yellow-500/40 text-inherit rounded-sm">$1</mark>')))
    .join('');
};

const articleMatches = (articulo, query) => {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    articulo.titulo.toLowerCase().includes(q) ||
    stripHtml(articulo.contenido).toLowerCase().includes(q)
  );
};

const Articulo = ({ articulo, query, open, onToggle }) => (
  <div className="border-b border-gray-100 dark:border-gray-700/60 last:border-b-0">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-2 py-2.5 text-left text-sm font-medium hover:text-accent transition-colors"
    >
      <span dangerouslySetInnerHTML={{ __html: highlightHtml(articulo.titulo, query) }} />
      <ChevronDown size={15} className={`flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && (
      <div
        className="pb-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300 space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-foreground [&_strong]:font-semibold"
        dangerouslySetInnerHTML={{ __html: highlightHtml(articulo.contenido, query) }}
      />
    )}
  </div>
);

const AyudaPage = () => {
  const [query, setQuery] = useState('');
  const [openIds, setOpenIds] = useState(() => new Set());
  const sectionRefs = useRef({});

  const toggleArticulo = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const categoriasFiltradas = useMemo(() => {
    const q = query.trim();
    return MANUAL_AYUDA
      .map((cat) => ({
        ...cat,
        articulos: cat.articulos.filter((a) => articleMatches(a, q)),
      }))
      .filter((cat) => cat.articulos.length > 0);
  }, [query]);

  const isSearching = query.trim().length > 0;

  const isArticuloAbierto = (id) => isSearching || openIds.has(id);

  const scrollToCategoria = (id) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="p-4 flex flex-col lg:flex-row gap-4 items-start">
      {/* Sidebar */}
      <div className="w-full lg:w-[250px] flex-shrink-0 lg:sticky lg:top-4 space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen size={22} className="text-accent" />
          <h1 className="text-xl font-bold uppercase">Ayuda</h1>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en el manual..."
            className="w-full pl-8 pr-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
          />
        </div>

        <nav className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden">
          {categoriasFiltradas.length === 0 ? (
            <p className="px-3 py-4 text-xs text-gray-400 text-center">Sin resultados</p>
          ) : (
            categoriasFiltradas.map((cat) => {
              const Icon = ICONOS[cat.icono] || FolderOpen;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => scrollToCategoria(cat.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left border-b border-gray-100 dark:border-gray-700/60 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Icon size={15} className="text-accent flex-shrink-0" />
                  <span className="flex-1 truncate">{cat.titulo}</span>
                  {isSearching && (
                    <span className="text-[10px] font-bold text-gray-400">{cat.articulos.length}</span>
                  )}
                </button>
              );
            })
          )}
        </nav>
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0 w-full space-y-4">
        {categoriasFiltradas.length === 0 ? (
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-8 text-center text-sm text-gray-400">
            No encontramos artículos que coincidan con "{query}".
          </div>
        ) : (
          categoriasFiltradas.map((cat) => {
            const Icon = ICONOS[cat.icono] || FolderOpen;
            return (
              <div
                key={cat.id}
                ref={(el) => { sectionRefs.current[cat.id] = el; }}
                className="scroll-mt-4 bg-white dark:bg-dark-surface rounded-lg shadow p-4"
              >
                <div className="flex items-center gap-2 mb-1 pb-2 border-b border-gray-100 dark:border-gray-700/60">
                  <Icon size={17} className="text-accent flex-shrink-0" />
                  <h2 className="text-sm font-bold uppercase tracking-wide">{cat.titulo}</h2>
                </div>
                <div>
                  {cat.articulos.map((articulo) => (
                    <Articulo
                      key={articulo.id}
                      articulo={articulo}
                      query={query.trim()}
                      open={isArticuloAbierto(articulo.id)}
                      onToggle={() => toggleArticulo(articulo.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AyudaPage;

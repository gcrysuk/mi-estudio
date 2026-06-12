import { Link } from 'react-router-dom';
import { BarChart3, Scale } from 'lucide-react';

const INFORMES = [
  {
    slug: 'demora-organismos',
    titulo: 'Demora de organismos',
    subtitulo: 'Despacho → Letra',
    descripcion: 'Qué juzgados demoran más en pasar tus carpetas de despacho a letra.',
    icon: Scale,
    gradient: 'from-violet-500 to-purple-600',
  },
];

const InformesPage = () => (
  <div className="space-y-6 p-4">
    <div className="flex items-center gap-3">
      <BarChart3 size={22} className="text-accent" />
      <h1 className="text-2xl font-bold uppercase">Informes</h1>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {INFORMES.map(({ slug, titulo, subtitulo, descripcion, icon: Icon, gradient }) => (
        <Link
          key={slug}
          to={`/informes/${slug}`}
          className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-lg p-6 text-white hover:scale-105 transition-transform duration-200 block`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">{subtitulo}</p>
              <h2 className="text-lg font-bold leading-tight mt-0.5">{titulo}</h2>
            </div>
            <Icon size={36} className="opacity-20 flex-shrink-0 ml-2" />
          </div>
          <p className="text-sm opacity-75">{descripcion}</p>
        </Link>
      ))}
    </div>
  </div>
);

export default InformesPage;

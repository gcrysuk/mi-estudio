import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import api from '../../services/api';
import HelpTip from '../../components/HelpTip';
import { HELP } from '../../constants/helpTexts';

const fmtFecha = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const InformeDemoraOrganismos = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    api.get('/carpetas/informe_demora_organismos/')
      .then(res => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const maxPico = data?.length ? Math.max(...data.map(r => r.pico_dias)) : 1;

  return (
    <div className="space-y-4 p-4">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Link
          to="/informes"
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-accent transition-colors"
        >
          <ArrowLeft size={15} /> Informes
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <BarChart3 size={22} className="text-accent" />
        <div>
          <h1 className="text-xl font-bold">Demora de organismos</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Despacho → Letra
          </p>
        </div>
      </div>

      {/* Contenido */}
      {loading && (
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow p-10 text-center text-sm text-gray-500">
          Cargando...
        </div>
      )}

      {error && (
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow p-10 text-center text-sm text-red-500">
          Error al cargar el informe.
        </div>
      )}

      {!loading && !error && data?.length === 0 && (
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow p-10 text-center text-sm text-gray-500">
          Aún no hay transiciones registradas; este informe se construye con el historial de
          sincronización MEV.
        </div>
      )}

      {!loading && !error && data?.length > 0 && (
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3">Organismo</th>
                  <th className="px-4 py-3 text-right">Transiciones</th>
                  <th className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1">Promedio (días)<HelpTip texto={HELP.informe_promedio} /></span>
                  </th>
                  <th className="px-4 py-3">
                    <span className="inline-flex items-center gap-1">Mayor tiempo a Despacho (días)<HelpTip texto={HELP.informe_pico} /></span>
                  </th>
                  <th className="px-4 py-3">Desde</th>
                  <th className="px-4 py-3">Carpeta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {data.map((row) => (
                  <tr key={row.organismo_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    {/* Organismo */}
                    <td className="px-4 py-3 font-medium">{row.organismo_nombre}</td>

                    {/* Transiciones */}
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-400">
                      {row.transiciones}
                    </td>

                    {/* Promedio */}
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-400">
                      {row.promedio_dias != null ? row.promedio_dias : '—'}
                    </td>

                    {/* Pico — con barra y badge EN CURSO */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums font-semibold w-10 text-right flex-shrink-0">
                          {row.pico_dias}
                        </span>
                        {/* Barra proporcional */}
                        <div className="flex-1 min-w-[60px] max-w-[160px] h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${row.pico_abierto ? 'bg-amber-400' : 'bg-violet-500'}`}
                            style={{ width: `${Math.round((row.pico_dias / maxPico) * 100)}%` }}
                          />
                        </div>
                        {row.pico_abierto && (
                          <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600 whitespace-nowrap">
                            EN CURSO
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Desde */}
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {fmtFecha(row.pico_fecha)}
                    </td>

                    {/* Carpeta */}
                    <td className="px-4 py-3">
                      <Link
                        to={`/carpetas/${row.pico_carpeta_id}`}
                        className="text-accent hover:underline"
                      >
                        {row.pico_carpeta_nombre}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InformeDemoraOrganismos;

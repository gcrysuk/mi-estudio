import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Calendar, FolderOpen, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ResumenMovimientos = () => {
  const [carpetas, setCarpetas] = useState([]);
  const [ultimosMovimientos, setUltimosMovimientos] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [carpetasRes, movimientosRes] = await Promise.all([
        api.get('/carpetas/'),
        api.get('/movimientos/'),
      ]);

      const carpetasData = carpetasRes.data.results || carpetasRes.data;
      const movimientosData = movimientosRes.data.results || movimientosRes.data;

      const porCarpeta = {};
      movimientosData.forEach(mov => {
        const cid = mov.carpeta;
        if (
          !porCarpeta[cid] ||
          new Date(mov.fecha_movimiento) > new Date(porCarpeta[cid].fecha_movimiento)
        ) {
          porCarpeta[cid] = mov;
        }
      });

      setCarpetas(carpetasData);
      setUltimosMovimientos(porCarpeta);
    } catch {
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha) =>
    new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold uppercase flex items-center gap-2">
          <ClipboardList className="text-accent" size={24} />
          RESUMEN
        </h1>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando...</div>
      ) : carpetas.length === 0 ? (
        <div className="bg-white dark:bg-dark-surface p-8 rounded-lg shadow text-center text-gray-500">
          No hay carpetas activas
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                <th className="px-4 py-3 font-semibold uppercase text-xs tracking-wide">Carpeta</th>
                <th className="px-4 py-3 font-semibold uppercase text-xs tracking-wide">Fecha</th>
                <th className="px-4 py-3 font-semibold uppercase text-xs tracking-wide">Último movimiento</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {carpetas.map(carpeta => {
                const ultimo = ultimosMovimientos[carpeta.id];
                return (
                  <tr
                    key={carpeta.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FolderOpen size={15} className="text-accent flex-shrink-0" />
                        <span className="font-medium">{carpeta.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {ultimo ? (
                        <span className="flex items-center gap-1">
                          <Calendar size={13} />
                          {formatFecha(ultimo.fecha_movimiento)}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs">
                      {ultimo ? (
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                            {ultimo.titulo}
                          </p>
                          {ultimo.descripcion && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {ultimo.descripcion}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sin movimientos</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/carpetas/${carpeta.id}/movimientos`}
                        className="p-1.5 rounded hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                        title="Ver movimientos"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ResumenMovimientos;

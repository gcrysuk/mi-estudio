import { useState, useEffect } from 'react';
import { X, Search, UserCheck } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AsignarResponsableModal = ({ movimiento, onClose, onAsignado }) => {
  const [search, setSearch] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [puedeEditarCarpeta, setPuedeEditarCarpeta] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cargar usuarios con acceso a la carpeta al abrir
  useEffect(() => {
    if (!movimiento?.carpeta) return;
    setLoading(true);
    api.get('/usuarios/', { params: { carpeta_id: movimiento.carpeta } })
      .then(r => setUsuarios(r.data.results || r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [movimiento]);

  // Búsqueda dinámica
  useEffect(() => {
    if (!search || search.length < 2) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/usuarios/', { params: { search } });
        setUsuarios(res.data.results || res.data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleConfirmar = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await api.patch(`/movimientos/${movimiento.id}/asignar_responsable/`, {
        usuario_id: selectedUser.id,
        puede_editar_carpeta: puedeEditarCarpeta,
      });
      const label = selectedUser.nombre_completo || selectedUser.username;
      toast.success(`Responsable asignado: ${label}`);
      onAsignado?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al asignar responsable');
    } finally {
      setSaving(false);
    }
  };

  const initiales = (u) =>
    (u.nombre_completo?.[0] || u.username?.[0] || '?').toUpperCase();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-bold uppercase flex items-center gap-2">
            <UserCheck size={16} className="text-accent" />
            Asignar Responsable
          </h3>
          <button onClick={onClose} className="p-1 hover:text-accent rounded transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Responsable actual */}
          {movimiento.responsable_username && (
            <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 rounded-lg text-xs">
              <UserCheck size={13} className="text-accent flex-shrink-0" />
              <span>Actual: <strong>{movimiento.responsable_username}</strong></span>
            </div>
          )}

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar usuario por nombre o email..."
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              autoFocus
            />
          </div>

          {/* Lista de usuarios */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-xs text-center text-gray-500">Buscando...</div>
            ) : usuarios.length === 0 ? (
              <div className="p-3 text-xs text-center text-gray-500">
                {search.length >= 2 ? 'Sin resultados' : 'Buscá un usuario por nombre'}
              </div>
            ) : (
              usuarios.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors border-b last:border-0 border-gray-100 dark:border-gray-700 ${
                    selectedUser?.id === u.id
                      ? 'bg-accent/10 text-accent'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                    {initiales(u)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.nombre_completo || u.username}</p>
                    {u.email && <p className="text-xs text-gray-500 truncate">{u.email}</p>}
                  </div>
                  {selectedUser?.id === u.id && (
                    <UserCheck size={14} className="ml-auto flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Permiso de carpeta */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={puedeEditarCarpeta}
              onChange={e => setPuedeEditarCarpeta(e.target.checked)}
              className="w-4 h-4 accent-blue-500 cursor-pointer"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              Puede editar la carpeta
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase"
          >
            CANCELAR
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={!selectedUser || saving}
            className="px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white uppercase flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            <UserCheck size={13} />
            {saving ? 'ASIGNANDO...' : 'CONFIRMAR'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AsignarResponsableModal;

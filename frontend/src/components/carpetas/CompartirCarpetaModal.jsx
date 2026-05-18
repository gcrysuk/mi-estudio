import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Trash2, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ConfirmDialog from '../ui/ConfirmDialog';

const CompartirCarpetaModal = ({ isOpen, onClose, carpeta, onSave }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [compartidos, setCompartidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsuario, setSelectedUsuario] = useState(null); // { id, username, email }
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [hacerPropietario, setHacerPropietario] = useState(false);
  const [foundUser, setFoundUser] = useState(null);
  const [searching, setSearching] = useState(false);
  const [confirmTransfer, setConfirmTransfer] = useState(null);
  const [confirmDejarCompartir, setConfirmDejarCompartir] = useState(null);

  useEffect(() => {
    if (isOpen && carpeta) {
      fetchUsuarios();
      if (!carpeta.multiple) {
        fetchCompartidos();
      }
    }
  }, [isOpen, carpeta]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedUsuario(null);
      setPuedeEditar(false);
      setHacerPropietario(false);
      setFoundUser(null);
    }
  }, [isOpen]);

  const fetchUsuarios = async () => {
    try {
      const response = await api.get('/usuarios/');
      const data = Array.isArray(response.data) ? response.data : (response.data.results ?? []);
      setUsuarios(data);
    } catch (error) {
      console.error('Error fetching usuarios:', error);
    }
  };

  const fetchCompartidos = async () => {
    try {
      const response = await api.get(`/carpetas/${carpeta.id}/usuarios_compartidos/`);
      setCompartidos(response.data);
    } catch (error) {
      console.error('Error fetching compartidos:', error);
    }
  };

  const handleCompartir = async () => {
    if (!selectedUsuario) {
      toast.error('Selecciona un usuario');
      return;
    }

    setLoading(true);
    try {
      if (carpeta.multiple) {
        await api.post('/carpetas/compartir_multiples/', {
          carpetas: carpeta.id,
          usuario_id: selectedUsuario.id,
          puede_editar: puedeEditar,
        });
        toast.success('Carpetas compartidas');
      } else {
        await api.post(`/carpetas/${carpeta.id}/compartir/`, {
          usuario_id: selectedUsuario.id,
          puede_editar: puedeEditar,
        });
        toast.success('Carpeta compartida');
        fetchCompartidos();
      }
      setSearchTerm('');
      setSelectedUsuario(null);
      setFoundUser(null);
      setPuedeEditar(false);
      setHacerPropietario(false);
      if (onSave) onSave();
    } catch (error) {
      console.error('Error compartiendo:', error);
      toast.error(error.response?.data?.error || 'Error al compartir');
    } finally {
      setLoading(false);
    }
  };

  const handleDejarCompartir = async (usuarioId) => {
    try {
      await api.post(`/carpetas/${carpeta.id}/dejar_compartir/`, { usuario_id: usuarioId });
      toast.success('Compartido eliminado');
      fetchCompartidos();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al eliminar');
    }
  };

  const handleTransferirPropiedad = async () => {
    if (!confirmTransfer) return;
    try {
      await api.post(`/carpetas/${carpeta.id}/transferir_propiedad/`, {
        usuario_id: confirmTransfer.usuario_id,
      });
      toast.success('Propiedad transferida. Ahora sos colaborador de esta carpeta.');
      setConfirmTransfer(null);
      if (onSave) onSave();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al transferir');
    }
  };

  const handleBuscar = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      const response = await api.get(`/usuarios/?search=${encodeURIComponent(searchTerm.trim())}`);
      const data = Array.isArray(response.data) ? response.data : (response.data.results ?? []);
      if (data.length > 0) {
        const user = data[0];
        setFoundUser(user);
        setSelectedUsuario({ id: user.id, username: user.username, email: user.email });
      } else {
        setFoundUser(null);
        toast.error('Usuario no registrado en el sistema');
      }
    } catch (error) {
      toast.error('Error al buscar usuario');
    } finally {
      setSearching(false);
    }
  };

  if (!isOpen) return null;

  // Conocidos filtrados localmente por username (excluye ya seleccionado y foundUser)
  const filteredKnown = searchTerm.trim()
    ? usuarios.filter(u =>
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (!foundUser || u.id !== foundUser.id)
      )
    : [];

  const isSelected = (u) => selectedUsuario?.id === u.id;

  return (
    <>
    <ConfirmDialog
      isOpen={!!confirmDejarCompartir}
      title="QUITAR ACCESO"
      message={confirmDejarCompartir
        ? `¿Querés quitarle el acceso a ${confirmDejarCompartir.username}? Ya no podrá ver ni editar esta carpeta.`
        : ''}
      confirmLabel="QUITAR ACCESO"
      onConfirm={() => { handleDejarCompartir(confirmDejarCompartir.usuario_id); setConfirmDejarCompartir(null); }}
      onCancel={() => setConfirmDejarCompartir(null)}
    />
    <ConfirmDialog
      isOpen={!!confirmTransfer}
      title="⚠️ TRANSFERIR PROPIEDAD"
      message={confirmTransfer
        ? `Estás por transferir la propiedad de esta carpeta a ${confirmTransfer.username}. A partir de ese momento, ${confirmTransfer.username} será el único propietario y podrá quitarte el acceso. Vos quedarás como colaborador. Esta acción no se puede deshacer fácilmente. ¿Confirmás la transferencia?`
        : ''}
      confirmLabel="TRANSFERIR"
      onConfirm={handleTransferirPropiedad}
      onCancel={() => setConfirmTransfer(null)}
    />
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-base font-bold uppercase">
            {carpeta?.multiple ? 'COMPARTIR CARPETAS' : 'COMPARTIR CARPETA'}
          </h2>
          <button onClick={onClose} className="p-1 hover:text-accent">
            <X size={18} />
          </button>
        </div>

        <div className="p-3">
          {/* Info carpeta */}
          {!carpeta?.multiple && carpeta && (carpeta.numero_expediente || carpeta.caratula || carpeta.nombre) && (
            <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium">
                {[carpeta.numero_expediente, carpeta.caratula, carpeta.nombre]
                  .filter(Boolean)
                  .join(' - ') || 'Sin nombre'}
              </p>
            </div>
          )}
          {carpeta?.multiple && (
            <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium">Compartir {carpeta.id.length} carpetas</p>
            </div>
          )}

          {/* Sección: Agregar colaborador */}
          <div className="mb-4">
            <p className="text-xs font-bold uppercase mb-2">AGREGAR COLABORADOR</p>

            {/* Input + botón buscar */}
            <div className="flex gap-2 mb-1">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Buscar username..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setFoundUser(null);
                    if (!e.target.value.trim()) setSelectedUsuario(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                  className="w-full pl-7 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                />
              </div>
              <button
                onClick={handleBuscar}
                disabled={searching || !searchTerm.trim()}
                className="px-3 py-1.5 text-xs uppercase rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {searching ? '...' : 'BUSCAR'}
              </button>
            </div>

            {/* Lista de conocidos filtrados */}
            {filteredKnown.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-2">
                {filteredKnown.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      setSelectedUsuario({ id: u.id, username: u.username, email: u.email });
                      setFoundUser(null);
                    }}
                    className={`px-3 py-2 cursor-pointer transition-colors text-sm ${
                      isSelected(u)
                        ? 'bg-accent/10 dark:bg-accent/20 border-l-2 border-accent'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {u.username}
                  </div>
                ))}
              </div>
            )}

            {/* Usuario encontrado por búsqueda exacta */}
            {foundUser && (
              <div
                onClick={() => setSelectedUsuario({ id: foundUser.id, username: foundUser.username, email: foundUser.email })}
                className={`p-2 rounded-lg cursor-pointer border transition-colors mb-2 ${
                  isSelected(foundUser)
                    ? 'border-accent bg-accent/10 dark:bg-accent/20'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <p className="text-sm font-medium">{foundUser.username}</p>
                <p className="text-xs text-gray-500">{foundUser.email}</p>
              </div>
            )}

            {/* Opciones y botón compartir — solo visibles cuando hay usuario seleccionado */}
            {selectedUsuario && (
              <>
                <div className="p-2 rounded-lg bg-accent/10 dark:bg-accent/20 border border-accent mb-2">
                  <p className="text-sm font-medium">{selectedUsuario.username}</p>
                  {selectedUsuario.email && (
                    <p className="text-xs text-gray-500">{selectedUsuario.email}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={puedeEditar}
                      onChange={(e) => { setPuedeEditar(e.target.checked); if (e.target.checked) setHacerPropietario(false); }}
                      className="rounded border-gray-300 text-accent focus:ring-accent"
                    />
                    <span className="text-xs uppercase">Puede editar</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hacerPropietario}
                      onChange={(e) => { setHacerPropietario(e.target.checked); if (e.target.checked) setPuedeEditar(false); }}
                      className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                    />
                    <span className="text-xs uppercase flex items-center gap-1">
                      <Crown size={12} className="text-yellow-500" /> Hacer propietario
                    </span>
                  </label>
                </div>

                <button
                  onClick={() => {
                    if (hacerPropietario) {
                      setConfirmTransfer({ usuario_id: selectedUsuario.id, username: selectedUsuario.username });
                    } else {
                      handleCompartir();
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  <UserPlus size={14} />
                  {loading ? 'COMPARTIENDO...' : hacerPropietario ? 'TRANSFERIR' : 'COMPARTIR'}
                </button>
              </>
            )}
          </div>

          {/* Lista de colaboradores actuales */}
          {!carpeta?.multiple && compartidos.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase mb-2">COMPARTIDO CON:</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {compartidos.map(c => (
                  <div key={c.usuario_id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{c.username}</p>
                      <p className="text-xs text-gray-500">{c.email}</p>
                      {c.puede_editar && (
                        <span className="text-xs text-accent">Puede editar</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setConfirmTransfer({ usuario_id: c.usuario_id, username: c.username })}
                        className="p-1 hover:text-yellow-500 transition-colors"
                        title="Hacer propietario"
                      >
                        <Crown size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDejarCompartir({ usuario_id: c.usuario_id, username: c.username })}
                        className="p-1 hover:text-red-500 transition-colors"
                        title="Dejar de compartir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default CompartirCarpetaModal;

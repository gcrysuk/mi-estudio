import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const CompartirCarpetaModal = ({ isOpen, onClose, carpeta, onSave }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [compartidos, setCompartidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsuario, setSelectedUsuario] = useState('');
  const [puedeEditar, setPuedeEditar] = useState(false);

  const [searchNewUsername, setSearchNewUsername] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [searchingNew, setSearchingNew] = useState(false);

  useEffect(() => {
    if (isOpen && carpeta) {
      fetchUsuarios();
      if (!carpeta.multiple) {
        fetchCompartidos();
      }
    }
  }, [isOpen, carpeta]);

  const fetchUsuarios = async () => {
    try {
      const response = await api.get('/usuarios/');
      const data = Array.isArray(response.data) ? response.data : (response.data.results ?? []);
      const propietarioId = carpeta.multiple ? null : carpeta.propietario;
      setUsuarios(data.filter(u => u.id !== propietarioId));
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
          usuario_id: parseInt(selectedUsuario),
          puede_editar: puedeEditar
        });
        toast.success('Carpetas compartidas');
      } else {
        await api.post(`/carpetas/${carpeta.id}/compartir/`, {
          usuario_id: parseInt(selectedUsuario),
          puede_editar: puedeEditar
        });
        toast.success('Carpeta compartida');
        fetchCompartidos();
      }
      setSelectedUsuario('');
      setFoundUser(null);
      setSearchNewUsername('');
      setPuedeEditar(false);
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
      await api.post(`/carpetas/${carpeta.id}/dejar_compartir/`, {
        usuario_id: usuarioId
      });
      toast.success('Compartido eliminado');
      fetchCompartidos();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleBuscarNuevo = async () => {
    if (!searchNewUsername.trim()) return;
    setSearchingNew(true);
    try {
      const response = await api.get(`/usuarios/?search=${encodeURIComponent(searchNewUsername.trim())}`);
      if (response.data.length > 0) {
        const user = response.data[0];
        setFoundUser(user);
        setSelectedUsuario(String(user.id));
        setSearchNewUsername('');
      } else {
        setFoundUser(null);
        toast.error('Usuario no registrado en el sistema');
      }
    } catch (error) {
      toast.error('Error al buscar usuario');
    } finally {
      setSearchingNew(false);
    }
  };

  if (!isOpen) return null;

  const filteredUsuarios = usuarios.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-md">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-base font-bold uppercase">
            {carpeta?.multiple ? 'COMPARTIR CARPETAS' : 'COMPARTIR CARPETA'}
          </h2>
          <button onClick={onClose} className="p-1 hover:text-accent">
            <X size={18} />
          </button>
        </div>

        <div className="p-3">
          {!carpeta?.multiple && carpeta && (
            <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium">{carpeta.numero_expediente} - {carpeta.caratula}</p>
            </div>
          )}

          {carpeta?.multiple && (
            <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium">Compartir {carpeta.id.length} carpetas</p>
            </div>
          )}

          {/* Sección 1: Conocidos */}
          <div className="mb-4">
            <p className="text-xs font-bold uppercase mb-2">CONOCIDOS</p>
            {usuarios.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">Aún no tenés colaboradores</p>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="BUSCAR USUARIO..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                  />
                </div>
                <select
                  value={selectedUsuario}
                  onChange={(e) => {
                    setSelectedUsuario(e.target.value);
                    if (foundUser) setFoundUser(null);
                  }}
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                >
                  <option value="">SELECCIONAR USUARIO</option>
                  {filteredUsuarios.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.username} - {u.email}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* Sección 2: Buscar nuevo usuario */}
          <div className="mb-3">
            <p className="text-xs font-bold uppercase mb-2">AGREGAR SOLO POR USERNAME</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="USERNAME..."
                value={searchNewUsername}
                onChange={(e) => {
                  setSearchNewUsername(e.target.value);
                  setFoundUser(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscarNuevo()}
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              />
              <button
                onClick={handleBuscarNuevo}
                disabled={searchingNew || !searchNewUsername.trim()}
                className="px-3 py-1.5 text-xs uppercase rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {searchingNew ? '...' : 'BUSCAR'}
              </button>
            </div>
            {foundUser && (
              <div
                onClick={() => setSelectedUsuario(String(foundUser.id))}
                className={`mt-2 p-2 rounded-lg cursor-pointer border transition-colors ${
                  selectedUsuario === String(foundUser.id)
                    ? 'border-accent bg-accent/10 dark:bg-accent/20'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <p className="text-sm font-medium">{foundUser.username}</p>
                <p className="text-xs text-gray-500">{foundUser.email}</p>
              </div>
            )}
          </div>

          {/* Checkbox puede editar */}
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={puedeEditar}
              onChange={(e) => setPuedeEditar(e.target.checked)}
              className="rounded border-gray-300 text-accent focus:ring-accent"
            />
            <span className="text-xs uppercase">Puede editar</span>
          </label>

          {/* Botón compartir */}
          <button
            onClick={handleCompartir}
            disabled={loading || !selectedUsuario}
            className="w-full bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-50 mb-4 transition-colors"
          >
            <UserPlus size={14} />
            {loading ? 'COMPARTIENDO...' : 'COMPARTIR'}
          </button>

          {/* Lista de usuarios con acceso */}
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
                    <button
                      onClick={() => handleDejarCompartir(c.usuario_id)}
                      className="p-1 hover:text-red-500 transition-colors"
                      title="Dejar de compartir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompartirCarpetaModal;

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '../stores/authStore';

const UndoContext = createContext(null);

export function UndoProvider({ children }) {
  const [stack, setStack] = useState([]);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const pushUndo = useCallback((item) => {
    setStack(prev => [...prev, { id: Date.now(), ...item }]);
  }, []);

  const removeById = useCallback((id) => {
    setStack(prev => prev.filter(item => item.id !== id));
  }, []);

  const undoLast = useCallback(async () => {
    setStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      last.restoreFn().then(() => {
        toast.success('Acción deshecha');
      }).catch(() => {
        toast.error('Error al deshacer');
      });
      return prev.slice(0, -1);
    });
  }, []);

  const clearStack = useCallback(() => setStack([]), []);

  // Vaciar pila al cerrar sesión
  useEffect(() => {
    if (!isAuthenticated) clearStack();
  }, [isAuthenticated, clearStack]);

  // Ctrl+Z global
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoLast();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undoLast]);

  return (
    <UndoContext.Provider value={{ stack, pushUndo, removeById, undoLast, clearStack }}>
      {children}
    </UndoContext.Provider>
  );
}

export function useUndoContext() {
  return useContext(UndoContext);
}

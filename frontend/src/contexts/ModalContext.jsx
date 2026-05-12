import { createContext, useContext, useState } from 'react';

const ModalContext = createContext();

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    tipo: null,
    onGuardar: null
  });

  const abrirModalPersona = (callback) => {
    console.log('🔵 ModalContext: abriendo modal persona');
    setModalState({
      isOpen: true,
      tipo: 'persona',
      onGuardar: callback
    });
  };

  const cerrarModal = () => {
    console.log('🔴 ModalContext: cerrando modal');
    setModalState({
      isOpen: false,
      tipo: null,
      onGuardar: null
    });
  };

  return (
    <ModalContext.Provider value={{
      modalState,
      abrirModalPersona,
      cerrarModal
    }}>
      {children}
    </ModalContext.Provider>
  );
};

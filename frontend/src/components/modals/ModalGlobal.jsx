import React from 'react';
import { useModal } from '../../contexts/ModalContext';
import PersonasList from '../../pages/personas/PersonasList';

const ModalGlobal = () => {
  const { modalState, cerrarModal } = useModal();

  if (!modalState.isOpen) return null;

  const handleGuardar = (personaId) => {
    if (modalState.onGuardar) {
      modalState.onGuardar(personaId);
    }
    cerrarModal();
  };

  const handleCancelar = () => {
    cerrarModal();
  };

  return (
    <div className="fixed inset-0 z-[500]">
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={handleCancelar}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-2xl">
          {modalState.tipo === 'persona' && (
            <PersonasList
              isModal={true}
              onGuardar={handleGuardar}
              onCancelar={handleCancelar}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalGlobal;

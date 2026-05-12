import React from 'react';
import { useModal } from '../../contexts/ModalContext';
import PersonasList from '../../pages/personas/PersonasList';

const ModalGlobal = () => {
  const { modalState, cerrarModal } = useModal();

  console.log('📦 ModalGlobal - modalState:', modalState); // 👈 Log importante

  if (!modalState.isOpen) {
    console.log('⏸️ Modal cerrado');
    return null;
  }

  const handleGuardar = (personaId) => {
    console.log('🟢 ModalGlobal: persona guardada con ID:', personaId);
    console.log('🟢 Callback en modalState:', modalState.onGuardar);

    if (modalState.onGuardar) {
      modalState.onGuardar(personaId);
    } else {
      console.log('❌ No hay callback definido');
    }

    cerrarModal();
  };

  const handleCancelar = () => {
    console.log('🔴 ModalGlobal: cancelado');
    cerrarModal();
  };

  console.log('🎯 Renderizando modal, tipo:', modalState.tipo);

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={handleCancelar}
      />

      {/* Contenido del modal */}
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

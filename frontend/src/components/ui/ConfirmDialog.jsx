import { X } from 'lucide-react';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'ELIMINAR' }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl p-5 max-w-sm w-full">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-bold uppercase">{title}</h3>
          <button onClick={onCancel} className="p-0.5 hover:text-accent text-gray-400">
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase"
          >
            CANCELAR
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors uppercase"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

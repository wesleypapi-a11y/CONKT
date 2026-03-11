import { AlertTriangle } from 'lucide-react';
import { conktColors } from '../../styles/colors';

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    return <AlertTriangle className="w-16 h-16 text-orange-500" />;
  };

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case 'danger':
        return 'Atenção';
      case 'warning':
        return 'Confirmação';
      default:
        return 'Confirmar Ação';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'danger':
        return 'border-red-500';
      case 'warning':
        return 'border-orange-500';
      default:
        return 'border-blue-500';
    }
  };

  const getConfirmButtonColor = () => {
    switch (type) {
      case 'danger':
        return '#ef4444';
      default:
        return conktColors.primary.blue;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div
        className={`bg-white rounded-lg shadow-2xl max-w-md w-full border-t-4 ${getBorderColor()} animate-fade-in`}
        style={{
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4">
              {getIcon()}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {getTitle()}
            </h3>
            <p className="text-gray-600 mb-6 whitespace-pre-line">
              {message}
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={onCancel}
                className="flex-1 px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-all border-2"
                style={{
                  borderColor: '#d1d5db',
                  color: '#374151',
                  backgroundColor: '#ffffff'
                }}
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  console.log('[ConfirmModal] Botão Confirmar clicado');
                  onConfirm();
                }}
                className="flex-1 px-6 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-all shadow-md"
                style={{ backgroundColor: getConfirmButtonColor() }}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

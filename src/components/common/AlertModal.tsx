import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { conktColors } from '../../styles/colors';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

export default function AlertModal({ isOpen, onClose, title, message, type = 'info' }: AlertModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-16 h-16 text-red-500" />;
      default:
        return <Info className="w-16 h-16 text-blue-500" />;
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case 'success':
        return 'Sucesso';
      case 'error':
        return 'Erro';
      default:
        return 'Informação';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-green-500';
      case 'error':
        return 'border-red-500';
      default:
        return 'border-blue-500';
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
            <button
              onClick={onClose}
              className="w-full px-6 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-all shadow-md"
              style={{ backgroundColor: conktColors.primary.blue }}
            >
              OK
            </button>
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

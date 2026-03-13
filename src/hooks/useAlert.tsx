import { useState, useCallback, useRef } from 'react';
import AlertModal from '../components/common/AlertModal';
import ConfirmModal from '../components/common/ConfirmModal';

interface AlertOptions {
  title?: string;
  type?: 'success' | 'error' | 'info';
}

interface ConfirmOptions {
  title?: string;
  type?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

export function useAlert() {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [alertOptions, setAlertOptions] = useState<AlertOptions>({});
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions>({});
  const confirmCallbackRef = useRef<(() => void | Promise<void>) | null>(null);

  const showAlert = useCallback((msg: string, typeOrOpts?: 'success' | 'error' | 'info' | 'warning' | AlertOptions) => {
    setMessage(msg);
    if (typeof typeOrOpts === 'string') {
      setAlertOptions({ type: typeOrOpts as 'success' | 'error' | 'info' });
    } else {
      setAlertOptions(typeOrOpts || {});
    }
    setIsAlertOpen(true);
  }, []);

  const showSuccess = useCallback((msg: string, title?: string) => {
    showAlert(msg, { type: 'success', title });
  }, [showAlert]);

  const showError = useCallback((msg: string, title?: string) => {
    showAlert(msg, { type: 'error', title });
  }, [showAlert]);

  const showInfo = useCallback((msg: string, title?: string) => {
    showAlert(msg, { type: 'info', title });
  }, [showAlert]);

  const showConfirm = useCallback((msg: string, onConfirm: () => void | Promise<void>, opts: ConfirmOptions = {}) => {
    setMessage(msg);
    setConfirmOptions(opts);
    confirmCallbackRef.current = onConfirm;
    setIsConfirmOpen(true);
  }, []);

  const closeAlert = useCallback(() => {
    setIsAlertOpen(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    const callback = confirmCallbackRef.current;
    confirmCallbackRef.current = null;
    setIsConfirmOpen(false);

    if (callback) {
      try {
        await callback();
      } catch (error) {
        console.error('Erro ao executar callback de confirmação:', error);
      }
    }
  }, []);

  const handleCancel = useCallback(() => {
    setIsConfirmOpen(false);
    confirmCallbackRef.current = null;
  }, []);

  const AlertComponent = useCallback(() => (
    <>
      <AlertModal
        isOpen={isAlertOpen}
        onClose={closeAlert}
        message={message}
        {...alertOptions}
      />
      <ConfirmModal
        isOpen={isConfirmOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        message={message}
        {...confirmOptions}
      />
    </>
  ), [isAlertOpen, isConfirmOpen, closeAlert, handleConfirm, handleCancel, message, alertOptions, confirmOptions]);

  return {
    showAlert,
    showSuccess,
    showError,
    showInfo,
    showConfirm,
    AlertComponent
  };
}

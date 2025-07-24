import React from 'react';
import styles from '@/styles/admin/confirmationModal.module.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmVariant?: 'vermelho' | 'azul';
}

const ConfirmationModal = ({
  isOpen,
  message,
  confirmText = 'Excluir',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  confirmVariant = 'vermelho',
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  const confirmClass = confirmVariant === 'azul'
    ? styles.confirmButtonAzul
    : styles.confirmButton;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <p className={styles.message}>{message}</p>
        <div className={styles.buttonContainer}>
          <button className={`${styles.button} ${confirmClass}`} onClick={onConfirm}>
            {confirmText}
          </button>
          <button className={`${styles.button} ${styles.cancelButton}`} onClick={onCancel}>
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

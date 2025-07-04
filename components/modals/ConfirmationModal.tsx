import React from 'react';
import styles from '@/styles/admin/cadastros/procedimento/confirmationModal.module.css';


interface ConfirmationModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal = ({ isOpen, message, onConfirm, onCancel }: ConfirmationModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <p className={styles.message}>{message}</p>
        <div className={styles.buttonContainer}>
          <button className={`${styles.button} ${styles.confirmButton}`} onClick={onConfirm}>
            Confirmar
          </button>
          <button className={`${styles.button} ${styles.cancelButton}`} onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

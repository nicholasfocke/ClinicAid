import React from 'react';
import styles from '@/styles/admin/financeiro/contas-a-pagar.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    vencimento: string;
    fornecedor: string;
    descricao: string;
    valor: number;
  }) => void;
}

export const ModalAdicionarConta: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [form, setForm] = React.useState({
    vencimento: '',
    fornecedor: '',
    descricao: '',
    valor: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vencimento || !form.fornecedor || !form.descricao || !form.valor) return;
    onSubmit({
      vencimento: form.vencimento,
      fornecedor: form.fornecedor,
      descricao: form.descricao,
      valor: Number(form.valor)
    });
    setForm({ vencimento: '', fornecedor: '', descricao: '', valor: '' });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox}>
        <h2 className={styles.modalTitle}>Adicionar conta a pagar</h2>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <label className={styles.modalLabel}>
            Vencimento
            <input type="date" name="vencimento" value={form.vencimento} onChange={handleChange} className={styles.modalInput} required />
          </label>
          <label className={styles.modalLabel}>
            Fornecedor
            <input type="text" name="fornecedor" value={form.fornecedor} onChange={handleChange} className={styles.modalInput} required />
          </label>
          <label className={styles.modalLabel}>
            Descrição
            <input type="text" name="descricao" value={form.descricao} onChange={handleChange} className={styles.modalInput} required />
          </label>
          <label className={styles.modalLabel}>
            Valor
            <input type="number" name="valor" value={form.valor} onChange={handleChange} className={styles.modalInput} required min="0" step="0.01" />
          </label>
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnRemover} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.btnAdicionar}>Adicionar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

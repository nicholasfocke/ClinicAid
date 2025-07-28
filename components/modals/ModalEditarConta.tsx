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
    status: 'Pendente' | 'Pago';
  }) => void;
  conta?: {
    vencimento: string;
    fornecedor: string;
    descricao: string;
    valor: number;
    status?: 'Pendente' | 'Pago';
  };
}

export const ModalEditarConta: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit, conta }) => {
  const [form, setForm] = React.useState({
    vencimento: conta?.vencimento ? conta.vencimento.split('/').reverse().join('-') : '',
    fornecedor: conta?.fornecedor || '',
    descricao: conta?.descricao || '',
    valor: conta?.valor ? String(conta.valor) : '',
    status: conta?.status || 'Pendente',
  });

  React.useEffect(() => {
    setForm({
      vencimento: conta?.vencimento ? conta.vencimento.split('/').reverse().join('-') : '',
      fornecedor: conta?.fornecedor || '',
      descricao: conta?.descricao || '',
      valor: conta?.valor ? String(conta.valor) : '',
      status: conta?.status || 'Pendente',
    });
  }, [conta]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vencimento || !form.fornecedor || !form.descricao || !form.valor) return;
    onSubmit({
      vencimento: form.vencimento,
      fornecedor: form.fornecedor,
      descricao: form.descricao,
      valor: Number(form.valor),
      status: form.status as 'Pendente' | 'Pago',
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox}>
        <h2 className={styles.modalTitle}>Editar conta a pagar</h2>
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
          <label className={styles.modalLabel}>
            Status
            <select name="status" value={form.status} onChange={handleChange} className={styles.modalInput} required>
              <option value="Pendente">Pendente</option>
              <option value="Pago">Pago</option>
            </select>
          </label>
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnRemover} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.btnEditar}>Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

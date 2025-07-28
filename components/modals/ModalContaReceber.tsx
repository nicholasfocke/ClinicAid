import React from 'react';
import styles from '@/styles/admin/financeiro/contas-a-receber.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    descricao: string;
    valor: number;
    cliente: string;
    vencimento: string;
    status: 'Pendente' | 'Recebido';
  }) => void;
  conta?: {
    descricao: string;
    valor: number;
    cliente: string;
    vencimento: string;
    status: 'Pendente' | 'Recebido';
  };
  isEdit?: boolean;
}

export const ModalContaReceber: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit, conta, isEdit }) => {
  const [form, setForm] = React.useState({
    descricao: conta?.descricao || '',
    valor: conta?.valor ? String(conta.valor) : '',
    cliente: conta?.cliente || '',
    vencimento: conta?.vencimento ? conta.vencimento.split('/').reverse().join('-') : '',
    status: conta?.status || 'Pendente',
  });

  React.useEffect(() => {
    setForm({
      descricao: conta?.descricao || '',
      valor: conta?.valor ? String(conta.valor) : '',
      cliente: conta?.cliente || '',
      vencimento: conta?.vencimento ? conta.vencimento.split('/').reverse().join('-') : '',
      status: conta?.status || 'Pendente',
    });
  }, [conta, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descricao || !form.valor || !form.cliente || !form.vencimento) return;
    onSubmit({
      descricao: form.descricao,
      valor: Number(form.valor),
      cliente: form.cliente,
      vencimento: form.vencimento,
      status: form.status as 'Pendente' | 'Recebido',
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox}>
        <h2 className={styles.modalTitle}>{isEdit ? 'Editar conta a receber' : 'Adicionar conta a receber'}</h2>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <label className={styles.modalLabel}>
            Vencimento
            <input type="date" name="vencimento" value={form.vencimento} onChange={handleChange} className={styles.modalInput} required />
          </label>
          <label className={styles.modalLabel}>
            Cliente
            <input type="text" name="cliente" value={form.cliente} onChange={handleChange} className={styles.modalInput} required />
          </label>
          <label className={styles.modalLabel}>
            Descrição
            <input type="text" name="descricao" value={form.descricao} onChange={handleChange} className={styles.modalInput} required />
          </label>
          <label className={styles.modalLabel}>
            Valor
            <input type="number" name="valor" value={form.valor} onChange={handleChange} className={styles.modalInput} required min="0" step="0.01" />
          </label>
          {isEdit && (
            <label className={styles.modalLabel}>
              Status
              <select name="status" value={form.status} onChange={handleChange} className={styles.modalInput} required>
                <option value="Pendente">Pendente</option>
                <option value="Recebido">Recebido</option>
              </select>
            </label>
          )}
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnRemoverReceber} onClick={onClose}>Cancelar</button>
            <button type="submit" className={isEdit ? styles.btnEditarReceber : styles.btnAdicionarReceber}>{isEdit ? 'Salvar' : 'Adicionar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

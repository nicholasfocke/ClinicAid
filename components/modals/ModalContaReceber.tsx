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
    formaPagamento?: 'Pix' | 'Boleto bancário' | 'Cartão' | 'Transferência' | '';
  }) => void;
  conta?: {
    descricao: string;
    valor: number;
    cliente: string;
    vencimento: string;
    status: 'Pendente' | 'Recebido';
    formaPagamento?: 'Pix' | 'Boleto bancário' | 'Cartão' | 'Transferência' | '';
  };
  isEdit?: boolean;
}

export const ModalContaReceber: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit, conta, isEdit }) => {
  const [form, setForm] = React.useState({
    descricao: conta?.descricao || '',
    valor: conta?.valor !== undefined ? formatarMoeda(conta.valor) : '',
    cliente: conta?.cliente || '',
    vencimento: conta?.vencimento ? conta.vencimento.split('/').reverse().join('-') : '',
    status: conta?.status || 'Pendente',
    formaPagamento: conta?.formaPagamento || '',
  });

  // Função para formatar moeda (R$ 1.000,00)
  function formatarMoeda(valor: string | number) {
    const onlyDigits = String(valor).replace(/\D/g, '');
    const number = Number(onlyDigits) / 100;
    if (isNaN(number)) return '';
    if (typeof valor === 'number') {
      return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else if (typeof valor === 'string') {
      const onlyDigits = valor.replace(/\D/g, '');
      const number = Number(onlyDigits) / 100;
      if (isNaN(number)) return '';
      return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    return '';
  }

  React.useEffect(() => {
    if (!isOpen) {
      setForm({
        descricao: '',
        valor: '',
        cliente: '',
        vencimento: '',
        status: 'Pendente',
        formaPagamento: '',
      });
    } else {
      setForm({
        descricao: conta?.descricao || '',
        valor: conta?.valor !== undefined ? formatarMoeda(conta.valor) : '',
        cliente: conta?.cliente || '',
        vencimento: conta?.vencimento ? conta.vencimento.split('/').reverse().join('-') : '',
        status: conta?.status || 'Pendente',
        formaPagamento: conta?.formaPagamento || '',
      });
    }
  }, [isOpen, conta, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'valor') {
      setForm({ ...form, valor: formatarMoeda(value) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descricao || !form.valor || !form.cliente || !form.vencimento) return;
    // Extrai o valor numérico da string formatada
    const valorNumerico = Number(form.valor.replace(/[^\d]/g, '')) / 100;
    onSubmit({
      descricao: form.descricao,
      valor: valorNumerico,
      cliente: form.cliente,
      vencimento: form.vencimento,
      status: form.status as 'Pendente' | 'Recebido',
      formaPagamento: form.formaPagamento as 'Pix' | 'Boleto bancário' | 'Cartão' | 'Transferência' | '',
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
            <input
              type="text"
              name="valor"
              value={form.valor}
              onChange={handleChange}
              className={styles.modalInput}
              required
              inputMode="numeric"
              placeholder="R$ 0,00"
              maxLength={20}
              autoComplete="off"
            />
          </label>
          <label className={styles.modalLabel}>
            Forma de Pagamento
            <select
              name="formaPagamento"
              value={form.formaPagamento}
              onChange={handleChange}
              className={styles.modalInput}
              required
            >
              <option value="">Selecione</option>
              <option value="Pix">Pix</option>
              <option value="Boleto bancário">Boleto bancário</option>
              <option value="Cartão">Cartão</option>
              <option value="Transferência">Transferência</option>
            </select>
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

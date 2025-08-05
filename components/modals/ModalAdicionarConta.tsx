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
    formaPagamento?: 'Pix' | 'Boleto bancário' | 'Cartão' | 'Transferência' | '';
  }) => void;
}

export const ModalAdicionarConta: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [form, setForm] = React.useState({
    vencimento: '',
    fornecedor: '',
    descricao: '',
    valor: '',
    formaPagamento: '',
  });

  // Função para formatar moeda (R$ 1.000,00)
  function formatarMoeda(valor: string) {
    const onlyDigits = valor.replace(/\D/g, '');
    const number = Number(onlyDigits) / 100;
    if (isNaN(number)) return '';
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }


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
    if (!form.vencimento || !form.fornecedor || !form.descricao || !form.valor) return;
    // Extrai o valor numérico da string formatada
    const valorNumerico = Number(form.valor.replace(/[^\d]/g, '')) / 100;
    onSubmit({
      vencimento: form.vencimento,
      fornecedor: form.fornecedor,
      descricao: form.descricao,
      valor: valorNumerico,
      formaPagamento: form.formaPagamento as 'Pix' | 'Boleto bancário' | 'Cartão' | 'Transferência' | '',
    });
    setForm({ vencimento: '', fornecedor: '', descricao: '', valor: '', formaPagamento: '' });
  };

  // Limpa o formulário sempre que o modal for fechado (ao cancelar ou sair)
  React.useEffect(() => {
    if (!isOpen) {
      setForm({ vencimento: '', fornecedor: '', descricao: '', valor: '', formaPagamento: '' });
    }
  }, [isOpen]);

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
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnRemover} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.btnAdicionar}>Adicionar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

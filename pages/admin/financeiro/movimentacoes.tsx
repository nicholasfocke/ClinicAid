import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/financeiro/movimentacoes.module.css';
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { ModalContaReceber } from '@/components/modals/ModalContaReceber';
import ConfirmationModal from '@/components/modals/ConfirmationModal';

interface ContaReceber {
  id: string;
  descricao: string;
  valor: number;
  cliente: string;
  vencimento: string;
  status: 'Pendente' | 'Recebido';
  formaPagamento?: 'Pix' | 'Boleto bancário' | 'Cartão' | 'Transferência' | '';
}

const MovimentacoesFinanceiras = () => {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [contaEdit, setContaEdit] = useState<ContaReceber | null>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; onConfirm: () => void }>({ isOpen: false, onConfirm: () => {} });

  useEffect(() => {
    const fetchContas = async () => {
      setLoading(true);
      try {
        const contasRef = collection(firestore, 'contasAReceber');
        const snapshot = await getDocs(contasRef);
        const contasList: ContaReceber[] = snapshot.docs.map(doc => ({
          id: doc.id,
          vencimento: doc.data().vencimento,
          cliente: doc.data().cliente,
          descricao: doc.data().descricao,
          valor: doc.data().valor,
          status: doc.data().status,
          formaPagamento: doc.data().formaPagamento || '',
        }));
        setContas(contasList);
      } catch {
        setContas([]);
      }
      setLoading(false);
    };
    fetchContas();
  }, []);

  const abrirModalEditar = (conta: ContaReceber) => {
    setContaEdit(conta);
    setModalEditOpen(true);
  };

  const editarConta = async (data: Omit<ContaReceber, 'id'>) => {
    if (!contaEdit) return;
    try {
      await updateDoc(doc(firestore, 'contasAReceber', contaEdit.id), {
        vencimento: data.vencimento.split('-').reverse().join('/'),
        cliente: data.cliente,
        descricao: data.descricao,
        valor: data.valor,
        status: data.status,
        formaPagamento: data.formaPagamento || '',
      });
      setContas(prev => prev.map(c =>
        c.id === contaEdit.id
          ? {
              id: contaEdit.id,
              vencimento: data.vencimento.split('-').reverse().join('/'),
              cliente: data.cliente,
              descricao: data.descricao,
              valor: data.valor,
              status: data.status,
              formaPagamento: data.formaPagamento || '',
            }
          : c
      ));
    } catch {
      // erro ao editar
    }
    setModalEditOpen(false);
    setContaEdit(null);
  };

  const removerConta = (id: string) => {
    setModalState({
      isOpen: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(firestore, 'contasAReceber', id));
          setContas(prev => prev.filter(c => c.id !== id));
        } catch {
          // erro ao remover
        }
        setModalState({ isOpen: false, onConfirm: () => {} });
      },
    });
  };

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Financeiro &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Movimentações</span>
          </span>
        </div>
        <h1 className={styles.titleFinanceiro}>Movimentações</h1>
        <div className={styles.subtitleFinanceiro}>Acompanhe as movimentações financeiras da clínica</div>
        <div className={styles.tabelaWrapper}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px' }}>Carregando...</div>
          ) : (
            <table className={styles.tabelaContasReceber}>
              <thead>
                <tr>
                  <th>VENCIMENTO</th>
                  <th>CLIENTE</th>
                  <th>DESCRIÇÃO</th>
                  <th>VALOR</th>
                  <th>FORMA PAGAMENTO</th>
                  <th>STATUS</th>
                  <th>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {contas.map(conta => (
                  <tr key={conta.id}>
                    <td>{conta.vencimento}</td>
                    <td>{conta.cliente}</td>
                    <td>{conta.descricao}</td>
                    <td>{conta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td>{conta.formaPagamento || '-'}</td>
                    <td>
                      <span className={conta.status === 'Pendente' ? styles.statusPendente : styles.statusRecebido}>
                        {conta.status}
                      </span>
                    </td>
                    <td className={styles.acoesTd}>
                      <button
                        className={styles.iconBtn + ' ' + styles.iconEdit}
                        title="Editar"
                        onClick={() => abrirModalEditar(conta)}
                        aria-label="Editar"
                      >
                        <svg width="22" height="22" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M12 20h9"/>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/>
                        </svg>
                      </button>
                      <button
                        className={styles.iconBtn + ' ' + styles.iconDelete}
                        title="Excluir"
                        onClick={() => removerConta(conta.id)}
                        aria-label="Excluir"
                      >
                        <svg width="22" height="22" fill="none" stroke="#e53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <ModalContaReceber
        isOpen={modalEditOpen}
        onClose={() => setModalEditOpen(false)}
        onSubmit={editarConta}
        conta={contaEdit || undefined}
        isEdit
      />
      <ConfirmationModal
        isOpen={modalState.isOpen}
        message="Você tem certeza que deseja excluir esta movimentação?"
        onConfirm={modalState.onConfirm}
        onCancel={() => setModalState({ isOpen: false, onConfirm: () => {} })}
      />
    </ProtectedRoute>
  );
};

export default MovimentacoesFinanceiras;

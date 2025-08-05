import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/financeiro/financeiro.module.css';
import receberStyles from '@/styles/admin/financeiro/contas-a-receber.module.css';
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { ModalContaReceber } from '@/components/modals/ModalContaReceber';
import ConfirmationModal from '@/components/modals/ConfirmationModal';

type TipoMovimentacao = 'Receber' | 'Pagar' | 'Despesa';
interface Movimentacao {
  id: string;
  tipo: TipoMovimentacao;
  descricao: string;
  valor: number;
  pessoa: string; // cliente ou fornecedor
  data: string; // vencimento ou data
  status: string;
  formaPagamento?: string;
}

const MovimentacoesFinanceiras = () => {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Contas a Receber
        const contasReceberSnap = await getDocs(collection(firestore, 'contasAReceber'));
        const contasReceber: Movimentacao[] = contasReceberSnap.docs.map(doc => ({
          id: doc.id,
          tipo: 'Receber',
          descricao: doc.data().descricao,
          valor: doc.data().valor,
          pessoa: doc.data().cliente,
          data: doc.data().vencimento,
          status: doc.data().status,
          formaPagamento: doc.data().formaPagamento || '',
        }));

        // Contas a Pagar
        const contasPagarSnap = await getDocs(collection(firestore, 'contasAPagar'));
        const contasPagar: Movimentacao[] = contasPagarSnap.docs.map(doc => ({
          id: doc.id,
          tipo: 'Pagar',
          descricao: doc.data().descricao,
          valor: doc.data().valor,
          pessoa: doc.data().fornecedor,
          data: doc.data().vencimento,
          status: doc.data().status,
          formaPagamento: doc.data().formaPagamento || '',
        }));

        // Despesas
        const despesasSnap = await getDocs(collection(firestore, 'despesas'));
        const despesas: Movimentacao[] = despesasSnap.docs.map(doc => ({
          id: doc.id,
          tipo: 'Despesa',
          descricao: doc.data().descricao,
          valor: doc.data().valor,
          pessoa: '-',
          data: doc.data().data,
          status: doc.data().status,
          formaPagamento: doc.data().formaPagamento || '',
        }));

        setMovimentacoes([...contasReceber, ...contasPagar, ...despesas]);
      } catch {
        setMovimentacoes([]);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);



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
        <div className={receberStyles.tabelaWrapper}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px' }}>Carregando...</div>
          ) : (
            <table className={receberStyles.tabelaContasReceber}>
              <thead>
                <tr>
                  <th>DATA</th>
                  <th>TIPO</th>
                  <th>PESSOA</th>
                  <th>DESCRIÇÃO</th>
                  <th>VALOR</th>
                  <th>FORMA PAGAMENTO</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map(mov => (
                  <tr key={mov.tipo + '-' + mov.id}>
                    <td>{mov.data}</td>
                    <td>{mov.tipo}</td>
                    <td>{mov.pessoa}</td>
                    <td>{mov.descricao}</td>
                    <td>{mov.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td>{mov.formaPagamento || '-'}</td>
                    <td>
                      <span className={
                        mov.tipo === 'Receber'
                          ? mov.status === 'Pendente' ? receberStyles.statusPendente : receberStyles.statusRecebido
                          : mov.tipo === 'Pagar'
                            ? mov.status === 'Pendente' ? styles.statusPendente : styles.statusPago
                            : mov.status === 'Pendente' ? styles.statusPendente : styles.statusPago
                      }>
                        {mov.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default MovimentacoesFinanceiras;

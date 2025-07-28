import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/financeiro/financeiro.module.css';
import contasStyles from '@/styles/admin/financeiro/contas-a-pagar.module.css';


import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { ModalAdicionarConta } from '@/components/modals/ModalAdicionarConta';
import { ModalEditarConta } from '@/components/modals/ModalEditarConta';

interface ContaPagar {
  id: string;
  vencimento: string;
  fornecedor: string;
  descricao: string;
  valor: number;
  status: 'Pendente' | 'Pago';
}

const ContasAPagar = () => {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [contaEdit, setContaEdit] = useState<ContaPagar | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContas = async () => {
      setLoading(true);
      try {
        const contasRef = collection(firestore, 'contasAPagar');
        const snapshot = await getDocs(contasRef);
        const contasList: ContaPagar[] = snapshot.docs.map(doc => ({
          id: doc.id,
          vencimento: doc.data().vencimento,
          fornecedor: doc.data().fornecedor,
          descricao: doc.data().descricao,
          valor: doc.data().valor,
          status: doc.data().status || 'Pendente',
        }));
        setContas(contasList);
      } catch (err) {
        setContas([]);
      }
      setLoading(false);
    };
    fetchContas();
  }, []);

  const saldoPago = contas
    .filter(c => c.status === 'Pago')
    .reduce((acc, c) => acc + c.valor, 0);

  const removerConta = async (id: string) => {
    try {
      await deleteDoc(doc(firestore, 'contasAPagar', id));
      setContas(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      // erro ao remover
    }
  };

  const adicionarConta = async (data: { vencimento: string; fornecedor: string; descricao: string; valor: number; status?: 'Pendente' | 'Pago' }) => {
    try {
      const docRef = await addDoc(collection(firestore, 'contasAPagar'), {
        vencimento: data.vencimento.split('-').reverse().join('/'),
        fornecedor: data.fornecedor,
        descricao: data.descricao,
        valor: data.valor,
        status: data.status || 'Pendente',
      });
      setContas(prev => [
        ...prev,
        {
          id: docRef.id,
          vencimento: data.vencimento.split('-').reverse().join('/'),
          fornecedor: data.fornecedor,
          descricao: data.descricao,
          valor: data.valor,
          status: data.status || 'Pendente',
        },
      ]);
    } catch (err) {
      // erro ao adicionar
    }
    setModalOpen(false);
  };

  const abrirModalEditar = (conta: ContaPagar) => {
    setContaEdit(conta);
    setModalEditOpen(true);
  };

  const editarConta = async (data: { vencimento: string; fornecedor: string; descricao: string; valor: number; status?: 'Pendente' | 'Pago' }) => {
    if (!contaEdit) return;
    try {
      await import('firebase/firestore').then(({ updateDoc }) =>
        updateDoc(doc(firestore, 'contasAPagar', contaEdit.id), {
          vencimento: data.vencimento.split('-').reverse().join('/'),
          fornecedor: data.fornecedor,
          descricao: data.descricao,
          valor: data.valor,
          status: data.status || 'Pendente',
        })
      );
      setContas(prev => prev.map(c =>
        c.id === contaEdit.id
          ? {
              ...c,
              vencimento: data.vencimento.split('-').reverse().join('/'),
              fornecedor: data.fornecedor,
              descricao: data.descricao,
              valor: data.valor,
              status: data.status || 'Pendente',
            }
          : c
      ));
    } catch (err) {
      // erro ao editar
    }
    setModalEditOpen(false);
    setContaEdit(null);
  };

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Financeiro &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Contas a Pagar</span>
          </span>
        </div>
        <h1 className={styles.titleFinanceiro}>Contas a Pagar</h1>
        <div className={styles.subtitleFinanceiro}>
          Visualize as suas contas pendentes e gerencie as contas a pagar da sua clínica
        </div>
        <div className={contasStyles.containerContasPagar}>
          <button className={contasStyles.btnAdicionar} onClick={() => setModalOpen(true)}>
            Adicionar conta a pagar
          </button>
          <ModalAdicionarConta
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSubmit={adicionarConta}
          />
          <ModalEditarConta
            isOpen={modalEditOpen}
            onClose={() => { setModalEditOpen(false); setContaEdit(null); }}
            onSubmit={editarConta}
            conta={contaEdit || undefined}
          />
          <div className={contasStyles.saldoBox}>
            <span className={contasStyles.saldoLabel}>Saldo pago</span>
            <span className={contasStyles.saldoValor + ' ' + contasStyles.saldoNegativo}>
              -{saldoPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          {loading ? (
            <div style={{textAlign: 'center', padding: '24px'}}>Carregando...</div>
          ) : (
            <table className={contasStyles.tabelaContas}>
              <thead>
                <tr>
                  <th>VENCIMENTO</th>
                  <th>FORNECEDOR</th>
                  <th>DESCRIÇÃO</th>
                  <th>VALOR</th>
                  <th>STATUS</th>
                  <th>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {contas.map(conta => (
                  <tr key={conta.id}>
                    <td>{conta.vencimento}</td>
                    <td>{conta.fornecedor}</td>
                    <td>{conta.descricao}</td>
                    <td>{conta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td>
                      <span className={conta.status === 'Pendente' ? contasStyles.statusPendente : contasStyles.statusPago}>
                        {conta.status}
                      </span>
                    </td>
                    <td>
                      <button className={contasStyles.btnEditar} onClick={() => abrirModalEditar(conta)}>
                        Editar
                      </button>
                      <button className={contasStyles.btnRemover} onClick={() => removerConta(conta.id)}>
                        Remover
                      </button>
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

export default ContasAPagar;

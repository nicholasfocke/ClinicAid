import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/financeiro/financeiro.module.css';
import receberStyles from '@/styles/admin/financeiro/contas-a-receber.module.css';
import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { ModalContaReceber } from '@/components/modals/ModalContaReceber';

interface ContaReceber {
  id: string;
  descricao: string;
  valor: number;
  cliente: string;
  vencimento: string;
  status: 'Pendente' | 'Recebido';
}

const ContasAReceber = () => {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);
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
        }));
        setContas(contasList);
      } catch (err) {
        setContas([]);
      }
      setLoading(false);
    };
    fetchContas();
  }, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [contaEdit, setContaEdit] = useState<ContaReceber | null>(null);
  const [search, setSearch] = useState('');

  const adicionarConta = async (data: Omit<ContaReceber, 'id'>) => {
    try {
      const docRef = await addDoc(collection(firestore, 'contasAReceber'), {
        vencimento: data.vencimento.split('-').reverse().join('/'),
        cliente: data.cliente,
        descricao: data.descricao,
        valor: data.valor,
        status: data.status,
      });
      setContas(prev => [
        ...prev,
        {
          id: docRef.id,
          vencimento: data.vencimento.split('-').reverse().join('/'),
          cliente: data.cliente,
          descricao: data.descricao,
          valor: data.valor,
          status: data.status,
        },
      ]);
    } catch (err) {
      // erro ao adicionar
    }
    setModalOpen(false);
  };

  const abrirModalEditar = (conta: ContaReceber) => {
    setContaEdit(conta);
    setModalEditOpen(true);
  };

  const editarConta = async (data: Omit<ContaReceber, 'id'>) => {
    if (!contaEdit) return;
    try {
      await import('firebase/firestore').then(({ updateDoc }) =>
        updateDoc(doc(firestore, 'contasAReceber', contaEdit.id), {
          vencimento: data.vencimento.split('-').reverse().join('/'),
          cliente: data.cliente,
          descricao: data.descricao,
          valor: data.valor,
          status: data.status,
        })
      );
      setContas(prev => prev.map(c =>
        c.id === contaEdit.id
          ? {
              ...c,
              vencimento: data.vencimento.split('-').reverse().join('/'),
              cliente: data.cliente,
              descricao: data.descricao,
              valor: data.valor,
              status: data.status,
            }
          : c
      ));
    } catch (err) {
      // erro ao editar
    }
    setModalEditOpen(false);
    setContaEdit(null);
  };

  const removerConta = async (id: string) => {
    try {
      await deleteDoc(doc(firestore, 'contasAReceber', id));
      setContas(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      // erro ao remover
    }
  };

  const contasFiltradas = contas.filter(c =>
    c.descricao.toLowerCase().includes(search.toLowerCase()) ||
    c.cliente.toLowerCase().includes(search.toLowerCase())
  );

  const saldoRecebido = contas
    .filter(c => c.status === 'Recebido')
    .reduce((acc, c) => acc + c.valor, 0);

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Financeiro &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Contas a Receber</span>
          </span>
        </div>
        <h1 className={styles.titleFinanceiro}>Contas a Receber</h1>
        <div className={styles.subtitleFinanceiro}>
          Gerencie os pagamentos pendentes que a a sua clínica deve receber
        </div>
        <div className={receberStyles.containerContasReceber}>
          <button className={receberStyles.btnAdicionarReceber} onClick={() => setModalOpen(true)}>
            Adicionar conta a receber
          </button>
          <ModalContaReceber
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSubmit={adicionarConta}
          />
          <ModalContaReceber
            isOpen={modalEditOpen}
            onClose={() => { setModalEditOpen(false); setContaEdit(null); }}
            onSubmit={editarConta}
            conta={contaEdit || undefined}
            isEdit
          />
          <div className={receberStyles.saldoBoxReceber}>
            <span className={receberStyles.saldoLabel}>Saldo recebido</span>
            <span className={receberStyles.saldoValor + ' ' + receberStyles.saldoPositivo}>
              +{saldoRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className={receberStyles.pesquisaBox}>
            <input
              type="text"
              className={receberStyles.pesquisaInput}
              placeholder="Pesquisar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {loading ? (
            <div style={{textAlign: 'center', padding: '24px'}}>Carregando...</div>
          ) : (
            <table className={receberStyles.tabelaContasReceber}>
              <thead>
                <tr>
                  <th>VENCIMENTO</th>
                  <th>CLIENTE</th>
                  <th>DESCRIÇÃO</th>
                  <th>VALOR</th>
                  <th>STATUS</th>
                  <th>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {contasFiltradas.map(conta => (
                  <tr key={conta.id}>
                    <td>{conta.vencimento}</td>
                    <td>{conta.cliente}</td>
                    <td>{conta.descricao}</td>
                    <td>{conta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td>
                      <span className={conta.status === 'Pendente' ? receberStyles.statusPendente : receberStyles.statusRecebido}>
                        {conta.status}
                      </span>
                    </td>
                    <td>
                      <button className={receberStyles.btnEditarReceber} onClick={() => abrirModalEditar(conta)}>
                        Editar
                      </button>
                      <button className={receberStyles.btnRemoverReceber} onClick={() => removerConta(conta.id)}>
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

export default ContasAReceber;

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/financeiro/financeiro.module.css';
import receberStyles from '@/styles/admin/financeiro/contas-a-receber.module.css';
import React, { useState, useEffect } from 'react';
import ConfirmationModal from '@/components/modals/ConfirmationModal';
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
  const [modalState, setModalState] = useState<{ isOpen: boolean; onConfirm: () => void }>({ isOpen: false, onConfirm: () => {} });
  const [contaIdParaExcluir, setContaIdParaExcluir] = useState<string | null>(null);
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
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [filtroModo, setFiltroModo] = useState<'mes' | 'periodo'>('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Extrai meses/anos únicos dos vencimentos
  const mesesDisponiveis = Array.from(
    new Set(
      contas.map(c => {
        // Aceita formatos dd/MM/yyyy ou yyyy-MM-dd
        let v = c.vencimento;
        if (!v) return '';
        let partes = v.includes('/') ? v.split('/') : v.split('-').reverse();
        return `${partes[1]}/${partes[2]}`;
      })
    )
  ).filter(Boolean).sort((a, b) => {
    // Ordena por ano/mês
    const [ma, aa] = a.split('/').map(Number);
    const [mb, ab] = b.split('/').map(Number);
    return aa !== ab ? aa - ab : ma - mb;
  });

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
    setContaIdParaExcluir(id);
    setModalState({
      isOpen: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(firestore, 'contasAReceber', id));
          setContas(prev => prev.filter(c => c.id !== id));
        } catch (err) {
          // erro ao remover
        }
        setModalState({ isOpen: false, onConfirm: () => {} });
        setContaIdParaExcluir(null);
      },
    });
  };

  const [filtroStatus, setFiltroStatus] = useState<'Pendente' | 'Recebido' | ''>('');

  const contasFiltradas = contas.filter(c => {
    const matchSearch =
      c.descricao.toLowerCase().includes(search.toLowerCase()) ||
      c.cliente.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filtroStatus ? c.status === filtroStatus : true;

    if (filtroModo === 'mes') {
      if (!mesSelecionado) return matchSearch && matchStatus;
      // Filtra pelo mês/ano do vencimento
      let v = c.vencimento;
      if (!v) return false;
      let partes = v.includes('/') ? v.split('/') : v.split('-').reverse();
      const mesAno = `${partes[1]}/${partes[2]}`;
      return matchSearch && matchStatus && mesAno === mesSelecionado;
    } else {
      // Filtro por período
      if (!dataInicio && !dataFim) return matchSearch && matchStatus;
      let v = c.vencimento;
      if (!v) return false;
      // Converte para yyyy-MM-dd
      let partes = v.includes('/') ? v.split('/') : v.split('-').reverse();
      const dataPadrao = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
      if (dataInicio && dataFim) {
        return matchSearch && matchStatus && dataPadrao >= dataInicio && dataPadrao <= dataFim;
      } else if (dataInicio) {
        return matchSearch && matchStatus && dataPadrao >= dataInicio;
      } else if (dataFim) {
        return matchSearch && matchStatus && dataPadrao <= dataFim;
      }
      return matchSearch && matchStatus;
    }
  });

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
              <button
                type="button"
                className={receberStyles.filtroToggleBtn}
                style={{ fontWeight: filtroModo === 'mes' ? 'bold' : 'normal' }}
                onClick={() => setFiltroModo('mes')}
              >
                Mês/Ano
              </button>
              <button
                type="button"
                className={receberStyles.filtroToggleBtn}
                style={{ fontWeight: filtroModo === 'periodo' ? 'bold' : 'normal' }}
                onClick={() => setFiltroModo('periodo')}
              >
                Período
              </button>
            </div>
            <select
              className={receberStyles.selectStatusExtrato}
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value as 'Pendente' | 'Recebido' | '')}
              style={{ marginLeft: 12 }}
            >
              <option value="">Status</option>
              <option value="Pendente">Pendente</option>
              <option value="Recebido">Recebido</option>
            </select>
            {filtroModo === 'mes' ? (
              <select
                className={receberStyles.selectMesExtrato}
                value={mesSelecionado}
                onChange={e => setMesSelecionado(e.target.value)}
                style={{ marginLeft: 12 }}
              >
                <option value="">Todos os meses</option>
                {mesesDisponiveis.map(mes => (
                  <option key={mes} value={mes}>{mes}</option>
                ))}
              </select>
            ) : (
              <>
                <input
                  type="date"
                  className={receberStyles.inputPeriodoExtrato}
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  style={{ marginLeft: 12 }}
                />
                <span style={{ margin: '0 4px' }}>até</span>
                <input
                  type="date"
                  className={receberStyles.inputPeriodoExtrato}
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                />
              </>
            )}
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
                    <td className={receberStyles.acoesTd}>
                      <button
                        className={receberStyles.iconBtn + ' ' + receberStyles.iconEdit}
                        title="Editar"
                        onClick={() => abrirModalEditar(conta)}
                        aria-label="Editar"
                      >
                        {/* Feather Icon: edit (caneta) */}
                        <svg width="22" height="22" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M12 20h9"/>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/>
                        </svg>
                      </button>
                      <button
                        className={receberStyles.iconBtn + ' ' + receberStyles.iconDelete}
                        title="Excluir"
                        onClick={() => removerConta(conta.id)}
                        aria-label="Excluir"
                      >
                        {/* Feather Icon: trash (lixeira) */}
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
      <ConfirmationModal
        isOpen={modalState.isOpen}
        message="Você tem certeza que deseja excluir esta conta a receber?"
        onConfirm={modalState.onConfirm}
        onCancel={() => {
          setModalState({ isOpen: false, onConfirm: () => {} });
          setContaIdParaExcluir(null);
        }}
      />
    </ProtectedRoute>
  );
};

export default ContasAReceber;

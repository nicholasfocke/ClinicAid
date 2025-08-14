import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/financeiro/financeiro.module.css';
import contasStyles from '@/styles/admin/financeiro/contas-a-pagar.module.css';


import React, { useState, useEffect } from 'react';
import ConfirmationModal from '@/components/modals/ConfirmationModal';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { ModalAdicionarConta } from '@/components/modals/ModalAdicionarConta';
import { gerarRelatorioPDF } from '@/utils/gerarRelatorio';
import { gerarExtratoContasPagar } from '@/utils/gerarContasPagar';

function formatarMoeda(valor: string) {
  // Remove tudo que não for dígito
  const onlyDigits = valor.replace(/\D/g, '');
  // Converte para centavos
  const number = Number(onlyDigits) / 100;
  if (isNaN(number)) return '';
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
import { ModalEditarConta } from '@/components/modals/ModalEditarConta';

interface ContaPagar {
  id: string;
  vencimento: string;
  fornecedor: string;
  descricao: string;
  valor: number;
  status: 'Pendente' | 'Pago';
  formaPagamento?: 'Pix' | 'Boleto bancário' | 'Cartão' | 'Transferência' | '';
}

const ContasAPagar = () => {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [contaEdit, setContaEdit] = useState<ContaPagar | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<{ isOpen: boolean; onConfirm: () => void }>({ isOpen: false, onConfirm: () => {} });
  const [contaIdParaExcluir, setContaIdParaExcluir] = useState<string | null>(null);

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


  const [search, setSearch] = useState('');
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [filtroModo, setFiltroModo] = useState<'mes' | 'periodo'>('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Extrai meses/anos únicos dos vencimentos
  const mesesDisponiveis = Array.from(
    new Set(
      contas.map(c => {
        let v = c.vencimento;
        if (!v) return '';
        let partes = v.includes('/') ? v.split('/') : v.split('-').reverse();
        return `${partes[1]}/${partes[2]}`;
      })
    )
  ).filter(Boolean).sort((a, b) => {
    const [ma, aa] = a.split('/').map(Number);
    const [mb, ab] = b.split('/').map(Number);
    return aa !== ab ? aa - ab : ma - mb;
  });

  const [filtroStatus, setFiltroStatus] = useState<'Pendente' | 'Pago' | ''>('');

  const contasFiltradas = contas.filter(c => {
    const matchSearch =
      c.descricao.toLowerCase().includes(search.toLowerCase()) ||
      c.fornecedor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filtroStatus ? c.status === filtroStatus : true;

    if (filtroModo === 'mes') {
      if (!mesSelecionado) return matchSearch && matchStatus;
      let v = c.vencimento;
      if (!v) return false;
      let partes = v.includes('/') ? v.split('/') : v.split('-').reverse();
      const mesAno = `${partes[1]}/${partes[2]}`;
      return matchSearch && matchStatus && mesAno === mesSelecionado;
    } else {
      if (!dataInicio && !dataFim) return matchSearch && matchStatus;
      let v = c.vencimento;
      if (!v) return false;
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

  const saldoPago = contas
    .filter(c => c.status === 'Pago')
    .reduce((acc, c) => acc + c.valor, 0);

  const baixarExtrato = async () => {
    const contasExtrato = contas.filter(c => {
      if (c.status !== 'Pago') return false;
      let v = c.vencimento;
      if (!v) return false;
      let partes = v.includes('/') ? v.split('/') : v.split('-').reverse();
      if (filtroModo === 'mes') {
        if (!mesSelecionado) return true;
        const mesAno = `${partes[1]}/${partes[2]}`;
        return mesAno === mesSelecionado;
      } else {
        const dataPadrao = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        if (dataInicio && dataFim) return dataPadrao >= dataInicio && dataPadrao <= dataFim;
        if (dataInicio) return dataPadrao >= dataInicio;
        if (dataFim) return dataPadrao <= dataFim;
        return true;
      }
    });

    const nenhumFiltroAtivo = !mesSelecionado && !dataInicio && !dataFim && !search && !filtroStatus;
    if (contasExtrato.length === 0 && nenhumFiltroAtivo) {
      alert('Não é possível gerar o extrato: não há movimentações pagas e nenhum filtro ativo.');
      return;
    }
    // Se filtro está ativo e não há resultado, também não permite baixar
    const filtroAtivo = mesSelecionado || dataInicio || dataFim || search || filtroStatus;
    if (contasExtrato.length === 0 && filtroAtivo) {
      alert('Não há movimentações pagas para o filtro selecionado.');
      return;
    }

    const dados = contasExtrato.map(c => [
      c.vencimento,
      c.fornecedor,
      c.descricao,
      c.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    ]);

    await gerarExtratoContasPagar({
      titulo: 'Extrato de Contas Pagas',
      colunas: ['Vencimento', 'Fornecedor', 'Descrição', 'Valor'],
      dados,
      nomeArquivo: 'extrato_contas_pagas.pdf',
    });
  };

  const removerConta = async (id: string) => {
    setContaIdParaExcluir(id);
    setModalState({
      isOpen: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(firestore, 'contasAPagar', id));
          setContas(prev => prev.filter(c => c.id !== id));
        } catch (err) {
          // erro ao remover
        }
        setModalState({ isOpen: false, onConfirm: () => {} });
        setContaIdParaExcluir(null);
      },
    });
  };

  const adicionarConta = async (data: { vencimento: string; fornecedor: string; descricao: string; valor: number; status?: 'Pendente' | 'Pago'; formaPagamento?: 'Pix' | 'Boleto bancário' | 'Cartão' | 'Transferência' | '' }) => {
    try {
      const docRef = await addDoc(collection(firestore, 'contasAPagar'), {
        vencimento: data.vencimento.split('-').reverse().join('/'),
        fornecedor: data.fornecedor,
        descricao: data.descricao,
        valor: data.valor,
        status: data.status || 'Pendente',
        formaPagamento: data.formaPagamento || '',
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
          formaPagamento: data.formaPagamento || '',
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

  const editarConta = async (data: { vencimento: string; fornecedor: string; descricao: string; valor: number; status?: 'Pendente' | 'Pago'; formaPagamento?: 'Pix' | 'Boleto bancário' | 'Cartão' | 'Transferência' | '' }) => {
    if (!contaEdit) return;
    try {
      await import('firebase/firestore').then(({ updateDoc }) =>
        updateDoc(doc(firestore, 'contasAPagar', contaEdit.id), {
          vencimento: data.vencimento.split('-').reverse().join('/'),
          fornecedor: data.fornecedor,
          descricao: data.descricao,
          valor: data.valor,
          status: data.status || 'Pendente',
          formaPagamento: data.formaPagamento || '',
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
              formaPagamento: data.formaPagamento || '',
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
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className={contasStyles.btnAdicionar} onClick={() => setModalOpen(true)}>
              Adicionar conta a pagar
            </button>
            <button className={contasStyles.btnExtrato} onClick={baixarExtrato}>
              Baixar extrato
            </button>
          </div>
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
          <div className={contasStyles.pesquisaBox}>
            <input
              type="text"
              className={contasStyles.pesquisaInput}
              placeholder="Pesquisar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
              <button
                type="button"
                className={contasStyles.filtroToggleBtn}
                style={{ fontWeight: filtroModo === 'mes' ? 'bold' : 'normal' }}
                onClick={() => setFiltroModo('mes')}
              >
                Mês/Ano
              </button>
              <button
                type="button"
                className={contasStyles.filtroToggleBtn}
                style={{ fontWeight: filtroModo === 'periodo' ? 'bold' : 'normal' }}
                onClick={() => setFiltroModo('periodo')}
              >
                Período
              </button>
            </div>
            <select
              className={contasStyles.selectStatusExtrato}
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value as 'Pendente' | 'Pago' | '')}
              style={{ marginLeft: 12 }}
            >
              <option value="">Status</option>
              <option value="Pendente">Pendente</option>
              <option value="Pago">Paga</option>
            </select>
            {filtroModo === 'mes' ? (
              <select
                className={contasStyles.selectMesExtrato}
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
                  className={contasStyles.inputPeriodoExtrato}
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  style={{ marginLeft: 12 }}
                />
                <span style={{ margin: '0 4px' }}>até</span>
                <input
                  type="date"
                  className={contasStyles.inputPeriodoExtrato}
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                />
              </>
            )}
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
                  <th>FORMA DE PAGAMENTO</th>
                  <th>STATUS</th>
                  <th>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {contasFiltradas.map(conta => (
                  <tr key={conta.id}>
                    <td>{conta.vencimento}</td>
                    <td>{conta.fornecedor}</td>
                    <td>{conta.descricao}</td>
                    <td>{conta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td>{conta.formaPagamento || '-'}</td>
                    <td>
                      <span className={conta.status === 'Pendente' ? contasStyles.statusPendente : contasStyles.statusPago}>
                        {conta.status}
                      </span>
                    </td>
                    <td className={contasStyles.acoesTd}>
                      <button
                        className={contasStyles.iconBtn + ' ' + contasStyles.iconEdit}
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
                        className={contasStyles.iconBtn + ' ' + contasStyles.iconDelete}
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
        message="Você tem certeza que deseja excluir esta conta a pagar?"
        onConfirm={modalState.onConfirm}
        onCancel={() => {
          setModalState({ isOpen: false, onConfirm: () => {} });
          setContaIdParaExcluir(null);
        }}
      />
    </ProtectedRoute>
  );
};

export default ContasAPagar;

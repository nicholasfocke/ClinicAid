import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import despesasStyles from '@/styles/admin/financeiro/despesas.module.css';
import React, { useState, useEffect } from 'react';
import ConfirmationModal from '@/components/modals/ConfirmationModal';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { gerarRelatorioPDF } from '@/utils/gerarRelatorio';

interface Despesa {
  id: string;
  descricao: string;
  categoria: string;
  data: string;
  valor: number;
  status: 'Pendente' | 'Paga';
}

const categorias = ['Compras', 'Infraestrutura', 'Serviços', 'Outros'];
const statusList = ['Pendente', 'Paga'];

const ModalDespesa = ({ isOpen, onClose, onSubmit, despesa, isEdit }: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Despesa, 'id'>) => void;
  despesa?: Despesa;
  isEdit?: boolean;
}) => {
  // Função para formatar moeda (R$ 1.000,00)
  function formatarMoeda(valor: string) {
    const onlyDigits = valor.replace(/\D/g, '');
    const number = Number(onlyDigits) / 100;
    if (isNaN(number)) return '';
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  const [descricao, setDescricao] = useState(despesa?.descricao || '');
  const [categoria, setCategoria] = useState(despesa?.categoria || '');
  const [data, setData] = useState(despesa?.data ? despesa.data.split('/').reverse().join('-') : '');
  const [valor, setValor] = useState(despesa?.valor !== undefined ? formatarMoeda(String(despesa.valor)) : '');
  const [status, setStatus] = useState<Despesa['status']>(despesa?.status || 'Pendente');

  React.useEffect(() => {
    if (!isOpen) {
      setDescricao('');
      setCategoria('');
      setData('');
      setValor('');
      setStatus('Pendente');
    } else {
      setDescricao(despesa?.descricao || '');
      setCategoria(despesa?.categoria || '');
      setData(despesa?.data ? despesa.data.split('/').reverse().join('-') : '');
      setValor(despesa?.valor !== undefined ? formatarMoeda(String(despesa.valor)) : '');
      setStatus(despesa?.status || 'Pendente');
    }
  }, [isOpen, despesa]);

  if (!isOpen) return null;
  return (
    <div className={despesasStyles.modalOverlay}>
      <div className={despesasStyles.modalContent}>
        <div className={despesasStyles.modalTitle}>{isEdit ? 'Editar despesa' : 'Adicionar despesa'}</div>
        <form className={despesasStyles.modalForm} onSubmit={e => {
          e.preventDefault();
          if (valor === '' || Number(valor.replace(/[^\d]/g, '')) === 0) return;
          // Extrai o valor numérico da string formatada
          const valorNumerico = Number(valor.replace(/[^\d]/g, '')) / 100;
          onSubmit({ descricao, categoria, data, valor: valorNumerico, status });
        }}>
          <input type="text" placeholder="Descrição" value={descricao} onChange={e => setDescricao(e.target.value)} required />
          <select value={categoria} onChange={e => setCategoria(e.target.value)} required>
            <option value="">Categoria</option>
            {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <input type="date" value={data} onChange={e => setData(e.target.value)} required />
          <input
            type="text"
            inputMode="numeric"
            placeholder="R$ 0,00"
            value={valor}
            onChange={e => setValor(formatarMoeda(e.target.value))}
            required
            maxLength={20}
            autoComplete="off"
          />
          <select value={status} onChange={e => setStatus(e.target.value as Despesa['status'])} required>
            {statusList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className={despesasStyles.modalActions}>
            <button type="button" className={despesasStyles.modalBtnCancelar} onClick={onClose}>Cancelar</button>
            <button type="submit" className={despesasStyles.modalBtnSalvar}>Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Despesas = () => {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [despesaEdit, setDespesaEdit] = useState<Despesa | null>(null);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  // Filtro extrato: modo, mês/ano, período
  const [filtroModo, setFiltroModo] = useState<'mes' | 'periodo'>('mes');
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [modalState, setModalState] = useState<{ isOpen: boolean; onConfirm: () => void }>({ isOpen: false, onConfirm: () => {} });
  const [despesaIdParaExcluir, setDespesaIdParaExcluir] = useState<string | null>(null);

  // Inicializa vazio, tudo será criado manualmente pelo usuário
  useEffect(() => {
    const fetchDespesas = async () => {
      try {
        const despesasRef = collection(firestore, 'despesas');
        const snapshot = await getDocs(despesasRef);
        const despesasList: Despesa[] = snapshot.docs.map(doc => ({
          id: doc.id,
          descricao: doc.data().descricao,
          categoria: doc.data().categoria,
          data: doc.data().data,
          valor: doc.data().valor,
          status: doc.data().status,
        }));
        setDespesas(despesasList);
      } catch (err) {
        setDespesas([]);
      }
    };
    fetchDespesas();
  }, []);

  const adicionarDespesa = async (data: Omit<Despesa, 'id'>) => {
    try {
      const docRef = await addDoc(collection(firestore, 'despesas'), {
        descricao: data.descricao,
        categoria: data.categoria,
        data: data.data.split('-').reverse().join('/'),
        valor: data.valor,
        status: data.status,
      });
      setDespesas(prev => [
        ...prev,
        {
          id: docRef.id,
          descricao: data.descricao,
          categoria: data.categoria,
          data: data.data.split('-').reverse().join('/'),
          valor: data.valor,
          status: data.status,
        },
      ]);
    } catch (err) {
      // erro ao adicionar
    }
    setModalOpen(false);
  };

  const abrirModalEditar = (despesa: Despesa) => {
    setDespesaEdit(despesa);
    setModalEditOpen(true);
  };

  const editarDespesa = async (data: Omit<Despesa, 'id'>) => {
    if (!despesaEdit) return;
    try {
      await import('firebase/firestore').then(({ updateDoc }) =>
        updateDoc(doc(firestore, 'despesas', despesaEdit.id), {
          descricao: data.descricao,
          categoria: data.categoria,
          data: data.data.split('-').reverse().join('/'),
          valor: data.valor,
          status: data.status,
        })
      );
      setDespesas(prev => prev.map(d =>
        d.id === despesaEdit.id
          ? { ...d, ...data, data: data.data.split('-').reverse().join('/') }
          : d
      ));
    } catch (err) {
      // erro ao editar
    }
    setModalEditOpen(false);
    setDespesaEdit(null);
  };

  const removerDespesa = async (id: string) => {
    setDespesaIdParaExcluir(id);
    setModalState({
      isOpen: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(firestore, 'despesas', id));
          setDespesas(prev => prev.filter(d => d.id !== id));
        } catch (err) {
          // erro ao remover
        }
        setModalState({ isOpen: false, onConfirm: () => {} });
        setDespesaIdParaExcluir(null);
      },
    });
  };

  // Extrai meses/anos únicos das datas das despesas
  const mesesDisponiveis = Array.from(
    new Set(
      despesas.map(d => {
        let v = d.data;
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

  const despesasFiltradas = despesas.filter(d => {
    const matchSearch =
      d.descricao.toLowerCase().includes(search.toLowerCase()) ||
      d.categoria.toLowerCase().includes(search.toLowerCase());
    const matchCategoria = filtroCategoria ? d.categoria === filtroCategoria : true;
    const matchStatus = filtroStatus ? d.status === filtroStatus : true;

    let matchPeriodo = true;
    if (filtroModo === 'mes') {
      if (mesSelecionado) {
        let v = d.data;
        if (!v) return false;
        let partes = v.includes('/') ? v.split('/') : v.split('-').reverse();
        const mesAno = `${partes[1]}/${partes[2]}`;
        matchPeriodo = mesAno === mesSelecionado;
      }
    } else {
      // Filtro por período
      if (dataInicio || dataFim) {
        let v = d.data;
        if (!v) return false;
        let partes = v.includes('/') ? v.split('/') : v.split('-').reverse();
        const dataPadrao = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        if (dataInicio && dataFim) {
          matchPeriodo = dataPadrao >= dataInicio && dataPadrao <= dataFim;
        } else if (dataInicio) {
          matchPeriodo = dataPadrao >= dataInicio;
        } else if (dataFim) {
          matchPeriodo = dataPadrao <= dataFim;
        }
      }
    }
    return matchSearch && matchCategoria && matchStatus && matchPeriodo;
  });

  const totalPago = despesas
    .filter(d => d.status === 'Paga')
    .reduce((acc, d) => acc + d.valor, 0);

  const baixarExtrato = async () => {
    const despesasExtrato = despesas.filter(d => {
      if (d.status !== 'Paga') return false;
      let v = d.data;
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

    if (despesasExtrato.length === 0) return;

    const dados = despesasExtrato.map(d => [
      d.data,
      d.categoria,
      d.descricao,
      d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    ]);

    await gerarRelatorioPDF({
      titulo: 'Extrato de Despesas Pagas',
      colunas: ['Data', 'Categoria', 'Descrição', 'Valor'],
      dados,
      nomeArquivo: 'extrato_despesas_pagas.pdf',
    });
  };

  return (
    <ProtectedRoute>
      <div>
        <div className={despesasStyles.headerDespesas}>
          <div className={breadcrumbStyles.breadcrumbWrapper}>
            <span className={breadcrumbStyles.breadcrumb}>
              Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Financeiro &gt; </span>
              <span className={breadcrumbStyles.breadcrumbActive}>Despesas</span>
            </span>
          </div>
          <h1 className={despesasStyles.titleDespesas}>Despesas</h1>
          <div className={despesasStyles.subtitleDespesas}>Visualize e gerencie as despesas da sua clínica</div>
        </div>
        <div className={despesasStyles.containerDespesasGeral}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className={despesasStyles.btnAdicionarDespesa} onClick={() => setModalOpen(true)}>
              + Adicionar despesa
            </button>
            <button className={despesasStyles.btnExtratoDespesa} onClick={baixarExtrato}>
              Baixar extrato
            </button>
          </div>
          <ModalDespesa
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSubmit={adicionarDespesa}
          />
          <ModalDespesa
            isOpen={modalEditOpen}
            onClose={() => { setModalEditOpen(false); setDespesaEdit(null); }}
            onSubmit={editarDespesa}
            despesa={despesaEdit || undefined}
            isEdit
          />
          <div className={despesasStyles.saldoBox}>
            <span className={despesasStyles.saldoLabel}>Total pago</span>
            <span className={despesasStyles.saldoValor + ' ' + despesasStyles.saldoNegativo}>
              -{totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className={despesasStyles.filtrosBox}>
            <input
              type="text"
              className={despesasStyles.pesquisaInput}
              placeholder="Pesquisar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginRight: 8 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                className={despesasStyles.filtroToggleBtn}
                style={{ fontWeight: filtroModo === 'mes' ? 'bold' : 'normal' }}
                onClick={() => setFiltroModo('mes')}
              >
                Mês/Ano
              </button>
              <button
                type="button"
                className={despesasStyles.filtroToggleBtn}
                style={{ fontWeight: filtroModo === 'periodo' ? 'bold' : 'normal' }}
                onClick={() => setFiltroModo('periodo')}
              >
                Período
              </button>
              {filtroModo === 'mes' && (
                <select
                  className={despesasStyles.selectMesExtrato}
                  value={mesSelecionado}
                  onChange={e => setMesSelecionado(e.target.value)}
                  style={{ minWidth: 120, marginLeft: 8 }}
                >
                  <option value="">Todos os meses</option>
                  {mesesDisponiveis.map(mes => (
                    <option key={mes} value={mes}>{mes}</option>
                  ))}
                </select>
              )}
              {filtroModo === 'periodo' && (
                <>
                  <select
                    className={despesasStyles.selectMesExtrato}
                    value={mesSelecionado}
                    disabled
                    style={{ minWidth: 120, marginLeft: 8, background: '#f8fafc', color: '#888', cursor: 'not-allowed' }}
                  >
                    <option value="">Todos os meses</option>
                  </select>
                  <input
                    type="date"
                    className={despesasStyles.inputPeriodoExtrato}
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    style={{ marginLeft: 8 }}
                  />
                  <span style={{ margin: '0 4px' }}>até</span>
                  <input
                    type="date"
                    className={despesasStyles.inputPeriodoExtrato}
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                  />
                </>
              )}
            </div>
            <select
              className={despesasStyles.selectStatusExtrato}
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              style={{ marginLeft: 8 }}
            >
              <option value="">Status</option>
              {statusList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              className={despesasStyles.selectCategoriaExtrato}
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              style={{ marginLeft: 8 }}
            >
              <option value="">Categoria</option>
              {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            {/* Removido select duplicado de mês */}
          </div>
          <table className={despesasStyles.tabelaDespesas}>
            <thead>
              <tr>
                <th>DATA</th>
                <th>CATEGORIA</th>
                <th>DESCRIÇÃO</th>
                <th>VALOR</th>
                <th>STATUS</th>
                <th>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {despesasFiltradas.map(despesa => (
                <tr key={despesa.id}>
                  <td>{despesa.data}</td>
                  <td>{despesa.categoria}</td>
                  <td>{despesa.descricao}</td>
                  <td>{despesa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td>
                    <span className={despesa.status === 'Pendente' ? despesasStyles.statusPendente : despesasStyles.statusPaga}>
                      {despesa.status}
                    </span>
                  </td>
                  <td className={despesasStyles.acoesTd}>
                    <button
                      className={despesasStyles.iconBtn + ' ' + despesasStyles.iconEdit}
                      title="Editar"
                      onClick={() => abrirModalEditar(despesa)}
                      aria-label="Editar"
                    >
                      {/* Feather Icon: edit (caneta) */}
                      <svg width="22" height="22" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/>
                      </svg>
                    </button>
                    <button
                      className={despesasStyles.iconBtn + ' ' + despesasStyles.iconDelete}
                      title="Excluir"
                      onClick={() => removerDespesa(despesa.id)}
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
        </div>
      </div>
      <ConfirmationModal
        isOpen={modalState.isOpen}
        message="Você tem certeza que deseja excluir esta despesa?"
        onConfirm={modalState.onConfirm}
        onCancel={() => {
          setModalState({ isOpen: false, onConfirm: () => {} });
          setDespesaIdParaExcluir(null);
        }}
      />
    </ProtectedRoute>
  );
};

export default Despesas;

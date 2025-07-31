import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import despesasStyles from '@/styles/admin/financeiro/despesas.module.css';
import React, { useState, useEffect } from 'react';
import ConfirmationModal from '@/components/modals/ConfirmationModal';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

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
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
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

  const despesasFiltradas = despesas.filter(d =>
    (d.descricao.toLowerCase().includes(search.toLowerCase()) ||
     d.categoria.toLowerCase().includes(search.toLowerCase())) &&
    (filtroCategoria ? d.categoria === filtroCategoria : true) &&
    (filtroStatus ? d.status === filtroStatus : true) &&
    (filtroPeriodo ? d.data === filtroPeriodo.split('-').reverse().join('/') : true)
  );

  const totalPago = despesas
    .filter(d => d.status === 'Paga')
    .reduce((acc, d) => acc + d.valor, 0);

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
          <button className={despesasStyles.btnAdicionarDespesa} onClick={() => setModalOpen(true)}>
            + Adicionar despesa
          </button>
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
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
              <option value="">Categoria</option>
              {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <input type="month" value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} />
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="">Status</option>
              {statusList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className={despesasStyles.pesquisaBox}>
              <input
                type="text"
                className={despesasStyles.pesquisaInput}
                placeholder="Pesquisar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
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

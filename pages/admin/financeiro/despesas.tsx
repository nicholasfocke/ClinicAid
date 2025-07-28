import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import despesasStyles from '@/styles/admin/financeiro/despesas.module.css';
import React, { useState, useEffect } from 'react';
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
  const [descricao, setDescricao] = useState(despesa?.descricao || '');
  const [categoria, setCategoria] = useState(despesa?.categoria || '');
  const [data, setData] = useState(despesa?.data ? despesa.data.split('/').reverse().join('-') : '');
  const [valor, setValor] = useState(despesa?.valor || 0);
  const [status, setStatus] = useState<Despesa['status']>(despesa?.status || 'Pendente');

  React.useEffect(() => {
    if (isOpen) {
      setDescricao(despesa?.descricao || '');
      setCategoria(despesa?.categoria || '');
      setData(despesa?.data ? despesa.data.split('/').reverse().join('-') : '');
      setValor(despesa?.valor || 0);
      setStatus(despesa?.status || 'Pendente');
    }
  }, [isOpen, despesa]);

  if (!isOpen) return null;
  return (
    <div className={despesasStyles.modalOverlay}>
      <div className={despesasStyles.modalContent}>
        <div className={despesasStyles.modalTitle}>{isEdit ? 'Editar despesa' : 'Adicionar despesa'}</div>
        <form className={despesasStyles.modalForm} onSubmit={e => {e.preventDefault(); onSubmit({ descricao, categoria, data, valor, status }); }}>
          <input type="text" placeholder="Descrição" value={descricao} onChange={e => setDescricao(e.target.value)} required />
          <select value={categoria} onChange={e => setCategoria(e.target.value)} required>
            <option value="">Categoria</option>
            {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <input type="date" value={data} onChange={e => setData(e.target.value)} required />
          <input type="number" min={0} step={0.01} placeholder="Valor" value={valor} onChange={e => setValor(Number(e.target.value))} required />
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
    try {
      await deleteDoc(doc(firestore, 'despesas', id));
      setDespesas(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      // erro ao remover
    }
  };

  const despesasFiltradas = despesas.filter(d =>
    (d.descricao.toLowerCase().includes(search.toLowerCase()) ||
     d.categoria.toLowerCase().includes(search.toLowerCase())) &&
    (filtroCategoria ? d.categoria === filtroCategoria : true) &&
    (filtroStatus ? d.status === filtroStatus : true) &&
    (filtroPeriodo ? d.data === filtroPeriodo.split('-').reverse().join('/') : true)
  );

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
                  <td>
                    <button className={despesasStyles.btnEditarDespesa} onClick={() => abrirModalEditar(despesa)}>
                      Editar
                    </button>
                    <button className={despesasStyles.btnRemoverDespesa} onClick={() => removerDespesa(despesa.id)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Despesas;

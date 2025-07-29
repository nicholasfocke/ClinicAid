import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/medico/medicos.module.css';
import tableStyles from '@/styles/admin/cadastros/formapagamentos/formasPagamento.module.css';
import modalStyles from '@/styles/admin/cadastros/modal.module.css';
import { buscarFormasPagamento, criarFormaPagamento, excluirFormaPagamento, atualizarFormaPagamento, } from '@/functions/formasPagamentosFunctions';
import StickyFooter from '@/components/StickyFooter';
import ConfirmationModal from '@/components/modals/ConfirmationModal';

interface FormaPagamento {
  id: string;
  nome: string;
  taxa: number;
}

interface User {
  uid: string;
  email: string;
}

const FormasPagamento = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ nome: string; taxa: number }>({ nome: '', taxa: 0 });
  const [newForma, setNewForma] = useState<{ nome: string; taxa: number }>({ nome: '', taxa: 0 });
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allSelected = formas.length > 0 && selectedIds.length === formas.length;
  const [modalState, setModalState] = useState({ isOpen: false, onConfirm: () => {} });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      try {
        if (currentUser) {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email || '',
          });
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setError('Erro ao verificar autenticação.');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchData = async () => {
      const docs = await buscarFormasPagamento();
      setFormas(docs as FormaPagamento[]);
    };
    fetchData();
  }, []);

  const filteredFormas = formas.filter(f =>
    f.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = filteredFormas.length;
  const paginatedFormas = filteredFormas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startEdit = (f: FormaPagamento) => {
    setEditingId(f.id);
    setFormData({ nome: f.nome, taxa: f.taxa });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'taxa' ? Number(value) : value }));
  };

  const saveEdit = async (id: string) => {
    const nomeTrim = formData.nome.trim();
    if (!nomeTrim) {
      setError('O nome não pode estar vazio.');
      return;
    }
    await atualizarFormaPagamento(id, { nome: nomeTrim, taxa: formData.taxa });
    setFormas(prev => prev.map(f => (f.id === id ? { id, ...formData } : f)));
    setEditingId(null);
    setError(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleNewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewForma(prev => ({ ...prev, [name]: name === 'taxa' ? Number(value) : value }));
  };

  const createForma = async () => {
    const nomeTrim = newForma.nome.trim();
    if (!nomeTrim) {
      setError('O nome não pode estar vazio.');
      return;
    }
    await criarFormaPagamento({ nome: nomeTrim, taxa: newForma.taxa });
    setFormas(prev => [...prev, { id: Date.now().toString(), nome: nomeTrim, taxa: newForma.taxa }]);
    setShowModal(false);
    setNewForma({ nome: '', taxa: 0 });
    setError(null);
  };

  const handleDelete = (id: string) => {
    const confirmAction = async () => {
      try {
        await excluirFormaPagamento(id);
        setFormas(prev => prev.filter(p => p.id !== id));
      } catch (error) {
        setError('Erro ao excluir forma de pagamento.');
      }
      setModalState({ isOpen: false, onConfirm: () => {} });
    };

    setModalState({
      isOpen: true,
      onConfirm: confirmAction,
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(formas.map(f => f.id));
    }
  };

  const deleteSelected = async () => {
    const confirmDelete = window.confirm('Deseja excluir as formas selecionadas?');
    if (!confirmDelete) return;
    for (const id of selectedIds) {
      await excluirFormaPagamento(id);
    }
    setFormas(prev => prev.filter(f => !selectedIds.includes(f.id)));
    setSelectedIds([]);
  };

  return (
    <>
      <div className={layoutStyles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Cadastros &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Formas de pagamentos</span>
          </span>
        </div>
        <h1 className={tableStyles.titleFormasPagamento}>Formas de Pagamento</h1>
        <div className={tableStyles.subtitleFormasPagamento}>Lista de formas de pagamento cadastradas</div>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        <div className={tableStyles.topBar}>
          <div className={layoutStyles.actionButtonsWrapper}>
            <button className={layoutStyles.buttonAdicionar} onClick={() => setShowModal(true)}>
              + Adicionar forma de pagamento
            </button>
            {selectedIds.length > 0 && (
              <button
                className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`}
                onClick={deleteSelected}
              >
                Excluir selecionados
              </button>
            )}
          </div>

          <div className={tableStyles.searchContainer}>
            <input
              type="text"
              placeholder="🔍 Pesquisar forma de pagamento"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={tableStyles.searchInput}
            />
          </div>
        </div>
        <div className={tableStyles.formasPagamentoTableWrapper}>
        <StickyFooter
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
          <table className={tableStyles.formasPagamentoTable}>
            <thead>
              <tr>
                <th className={tableStyles.checkboxHeader}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
                <th>NOME</th>
                <th>TAXA (%)</th>
                <th>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFormas.map(f => (
                <tr key={f.id}>
                  <td className={tableStyles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(f.id)}
                      onChange={() => toggleSelect(f.id)}
                    />
                  </td>
                  {editingId === f.id ? (
                    <>
                      <td>
                        <input name="nome" value={formData.nome} onChange={handleChange} />
                      </td>
                      <td>
                        <input name="taxa" type="number" step="0.5" value={formData.taxa} onChange={handleChange} />
                      </td>
                      <td>
                        <button className={tableStyles.buttonAcao} onClick={() => saveEdit(f.id)}>Salvar</button>
                        <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={cancelEdit}>Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{f.nome}</td>
                      <td>{f.taxa}</td>
                      <td className={tableStyles.acoesTd}>
                        <button
                          className={tableStyles.iconBtn + ' ' + tableStyles.iconEdit}
                          title="Editar"
                          onClick={() => startEdit(f)}
                          aria-label="Editar"
                        >
                          {/* Feather Icon: edit (caneta) */}
                          <svg width="22" height="22" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/>
                          </svg>
                        </button>
                        <button
                          className={tableStyles.iconBtn + ' ' + tableStyles.iconDelete}
                          title="Excluir"
                          onClick={() => handleDelete(f.id)}
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
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className={modalStyles.overlay} onClick={() => setShowModal(false)}>
          <div className={modalStyles.modal} onClick={e => e.stopPropagation()}>
            <button className={modalStyles.closeButton} onClick={() => setShowModal(false)}>
              X
            </button>
            <h3>Nova Forma de Pagamento</h3>
            <label htmlFor="nome" className={modalStyles.label}>Nome</label>
            <input
              name="nome"
              className={modalStyles.input}
              value={newForma.nome}
              onChange={handleNewChange}
            />
            <label htmlFor="taxa" className={modalStyles.label}>Taxa (%)</label>
            <input
              name="taxa"
              type="number"
              step="0.5"
              className={modalStyles.input}
              value={newForma.taxa}
              onChange={handleNewChange}
            />
            <button className={modalStyles.buttonSalvar} onClick={createForma}>Salvar</button>
          </div>
        </div>
      )}
    <ConfirmationModal
      isOpen={modalState.isOpen}
      message="Você tem certeza que deseja excluir esta forma de pagamento?"
      onConfirm={modalState.onConfirm}
      onCancel={() => setModalState({ isOpen: false, onConfirm: () => {} })}
    />
    </>
  );
};

export default FormasPagamento;
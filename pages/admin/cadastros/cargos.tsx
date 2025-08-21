import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/medico/medicos.module.css';
import tableStyles from '@/styles/admin/cadastros/salas/salas.module.css';
import modalStyles from '@/styles/admin/cadastros/modal.module.css';
import { buscarCargos, criarCargo, excluirCargo, atualizarCargo } from '@/functions/cargosFunctions';
import StickyFooter from '@/components/StickyFooter';
import ConfirmationModal from '@/components/modals/ConfirmationModal';

interface Cargo {
  id: string;
  nome: string;
  quantidadeUsuarios: number;
  profissionalSaude: boolean;
}

interface User {
  uid: string;
  email: string;
}

const Cargos = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ nome: string; quantidadeUsuarios: number; profissionalSaude: boolean }>({
    nome: '',
    quantidadeUsuarios: 0,
    profissionalSaude: false,
  });
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newCargo, setNewCargo] = useState<{ nome: string; profissionalSaude: boolean }>({ nome: '', profissionalSaude: false });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalState, setModalState] = useState({isOpen: false, onConfirm: () => {} });

  const allSelected = cargos.length > 0 && selectedIds.length === cargos.length;
  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({ uid: currentUser.uid, email: currentUser.email || '' });
      } else {
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchData = async () => {
      const docs = await buscarCargos();
      setCargos(docs as Cargo[]);
    };
    fetchData();
  }, []);

  const filteredCargos = cargos.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = filteredCargos.length;
  const paginatedCargos = filteredCargos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startEdit = (c: Cargo) => {
    setEditingId(c.id);
    setFormData({ nome: c.nome, quantidadeUsuarios: c.quantidadeUsuarios, profissionalSaude: c.profissionalSaude });
    setShowEditModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: name === 'quantidadeUsuarios' ? Number(val) : val }));
  };

  const saveEdit = async (id: string) => {
    // Busca o cargo original para manter campos não editáveis
    const original = cargos.find(c => c.id === id);
    if (!original) return;
    // Garante que quantidadeUsuarios nunca seja undefined ou NaN
    const quantidadeUsuarios =
      typeof formData.quantidadeUsuarios === 'number' && !isNaN(formData.quantidadeUsuarios)
        ? formData.quantidadeUsuarios
        : original.quantidadeUsuarios;
    const payload = {
      nome: formData.nome,
      quantidadeUsuarios,
      profissionalSaude: formData.profissionalSaude,
    };
    await atualizarCargo(id, payload);
    setCargos(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, ...payload }
          : c
      )
    );
    setEditingId(null);
    setShowEditModal(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowEditModal(false);
  };

  const handleNewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setNewCargo(prev => ({ ...prev, [name]: val }));
  };

  const createCargo = async () => {
    const nomeTrim = newCargo.nome.trim();
    if (!nomeTrim) { setError('O nome não pode estar vazio.'); return; }
    await criarCargo({ nome: nomeTrim, quantidadeUsuarios: 0, profissionalSaude: newCargo.profissionalSaude });
    // Após criar, busque novamente os cargos do Firestore para garantir IDs corretos
    const docs = await buscarCargos();
    setCargos(docs as Cargo[]);
    setShowModal(false);
    setNewCargo({ nome: '', profissionalSaude: false });
  };

  const handleDelete = (id: string) => {
    const confirmAction = async () => {
      try {
        await excluirCargo(id);
        setCargos(prev => prev.filter(c => c.id !== id));
      } catch (error) {
        setError('Erro ao excluir Cargo.');
      }
      setModalState({ isOpen: false, onConfirm: () => {} });
    };

    setModalState({
      isOpen: true,
      onConfirm: confirmAction,
    });
  };

  const handleDeleteFromModal = (id: string) => {
    setShowEditModal(false);
    setEditingId(null);
    handleDelete(id);
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
      setSelectedIds(cargos.map(c => c.id));
    }
  };

  const deleteSelected = async () => {
    const confirmDelete = window.confirm('Deseja excluir os cargos selecionados?');
    if (!confirmDelete) return;
    for (const id of selectedIds) {
      await excluirCargo(id);
    }
    setCargos(prev => prev.filter(c => !selectedIds.includes(c.id)));
    setSelectedIds([]);
  };

  return (
    <>
      <div className={layoutStyles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Cadastros &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Cargos</span>
          </span>
        </div>
        <h1 className={tableStyles.titleSalas}>Cargos</h1>
        <div className={tableStyles.subtitleSalas}>Lista de cargos cadastrados</div>
        <div className={tableStyles.topBar}>
          <div className={tableStyles.actionButtonsWrapper}>
            <button className={tableStyles.buttonAdicionar} onClick={() => setShowModal(true)}>+ Adicionar cargo</button>
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
              placeholder="🔍 Pesquisar cargo"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className={tableStyles.searchInput}
            />
          </div>
        </div>
        <div className={tableStyles.salasTableWrapper}>
          <StickyFooter
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
          <table className={tableStyles.salasTable}>
            <thead>
              <tr>
                <th className={tableStyles.checkboxHeader}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
                <th>NOME</th>
                <th>USUÁRIOS</th>
                <th>PROFISSIONAL SAÚDE</th>
                <th className={tableStyles.acoesTh}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
            {paginatedCargos.map(c => (
                <tr key={c.id}>
                  <td className={tableStyles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => toggleSelect(c.id)}
                    />
                  </td>
                  <td>{c.nome}</td>
                  <td>{c.quantidadeUsuarios ?? 0}</td>
                  <td>{c.profissionalSaude ? 'Sim' : 'Não'}</td>
                  <td>
                    <button className={tableStyles.iconBtn} title="Editar" onClick={() => startEdit(c)}>
                      <svg className={tableStyles.iconEdit} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1976D2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className={modalStyles.overlay} onClick={() => setShowModal(false)}>
          <div className={modalStyles.modal} onClick={e => e.stopPropagation()}>
            <button className={modalStyles.closeButton} onClick={() => setShowModal(false)}>X</button>
            <h3>Novo Cargo</h3>
            <label className={modalStyles.label}>Nome</label>
            <input name="nome" className={modalStyles.input} value={newCargo.nome} onChange={handleNewChange} />
            <label className={modalStyles.label}>Profissional da Saúde</label>
            <input name="profissionalSaude" type="checkbox" checked={newCargo.profissionalSaude} onChange={handleNewChange} />
            <button className={modalStyles.buttonSalvar} onClick={createCargo}>Salvar</button>
          </div>
        </div>
      )}
      {showEditModal && editingId && (
        <div className={modalStyles.overlay} onClick={cancelEdit}>
          <div className={modalStyles.modal} onClick={e => e.stopPropagation()}>
            <button className={modalStyles.closeButton} onClick={cancelEdit}>X</button>
            <h3>Editar Cargo</h3>
            <label className={modalStyles.label}>Nome</label>
            <input name="nome" className={modalStyles.input} value={formData.nome} onChange={handleChange} />
            <label className={modalStyles.label}>Usuários</label>
            <input name="quantidadeUsuarios" type="number" className={modalStyles.input} value={formData.quantidadeUsuarios} onChange={handleChange} />
            <label className={modalStyles.label}>Profissional da Saúde</label>
            <input name="profissionalSaude" type="checkbox" checked={formData.profissionalSaude} onChange={handleChange} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className={modalStyles.buttonSalvar} onClick={() => saveEdit(editingId)}>
                Salvar
              </button>
              <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={() => handleDeleteFromModal(editingId)}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    <ConfirmationModal
      isOpen={modalState.isOpen}
      message="Você tem certeza que deseja excluir este Cargo?"
      onConfirm={modalState.onConfirm}
      onCancel={() => setModalState({ isOpen: false, onConfirm: () => {} })}
    />
    </>
  );
};

export default Cargos;
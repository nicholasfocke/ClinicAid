import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/medico/medicos.module.css';
import tableStyles from '@/styles/admin/cadastros/salas/salas.module.css';
import modalStyles from '@/styles/admin/cadastros/modal.module.css';
import { buscarEspecialidades, criarEspecialidade, excluirEspecialidade, atualizarEspecialidade } from '@/functions/especialidadesFunctions';
import StickyFooter from '@/components/StickyFooter';
import ConfirmationModal from '@/components/modals/ConfirmationModal';

interface Especialidade {
  id: string;
  nome: string;
  quantidadeUsuarios: number;
  profissionalSaude: boolean;
}

interface User {
  uid: string;
  email: string;
}

const Especialidades = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
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
  const [novaEspecialidade, setNovaEspecialidade] = useState<{ nome: string; profissionalSaude: boolean }>({ nome: '', profissionalSaude: false });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalState, setModalState] = useState({isOpen: false, onConfirm: () => {} });

  const allSelected = especialidades.length > 0 && selectedIds.length === especialidades.length;
  

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
      const docs = await buscarEspecialidades();
      setEspecialidades(docs as Especialidade[]);
    };
    fetchData();
  }, []);

  const filteredEspecialidades = especialidades.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = filteredEspecialidades.length;
  const paginatedEspecialidades = filteredEspecialidades.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startEdit = (c: Especialidade) => {
    setEditingId(c.id);
    setFormData({ nome: c.nome, quantidadeUsuarios: c.quantidadeUsuarios, profissionalSaude: c.profissionalSaude });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: name === 'quantidadeUsuarios' ? Number(val) : val }));
  };

  const saveEdit = async (id: string) => {
    // Busca a especialidade original para manter campos não editáveis
    const original = especialidades.find(c => c.id === id);
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
    await atualizarEspecialidade(id, payload);
    setEspecialidades(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, ...payload }
          : c
      )
    );
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleNewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setNovaEspecialidade(prev => ({ ...prev, [name]: val }));
  };

  const createEspecialidade = async () => {
    const nomeTrim = novaEspecialidade.nome.trim();
    if (!nomeTrim) { setError('O nome não pode estar vazio.'); return; }
    await criarEspecialidade({ nome: nomeTrim, quantidadeUsuarios: 0, profissionalSaude: novaEspecialidade.profissionalSaude });
    // Após criar, busque novamente as especialidades do Firestore para garantir IDs corretos
    const docs = await buscarEspecialidades();
    setEspecialidades(docs as Especialidade[]);
    setShowModal(false);
    setNovaEspecialidade({ nome: '', profissionalSaude: false });
  };

  const handleDelete = (id: string) => {
    const confirmAction = async () => {
      try {
        await excluirEspecialidade(id);
        setEspecialidades(prev => prev.filter(c => c.id !== id));
      } catch (error) {
        setError('Erro ao excluir Especialidade.');
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
      setSelectedIds(especialidades.map(c => c.id));
    }
  };

  const deleteSelected = async () => {
    const confirmDelete = window.confirm('Deseja excluir as especialidades selecionadas?');
    if (!confirmDelete) return;
    for (const id of selectedIds) {
      await excluirEspecialidade(id);
    }
    setEspecialidades(prev => prev.filter(c => !selectedIds.includes(c.id)));
    setSelectedIds([]);
  };

  return (
    <>
      <div className={layoutStyles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Cadastros &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Especialidades</span>
          </span>
        </div>
        <h1 className={tableStyles.titleSalas}>Especialidades</h1>
        <div className={tableStyles.subtitleSalas}>Lista de especialidades cadastradas</div>
        <div className={tableStyles.topBar}>
          <div className={tableStyles.actionButtonsWrapper}>
            <button className={tableStyles.buttonAdicionar} onClick={() => setShowModal(true)}>+ Adicionar especialidade</button>
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
              placeholder="🔍 Pesquisar especialidade"
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
            {paginatedEspecialidades.map(c => (
                <tr key={c.id}>
                  <td className={tableStyles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => toggleSelect(c.id)}
                    />
                  </td>
                  {editingId === c.id ? (
                    <>
                      <td>
                        <input name="nome" value={formData.nome} onChange={handleChange} />
                      </td>
                      <td>
                        <input name="quantidadeUsuarios" type="number" value={formData.quantidadeUsuarios} onChange={handleChange} />
                      </td>
                      <td>
                        <input name="profissionalSaude" type="checkbox" checked={formData.profissionalSaude} onChange={handleChange} />
                      </td>
                      <td>
                        <button className={tableStyles.buttonAcao} onClick={() => saveEdit(c.id)}>Salvar</button>
                        <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={cancelEdit}>Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{c.nome}</td>
                      <td>{c.quantidadeUsuarios ?? 0}</td>
                      <td>{c.profissionalSaude ? 'Sim' : 'Não'}</td>
                      <td>
                        <button className={tableStyles.iconBtn} title="Editar" onClick={() => startEdit(c)}>
                          <svg className={tableStyles.iconEdit} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1976D2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                        </button>
                        <button className={tableStyles.iconBtn} title="Excluir" onClick={() => handleDelete(c.id)}>
                          <svg className={tableStyles.iconDelete} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
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
            <button className={modalStyles.closeButton} onClick={() => setShowModal(false)}>X</button>
            <h3>Nova Especialidade</h3>
            <label className={modalStyles.label}>Nome</label>
            <input name="nome" className={modalStyles.input} value={novaEspecialidade.nome} onChange={handleNewChange} />
            <label className={modalStyles.label}>Profissional da Saúde</label>
            <input name="profissionalSaude" type="checkbox" checked={novaEspecialidade.profissionalSaude} onChange={handleNewChange} />
            <button className={modalStyles.buttonSalvar} onClick={createEspecialidade}>Salvar</button>
          </div>
        </div>
      )}
    <ConfirmationModal
      isOpen={modalState.isOpen}
      message="Você tem certeza que deseja excluir esta Especialidade?"
      onConfirm={modalState.onConfirm}
      onCancel={() => setModalState({ isOpen: false, onConfirm: () => {} })}
    />
    </>
  );
};

export default Especialidades;
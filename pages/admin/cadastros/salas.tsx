import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/medico/medicos.module.css';
import tableStyles from '@/styles/admin/cadastros/salas/salas.module.css';
import modalStyles from '@/styles/admin/cadastros/modal.module.css';
import { buscarSalas, criarSala, excluirSala, atualizarSala } from '@/functions/salasFunctions';
import { buscarMedicos } from '@/functions/medicosFunctions';
import StickyFooter from '@/components/StickyFooter';
import ConfirmationModal from '@/components/modals/ConfirmationModal';

interface Sala {
  id: string;
  nome: string;
  profissionalId: string | null;
  ativo: boolean;
}

interface Medico {
  id: string;
  nome: string;
}

interface User {
    uid: string;
    email: string;
}

const Salas = () => {
  const [error, setError] = useState('');
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ nome: string; profissionalId: string | null }>({ nome: '', profissionalId: null });
  const [showModal, setShowModal] = useState(false);
  const [newSala, setNewSala] = useState<{ nome: string; profissionalId: string | null }>({ nome: '', profissionalId: null });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const allSelected = salas.length > 0 && selectedIds.length === salas.length;
  const [modalState, setModalState] = useState({isOpen: false, onConfirm: () => {} });

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
      const s = await buscarSalas();
      setSalas(s as Sala[]);
      const m = await buscarMedicos();
      setMedicos(m.map((med: any) => ({ id: med.id, nome: med.nome })));
    };
    fetchData();
  }, []);

  const filteredSalas = salas.filter(s =>
    s.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = filteredSalas.length;
  const paginatedSalas = filteredSalas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startEdit = (s: Sala) => {
    setEditingId(s.id);
    setFormData({ nome: s.nome, profissionalId: s.profissionalId });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveEdit = async (id: string) => {
    await atualizarSala(id, { nome: formData.nome, profissionalId: formData.profissionalId });
    setSalas(prev => prev.map(s => (s.id === id ? { ...s, nome: formData.nome, profissionalId: formData.profissionalId } : s)));
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleNewChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewSala(prev => ({ ...prev, [name]: value }));
  };

  const createSala = async () => {
    await criarSala({ nome: newSala.nome, profissionalId: newSala.profissionalId, ativo: true });
    setSalas(prev => [...prev, { id: Date.now().toString(), nome: newSala.nome, profissionalId: newSala.profissionalId, ativo: true }]);
    setShowModal(false);
    setNewSala({ nome: '', profissionalId: null });
  };

  const handleDelete = (id: string) => {
    const confirmAction = async () => {
      try {
        await excluirSala(id);
        setSalas(prev => prev.filter(p => p.id !== id));
      } catch (error) {
        setError('Erro ao excluir convenio.');
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
      setSelectedIds(salas.map(s => s.id));
    }
  };

  const deleteSelected = async () => {
    const confirm = window.confirm('Deseja excluir as salas selecionadas?');
    if (!confirm) return;
    for (const id of selectedIds) {
      await excluirSala(id);
    }
    setSalas(prev => prev.filter(s => !selectedIds.includes(s.id)));
    setSelectedIds([]);
  };

  const toggleAtivo = async (s: Sala) => {
    await atualizarSala(s.id, { ativo: !s.ativo });
    setSalas(prev => prev.map(p => (p.id === s.id ? { ...p, ativo: !s.ativo } : p)));
  };

  const getNomeMedico = (id: string | null) => {
    const med = medicos.find(m => m.id === id);
    return med ? med.nome : '-';
  };

  return (
    <>
      <div className={layoutStyles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Cadastros &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Salas</span>
          </span>
        </div>
        <h1 className={tableStyles.titleSalas}>Salas</h1>
        <div className={tableStyles.subtitleSalas}>Lista de salas cadastradas</div>
        <div className={tableStyles.topBar}>
          <div className={tableStyles.actionButtonsWrapper}>
            <button className={tableStyles.buttonAdicionar} onClick={() => setShowModal(true)}>
              + Adicionar sala
            </button>
            {selectedIds.length > 0 && (
              <button
                className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`}
                onClick={deleteSelected}
              >
                Excluir selecionadas
              </button>
            )}
          </div>

          <div className={tableStyles.searchContainer}>
            <input
              type="text"
              placeholder="🔍 Pesquisar sala"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
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
                <th>PROFISSIONAL</th>
                <th>ATIVA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedSalas.map(s => (
                <tr key={s.id}>
                  <td className={tableStyles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(s.id)}
                      onChange={() => toggleSelect(s.id)}
                    />
                  </td>
                  {editingId === s.id ? (
                    <>
                      <td>
                        <input name="nome" value={formData.nome} onChange={handleChange} />
                      </td>
                      <td>
                        <select name="profissionalId" value={formData.profissionalId || ''} onChange={handleChange}>
                          <option value="">Selecione</option>
                          {medicos.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.nome}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{s.ativo ? 'Sim' : 'Não'}</td>
                      <td>
                        <button className={tableStyles.buttonAcao} onClick={() => saveEdit(s.id)}>
                          Salvar
                        </button>
                        <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={cancelEdit}>
                          Cancelar
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{s.nome}</td>
                      <td>{getNomeMedico(s.profissionalId)}</td>
                      <td>{s.ativo ? 'Sim' : 'Não'}</td>
                      <td>
                        <button className={tableStyles.buttonAcao} onClick={() => startEdit(s)}>
                          Editar
                        </button>
                        <button className={tableStyles.buttonAcao} onClick={() => toggleAtivo(s)}>
                          {s.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={() => handleDelete(s.id)}>
                          Excluir
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
            <h3>Nova Sala</h3>
            <label className={modalStyles.label}>Nome</label>
            <input name="nome" className={modalStyles.input} value={newSala.nome} onChange={handleNewChange} />
            <label className={modalStyles.label}>Profissional</label>
            <select name="profissionalId" className={modalStyles.input} value={newSala.profissionalId || ''} onChange={handleNewChange}>
              <option value="">Selecione</option>
              {medicos.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
            <button className={modalStyles.buttonSalvar} onClick={createSala}>Salvar</button>
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

export default Salas;

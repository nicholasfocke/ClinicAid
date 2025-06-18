import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/medico/medicos.module.css';
import tableStyles from '@/styles/admin/cadastros/salas/salas.module.css';
import modalStyles from '@/styles/admin/cadastros/modal.module.css';
import { buscarCargos, criarCargo, excluirCargo, atualizarCargo } from '@/functions/cargosFunctions';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ nome: string; quantidadeUsuarios: number; profissionalSaude: boolean }>({
    nome: '',
    quantidadeUsuarios: 0,
    profissionalSaude: false,
  });
  const [showModal, setShowModal] = useState(false);
  const [newCargo, setNewCargo] = useState<{ nome: string; profissionalSaude: boolean }>({ nome: '', profissionalSaude: false });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const startEdit = (c: Cargo) => {
    setEditingId(c.id);
    setFormData({ nome: c.nome, quantidadeUsuarios: c.quantidadeUsuarios, profissionalSaude: c.profissionalSaude });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: name === 'quantidadeUsuarios' ? Number(val) : val }));
  };

  const saveEdit = async (id: string) => {
    await atualizarCargo(id, formData);
    setCargos(prev => prev.map(c => (c.id === id ? { id, ...formData } : c)));
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleNewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setNewCargo(prev => ({ ...prev, [name]: val }));
  };

  const createCargo = async () => {
    const nomeTrim = newCargo.nome.trim();
    if (!nomeTrim) { setError('O nome não pode estar vazio.'); return; }
    await criarCargo({ nome: nomeTrim, quantidadeUsuarios: 0, profissionalSaude: newCargo.profissionalSaude });
    setCargos(prev => [...prev, { id: Date.now().toString(), nome: nomeTrim, quantidadeUsuarios: 0, profissionalSaude: newCargo.profissionalSaude }]);
    setShowModal(false);
    setNewCargo({ nome: '', profissionalSaude: false });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este cargo?')) return;
    await excluirCargo(id);
    setCargos(prev => prev.filter(c => c.id !== id));
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
              placeholder="Pesquisar cargo"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={tableStyles.searchInput}
            />
          </div>
        </div>
        <div className={tableStyles.salasTableWrapper}>
          <table className={tableStyles.salasTable}>
            <thead>
              <tr>
                <th className={tableStyles.checkboxHeader}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
                <th>NOME</th>
                <th>USUÁRIOS</th>
                <th>PROFISSIONAL SAÚDE</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
            {filteredCargos.map(c => (
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
                        <button className={tableStyles.buttonAcao} onClick={() => startEdit(c)}>Editar</button>
                        <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={() => handleDelete(c.id)}>Excluir</button>
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
            <h3>Novo Cargo</h3>
            <label className={modalStyles.label}>Nome</label>
            <input name="nome" className={modalStyles.input} value={newCargo.nome} onChange={handleNewChange} />
            <label className={modalStyles.label}>Profissional da Saúde</label>
            <input name="profissionalSaude" type="checkbox" checked={newCargo.profissionalSaude} onChange={handleNewChange} />
            <button className={modalStyles.buttonSalvar} onClick={createCargo}>Salvar</button>
          </div>
        </div>
      )}
    </>
  );
};

export default Cargos;
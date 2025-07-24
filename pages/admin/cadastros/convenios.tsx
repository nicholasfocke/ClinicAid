import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/medico/medicos.module.css';
import tableStyles from '@/styles/admin/cadastros/convenio/convenios.module.css';
import modalStyles from '@/styles/admin/cadastros/modal.module.css';
import { buscarConvenios, excluirConvenio, atualizarConvenio, criarConvenio } from '@/functions/conveniosFunctions';
import StickyFooter from '@/components/StickyFooter';
import ConfirmationModal from '@/components/modals/ConfirmationModal';

interface Convenio {
  id: string;
  nome: string;
  numeroPacientes: number;
  comissao: number;
  telefone?: string;
}

interface User {
  uid: string;
  email: string;
}

const formatTelefone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
};

const Convenios = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ nome: string; numeroPacientes: number; comissao: number; telefone: string }>({
    nome: '',
    numeroPacientes: 0,
    comissao: 0,
    telefone: '',
  });

  const [showModal, setShowModal] = useState(false);
  const [newConvenio, setNewConvenio] = useState<{ nome: string; comissao: number; telefone: string }>({
    nome: '',
    comissao: 0,
    telefone: '',
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allSelected = convenios.length > 0 && selectedIds.length === convenios.length;
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
      const docs = await buscarConvenios();
      setConvenios(docs as Convenio[]);
    };
    fetchData();
  }, []);

  const filteredConvenios = convenios.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = filteredConvenios.length;
  const paginatedConvenios = filteredConvenios.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = (id: string) => {
    const confirmAction = async () => {
      try {
        await excluirConvenio(id);
        setConvenios(prev => prev.filter(p => p.id !== id));
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
      setSelectedIds(convenios.map(c => c.id));
    }
  };

  const deleteSelected = async () => {
    const confirm = window.confirm('Deseja excluir os convênios selecionados?');
    if (!confirm) return;
    for (const id of selectedIds) {
      await excluirConvenio(id);
    }
    setConvenios(prev => prev.filter(c => !selectedIds.includes(c.id)));
    setSelectedIds([]);
  };

  const startEdit = (c: Convenio) => {
    setEditingId(c.id);
    setFormData({ nome: c.nome, numeroPacientes: c.numeroPacientes, comissao: c.comissao, telefone: c.telefone || '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value: raw } = e.target;
    let value = raw;
    if (name === 'telefone') { value = formatTelefone(raw); }

    setFormData(prev => ({ ...prev, [name]: name === 'numeroPacientes' || name === 'comissao' ? Number(value) : value }));
  };

  const saveEdit = async (id: string) => {
    const nomeTrim = formData.nome.trim();
    if (!nomeTrim || /^\d+$/.test(nomeTrim)) {
        setError('O nome do convênio não pode ser vazio nem apenas números');
        return;  // <-- impede de continuar
  } 

    await atualizarConvenio(id, formData);
    setConvenios(prev => prev.map(c => (c.id === id ? { id, ...formData } : c)));
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleNewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value: raw } = e.target;
    let value = raw;
    if (name === 'telefone') { value = formatTelefone(raw); }

    setNewConvenio(prev => ({ ...prev, [name]: name === 'comissao' ? Number(value) : value }));
  }

  const createConvenio = async () => {
    const nomeTrim = newConvenio.nome.trim();
    if (!nomeTrim || /^\d+$/.test(nomeTrim)) {
      setError('O nome do convênio não pode ser vazio nem apenas números');
      return;  // <-- impede de continuar
    }

    await criarConvenio({ nome: newConvenio.nome, numeroPacientes: 0, comissao: newConvenio.comissao, telefone: newConvenio.telefone });
    setConvenios(prev => [...prev, { id: Date.now().toString(), numeroPacientes: 0, ...newConvenio }]);
    setShowModal(false);
    setNewConvenio({ nome: '', comissao: 0, telefone: '' });
  };


  return (
    <>
    <div className={layoutStyles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Cadastros &gt; </span>
          <span className={breadcrumbStyles.breadcrumbActive}>Convênios</span>
        </span>
      </div>
        <h1 className={tableStyles.titleConvenios}>Convênios</h1>
      <div className={tableStyles.subtitleConvenios}>Lista de convênios cadastrados</div>
      <div className={tableStyles.topBar}>
        <div className={tableStyles.actionButtonsWrapper}>
          <button className={tableStyles.buttonAdicionar} onClick={() => setShowModal(true)}>+ Adicionar convênio</button>
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
            placeholder="🔍 Pesquisar convênio"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={tableStyles.searchInput}
          />
        </div>
      </div>

      <div className={tableStyles.conveniosTableWrapper}>
        <StickyFooter
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        <table className={tableStyles.conveniosTable}>
          <thead>
            <tr>
              <th className={tableStyles.checkboxHeader}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              </th>
              <th>CONVÊNIO</th>
              <th>PACIENTES</th>
              <th>COMISSÃO (%)</th>
              <th>TELEFONE</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginatedConvenios.map(c => (
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
                      <input name="numeroPacientes" type="number" value={formData.numeroPacientes} onChange={handleChange} />
                    </td>
                    <td>
                      <input name="comissao" type="number" step="1.00" value={formData.comissao} onChange={handleChange} />
                    </td>
                    <td>
                      <input name="telefone" value={formData.telefone} onChange={handleChange} />
                    </td>
                    <td>
                      <button className={tableStyles.buttonAcao} onClick={() => saveEdit(c.id)}>Salvar</button>
                      <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={cancelEdit}>Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{c.nome}</td>
                    <td>{c.numeroPacientes}</td>
                    <td>{c.comissao}</td>
                    <td>{c.telefone || '-'}</td>
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
          <h3>Novo Convênio</h3>
          
          <label htmlFor="nome" className={modalStyles.label}>Nome</label>
          <input
            name="nome"
            className={modalStyles.input}
            placeholder="Nome do convênio"
            value={newConvenio.nome}
            onChange={handleNewChange}
          />
          <label htmlFor="comissao" className={modalStyles.label}>Comissão da clínica (%)</label>
          <input
            name="comissao"
            type="number"
            step="1.00"
            className={modalStyles.input}
            placeholder="Comissão(%)"
            value={newConvenio.comissao}
            onChange={handleNewChange}
          />
          <label htmlFor="telefone" className={modalStyles.label}>Telefone</label>
          <input
            name="telefone"
            className={modalStyles.input}
            placeholder="Telefone"
            value={newConvenio.telefone}
            onChange={handleNewChange}
          />
          <button className={modalStyles.buttonSalvar} onClick={createConvenio}>Salvar</button>
        </div>
      </div>
    )}
    <ConfirmationModal
      isOpen={modalState.isOpen}
      message="Você tem certeza que deseja excluir este convênio?"
      onConfirm={modalState.onConfirm}
      onCancel={() => setModalState({ isOpen: false, onConfirm: () => {} })}
    />
    </>
  );
};

export default Convenios;
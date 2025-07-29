import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import { gerarRelatorioPDF } from '@/utils/gerarRelatorio';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/medico/medicos.module.css';
import tableStyles from '@/styles/admin/cadastros/procedimento/procedimentos.module.css';
import modalStyles from '@/styles/admin/cadastros/modal.module.css';
import { buscarProcedimentos, criarProcedimento, excluirProcedimento, atualizarProcedimento, ProcedimentoData } from '@/functions/procedimentosFunctions';
import ConfirmationModal from '@/components/modals/ConfirmationModal';
import StickyFooter from '@/components/StickyFooter';

const formatValor = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const parseValor = (valor: string) => {
  const digits = valor.replace(/\D/g, '');
  return Number(digits) / 100;
};

interface Procedimento extends ProcedimentoData {
  id: string;
}

interface User {
  uid: string;
  email: string;
}

const Procedimentos = () => {
  const router = useRouter();
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser ] = useState<User | null>(null);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProcedimentoData>({
    nome: '',
    valor: 0,
    duracao: 0,
    convenio: false,
    tipo: 'consulta',
  });
  const [newProc, setNewProc] = useState<ProcedimentoData>({
    nome: '',
    valor: 0,
    duracao: 0,
    convenio: false,
    tipo: 'consulta',
  });
  const [valorInput, setValorInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'todos' | 'consultas' | 'exames'>('todos');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalState, setModalState] = useState({ isOpen: false, onConfirm: () => {} });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser ) => {
      try {
        if (currentUser ) {
          setUser ({
            uid: currentUser .uid,
            email: currentUser .email || '',
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
    if (showModal) {
      setValorInput(formatValor(newProc.valor));
    } else {
      setValorInput('');
    }
  }, [showModal, newProc.valor]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docs = await buscarProcedimentos();
        setProcedimentos(docs as Procedimento[]);
      } catch (error) {
        setError('Erro ao carregar procedimentos');
      }
    };
    fetchData();
  }, []);

  const validateFields = (data: ProcedimentoData) => {
    if (!data.nome.trim()) return 'O nome é obrigatório';
    if (data.valor <= 0) return 'O valor deve ser positivo';
    if (data.duracao <= 0) return 'A duração deve ser positiva';
    return null;
  };

  const filteredProcedimentos = procedimentos.filter(p => {
    if (activeTab === 'consultas') return p.tipo === 'consulta';
    if (activeTab === 'exames') return p.tipo === 'exame';
    return true;
  });

  const searchFilteredProcedimentos = filteredProcedimentos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = searchFilteredProcedimentos.length;
  const paginatedProcedimentos = searchFilteredProcedimentos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const allSelected =
    filteredProcedimentos.length > 0 &&
    selectedIds.length === filteredProcedimentos.length;

  const startEdit = (p: Procedimento) => {
    setEditingId(p.id);
    setFormData({ 
      nome: p.nome, 
      valor: p.valor, 
      duracao: p.duracao, 
      convenio: p.convenio, 
      tipo: p.tipo 
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'valor' || name === 'duracao' ? Number(value) : value,
    }));
  };

  const saveEdit = async (id: string) => {
    const validationError = validateFields(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await atualizarProcedimento(id, { ...formData });
      setProcedimentos(prev => prev.map(p => (p.id === id ? { id, ...formData } : p)));
      setEditingId(null);
      setError(null);
    } catch (error) {
      setError('Erro ao atualizar procedimento');
    }
  };

  const cancelEdit = () => setEditingId(null);

  const handleNewChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === 'valor') {
      const numeric = parseValor(value);
      setValorInput(formatValor(numeric));
      setNewProc(prev => ({ ...prev, valor: numeric }));
    } else {
      setNewProc(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : name === 'duracao' ? Number(value) : value,
      }));
    }
  };

  const createProcedimento = async () => {
    const validationError = validateFields(newProc);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const id = await criarProcedimento(newProc);
      if (typeof id === 'string') {
        setProcedimentos(prev => [...prev, { id, ...newProc }]);
        setShowModal(false);
        setNewProc({ nome: '', valor: 0, duracao: 0, convenio: false, tipo: 'consulta' });
        setError(null);
      } else {
        setError('Erro ao criar procedimento: ID inválido.');
      }
    } catch (error) {
      setError('Erro ao criar procedimento');
    }
  };

  const handleDelete = (id: string) => {
    const confirmAction = async () => {
      try {
        await excluirProcedimento(id);
        setProcedimentos(prev => prev.filter(p => p.id !== id));
      } catch (error) {
        setError('Erro ao excluir procedimento');
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
      setSelectedIds(filteredProcedimentos.map(p => p.id));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;

    const confirmAction = async () => {
      try {
        for (const id of selectedIds) {
          await excluirProcedimento(id);
        }
        setProcedimentos(prev => prev.filter(p => !selectedIds.includes(p.id)));
        setSelectedIds([]);
      } catch (error) {
        setError('Erro ao excluir procedimentos selecionados');
      }
      setModalState({ isOpen: false, onConfirm: () => {} });
    };

    setModalState({
      isOpen: true,
      onConfirm: confirmAction,
    });
  };

  const gerarRelatorioProcedimentos = () => {
    const colunas = ['Nome', 'Valor', 'Duração (min)', 'Convênio', 'Tipo'];
    const dados = procedimentos.map(p => [
      p.nome,
      formatValor(p.valor),
      `${p.duracao} min`,
      p.convenio ? 'Sim' : 'Não',
      p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1),
    ]);

    gerarRelatorioPDF({
      titulo: 'Relatório de Procedimentos',
      colunas,
      dados,
      nomeArquivo: 'procedimentos.pdf',
    });
  };

  return (
    <div className={layoutStyles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Cadastros &gt; </span>
          <span className={breadcrumbStyles.breadcrumbActive}>Procedimentos</span>
        </span>
      </div>
      <h1 className={layoutStyles.titleMedicos}>Procedimentos</h1>
      <div className={layoutStyles.subtitleMedicos}>Lista de procedimentos cadastrados</div>
      {error && (<p style={{ color: 'red', marginTop: '10px' }}>{error}</p>)}
      <div className={tableStyles.tabsWrapper}>
        <button
          className={`${tableStyles.tabButton} ${activeTab === 'todos' ? tableStyles.activeTab : ''}`}
          onClick={() => setActiveTab('todos')}
        >
          Todos
        </button>
        <button
          className={`${tableStyles.tabButton} ${activeTab === 'consultas' ? tableStyles.activeTab : ''}`}
          onClick={() => setActiveTab('consultas')}
        >
          Consultas
        </button>
        <button
          className={`${tableStyles.tabButton} ${activeTab === 'exames' ? tableStyles.activeTab : ''}`}
          onClick={() => setActiveTab('exames')}
        >
          Exames
        </button>
      </div>
      <div className={tableStyles.topBar}>
        <div className={layoutStyles.actionButtonsWrapper}>
          <button className={layoutStyles.buttonAdicionar} onClick={() => setShowModal(true)}>
            + Adicionar procedimento
          </button>
          {selectedIds.length > 0 && (
            <button
              className={`${tableStyles.buttonExcluirSelecionados} ${tableStyles.buttonExcluirSelecionados}`} 
              onClick={deleteSelected} > 
              Excluir selecionados
            </button>
          )}
          <button className={tableStyles.buttonPdf} onClick={gerarRelatorioProcedimentos}>
            📄 Gerar PDF
          </button>
        </div>

        <div className={tableStyles.searchContainer}>
          <input
            type="text"
            placeholder="🔍 Pesquisar procedimento"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={tableStyles.searchInput}
          />
        </div>
      </div>
      <div className={tableStyles.procedimentosTableWrapper}>
      <StickyFooter
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
        <table className={tableStyles.procedimentosTable}>
          <thead>
            <tr>
              <th className={tableStyles.checkboxHeader}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              </th>
              <th>NOME</th>
              <th>VALOR</th>
              <th>DURAÇÃO (min)</th>
              <th>CONVÊNIO</th>
              <th>TIPO</th>
              <th>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {searchFilteredProcedimentos.map(p => (
              <tr key={p.id}>
                <td className={tableStyles.checkboxCell}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => toggleSelect(p.id)}
                  />
                </td>
                {editingId === p.id ? (
                  <>
                    <td>
                      <input name="nome" value={formData.nome} onChange={handleChange} className={tableStyles.inputEdit} />
                    </td>
                    <td>
                      <input type="number" name="valor" value={formData.valor} onChange={handleChange} className={tableStyles.inputEdit} />
                    </td>
                    <td>
                      <input type="number" name="duracao" value={formData.duracao} onChange={handleChange} className={tableStyles.inputEdit} />
                    </td>
                    <td>
                      <input type="checkbox" name="convenio" checked={formData.convenio} onChange={handleChange} />
                    </td>
                    <td>
                      <select name="tipo" value={formData.tipo} onChange={handleChange} className={tableStyles.inputEdit}>
                        <option value="consulta">Consulta</option>
                        <option value="exame">Exame</option>
                      </select>
                    </td>
                    <td>
                      <button className={tableStyles.buttonAcao} onClick={() => saveEdit(p.id)}>Salvar</button>
                      <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={cancelEdit}>
                        Cancelar
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{p.nome}</td>
                    <td>{formatValor(p.valor)}</td>
                    <td>{p.duracao}</td>
                    <td>{p.convenio ? 'Sim' : 'Não'}</td>
                    <td>
                      <span
                        className={`${tableStyles.tipoQuad} ${
                          p.tipo === 'exame' ? tableStyles.exame : tableStyles.consulta
                        }`}
                      ></span>
                      {p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1)}
                    </td>
                    <td className={tableStyles.acoesTd}>
                      <button
                        className={tableStyles.iconBtn + ' ' + tableStyles.iconEdit}
                        title="Editar"
                        onClick={() => startEdit(p)}
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
                        onClick={() => handleDelete(p.id)}
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
      {showModal && (
        <div
          className={modalStyles.overlay}
          onClick={() => {
            setShowModal(false);
            setValorInput('');
          }}
        >
          <div className={modalStyles.modal} onClick={e => e.stopPropagation()}>
            <button
              className={modalStyles.closeButton}
              onClick={() => {
                setShowModal(false);
                setValorInput('');
              }}
            >
              X
            </button>
            <h3>Novo Procedimento</h3>
            <label className={modalStyles.label}>Nome</label>
            <input
              name="nome"
              className={modalStyles.input}
              value={newProc.nome}
              onChange={handleNewChange}
            />
            <label className={modalStyles.label}>Valor</label>
            <input
              type="text"
              name="valor"
              className={modalStyles.input}
              value={valorInput}
              onChange={handleNewChange}
              inputMode="numeric"
            />
            <label className={modalStyles.label}>Duração (minutos)</label>
            <input
              type="number"
              name="duracao"
              className={modalStyles.input}
              value={newProc.duracao}
              onChange={handleNewChange}
            />
            <label className={modalStyles.label}>Convênio?</label>
            <input
              type="checkbox"
              name="convenio"
              checked={newProc.convenio}
              onChange={handleNewChange}
            />
            <label className={modalStyles.label}>Tipo</label>
            <select name="tipo" className={modalStyles.input} value={newProc.tipo} onChange={handleNewChange}>
              <option value="consulta">Consulta</option>
              <option value="exame">Exame</option>
            </select>
            <button className={modalStyles.buttonSalvar} onClick={createProcedimento}>
              Salvar
            </button>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={modalState.isOpen}
        message="Você tem certeza que deseja excluir este procedimento?"
        onConfirm={modalState.onConfirm}
        onCancel={() => setModalState({ isOpen: false, onConfirm: () => {} })}
      />
    </div>
  );
};

export default Procedimentos;

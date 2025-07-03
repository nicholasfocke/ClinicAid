import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, arrayUnion } from 'firebase/firestore';
import { auth, firestore } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/pacientes.module.css';
import { ExternalLink } from 'lucide-react';
import detailsStyles from '@/styles/admin/pacienteDetails.module.css';
import modalStyles from '@/styles/admin/cadastros/modal.module.css';
import { statusAgendamento } from '@/functions/agendamentosFunction';
import {
  atualizarPaciente,
  excluirPaciente,
  uploadArquivoPaciente,
  uploadArquivoPacienteSecao,
  uploadArquivoTemp,
  adicionarEvolucaoPaciente,
  criarPaciente,
  PacienteArquivo,
} from '@/functions/pacientesFunctions';
import { getStorage, ref as storageRef, deleteObject } from 'firebase/storage';
import { format as formatDateFns, parse as parseDateFns } from 'date-fns';

interface EvolucaoClinica {
  data: string;
  profissional: string;
  diagnostico: string;
  procedimentos: string;
  prescricao?: string;
  arquivos?: PacienteArquivo[];
}

interface ConversaIA {
  data: string;
  sintomas: string;
  respostaIA: string;
  recomendacao: string;
  utilizada: boolean;
}

interface HistoricoAgendamento {
  id?: string;
  data: string;
  hora?: string;
  profissional: string;
  procedimento?:string;
  status: string;
  descricao?: string;
  especialidade?: string;
  prontuarioLink?: string;
}

interface RelacaoProfissional {
  profissional: string;
  sessoes: number;
}

interface Paciente {
  id: string;
  nome: string;
  email: string;
  cpf?: string;
  telefone?: string;
  convenio?: string;
  dataNascimento?: string;
  arquivos?: PacienteArquivo[];
  infoArquivos?: PacienteArquivo[];
  prontuarios?: EvolucaoClinica[];
  conversasIA?: ConversaIA[];
  conversasArquivos?: PacienteArquivo[];
  agendamentos?: HistoricoAgendamento[];
  profissionaisAtendimentos?: RelacaoProfissional[];
  profissionaisArquivos?: PacienteArquivo[];
  observacoes?: string;
  alertas?: string[];
  tags?: string[];
}

interface User {
  uid: string;
  email: string;
}

const Pacientes = () => {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formData, setFormData] = useState<Paciente>({
    id: '',
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    convenio: '',
    dataNascimento: '',
    arquivos: [],
    infoArquivos: [],
    prontuarios: [],
    conversasIA: [],
    conversasArquivos: [],
    agendamentos: [],
    profissionaisAtendimentos: [],
    profissionaisArquivos: [],
    observacoes: '',
    alertas: [],
    tags: [],
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pacienteInfo, setPacienteInfo] = useState<Paciente | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPaciente, setNewPaciente] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    convenio: '',
    dataNascimento: '',
  });
  const [availableAppointments, setAvailableAppointments] = useState<HistoricoAgendamento[]>([]);
  const [selectedAppointmentIdToLink, setSelectedAppointmentIdToLink] = useState('');
  const [activeTab, setActiveTab] = useState<
    'info' | 'prontuarios' | 'conversas' | 'agendamentos' | 'documentos' | 'profissionais'
  >('info');
  const [addingEvolucao, setAddingEvolucao] = useState(false);
  const [novaEvolucao, setNovaEvolucao] = useState<EvolucaoClinica>({
    data: '',
    profissional: '',
    diagnostico: '',
    procedimentos: '',
    prescricao: '',
  });

  const statusClassMap: Record<string, string> = {
    [statusAgendamento.AGENDADO]: detailsStyles.statusAgendado,
    [statusAgendamento.CONFIRMADO]: detailsStyles.statusConfirmado,
    [statusAgendamento.CANCELADO]: detailsStyles.statusCancelado,
    [statusAgendamento.CONCLUIDO]: detailsStyles.statusConcluido,
    [statusAgendamento.PENDENTE]: detailsStyles.statusPendente,
  };


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser({ uid: currentUser.uid, email: currentUser.email || '' });
      } else {
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchPacientes = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'pacientes'));
        const lista: Paciente[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          lista.push({
            id: docSnap.id,
            nome: data.nome || '',
            email: data.email || '',
            cpf: data.cpf || '',
            telefone: data.telefone || '',
            convenio: data.convenio || '',
            dataNascimento: data.dataNascimento || '',
            arquivos: data.arquivos || [],
            infoArquivos: data.infoArquivos || [],
            prontuarios: data.prontuarios || [],
            conversasIA: data.conversasIA || [],
            conversasArquivos: data.conversasArquivos || [],
            agendamentos: data.agendamentos || [],
            profissionaisAtendimentos: data.profissionaisAtendimentos || [],
            profissionaisArquivos: data.profissionaisArquivos || [],
            observacoes: data.observacoes || '',
            alertas: data.alertas || [],
            tags: data.tags || [],
          });
        });
        setPacientes(lista);
      } catch (err) {
        console.error('Erro ao buscar pacientes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPacientes();
  }, []);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'agendamentos'));
        const list: HistoricoAgendamento[] = [];
        snap.forEach(d => {
          const data = d.data();
          list.push({
            id: d.id,
            data: data.data || '',
            hora: data.hora || '',
            profissional: data.profissional || '',
            procedimento: data.procedimento || '',
            status: data.status || '',
            descricao: data.detalhes || '',
          });
        });
        setAvailableAppointments(list);
      } catch (err) {
        console.error('Erro ao buscar agendamentos:', err);
      }
    };
    fetchAppointments();
  }, []);

  // Máscaras de formatação
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  const formatTelefone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const maskDataNascimento = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1/$2')
      .replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3')
      .slice(0, 10);
  };

  // Validação de CPF
  function isValidCPF(cpf: string): boolean {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /(\d)\1+$/.test(cpf)) return false;
    let soma = 0,
      resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf[i - 1]) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf[9])) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf[i - 1]) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf[10])) return false;
    return true;
  }

  const filteredPacientes = pacientes.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser({ uid: currentUser.uid, email: currentUser.email || '' });
      } else {
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchPacientes = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'pacientes'));
        const lista: Paciente[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          lista.push({
            id: docSnap.id,
            nome: data.nome || '',
            email: data.email || '',
            cpf: data.cpf || '',
            telefone: data.telefone || '',
            convenio: data.convenio || '',
            dataNascimento: data.dataNascimento || '',
            arquivos: data.arquivos || [],
            infoArquivos: data.infoArquivos || [],
            prontuarios: data.prontuarios || [],
            conversasIA: data.conversasIA || [],
            conversasArquivos: data.conversasArquivos || [],
            agendamentos: data.agendamentos || [],
            profissionaisAtendimentos: data.profissionaisAtendimentos || [],
            profissionaisArquivos: data.profissionaisArquivos || [],
            observacoes: data.observacoes || '',
            alertas: data.alertas || [],
            tags: data.tags || [],
          });
        });
        setPacientes(lista);
      } catch (err) {
        console.error('Erro ao buscar pacientes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPacientes();
  }, []);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'agendamentos'));
        const list: HistoricoAgendamento[] = [];
        snap.forEach(d => {
          const data = d.data();
          list.push({
            id: d.id,
            data: data.data || '',
            hora: data.hora || '',
            profissional: data.profissional || '',
            procedimento: data.procedimento || '',
            status: data.status || '',
            descricao: data.detalhes || '',
          });
        });
        setAvailableAppointments(list);
      } catch (err) {
        console.error('Erro ao buscar agendamentos:', err);
      }
    };
    fetchAppointments();
  }, []);

  const openDetails = (p: Paciente) => {
    setSelectedPaciente(p);
    setFormData(p);
    setActiveTab('info');
    setShowDetails(true);
  };

  const closeModal = () => {
    setShowDetails(false);
    setEditing(false);
    setConfirmDelete(false);
    setFile(null);
    setActiveTab('info');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'dataNascimento') {
      setFormData(prev => ({ ...prev, [name]: maskDataNascimento(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleNewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      setNewPaciente(prev => ({ ...prev, cpf: formatCPF(value) }));
    } else if (name === 'telefone') {
      setNewPaciente(prev => ({ ...prev, telefone: formatTelefone(value) }));
    } else if (name === 'dataNascimento') {
      setNewPaciente(prev => ({ ...prev, dataNascimento: maskDataNascimento(value) }));
    } else {
      setNewPaciente(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (!selectedPaciente) return;
    await atualizarPaciente(selectedPaciente.id, {
      nome: formData.nome,
      email: formData.email,
      cpf: formData.cpf,
      telefone: formData.telefone,
      convenio: formData.convenio,
      dataNascimento: formData.dataNascimento,
    });
    const updated = { ...selectedPaciente, ...formData };
    setPacientes(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    setSelectedPaciente(updated);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!selectedPaciente) return;
    await excluirPaciente(selectedPaciente.id);
    setPacientes(prev => prev.filter(p => p.id !== selectedPaciente.id));
    closeModal();
  };

  const handleFileUpload = async (campo: string) => {
    if (!selectedPaciente || !file) return;
    setUploading(true);
    try {
      const arq = await uploadArquivoPacienteSecao(
        selectedPaciente.id,
        file,
        campo
      );
      const updated = {
        ...selectedPaciente,
        [campo]: [...((selectedPaciente as any)[campo] || []), arq],
      } as Paciente;
      setPacientes(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      setSelectedPaciente(updated);
      setFormData(prev => ({ ...prev, [campo]: (updated as any)[campo] }));
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteArquivo = async (campo: string, arquivo: PacienteArquivo) => {
    if (!selectedPaciente) return;
    if (!confirm('Deseja excluir este arquivo?')) return;
    try {
      // Remove do Storage se houver path
      if (arquivo.path) {
        const storage = getStorage();
        const fileRef = storageRef(storage, arquivo.path);
        await deleteObject(fileRef);
      }
      // Remove do Firestore (atualiza o array de arquivos)
      const novosArquivos = ((selectedPaciente as any)[campo] || []).filter(
        (a: PacienteArquivo) => a.path !== arquivo.path
      );
      await atualizarPaciente(selectedPaciente.id, { [campo]: novosArquivos });
      setPacientes(prev =>
        prev.map(p =>
          p.id === selectedPaciente.id ? { ...p, [campo]: novosArquivos } : p
        )
      );
      setSelectedPaciente(prev =>
        prev ? { ...prev, [campo]: novosArquivos } : prev
      );
      setFormData(prev => ({ ...prev, [campo]: novosArquivos }));
    } catch (err) {
      alert('Erro ao excluir arquivo.');
    }
  };

  const handleAddEvolucao = async () => {
    if (!selectedPaciente) return;
    setUploading(true);
    try {
      let arquivos: PacienteArquivo[] = [];
      if (file) {
        const arq = await uploadArquivoTemp(selectedPaciente.id, file, 'prontuarios');
        arquivos.push(arq);
      }
      const nova = { ...novaEvolucao, arquivos };
      await adicionarEvolucaoPaciente(selectedPaciente.id, nova);
      const updated = {
        ...selectedPaciente,
        prontuarios: [...(selectedPaciente.prontuarios || []), nova],
      } as Paciente;
      setPacientes(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      setSelectedPaciente(updated);
      setPacienteInfo(updated);
      setNovaEvolucao({ data: '', profissional: '', diagnostico: '', procedimentos: '', prescricao: '' });
      setFile(null);
      setAddingEvolucao(false);
    } finally {
      setUploading(false);
    }
  };

  const handleLinkAppointment = async () => {
    if (!selectedPaciente || !selectedAppointmentIdToLink) return;
    const ag = availableAppointments.find(a => a.id === selectedAppointmentIdToLink);
    if (!ag) return;
    await atualizarPaciente(selectedPaciente.id, {
      agendamentos: arrayUnion(ag),
    });
    const updated = {
      ...selectedPaciente,
      agendamentos: [...(selectedPaciente.agendamentos || []), ag],
    } as Paciente;
    setPacientes(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    setSelectedPaciente(updated);
    setPacienteInfo(updated);
    setSelectedAppointmentIdToLink('');
  };

  const createPaciente = async () => {
    const id = await criarPaciente(newPaciente);
    const novo: Paciente = { id, ...newPaciente };
    setPacientes(prev => [...prev, novo]);
    setShowCreateModal(false);
    setNewPaciente({
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      convenio: '',
      dataNascimento: '',
    });
  };

  // Busca todas as informações do paciente ao abrir o modal de detalhes
  useEffect(() => {
    if (showDetails && selectedPaciente) {
      setPacienteInfo(selectedPaciente);
    } else {
      setPacienteInfo(null);
    }
  }, [showDetails, selectedPaciente]);

  if (loading) {
    return <p>Carregando pacientes...</p>;
  }

  return (
    <div className={styles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumbActive}>Pacientes</span>
        </span>
      </div>
      <h1 className={styles.titlePacientes}>Pacientes</h1>
      <div className={styles.subtitlePacientes}>Lista de pacientes cadastrados</div>
      {/* Barra de ações: botão + barra de pesquisa lado a lado */}
      <div className={styles.topBar}>
        <div className={styles.actionButtonsWrapper} style={{ marginBottom: 0 }}>
          <button
            className={styles.buttonAdicionar}
            onClick={() => setShowCreateModal(true)}
          >
            + Adicionar paciente
          </button>
        </div>
        <div className={styles.searchContainer} style={{ marginBottom: 0 }}>
          <input
            type="text"
            placeholder="🔍 Pesquisar paciente"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>
      <div className={styles.pacientesTableWrapper}>
        <table className={styles.pacientesTable}>
          <thead>
            <tr>
              <th>NOME</th>
              <th>EMAIL</th>
              <th>CPF</th>
              <th>TELEFONE</th>
              <th>CONVÊNIO</th>
              <th>NASCIMENTO</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredPacientes.map(p => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{p.email}</td>
                <td>{p.cpf || '-'}</td>
                <td>{p.telefone || '-'}</td>
                <td>{p.convenio || '-'}</td>
                <td>{p.dataNascimento || '-'}</td>
                <td>
                  <button
                    className={styles.externalLink}
                    title="Ver detalhes"
                    onClick={() => openDetails(p)}
                  >
                    <ExternalLink size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showCreateModal && (
        <div
          className={modalStyles.overlay}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className={modalStyles.modal}
            onClick={e => e.stopPropagation()}
          >
            <button
              className={modalStyles.closeButton}
              onClick={() => setShowCreateModal(false)}
            >
              X
            </button>
            <h3>Novo Paciente</h3>
            <label className={modalStyles.label}>Nome</label>
            <input
              name="nome"
              className={modalStyles.input}
              value={newPaciente.nome}
              onChange={handleNewChange}
            />
            <label className={modalStyles.label}>Email</label>
            <input
              name="email"
              className={modalStyles.input}
              value={newPaciente.email}
              onChange={handleNewChange}
            />
            <label className={modalStyles.label}>CPF</label>
            <input
              name="cpf"
              className={modalStyles.input}
              value={newPaciente.cpf}
              onChange={handleNewChange}
              maxLength={14}
            />
            <label className={modalStyles.label}>Telefone</label>
            <input
              name="telefone"
              className={modalStyles.input}
              value={newPaciente.telefone}
              onChange={handleNewChange}
              maxLength={15}
            />
            <label className={modalStyles.label}>Convênio</label>
            <input
              name="convenio"
              className={modalStyles.input}
              value={newPaciente.convenio}
              onChange={handleNewChange}
            />
            <label className={modalStyles.label}>Nascimento (DD/MM/AAAA)</label>
            <input
              name="dataNascimento"
              maxLength={10}
              className={modalStyles.input}
              value={newPaciente.dataNascimento}
              onChange={handleNewChange}
            />
            <button
              className={modalStyles.buttonSalvar}
              onClick={createPaciente}
            >
              Salvar
            </button>
          </div>
        </div>
      )}
      {showDetails && selectedPaciente && (
        <div className={detailsStyles.overlay} onClick={closeModal}>
          <div
            className={detailsStyles.card}
            onClick={e => e.stopPropagation()}
          >
            <div className={detailsStyles.tabBar}>
              <button
                className={`${detailsStyles.tabButton} ${activeTab === 'info' ? detailsStyles.activeTab : ''}`}
                onClick={() => setActiveTab('info')}
              >
                Informações
              </button>
              <button
                className={`${detailsStyles.tabButton} ${activeTab === 'prontuarios' ? detailsStyles.activeTab : ''}`}
                onClick={() => setActiveTab('prontuarios')}
              >
                Prontuários
              </button>
              <button
                className={`${detailsStyles.tabButton} ${activeTab === 'conversas' ? detailsStyles.activeTab : ''}`}
                onClick={() => setActiveTab('conversas')}
              >
                Conversas IA
              </button>
              <button
                className={`${detailsStyles.tabButton} ${activeTab === 'agendamentos' ? detailsStyles.activeTab : ''}`}
                onClick={() => setActiveTab('agendamentos')}
              >
                Agendamentos
              </button>
              <button
                className={`${detailsStyles.tabButton} ${activeTab === 'documentos' ? detailsStyles.activeTab : ''}`}
                onClick={() => setActiveTab('documentos')}
              >
                Documentos
              </button>
              <button
                className={`${detailsStyles.tabButton} ${activeTab === 'profissionais' ? detailsStyles.activeTab : ''}`}
                onClick={() => setActiveTab('profissionais')}
              >
                Profissionais
              </button>
            </div>
            {confirmDelete ? (
              <>
                <p>Confirmar exclusão?</p>
                <div className={detailsStyles.buttons}>
                  <button
                    className={detailsStyles.buttonExcluir}
                    onClick={handleDelete}
                  >
                    Confirmar
                  </button>
                  <button
                    className={detailsStyles.buttonEditar}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : editing ? (
              <>
                <input
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className={detailsStyles.input}
                  placeholder="Nome"
                />
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={detailsStyles.input}
                  placeholder="Email"
                />
                <input
                  name="cpf"
                  value={formData.cpf || ''}
                  onChange={handleChange}
                  className={detailsStyles.input}
                  placeholder="CPF"
                />
                <input
                  name="telefone"
                  value={formData.telefone || ''}
                  onChange={handleChange}
                  className={detailsStyles.input}
                  placeholder="Telefone"
                />
                <input
                  name="convenio"
                  value={formData.convenio || ''}
                  onChange={handleChange}
                  className={detailsStyles.input}
                  placeholder="Convênio"
                />
                <input
                  name="dataNascimento"
                  value={formData.dataNascimento || ''}
                  onChange={handleChange}
                  className={detailsStyles.input}
                  placeholder="Nascimento (DD/MM/AAAA)"
                  maxLength={10}
                />
                <div>
                  <input
                    type="file"
                    onChange={e =>
                      setFile(e.target.files ? e.target.files[0] : null)
                    }
                  />
                  {file && (
                    <button
                      className={detailsStyles.buttonEditar}
                      onClick={() => handleFileUpload('arquivos')}
                      disabled={uploading}
                    >
                      {uploading ? 'Enviando...' : 'Enviar arquivo'}
                    </button>
                  )}
                </div>
                {formData.arquivos && formData.arquivos.length > 0 && (
                  <ul>
                    {formData.arquivos.map(a => (
                      <li key={a.path} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <a href={a.url} target="_blank" rel="noreferrer">
                          {a.nome}
                        </a>
                        <button
                          style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}
                          onClick={() => handleDeleteArquivo('arquivos', a)}
                          title="Excluir arquivo"
                          type="button"
                        >
                          Excluir
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className={detailsStyles.buttons}>
                  <button
                    className={detailsStyles.buttonEditar}
                    onClick={handleSave}
                  >
                    Salvar
                  </button>
                  <button
                    className={detailsStyles.buttonCancelar}
                    onClick={() => {
                      setEditing(false);
                      setFormData(selectedPaciente);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                {activeTab === 'info' && pacienteInfo && (
                  <div style={{ marginBottom: 16 }}>
                    <h3>Informações completas do paciente</h3>
                    <p><strong>Nome:</strong> {pacienteInfo.nome}</p>
                    <p><strong>Email:</strong> {pacienteInfo.email}</p>
                    <p><strong>CPF:</strong> {pacienteInfo.cpf || '-'}</p>
                    <p><strong>Telefone:</strong> {pacienteInfo.telefone || '-'}</p>
                    <p><strong>Convênio:</strong> {pacienteInfo.convenio || '-'}</p>
                    <p><strong>Nascimento:</strong> {pacienteInfo.dataNascimento || '-'}</p>
                    {pacienteInfo.infoArquivos && pacienteInfo.infoArquivos.length > 0 && (
                      <ul>
                        {pacienteInfo.infoArquivos.map(a => (
                          <li key={a.path} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <a href={a.url} target="_blank" rel="noreferrer">{a.nome}</a>
                            <button
                              style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}
                              onClick={() => handleDeleteArquivo('infoArquivos', a)}
                              title="Excluir arquivo"
                              type="button"
                            >
                              Excluir
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="file"
                        onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                      />
                      {file && (
                        <button
                          className={detailsStyles.buttonEditar}
                          onClick={() => handleFileUpload('infoArquivos')}
                          disabled={uploading}
                        >
                          {uploading ? 'Enviando...' : 'Enviar arquivo'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'prontuarios' && pacienteInfo && (
                  <div style={{ marginBottom: 16 }}>
                    {pacienteInfo.prontuarios && pacienteInfo.prontuarios.length > 0 ? (
                      <ul className={detailsStyles.prontuarioList}>
                        {pacienteInfo.prontuarios.map((ev, idx) => (
                          <details
                            key={idx}
                            className={detailsStyles.prontuarioDetails}
                          >
                            <summary className={detailsStyles.prontuarioSummary}>
                              {/* Título à esquerda, setinha preta à direita */}
                              <span>
                                {ev.data
                                  ? (() => {
                                      try {
                                        let d = ev.data;
                                        let parsed = d.includes('-')
                                          ? parseDateFns(d, 'yyyy-MM-dd', new Date())
                                          : parseDateFns(d, 'dd/MM/yyyy', new Date());
                                        return `Prontuário: ${formatDateFns(parsed, 'dd-MM-yyyy')}`;
                                      } catch {
                                        return `Prontuário: ${ev.data}`;
                                      }
                                    })()
                                  : `Prontuário`}
                              </span>
                              <span className={detailsStyles.detailsArrow}>›</span>
                            </summary>
                            <div className={detailsStyles.prontuarioContent}>
                              <p>
                                <strong>Profissional:</strong> {ev.profissional}
                              </p>
                              <p>
                                <strong>Diagnóstico:</strong> {ev.diagnostico}
                              </p>
                              <p>
                                <strong>Procedimentos:</strong> {ev.procedimentos}
                              </p>
                              {ev.prescricao && (
                                <p>
                                  <strong>Prescrição:</strong> {ev.prescricao}
                                </p>
                              )}
                              {ev.arquivos && ev.arquivos.length > 0 && (
                                <ul>
                                  {ev.arquivos.map(a => (
                                    <li key={a.path}>
                                      <a href={a.url} target="_blank" rel="noreferrer">{a.nome}</a>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </details>
                        ))}
                      </ul>
                    ) : (
                      <p>Nenhuma evolução cadastrada.</p>
                    )}
                    {addingEvolucao ? (
                      <div style={{ marginTop: 8 }}>
                        <input
                          type="text"
                          placeholder="Data"
                          value={novaEvolucao.data}
                          onChange={e => setNovaEvolucao({ ...novaEvolucao, data: e.target.value })}
                          className={detailsStyles.input}
                        />
                        <input
                          type="text"
                          placeholder="Profissional"
                          value={novaEvolucao.profissional}
                          onChange={e => setNovaEvolucao({ ...novaEvolucao, profissional: e.target.value })}
                          className={detailsStyles.input}
                        />
                        <input
                          type="text"
                          placeholder="Diagnóstico"
                          value={novaEvolucao.diagnostico}
                          onChange={e => setNovaEvolucao({ ...novaEvolucao, diagnostico: e.target.value })}
                          className={detailsStyles.input}
                        />
                        <input
                          type="text"
                          placeholder="Procedimentos"
                          value={novaEvolucao.procedimentos}
                          onChange={e => setNovaEvolucao({ ...novaEvolucao, procedimentos: e.target.value })}
                          className={detailsStyles.input}
                        />
                        <input
                          type="text"
                          placeholder="Prescrição"
                          value={novaEvolucao.prescricao}
                          onChange={e => setNovaEvolucao({ ...novaEvolucao, prescricao: e.target.value })}
                          className={detailsStyles.input}
                        />
                        <div style={{ marginTop: 8 }}>
                          <input
                            type="file"
                            onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                          />
                          <button
                            className={detailsStyles.buttonEditar}
                            onClick={handleAddEvolucao}
                            disabled={uploading}
                          >
                            {uploading ? 'Salvando...' : 'Salvar evolução'}
                          </button>
                          <button
                            className={detailsStyles.buttonCancelar}
                            onClick={() => {
                              setAddingEvolucao(false);
                              setNovaEvolucao({ data: '', profissional: '', diagnostico: '', procedimentos: '', prescricao: '' });
                              setFile(null);
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className={detailsStyles.buttonEditar}
                        onClick={() => setAddingEvolucao(true)}
                      >
                        Adicionar nova evolução
                      </button>
                    )}
                  </div>
                )}

                {activeTab === 'conversas' && pacienteInfo && (
                  <div style={{ marginBottom: 16 }}>
                    {pacienteInfo.conversasIA && pacienteInfo.conversasIA.length > 0 ? (
                      <ul>
                        {pacienteInfo.conversasIA.map((c, idx) => (
                          <li key={idx} style={{ marginBottom: 8 }}>
                            <p>
                              <strong>Data:</strong>{' '}
                              {c.data
                                ? (() => {
                                    let d = c.data;
                                    try {
                                      let parsed = d.includes('-')
                                        ? parseDateFns(d, 'yyyy-MM-dd', new Date())
                                        : parseDateFns(d, 'dd/MM/yyyy', new Date());
                                      return formatDateFns(parsed, 'dd-MM-yyyy');
                                    } catch {
                                      return d;
                                    }
                                  })()
                                : '-'}
                            </p>
                            <p><strong>Sintomas:</strong> {c.sintomas}</p>
                            <p><strong>Resposta IA:</strong> {c.respostaIA}</p>
                            <p><strong>Recomendação:</strong> {c.recomendacao}</p>
                            <p><strong>Sugestão usada:</strong> {c.utilizada ? 'Sim' : 'Não'}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Sem conversas registradas.</p>
                    )}
                    {pacienteInfo.conversasArquivos && pacienteInfo.conversasArquivos.length > 0 && (
                      <ul>
                        {pacienteInfo.conversasArquivos.map(a => (
                          <li key={a.path} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <a href={a.url} target="_blank" rel="noreferrer">{a.nome}</a>
                            <button
                              style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}
                              onClick={() => handleDeleteArquivo('conversasArquivos', a)}
                              title="Excluir arquivo"
                              type="button"
                            >
                              Excluir
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="file"
                        onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                      />
                      {file && (
                        <button
                          className={detailsStyles.buttonEditar}
                          onClick={() => handleFileUpload('conversasArquivos')}
                          disabled={uploading}
                        >
                          {uploading ? 'Enviando...' : 'Enviar arquivo'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'agendamentos' && pacienteInfo && (
                  <div style={{ marginBottom: 16 }}>
                    {pacienteInfo.agendamentos && pacienteInfo.agendamentos.length > 0 ? (
                      <ul className={detailsStyles.agendamentoList}>
                        {pacienteInfo.agendamentos.map((a, idx) => (
                          <details
                            key={idx}
                            className={detailsStyles.agendamentoDetails}
                          >
                            <summary className={detailsStyles.agendamentoSummary}>
                              {/* Título à esquerda, setinha preta à direita */}
                              <span>
                                {a.data && a.hora
                                  ? (() => {
                                      try {
                                        let parsed = a.data.includes('-')
                                          ? parseDateFns(a.data, 'yyyy-MM-dd', new Date())
                                          : parseDateFns(a.data, 'dd/MM/yyyy', new Date());
                                        return `Agendamento: ${formatDateFns(parsed, 'dd-MM-yyyy')} ${a.hora}`;
                                      } catch {
                                        return `Agendamento: ${a.data} ${a.hora}`;
                                      }
                                    })()
                                  : `Agendamento`}
                              </span>
                              <span className={detailsStyles.detailsArrow}>›</span>
                              <span
                                className={`${detailsStyles.statusBadge} ${
                                  statusClassMap[a.status] || detailsStyles.statusAgendado
                                }`}
                              >
                                {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                              </span>
                            </summary>
                            <div className={detailsStyles.agendamentoContent}>
                              {a.descricao && (
                                <p>
                                  <strong>Descrição:</strong> {a.descricao}
                                </p>
                              )}
                              {a.especialidade && (
                                <p>
                                  <strong>Especialidade:</strong> {a.especialidade}
                                </p>
                              )}
                              {a.procedimento && (
                                <p>
                                  <strong>Procedimento:</strong> {a.procedimento}
                                </p>
                              )}
                              <p>
                                <strong>Profissional:</strong> {a.profissional}
                              </p>
                              <p>
                                <strong>Status:</strong> {a.status}
                              </p>
                              {a.prontuarioLink && (
                                <p>
                                  <a href={a.prontuarioLink} target="_blank" rel="noreferrer">
                                    Ver prontuário
                                  </a>
                                </p>
                              )}
                            </div>
                          </details>
                        ))}
                      </ul>
                    ) : (
                      <p>Sem agendamentos anteriores.</p>
                    )}
                  </div>
                )}

                {activeTab === 'documentos' && pacienteInfo && (
                  <div style={{ marginBottom: 16 }}>
                    {pacienteInfo.arquivos && pacienteInfo.arquivos.length > 0 ? (
                      <ul>
                        {pacienteInfo.arquivos.map(a => (
                          <li key={a.path} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <a href={a.url} target="_blank" rel="noreferrer">{a.nome}</a>
                            <button
                              style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}
                              onClick={() => handleDeleteArquivo('arquivos', a)}
                              title="Excluir arquivo"
                              type="button"
                            >
                              Excluir
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Nenhum documento enviado.</p>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="file"
                        onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                      />
                      {file && (
                        <button
                          className={detailsStyles.buttonEditar}
                          onClick={() => handleFileUpload('arquivos')}
                          disabled={uploading}
                        >
                          {uploading ? 'Enviando...' : 'Enviar arquivo'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'profissionais' && pacienteInfo && (
                  <div style={{ marginBottom: 16 }}>
                    {pacienteInfo.profissionaisAtendimentos && pacienteInfo.profissionaisAtendimentos.length > 0 ? (
                      <ul>
                        {pacienteInfo.profissionaisAtendimentos.map((r, idx) => (
                          <li key={idx} style={{ marginBottom: 8 }}>
                            {r.profissional} - {r.sessoes} sessões
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Nenhum atendimento registrado.</p>
                    )}
                    {pacienteInfo.profissionaisArquivos && pacienteInfo.profissionaisArquivos.length > 0 && (
                      <ul>
                        {pacienteInfo.profissionaisArquivos.map(a => (
                          <li key={a.path} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <a href={a.url} target="_blank" rel="noreferrer">{a.nome}</a>
                            <button
                              style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}
                              onClick={() => handleDeleteArquivo('profissionaisArquivos', a)}
                              title="Excluir arquivo"
                              type="button"
                            >
                              Excluir
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="file"
                        onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                      />
                      {file && (
                        <button
                          className={detailsStyles.buttonEditar}
                          onClick={() => handleFileUpload('profissionaisArquivos')}
                          disabled={uploading}
                        >
                          {uploading ? 'Enviando...' : 'Enviar arquivo'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className={detailsStyles.buttons}>
                  <button
                    className={detailsStyles.buttonExcluir}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Excluir
                  </button>
                  <button
                    className={detailsStyles.buttonEditar}
                    onClick={() => setEditing(true)}
                  >
                    Editar
                  </button>
                </div>
              </>
            )}
            <button
              className={detailsStyles.buttonFechar}
              onClick={closeModal}
            >
              X
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pacientes;
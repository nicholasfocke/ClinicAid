import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, arrayUnion } from 'firebase/firestore';
import { auth, firestore } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/pacientes/pacientes.module.css';
import { ExternalLink } from 'lucide-react';
import StickyFooter from '@/components/StickyFooter';
import detailsStyles from '@/styles/admin/pacientes/pacienteDetails.module.css';
import modalStyles from '@/styles/admin/cadastros/modal.module.css';
import { statusAgendamento } from '@/functions/agendamentosFunction';
import { atualizarPaciente, excluirPaciente, uploadArquivoPaciente, uploadArquivoPacienteSecao, uploadArquivoTemp,
    adicionarEvolucaoPaciente, criarPaciente, PacienteArquivo, } from '@/functions/pacientesFunctions';
import { buscarConvenios } from '@/functions/conveniosFunctions';
import { getStorage, ref as storageRef, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  sexo?: string;
  foto?: string;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    cep: string;
    bairro: string;
    estado: string;
    cidade: string;
  };
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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
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
  sexo: '',
  foto: '',
    endereco: {
      logradouro: '',
      numero: '',
      complemento: '',
      cep: '',
      bairro: '',
      estado: '',
      cidade: '',
    },
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
  const [foto, setFoto] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pacienteInfo, setPacienteInfo] = useState<Paciente | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [convenios, setConvenios] = useState<{ id: string; nome: string }[]>([]);
  const [newPaciente, setNewPaciente] = useState({
    nome: '',
    email: '',
    cpf: '',
  telefone: '',
  convenio: '',
  dataNascimento: '',
  sexo: '',
  logradouro: '',
    numero: '',
    complemento: '',
    cep: '',
    bairro: '',
    estado: '',
    cidade: '',
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
    [statusAgendamento.EM_ANDAMENTO]: detailsStyles.statusEmAndamento,
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
            sexo: data.sexo || '',
            endereco: data.endereco || {
              logradouro: '',
              numero: '',
              complemento: '',
              cep: '',
              bairro: '',
              estado: '',
              cidade: '',
            },
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

  useEffect(() => {
    if (!showCreateModal) return;
    (async () => {
      try {
        const docs = await buscarConvenios();
        setConvenios(docs as any);
      } catch (err) {
        console.error('Erro ao buscar convenios', err);
      }
    })();
  }, [showCreateModal]);

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

  const formatCEP = (value: string) => {
  return value
    .replace(/\D/g, '')              
    .replace(/^(\d{5})(\d)/, '$1-$2') // insere o hífen
    .slice(0, 9);                     
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
  const totalItems = filteredPacientes.length;
  const paginatedPacientes = filteredPacientes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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

  const buscarEnderecoPorCEP = async (cep: string) => {
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length !== 8) return;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await response.json();
    if (data.erro) {
      alert('CEP não encontrado.');
      return;
    }

    setNewPaciente(prev => ({
      ...prev,
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
    }));
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
  }
};


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      setFormData(prev => ({ ...prev, cpf: formatCPF(value) }));
    } else if (name === 'telefone') {
      setFormData(prev => ({ ...prev, telefone: formatTelefone(value) }));
    } else if (name === 'dataNascimento') {
      setFormData(prev => ({ ...prev, dataNascimento: maskDataNascimento(value) }));
    } else if (
      ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'estado', 'cidade'].includes(
        name
      )
    ) { 
      const val = name === 'cep' ? formatCEP(value) : value;
      setFormData(prev => ({
      ...prev,
      endereco: { ...(prev.endereco ?? { logradouro: '', numero: '', complemento: '', cep: '', bairro: '',
                        estado: '', cidade: '', }), [name]: val, },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleNewChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      setNewPaciente(prev => ({ ...prev, cpf: formatCPF(value) }));
    } else if (name === 'telefone') {
      setNewPaciente(prev => ({ ...prev, telefone: formatTelefone(value) }));
    } else if (name === 'dataNascimento') {
      setNewPaciente(prev => ({ ...prev, dataNascimento: maskDataNascimento(value) }));
    } else if (name === 'cep') {  
      const cepFormatado = formatCEP(value);
      setNewPaciente(prev => ({ ...prev, cep: cepFormatado }));
      if (cepFormatado.replace(/\D/g, '').length === 8) {
        buscarEnderecoPorCEP(cepFormatado);  }
    } else {
      setNewPaciente(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFoto(URL.createObjectURL(e.target.files[0]));
      setFotoFile(e.target.files[0]);
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
      sexo: formData.sexo,
      endereco: formData.endereco,
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
    const { logradouro, numero, cep, bairro, estado, cidade } = newPaciente;
    if (!logradouro || !numero || !cep || !bairro || !estado || !cidade) {
      alert('Preencha todos os campos obrigatórios do endereço.');
      return;
    }

    let fotoUrl = '';
    let fotoPath = '';
    if (fotoFile) {
      const storage = getStorage();
      const uniqueName = `${newPaciente.cpf.replace(/\D/g, '')}_${Date.now()}`;
      const ref = storageRef(storage, `paciente_photos/${uniqueName}`);
      await uploadBytes(ref, fotoFile);
      fotoUrl = await getDownloadURL(ref);
      fotoPath = ref.fullPath;
    }

    const id = await criarPaciente({
      nome: newPaciente.nome,
      email: newPaciente.email,
      cpf: newPaciente.cpf,
      telefone: newPaciente.telefone,
      convenio: newPaciente.convenio,
      dataNascimento: newPaciente.dataNascimento,
      sexo: newPaciente.sexo,
      foto: fotoUrl,
      fotoPath,
      endereco: {
        logradouro: newPaciente.logradouro,
        numero: newPaciente.numero,
        complemento: newPaciente.complemento,
        cep: newPaciente.cep,
        bairro: newPaciente.bairro,
        estado: newPaciente.estado,
        cidade: newPaciente.cidade,
      },
    });

    const novo: Paciente = {
      id,
      ...newPaciente,
      foto: fotoUrl,
      endereco: {
        logradouro: newPaciente.logradouro,
        numero: newPaciente.numero,
        complemento: newPaciente.complemento,
        cep: newPaciente.cep,
        bairro: newPaciente.bairro,
        estado: newPaciente.estado,
        cidade: newPaciente.cidade,
      },
    } as Paciente;
    setPacientes(prev => [...prev, novo]);
    setShowCreateModal(false);
    setNewPaciente({
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      convenio: '',
      dataNascimento: '',
      sexo: '',
      logradouro: '',
      numero: '',
      complemento: '',
      cep: '',
      bairro: '',
      estado: '',
      cidade: '',
    });
    setFoto(null);
    setFotoFile(null);
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
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.searchInput}
          />
        </div>
      </div>
      <div className={styles.pacientesTableWrapper}>
        <StickyFooter
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        >
        </StickyFooter>
        <table className={styles.pacientesTable}>
          <thead>
            <tr>
              <th>NOME</th>
              <th>EMAIL</th>
              <th>CPF</th>
              <th>TELEFONE</th>
              <th>CONVÊNIO</th>
              <th>NASCIMENTO</th>
              <th>SEXO</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginatedPacientes.map(p => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{p.email}</td>
                <td>{p.cpf || '-'}</td>
                <td>{p.telefone || '-'}</td>
                <td>{p.convenio || '-'}</td>
                <td>{p.dataNascimento || '-'}</td>
                <td>{p.sexo ? p.sexo.charAt(0).toUpperCase() + p.sexo.slice(1) : '-'}</td>
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
            className={`${modalStyles.modal} ${modalStyles.horizontalModal}`}
            onClick={e => e.stopPropagation()}
          >
            <button
              className={modalStyles.closeButton}
              onClick={() => setShowCreateModal(false)}
            >
              X
            </button>
            <h3>Novo Paciente</h3>
            <div className={modalStyles.formHorizontal}>
              <div className={modalStyles.basicInfo}>
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
                <select
                  name="convenio"
                  className={modalStyles.input}
                  value={newPaciente.convenio}
                  onChange={handleNewChange}
                >
                  <option value="">Selecione</option>
                  <option value="Particular">Particular</option>
                  {convenios.map(c => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
                <label className={modalStyles.label}>Nascimento (DD/MM/AAAA)</label>
                <input
                  name="dataNascimento"
                  maxLength={10}
                  className={modalStyles.input}
                  value={newPaciente.dataNascimento}
                  onChange={handleNewChange}
                />
                <label className={modalStyles.label}>Sexo</label>
                <select
                  name="sexo"
                  className={modalStyles.input}
                  value={newPaciente.sexo}
                  onChange={handleNewChange}
                >
                  <option value="">Selecione o sexo</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                  <option value="Prefiro não informar">Prefiro não informar</option>
                </select>
                <label className={modalStyles.label}>Foto</label>
                <input type="file" accept="image/*" onChange={handleFotoChange} />
                {foto && (
                  <img src={foto} alt="Foto" style={{ width: 80, height: 80, objectFit: 'cover', marginTop: 8 }} />
                )}
              </div>
              <div className={modalStyles.divider}></div>
              <div className={modalStyles.addressInfo}>
                <label className={modalStyles.label}>CEP</label>
                <input
                  name="cep"
                  className={modalStyles.input}
                  value={newPaciente.cep}
                  onChange={handleNewChange}
                />
                <label className={modalStyles.label}>Logradouro</label>
                <input
                  name="logradouro"
                  className={modalStyles.input}
                  value={newPaciente.logradouro}
                  onChange={handleNewChange}
                />
                <label className={modalStyles.label}>Número</label>
                <input
                  name="numero"
                  className={modalStyles.input}
                  value={newPaciente.numero}
                  onChange={handleNewChange}
                />
                <label className={modalStyles.label}>Complemento</label>
                <input
                  name="complemento"
                  className={modalStyles.input}
                  value={newPaciente.complemento}
                  onChange={handleNewChange}
                />
                <label className={modalStyles.label}>Bairro</label>
                <input
                  name="bairro"
                  className={modalStyles.input}
                  value={newPaciente.bairro}
                  onChange={handleNewChange}
                />
                <label className={modalStyles.label}>Estado</label>
                <input
                  name="estado"
                  className={modalStyles.input}
                  value={newPaciente.estado}
                  onChange={handleNewChange}
                />
                <label className={modalStyles.label}>Cidade</label>
                <input
                  name="cidade"
                  className={modalStyles.input}
                  value={newPaciente.cidade}
                  onChange={handleNewChange}
                />
              </div>
            </div>
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
                <div className={detailsStyles.infoLayout} style={{ marginBottom: 16 }}>
                  <div className={detailsStyles.basicInfo}>
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
                    <select
                      name="sexo"
                      value={formData.sexo || ''}
                      onChange={handleChange}
                      className={detailsStyles.input}
                    >
                      <option value="">Selecione o sexo</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                      <option value="outro">Outro</option>
                      <option value="prefiro não informar">Prefiro não informar</option>
                    </select>
                  </div>
                  <div className={detailsStyles.divider}></div>
                  <div className={detailsStyles.addressInfo}>
                    <input
                      name="cep"
                      value={formData.endereco?.cep ?? ''}
                      onChange={handleChange}
                      className={detailsStyles.input}
                      placeholder="CEP"
                    />
                    <input
                      name="logradouro"
                      value={formData.endereco?.logradouro ?? ''}
                      onChange={handleChange}
                      className={detailsStyles.input}
                      placeholder="Logradouro"
                    />
                    <input
                      name="numero"
                      value={(formData.endereco?.numero ?? '')}
                      onChange={handleChange}
                      className={detailsStyles.input}
                      placeholder="Número"
                    />
                    <input
                      name="complemento"
                      value={formData.endereco?.complemento ?? ''}
                      onChange={handleChange}
                      className={detailsStyles.input}
                      placeholder="Complemento"
                    />
                    <input
                      name="bairro"
                      value={formData.endereco?.bairro ?? ''}
                      onChange={handleChange}
                      className={detailsStyles.input}
                      placeholder="Bairro"
                    />
                    <input
                      name="estado"
                      value={formData.endereco?.estado ?? ''}
                      onChange={handleChange}
                      className={detailsStyles.input}
                      placeholder="Estado"
                    />
                    <input
                      name="cidade"
                      value={formData.endereco?.cidade ?? ''}
                      onChange={handleChange}
                      className={detailsStyles.input}
                      placeholder="Cidade"
                    />
                  </div>
                </div>
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
                  <div className={detailsStyles.infoLayout} style={{ marginBottom: 16 }}>
                    <div className={detailsStyles.basicInfo}>
                      <h3>Informações completas do paciente</h3>
                      <p><strong>Nome:</strong> {pacienteInfo.nome}</p>
                      <p><strong>Email:</strong> {pacienteInfo.email}</p>
                      <p><strong>CPF:</strong> {pacienteInfo.cpf || '-'}</p>
                      <p><strong>Telefone:</strong> {pacienteInfo.telefone || '-'}</p>
                      <p><strong>Convênio:</strong> {pacienteInfo.convenio || '-'}</p>
                      <p><strong>Nascimento:</strong> {pacienteInfo.dataNascimento || '-'}</p>
                      <p><strong>Sexo:</strong> {pacienteInfo.sexo || '-'}</p>
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
                    <div className={detailsStyles.divider}></div>
                    <div className={detailsStyles.addressInfo}>
                      <h3>Endereço</h3>
                      <p><strong>CEP:</strong> {pacienteInfo.endereco?.cep || '-'}</p>
                      <p><strong>Logradouro:</strong> {pacienteInfo.endereco?.logradouro || '-'}</p>
                      <p><strong>Número:</strong> {pacienteInfo.endereco?.numero || '-'}</p>
                      <p><strong>Complemento:</strong> {pacienteInfo.endereco?.complemento || '-'}</p>
                      <p><strong>Bairro:</strong> {pacienteInfo.endereco?.bairro || '-'}</p>
                      <p><strong>Estado:</strong> {pacienteInfo.endereco?.estado || '-'}</p>
                      <p><strong>Cidade:</strong> {pacienteInfo.endereco?.cidade || '-'}</p>
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
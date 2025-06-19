import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, firestore } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/pacientes.module.css';
import { ExternalLink } from 'lucide-react';
import detailsStyles from '@/styles/admin/pacienteDetails.module.css';
import {
  atualizarPaciente,
  excluirPaciente,
  uploadArquivoPaciente,
  PacienteArquivo,
} from '@/functions/pacientesFunctions';

interface Paciente {
  id: string;
  nome: string;
  email: string;
  cpf?: string;
  telefone?: string;
  convenio?: string;
  dataNascimento?: string;
  arquivos?: PacienteArquivo[];
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
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

  const openDetails = (p: Paciente) => {
    setSelectedPaciente(p);
    setFormData(p);
    setShowDetails(true);
  };

  const closeModal = () => {
    setShowDetails(false);
    setEditing(false);
    setConfirmDelete(false);
    setFile(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleFileUpload = async () => {
    if (!selectedPaciente || !file) return;
    setUploading(true);
    try {
      const arq = await uploadArquivoPaciente(selectedPaciente.id, file);
      const updated = {
        ...selectedPaciente,
        arquivos: [...(selectedPaciente.arquivos || []), arq],
      };
      setPacientes(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      setSelectedPaciente(updated);
      setFormData(prev => ({ ...prev, arquivos: updated.arquivos }));
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

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
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="🔍 Pesquisar paciente"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
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
      {showDetails && selectedPaciente && (
        <div className={detailsStyles.overlay} onClick={closeModal}>
          <div
            className={detailsStyles.card}
            onClick={e => e.stopPropagation()}
          >
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
                  placeholder="Nascimento"
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
                      onClick={handleFileUpload}
                      disabled={uploading}
                    >
                      {uploading ? 'Enviando...' : 'Enviar arquivo'}
                    </button>
                  )}
                </div>
                {formData.arquivos && formData.arquivos.length > 0 && (
                  <ul>
                    {formData.arquivos.map(a => (
                      <li key={a.path}>
                        <a href={a.url} target="_blank" rel="noreferrer">
                          {a.nome}
                        </a>
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
                <h3>{selectedPaciente.nome}</h3>
                <p>
                  <strong>Email:</strong> {selectedPaciente.email}
                </p>
                <p>
                  <strong>CPF:</strong> {selectedPaciente.cpf || '-'}
                </p>
                <p>
                  <strong>Telefone:</strong> {selectedPaciente.telefone || '-'}
                </p>
                <p>
                  <strong>Convênio:</strong> {selectedPaciente.convenio || '-'}
                </p>
                <p>
                  <strong>Nascimento:</strong>{' '}
                  {selectedPaciente.dataNascimento || '-'}
                </p>
                {selectedPaciente.arquivos &&
                  selectedPaciente.arquivos.length > 0 && (
                    <ul>
                      {selectedPaciente.arquivos.map(a => (
                        <li key={a.path}>
                          <a href={a.url} target="_blank" rel="noreferrer">
                            {a.nome}
                          </a>
                        </li>
                      ))}
                    </ul>
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
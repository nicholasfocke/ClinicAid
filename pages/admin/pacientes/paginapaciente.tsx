import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { auth } from '@/firebase/firebaseConfig';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/pacientes/paginapaciente.module.css';
import { buscarPacientesComDetalhes, PacienteDetails, buscarPacientePorId, atualizarPaciente } from '@/functions/pacientesFunctions';
import { buscarMedicos } from '@/functions/medicosFunctions';
import { User, Calendar, Phone, FileText, Stethoscope, Download, Trash, PenLine, ClipboardList } from 'lucide-react'
import { getStorage, ref as storageRef, deleteObject } from 'firebase/storage'
import { format as formatDateFns, parse as parseDateFns } from 'date-fns'
import AppointmentDetailsModal from '@/components/modals/AppointmentDetailsModal';
import ConfirmationModal from '@/components/modals/ConfirmationModal';
import { doc } from 'firebase/firestore';

type Tab =
  | 'resumo'
  | 'info'
  | 'prontuario'
  | 'conversas'
  | 'documentos'
  | 'agendamentos';

const PaginaPaciente = () => {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [pacientes, setPacientes] = useState<PacienteDetails[]>([]);
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<any | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('resumo');
  const [medicos, setMedicos] = useState<{ id: string; nome: string; especialidade: string }[]>([]);

  const [showAddDoc, setShowAddDoc] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<any | null>(null);

  const statusClassMap: Record<string, string> = {
    agendado: styles.statusAgendado,
    confirmado: styles.statusConfirmado,
    'em andamento': styles.statusEmAndamento,
    cancelado: styles.statusCancelado,
    'concluído': styles.statusConcluido,
    pendente: styles.statusPendente,
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const docs = await buscarPacientesComDetalhes();
        const sorted = docs.sort((a, b) => a.nome.localeCompare(b.nome));
        setPacientes(sorted);
      } catch (err) {
        console.error('Erro ao buscar pacientes', err);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const lista = await buscarMedicos();
        setMedicos(lista);
      } catch (err) {
        console.error('Erro ao buscar médicos', err);
      }
    })();
  }, [user]);

  const selectPaciente = async (id: string) => {
    try {
      const doc = await buscarPacientePorId(id);
      setSelectedPaciente(doc);
      setActiveTab('resumo');
      setShowModal(false);
    } catch (err) {
      console.error('Erro ao buscar paciente', err);
    }
  };
  
  const openDetails = (ag: any) => {
    setSelectedAppointment(ag);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setSelectedAppointment(null);
    setDetailsOpen(false);
  };

  const handleSaveDocumento = async () => {
    if (!selectedPaciente || !docTitle) return;
    setUploadingDoc(true);
    try {
      if (editingDoc) {
        // edição de documento existente
        const updatedDocMeta = { ...editingDoc, titulo: docTitle, descricao: docDesc };

        if (docFile) {
          // trocar o arquivo: deleta o antigo e faz upload do novo
          const { uploadDocumentoPaciente } = await import('@/functions/pacientesFunctions');

          if (editingDoc.path) {
            const storage = getStorage();
            const fileRef = storageRef(storage, editingDoc.path);
            await deleteObject(fileRef).catch(() => {
              console.warn('Falha ao deletar o arquivo antigo (talvez não existia).');
            });
          }

          const newDocObj = await uploadDocumentoPaciente(
            selectedPaciente.id,
            docFile,
            docTitle,
            docDesc
          );

          const novos = (selectedPaciente.documentos || []).map((d: any) =>
            d.url === editingDoc.url ? newDocObj : d
          );
          await atualizarPaciente(selectedPaciente.id, { documentos: novos });
          const updatedPaciente = { ...selectedPaciente, documentos: novos } as any;
          setSelectedPaciente(updatedPaciente);
          setPacientes(prev => prev.map(p => (p.id === updatedPaciente.id ? updatedPaciente : p)));
        } else {
          // só atualiza metadados (sem trocar arquivo)
          const novos = (selectedPaciente.documentos || []).map((d: any) =>
            d.url === editingDoc.url ? updatedDocMeta : d
          );
          await atualizarPaciente(selectedPaciente.id, { documentos: novos });
          const updatedPaciente = { ...selectedPaciente, documentos: novos } as any;
          setSelectedPaciente(updatedPaciente);
          setPacientes(prev => prev.map(p => (p.id === updatedPaciente.id ? updatedPaciente : p)));
        }
      } else {
        // criação nova exige arquivo
        if (!docFile) {
          alert('Por favor, escolha um arquivo antes de salvar.');
          return;
        }
        if(!docTitle) {
          alert('Por favor, insira um título para o documento.'); 
          return;
        }
        const { uploadDocumentoPaciente } = await import('@/functions/pacientesFunctions');
        const docObj = await uploadDocumentoPaciente(
          selectedPaciente.id,
          docFile,
          docTitle,
          docDesc
        );
        const updated = {
          ...selectedPaciente,
          documentos: [...(selectedPaciente.documentos || []), docObj],
        } as any;
        setSelectedPaciente(updated);
        setPacientes(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      }

      // resetar estado de modal
      setShowAddDoc(false);
      setDocTitle('');
      setDocDesc('');
      setDocFile(null);
      setEditingDoc(null);
    } catch (err: any) {
      console.error('Erro ao salvar documento:', err);
      const message = err?.message || 'Erro desconhecido ao salvar o documento.';
      alert(message);
    } finally {
      setUploadingDoc(false);
    }
  };


  const handleDeleteDocumento = async (docItem: any) => {
    if (!selectedPaciente) return;
    try {
      if (docItem.path) {
        const storage = getStorage();
        const fileRef = storageRef(storage, docItem.path);
        await deleteObject(fileRef);
      }
      const novos = (selectedPaciente.documentos || []).filter((d: any) => d.url !== docItem.url);
      await atualizarPaciente(selectedPaciente.id, { documentos: novos });
      const updated = { ...selectedPaciente, documentos: novos } as any;
      setSelectedPaciente(updated);
      setPacientes(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      setIsDeleteModalOpen(false);
      setDocToDelete(null);
    } catch {
      alert('Erro ao excluir documento.');
    }
  };

  const handleEditDocumento = (doc: any) => {
    setDocTitle(doc.titulo || '');
    setDocDesc(doc.descricao || '');
    setDocFile(null); // Não é possível editar o arquivo diretamente
    setEditingDoc(doc);
    setShowAddDoc(true);
  };

  if (!user) return <p>Carregando...</p>;

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>Menu Principal &gt; </span>
          <span className={breadcrumbStyles.breadcrumbActive}>Página do paciente</span>
        </div>
        <div className={styles.topBar}>
          <h1 className={styles.title}>Página do paciente</h1>
          <button className={styles.searchButton} onClick={() => setShowModal(true)}>
            Buscar paciente
          </button>
        </div>
        {selectedPaciente ? (
          <>
            <div className={styles.tabBar}>
              <button
                className={`${styles.tab} ${activeTab === 'resumo' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('resumo')}
              >
                Resumo
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'info' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('info')}
              >
                Informações
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'prontuario' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('prontuario')}
              >
                Prontuário
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'conversas' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('conversas')}
              >
                Conversas IA
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'documentos' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('documentos')}
              >
                Documentos
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'agendamentos' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('agendamentos')}
              >
                Agendamentos
              </button>
            </div>

            {activeTab === 'resumo' && (
              <div className={styles.card}>
                <div className={styles.resumoSections}>
                  <div className={`${styles.resumoSection}`}>

                      <div className={styles.resumoInner}>

                      {/* === Bloco básico ajustado === */}
                      <div className={styles.basicInfo}>
                        <div className={styles.basicInfoHeader}>
                          <img
                            src={selectedPaciente.foto || '/avatar.png'}
                            alt="Avatar"
                            className={styles.avatar}
                          />
                          <h2>{selectedPaciente.nome}</h2>
                        </div>

                        <div className={styles.basicInfoDetails}>
                          {/* Sexo */}
                          <p>
                            <User size={19} strokeWidth={3} />
                            <span>{selectedPaciente.sexo || '–'}</span>
                          </p>

                          {/* Idade */}
                          <p>
                            <Calendar size={19} strokeWidth={3} />
                            <span>
                              {selectedPaciente.idade != null
                                ? `${selectedPaciente.idade} anos`
                                : '– anos'}
                            </span>
                          </p>

                          {/* Telefone */}
                          <p>
                            <Phone size={19} strokeWidth={3} />
                            <span>{selectedPaciente.telefone || '–'}</span>
                          </p>

                          {/* CPF */}
                          <p>
                            <FileText size={19} strokeWidth={3} />
                            <span>{selectedPaciente.cpf || '–'}</span>
                          </p>
                        </div>
                      </div>

                      {/* === Coluna direita: cards Histórico + Observações === */}
                      <div className={styles.cardsContainer}>
                        {/* ...seus whiteCards aqui... */}
                      </div>
                    </div>
                  </div>

                  <div className={`${styles.resumoSection} ${styles.whiteCard}`}>
                    <h3 className={styles.sectionTitle}>Histórico</h3>
                    <div className={styles.historyGrid}>
                      {/* Agendamentos */}
                      <div className={styles.historyItem}>
                        <span className={styles.sectionTitle}>
                          {selectedPaciente.numAgendamentos ?? 0}
                        </span>
                        <span className={styles.historyLabel}>
                          agendamentos
                        </span>
                      </div>

                      {/* Cancelamentos */}
                      <div className={styles.historyItem}>
                        <span className={styles.sectionTitle}>
                          {selectedPaciente.numCancelamentos ?? 0}
                        </span>
                        <span className={styles.historyLabel}>
                          cancelamentos
                        </span>
                      </div>

                      {/* Receita */}
                      <div className={styles.historyItem}>
                        <span className={styles.sectionTitle}>
                          R$ {selectedPaciente.receita?.toLocaleString('pt-BR') ?? '0,00'}
                        </span>
                        <span className={styles.historyLabel}>
                          em receita
                        </span>
                      </div>

                      {/* Convênio */}
                      <div className={styles.historyItem}>
                        <span className={styles.sectionTitle}>
                          {selectedPaciente.convenio || '–'}
                        </span>
                        <span className={styles.historyLabel}>
                          convênio
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`${styles.resumoSection} ${styles.whiteCard}`}>
                    <h3 className={styles.sectionTitle}>Observações</h3>
                    {selectedPaciente.observacoes?.length ? (
                      <ul className={styles.list}>
                        {selectedPaciente.observacoes.map((obs: string, i: number) => (
                          <li key={i} className={styles.listItem}>{obs}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.emptyState}>Sem observações registradas.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

              {activeTab === "info" && (
                <div className={`${styles.infoTab} ${styles.whiteCard}`}>
                  <div className={styles.infoLayout}>
                    <div className={styles.basicInfoSection}>
                      <h3 className={styles.sectionTitle}>Informações Básicas</h3>
                      <ul className={styles.infoList}>
                        <li><strong>Nome Completo:</strong> {selectedPaciente.nome}</li>
                        <li><strong>Sexo:</strong> {selectedPaciente.sexo}</li>
                        <li><strong>Idade:</strong> {selectedPaciente.idade} anos</li>
                        <li><strong>Data de Nascimento:</strong> {selectedPaciente.dataNascimento || "Não informado"}</li>
                        <li><strong>Telefone:</strong> {selectedPaciente.telefone || "Não informado"}</li>
                        <li><strong>Email:</strong> {selectedPaciente.email || "Não informado"}</li>
                        <li><strong>Convênio:</strong> {selectedPaciente.convenio || "Não informado"}</li>
                      </ul>
                    </div>
                    <div className={styles.divider}></div>
                    <div className={styles.addressSection}>
                      <h3 className={styles.sectionTitle}>Endereço</h3>
                      <ul className={styles.infoList}>
                        <li><strong>CEP:</strong> {selectedPaciente.endereco?.cep || "Não informado"}</li>
                        <li><strong>Logradouro:</strong> {selectedPaciente.endereco?.logradouro || "Não informado"}</li>
                        <li><strong>Número:</strong> {selectedPaciente.endereco?.numero || "Não informado"}</li>
                        <li><strong>Complemento:</strong> {selectedPaciente.endereco?.complemento || "Não informado"}</li>
                        <li><strong>Bairro:</strong> {selectedPaciente.endereco?.bairro || "Não informado"}</li>
                        <li><strong>Estado:</strong> {selectedPaciente.endereco?.estado || "Não informado"}</li>
                        <li><strong>Cidade:</strong> {selectedPaciente.endereco?.cidade || "Não informado"}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

            {activeTab === 'prontuario' && (
              <p style={{ textAlign: 'center' }}>Nenhuma evolução cadastrada.</p>
            )}

            {activeTab === 'conversas' && (
              <p style={{ textAlign: 'center' }}>Nenhuma conversa registrada.</p>
            )}

            {activeTab === 'documentos' && (
              <div>
                <button
                  className={`${styles.searchButton} ${styles.addDocButton}`}
                  type="button"
                  onClick={() => setShowAddDoc(true)}
                >
                  Adicionar documento
                </button>
                {showAddDoc && (
                  <div className={styles.modalOverlay} onClick={() => setShowAddDoc(false)}>
                    <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
                      <h2 className={styles.sectionTitle}>Novo Documento</h2>
                      <div className={styles.documentForm}>
                        <input
                          type="text"
                          placeholder="Título do documento"
                          value={docTitle}
                          onChange={e => setDocTitle(e.target.value)}
                        />
                        <textarea
                          placeholder="Descrição"
                          value={docDesc}
                          onChange={e => setDocDesc(e.target.value)}
                          className={styles.textArea}
                        />
                        <input
                          type="file"
                          onChange={e => setDocFile(e.target.files ? e.target.files[0] : null)}
                        />
                        <div className={styles.addDocActions}>
                          <button
                            type="button"
                            className={styles.btnCancelar}
                            onClick={() => setShowAddDoc(false)}
                          >
                            Cancelar
                          </button>
                          <button
                            className={styles.searchButton}
                            type="button"
                            onClick={handleSaveDocumento  }
                            disabled={uploadingDoc}
                          >
                            {uploadingDoc ? 'Enviando...' : 'Salvar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className={styles.whiteCard} style={{ marginTop: 16 }}>
                  {selectedPaciente.documentos && selectedPaciente.documentos.length > 0 ? (
                    <div>
                      {selectedPaciente.documentos.map((d: any, idx: number) => (
                        <div key={idx} className={styles.documentCard}>
                          <div className={styles.documentHeader}>
                            <h3 className={styles.sectionTitle}>{d.titulo}</h3>
                            <div className={styles.documentActions}>
                              <button
                                type="button"
                                onClick={() => { handleEditDocumento(d); }}
                                className={styles.editButton}
                                title="Editar documento"
                              >
                                <PenLine size={18} />
                              </button>
                              <a
                                href={d.url}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.downloadLink}
                                title="Baixar documento"
                              >
                                <Download size={22} />
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  setDocToDelete(d);
                                  setIsDeleteModalOpen(true);
                                }}
                                className={styles.trashButton}
                                title="Remover documento"
                              >
                                <Trash size={22} />
                              </button>
                            </div>
                          </div>
                          {d.descricao && <p className={styles.documentDesc}>{d.descricao}</p>}
                          <p className={styles.documentDate}>
                            {d.dataEnvio ? formatDateFns(d.dataEnvio.toDate(), 'dd/MM/yyyy') : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Nenhum documento enviado.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'agendamentos' && (
              <div>
                {selectedPaciente.agendamentos && selectedPaciente.agendamentos.length > 0 ? (
                  [...selectedPaciente.agendamentos]
                    .sort((a: any, b: any) => {
                      const da = a.data ? (a.data.includes('-') ? parseDateFns(a.data, 'yyyy-MM-dd', new Date()) : parseDateFns(a.data, 'dd/MM/yyyy', new Date())) : new Date(0);
                      const db = b.data ? (b.data.includes('-') ? parseDateFns(b.data, 'yyyy-MM-dd', new Date()) : parseDateFns(b.data, 'dd/MM/yyyy', new Date())) : new Date(0);
                      if (da.getTime() !== db.getTime()) return da.getTime() - db.getTime();
                      if (a.hora && b.hora) {
                        return a.hora.localeCompare(b.hora);
                      }
                      return 0;
                    })
                    .map((a: any, idx: number) => (
                      <div key={idx} className={styles.agendamentoCard}>
                        <div className={styles.agendamentoHeader}>
                          <span>
                            {(() => {
                              try {
                                const parsed = a.data.includes('-')
                                  ? parseDateFns(a.data, 'yyyy-MM-dd', new Date())
                                  : parseDateFns(a.data, 'dd/MM/yyyy', new Date());
                                return `${formatDateFns(parsed, 'dd/MM/yyyy')} · ${a.hora || ''}`.trim();
                              } catch {
                                return `${a.data} ${a.hora || ''}`.trim();
                              }
                            })()}{' '}
                            <span className={`${styles.statusBadge} ${statusClassMap[a.status] || styles.statusAgendado}`}>{a.status}</span>
                          </span>
                        </div>
                        <div className={styles.agendamentoInfo}>
                          <p><User size={19} strokeWidth={3} /> {a.profissional}</p>
                          {(() => {
                            const esp = a.especialidade || medicos.find(m => m.id === a.profissional || m.nome === a.profissional)?.especialidade;
                            return esp ? (
                              <p><Stethoscope size={19} strokeWidth={3} /> Especialidade: {esp}</p>
                            ) : null;
                          })()}
                          {a.procedimento && <p><FileText size={19} strokeWidth={3} /> Procedimento: {a.procedimento}</p>}
                          {a.motivo && <p><ClipboardList size={19} strokeWidth={3} /> Motivo: {a.motivo}</p>}
                        </div>
                        <button className={styles.detailsButton} type="button" onClick={() => openDetails(a)}>
                          Ver detalhes
                        </button>
                      </div>
                    ))
                ) : (
                  <p>Nenhum agendamento.</p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className={styles.subtitlePacientes}>Nenhum paciente selecionado.</p>
        )}

        {showModal && (
          <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
              <input
                type="text"
                placeholder="Buscar paciente"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className={styles.searchInput}
              />
              <ul className={styles.patientList}>
                {pacientes
                  .filter(p => p.nome.toLowerCase().includes(query.toLowerCase()))
                  .map(p => (
                    <li
                      key={p.id}
                      className={styles.patientItem}
                      onClick={() => selectPaciente(p.id)}
                    >
                      {p.nome} {p.cpf ? `- ${p.cpf}` : ''}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      <AppointmentDetailsModal
        appointment={selectedAppointment}
        isOpen={detailsOpen}
        onClose={closeDetails}
        readOnly
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        message="Você tem certeza que deseja excluir este documento?"
        onConfirm={() => {
          if (docToDelete) handleDeleteDocumento(docToDelete);
        }}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDocToDelete(null);
        }}
      />
    </ProtectedRoute>
  );
}

export default PaginaPaciente;
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { auth } from '@/firebase/firebaseConfig';
import styles from '@/styles/admin/prontuario/prontuario.module.css';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import { buscarPacientesComDetalhes, PacienteDetails, buscarPacientePorId } from '@/functions/pacientesFunctions';
import { format, parseISO } from 'date-fns';
import { User, FileText } from 'lucide-react';

const Prontuario = () => {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [pacientes, setPacientes] = useState<PacienteDetails[]>([]);
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<any | null>(null);
  const [consultasLimit, setConsultasLimit] = useState(5);

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

  const selectPaciente = async (id: string) => {
    try {
      const doc = await buscarPacientePorId(id);
      setSelectedPaciente(doc);
      setShowModal(false);
    } catch (err) {
      console.error('Erro ao buscar paciente', err);
    }
  };

  const agendamentosOrdenados = selectedPaciente?.agendamentos
    ? [...selectedPaciente.agendamentos].sort(
        (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()
      )
    : [];

  const agendamentosFiltrados = agendamentosOrdenados.slice(0, consultasLimit);

  const evolucoesOrdenadas = selectedPaciente?.prontuarios
    ? [...selectedPaciente.prontuarios].sort(
        (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()
      )
    : [];

  if (!user) return <p>Carregando...</p>;

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>Menu Principal &gt; 
            <span className={breadcrumbStyles.breadcrumbActive}> Prontuário</span>
          </span>
          
        </div>

        <div className={styles.topBar}>

          <div className={styles.pageHeader}>
            <h1 className={styles.title}>Prontuário</h1>
            <h2 className={styles.subtitle}>Página de prontuários da clínica</h2>
          </div>

          <div className={styles.topActions}>
            <button className={styles.searchButton} onClick={() => setShowModal(true)}>Buscar paciente</button>
          </div>
        </div>
        {selectedPaciente ? (
          <>
            <div className={styles.actionButtonsWrapper}>
              <button className={styles.primaryButton}>Iniciar atendimento</button>
              <button className={styles.primaryButton}>Registrar informação avulsa</button>
              <button className={styles.primaryButton}>Ver prescrições</button>
            </div>

            <div className={styles.card}>
              <div className={styles.patientInfo}>
                {selectedPaciente.foto && (
                  <img
                    src={selectedPaciente.foto}
                    alt={selectedPaciente.nome}
                    className={styles.patientPhoto}
                  />
                )}
                <div>
                  <h3 className={styles.patientName}>{selectedPaciente.nome}</h3>
                  <p className={styles.patientDetails}>
                    {selectedPaciente.sexo || 'Sexo não informado'}
                    {selectedPaciente.idade ? ` | ${selectedPaciente.idade} anos` : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Histórico de evoluções</h3>
              {evolucoesOrdenadas.length > 0 ? (
                <ul className={styles.evolucaoList}>
                  {evolucoesOrdenadas.map((ev: any, index: number) => (
                    <li key={index} className={styles.evolucaoItem}>
                      <span className={styles.evolucaoDate}>
                        {format(parseISO(ev.data), 'dd/MM/yy')}
                      </span>
                      <span className={styles.evolucaoResumo}>
                        {ev.diagnostico || ev.procedimentos || ''}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.noEvolucoes}>Não existe evoluções registradas</p>
              )}
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Histórico de consultas</h3>
              <div className={styles.filterContainer}>
                <label>
                  Quantidade:
                  <select
                    value={consultasLimit}
                    onChange={e => setConsultasLimit(Number(e.target.value))}
                    className={styles.filterInput}
                  >
                    {[5, 10, 20, 30, 40, 50, 70, 100].map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {agendamentosFiltrados.length > 0 ? (
                agendamentosFiltrados.map((ag: any, index: number) => (
                  <div key={index} className={styles.agendamentoCard}>
                    <div className={styles.agendamentoHeader}>
                      <span>
                        {format(parseISO(ag.data), 'dd/MM/yy')}
                        {ag.hora ? ` · ${ag.hora}` : ''}
                      </span>
                      {ag.status && (
                        <span className={`${styles.statusBadge} ${statusClassMap[ag.status] || styles.statusAgendado}`}>
                          {ag.status}
                        </span>
                      )}
                    </div>
                    {(ag.profissional || ag.procedimento) && (
                      <div className={styles.agendamentoInfo}>
                        {ag.profissional && <p><User size={16} strokeWidth={3} /> <strong>Profissional:</strong>{ag.profissional}</p>}
                        {ag.procedimento && <p><FileText size={16} strokeWidth={3} /> <strong>Procedimento:</strong> {ag.procedimento}</p>}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p>Nenhum agendamento.</p>
              )}
            </div>
          </>
        ) : (
          <p className={styles.noPaciente}>Nenhum paciente selecionado.</p>
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
                      {p.nome} {p.idade ? `(${p.idade})` : ''} {p.cpf ? `- ${p.cpf}` : ''}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default Prontuario;
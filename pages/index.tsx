import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebase/firebaseConfig';
import { buscarAgendamentosDeHoje, statusAgendamento } from '@/functions/agendamentosFunction';
import { buscarNotificacoes, NotificacaoData, marcarNotificacoesLidas, } from '@/functions/notificacoesFunctions';
import { onAuthStateChanged } from 'firebase/auth';
import styles from '@/styles/Home.module.css';
import { format } from 'date-fns';
import SidebarAdmin from '@/components/layout/SidebarAdmin';
import Sidebar from '@/components/layout/Sidebar';
import Link from 'next/link';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import AppointmentDetailsModal from '@/components/modals/AppointmentDetailsModal';
import { Calendar, Pill } from 'lucide-react';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip);

const Index = () => {
  interface User {
    uid: string;
    email: string | null;
    tipo: string;
  }

  const [user, setUser] = useState<User | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<{ id: string; nome: string }[]>([]);
  const [selectedProfissional, setSelectedProfissional] = useState<string>('');
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pacientesPorDia, setPacientesPorDia] = useState<{ [dia: string]: number }>({});

  const statusClassMap: Record<string, string> = {
    [statusAgendamento.AGENDADO]: styles.statusAgendado,
    [statusAgendamento.CONFIRMADO]: styles.statusConfirmado,
    [statusAgendamento.CANCELADO]: styles.statusCancelado,
    [statusAgendamento.CONCLUIDO]: styles.statusConcluido,
    [statusAgendamento.PENDENTE]: styles.statusPendente,
  };

  const router = useRouter();

  const fetchHoje = async () => {
    try {
      const appointments = await buscarAgendamentosDeHoje();
      setTodayAppointments(appointments.slice(0, 5));
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userQuery = query(
            collection(firestore, 'users'),
            where('__name__', '==', currentUser.uid)
          );
          const userSnapshot = await getDocs(userQuery);

          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            const userType = userData.tipo || 'client';
            setUser({ ...currentUser, tipo: userType });
          } else {
            setUser({ ...currentUser, tipo: 'client' });
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
        }
      } else {
        setUser(null);
      }
    });

    fetchHoje();

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user && user.tipo !== 'admin') {
      router.replace('/paciente/indexCliente');
    }
  }, [user, router]);

  useEffect(() => {
    const fetchPacientesPorDia = async () => {
      const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const counts: { [dia: string]: number } = {};
      diasSemana.forEach(dia => { counts[dia] = 0; });

      try {
        const snap = await getDocs(collection(firestore, 'agendamentos'));
        snap.docs.forEach(docRef => {
          const data = docRef.data();
          if (data.data) {
            const dateObj = new Date(data.data + 'T00:00:00');
            const diaSemana = diasSemana[dateObj.getDay()];
            counts[diaSemana] = (counts[diaSemana] || 0) + 1;
          }
        });
        setPacientesPorDia(counts);
      } catch {
        setPacientesPorDia({});
      }
    };
    fetchPacientesPorDia();

    // Buscar profissionais para o filtro
    const fetchProfissionais = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'profissionais'));
        const list = snap.docs.map(doc => ({ id: doc.id, nome: doc.data().nome }));
        setProfissionais(list);
      } catch {
        setProfissionais([]);
      }
    };
    fetchProfissionais();
  }, []);

  const openDetails = (ag: any) => {
    setSelectedAppointment(ag);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setSelectedAppointment(null);
    setDetailsOpen(false);
  };

  const handleComplete = async (id: string) => {
    try {
      await updateDoc(doc(firestore, 'agendamentos', id), { status: statusAgendamento.CONCLUIDO });
      await fetchHoje();
      closeDetails();
    } catch (error) {
      console.error('Erro ao concluir agendamento:', error);
    }
  };

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const pacientesData = diasSemana.map(dia => pacientesPorDia[dia] || 0);

  const chartData = {
    labels: diasSemana,
    datasets: [
      {
        label: 'Pacientes por dia',
        data: pacientesData,
        backgroundColor: '#2563eb',
        borderRadius: 8,
        barThickness: 32,
        maxBarThickness: 40,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#8b98a9', font: { size: 14, weight: 600 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: '#f1f1f1' },
        ticks: { color: '#8b98a9', font: { size: 14 } },
        suggestedMax: Math.max(...pacientesData, 100) + 1
      }
    }
  };

  // Lista de notificações
  const [notificacoes, setNotificacoes] = useState<NotificacaoData[]>([]);

  useEffect(() => {
    const fetchNotificacoes = async () => {
      try {
        const list = await buscarNotificacoes({
          apenasNaoLidas: true,
        });
        setNotificacoes(list);
      } catch {}
    };
    fetchNotificacoes();
  }, []);

  // Estado para abrir/fechar popup de notificações
  const [notificacoesOpen, setNotificacoesOpen] = useState(false);
  const notificacoesRef = useRef<HTMLDivElement>(null);

  const handleLimparNotificacoes = async () => {
    const ids = notificacoes.map(n => n.id as string).filter(Boolean);
    if (ids.length) {
      await marcarNotificacoesLidas(ids);
    }
    setNotificacoes([]);
  };

  // Fecha popup ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificacoesRef.current &&
        !notificacoesRef.current.contains(event.target as Node)
      ) {
        setNotificacoesOpen(false);
      }
    }
    if (notificacoesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificacoesOpen]);

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        {/* Sininho de notificação no topo direito */}
        <div className={styles.notificationBellContainer}>
          <button
            className={styles.bellButton}
            onClick={() => setNotificacoesOpen((v) => !v)}
            aria-label="Abrir notificações"
          >
            {/* Ícone de sino */}
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
              <path d="M18 16v-5a6 6 0 10-12 0v5a2 2 0 01-2 2h16a2 2 0 01-2-2z" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21a2 2 0 01-3.46 0" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {/* Badge de quantidade de notificações */}
            <span className={styles.notificationBadge}>{notificacoes.length}</span>
          </button>
          {/* Popup de notificações */}
          {notificacoesOpen && (
            <div
              ref={notificacoesRef}
              className={styles.notificationPopup}
            >
              <div className={styles.notificationHeaderColumn}>
                <span className={styles.notificationHeaderTitle}>Notificações</span>
                <div className={styles.notificationHeaderActionsRow}>
                  <Link href="/notificacoes" className={styles.notificationViewAll}>Ver todas</Link>
                  <button
                    className={styles.notificationClearButton}
                    onClick={handleLimparNotificacoes}
                  >
                    Limpar notificações
                  </button>
                </div>
              </div>
              <ul className={styles.notificationList}>
                {notificacoes.length === 0 ? (
                  <li className={styles.notificationEmpty}>Não há notificações</li>
                ) : (
                  notificacoes.slice(0, 5).map((n) => (
                    <li
                      key={n.id}
                      className={styles.notificationItem}
                      onClick={() => router.push(`/notificacoes/${n.id}`)}
                    >
                      {/* Círculo de status */}
                      <span
                        className={styles.notificationIcon}
                        style={{
                          background:
                            n.icone === 'red'
                              ? '#ef4444'
                              : n.icone === 'yellow'
                              ? '#fbbf24'
                              : n.icone === 'green'
                              ? '#22c55e'
                              : '#8b98a9',
                        }}
                      >
                        {n.tipo === 'agendamento' && <Calendar size={12} />}
                        {n.tipo === 'farmacia' && <Pill size={12} />}
                      </span>
                      <div className={styles.notificationContent}>
                        <div className={styles.notificationTitle}>{n.titulo}</div>
                        <div className={styles.notificationDescription}>{n.descricao}</div>
                      </div>
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className={styles.notificationArrow}>
                        <path d="M9 18l6-6-6-6" stroke="#8b98a9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
        {/* Fim do sininho */}

        <SidebarAdmin />

        <div className={styles.mainContent}>
          <div className={styles.formContainer}>
            <div className={breadcrumbStyles.breadcrumbWrapper}>
              <span className={breadcrumbStyles.breadcrumb}>
                Menu Principal &gt; <span className={breadcrumbStyles.breadcrumbActive}>Dashboard</span>
              </span>
            </div>
            <h2 className={styles.titleDashboard}>Dashboard</h2>
            <div className={styles.dashboardSubtitle}>
              Acesse uma visão detalhada de métricas e resultados dos pacientes
            </div>

            <div className={styles.pacientesChartBox}>
              <div className={styles.pacientesChartTitle}>
                Volume de Pacientes por Dia da Semana
              </div>
              <Bar data={chartData} options={chartOptions} height={180} />
            </div>

            <div className={styles.upcomingAppointments}>
              <h3 className={styles.upcomingTitle}>Agendamentos</h3>
              <table className={styles.upcomingTable}>
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Data</th>
                    <th>Doutor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Filtro de profissionais */}
                  <tr>
                    <td colSpan={5} className={styles.filterProfissionalCell}>
                      <div className={styles.filterProfissionalWrapper}>
                        <label htmlFor="filtro-profissional" className={styles.filterProfissionalLabel}>Filtrar por profissional:</label>
                        <select
                          id="filtro-profissional"
                          className={styles.filterProfissionalSelect}
                          value={selectedProfissional}
                          onChange={e => setSelectedProfissional(e.target.value)}
                        >
                          <option value="">Todos</option>
                          {profissionais.map(p => (
                            <option key={p.id} value={p.nome}>{p.nome}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                  {/* Lista de agendamentos filtrada */}
                  {todayAppointments.length > 0 ? (
                    todayAppointments
                      .filter(appointment =>
                        !selectedProfissional || appointment.profissional === selectedProfissional
                      )
                      .map((appointment) => (
                        <tr key={appointment.id}>
                          <td className={styles.upcomingPacienteCell}>
                            {appointment.nomePaciente
                              ? appointment.nomePaciente
                              : (Array.isArray(appointment.nomesPacientes) && appointment.nomesPacientes.length > 0
                                ? appointment.nomesPacientes[0]
                                : '')}
                          </td>
                          <td>
                            {appointment.data && appointment.hora
                              ? `${format(new Date(appointment.data + 'T' + appointment.hora), 'dd/MM/yy, HH:mm')}`
                              : ''}
                          </td>
                          <td className={styles.upcomingDoutorCell}>
                            {appointment.profissional || appointment.funcionaria || ''}
                          </td>
                          <td>
                            <span
                              className={`${styles.statusBadge} ${
                                statusClassMap[appointment.status] || styles.statusAgendado
                              }`}
                            >
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </span>
                          </td>
                          <td>
                            <button onClick={() => openDetails(appointment)} className={styles.externalLink} title="Ver detalhes">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                                <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={4} className={styles.noAppointments}>Nenhum agendamento encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.sidebarRight}>
            <Sidebar />
          </div>
        </div>
      </div>
      <AppointmentDetailsModal
        appointment={selectedAppointment}
        isOpen={detailsOpen}
        onClose={closeDetails}
        onComplete={handleComplete}
      />
    </ProtectedRoute>
  );
};

export default Index;

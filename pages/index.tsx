import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebase/firebaseConfig';
import { buscarAgendamentosDeHoje, statusAgendamento } from '@/functions/agendamentosFunction';
import { onAuthStateChanged } from 'firebase/auth';
import styles from '@/styles/Home.module.css';
import { format } from 'date-fns';
import SidebarAdmin from '@/components/layout/SidebarAdmin';
import Sidebar from '@/components/layout/Sidebar';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import AppointmentDetailsModal from '@/components/modals/AppointmentDetailsModal';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip);

const Index = () => {
  interface User {
    uid: string;
    email: string | null;
    tipo: string;
  }

  const [user, setUser] = useState<User | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
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
        ticks: { color: '#8b98a9', font: { size: 13 } },
        suggestedMax: Math.max(...pacientesData, 5) + 1
      }
    }
  };

  // Notificações estáticas (mock)
  const notificacoesMock = [
    {
      id: 1,
      tipo: 'danger',
      titulo: 'Pagamento pendente: João da...',
      descricao: 'Hoje às 10:40',
      icone: 'red'
    },
    {
      id: 2,
      tipo: 'warning',
      titulo: 'Medicamento vencendo: Cod...',
      descricao: 'Ontem às 09:15',
      icone: 'yellow'
    },
    {
      id: 3,
      tipo: 'success',
      titulo: 'Dipirona adicionada ao estoque',
      descricao: 'Ontem às 15:22',
      icone: 'green'
    },
    {
      id: 4,
      tipo: 'info',
      titulo: 'Consulta ausente: Maria Alvv',
      descricao: '18 de abril, 2024',
      icone: 'gray'
    }
  ];

  // Estado para abrir/fechar popup de notificações
  const [notificacoesOpen, setNotificacoesOpen] = useState(false);
  const notificacoesRef = useRef<HTMLDivElement>(null);

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
        <div style={{
          position: 'fixed',
          top: 24,
          right: 40,
          zIndex: 100
        }}>
          <button
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative'
            }}
            onClick={() => setNotificacoesOpen((v) => !v)}
            aria-label="Abrir notificações"
          >
            {/* Ícone de sino */}
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
              <path d="M18 16v-5a6 6 0 10-12 0v5a2 2 0 01-2 2h16a2 2 0 01-2-2z" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21a2 2 0 01-3.46 0" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {/* Badge de quantidade de notificações */}
            <span style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              fontSize: 12,
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              border: '2px solid #fff'
            }}>
              8
            </span>
          </button>
          {/* Popup de notificações */}
          {notificacoesOpen && (
            <div
              ref={notificacoesRef}
              style={{
                position: 'absolute',
                top: 40,
                right: 0,
                width: 340,
                background: '#fff',
                borderRadius: 18,
                boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
                padding: '18px 0 0 0',
                zIndex: 200
              }}
            >
              <div style={{
                fontWeight: 700,
                fontSize: 20,
                padding: '0 24px 12px 24px',
                borderBottom: '1px solid #f1f1f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                Notificações
                <a href="#" style={{
                  fontWeight: 400,
                  fontSize: 15,
                  color: '#2563eb',
                  textDecoration: 'none'
                }}>Ver todas</a>
              </div>
              <ul style={{
                listStyle: 'none',
                margin: 0,
                padding: 0
              }}>
                {notificacoesMock.map((n) => (
                  <li key={n.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderBottom: '1px solid #f1f1f1',
                    cursor: 'pointer'
                  }}>
                    {/* Círculo de status */}
                    <span style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      marginRight: 16,
                      background:
                        n.icone === 'red' ? '#ef4444'
                        : n.icone === 'yellow' ? '#fbbf24'
                        : n.icone === 'green' ? '#22c55e'
                        : '#8b98a9',
                      display: 'inline-block'
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: 500,
                        fontSize: 15,
                        color: '#222',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 200
                      }}>{n.titulo}</div>
                      <div style={{
                        fontSize: 13,
                        color: '#8b98a9',
                        marginTop: 2
                      }}>{n.descricao}</div>
                    </div>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" style={{ marginLeft: 12 }}>
                      <path d="M9 18l6-6-6-6" stroke="#8b98a9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </li>
                ))}
              </ul>
              <div style={{ height: 8 }} />
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
                  {todayAppointments.length > 0 ? (
                    todayAppointments.map((appointment) => (
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

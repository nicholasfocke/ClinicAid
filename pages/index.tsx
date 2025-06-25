import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { useState, useEffect } from 'react';
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

  return (
    <ProtectedRoute>
      <div className={styles.container}>
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

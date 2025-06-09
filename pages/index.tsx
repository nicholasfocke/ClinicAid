import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Calendar from 'react-calendar';
import Modal from 'react-modal';
import 'react-calendar/dist/Calendar.css';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, firestore } from '../firebase/firebaseConfig';
import { buscarAgendamentosDeHoje, buscarHorariosDisponiveis, buscarDiasBloqueados, bloquearDiaParaFuncionario, buscarHorariosBloqueados,
  criarAgendamento, bloquearDia, bloquearHorario, enviarEmailDeConfirmacao} from '@/functions/agendamentosFunction';
import { onAuthStateChanged } from 'firebase/auth';
import styles from "@/styles/Home.module.css";
import { format, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SidebarAdmin from '@/components/layout/SidebarAdmin';
import Sidebar from '@/components/layout/Sidebar';
import Breadcrumb from '@/components/Breadcrumb';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import breadcrumbStyles from "@/styles/Breadcrumb.module.css";
import AppointmentDetailsModal from '@/components/modals/AppointmentDetailsModal';

Modal.setAppElement('#__next');

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip);

const Index = () => {
  interface User {
    uid: string;
    email: string | null;
    tipo: string;
  }

  interface Profissional {
    id: string;
    nome: string;
    empresaId: string;
  }

  const [user, setUser] = useState<User | null>(null);
  const [appointmentData, setAppointmentData] = useState({
    date: '',
    times: [''],
    nomesPacientes: [''],
    profissional: '',
    detalhes: '',
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [blockedDays, setBlockedDays] = useState<string[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<{ date: string; time: string; profissional: string }[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([
    { id: 'emilio', nome: 'Emilio', empresaId: 'default' }
  ]);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [pacientesPorDia, setPacientesPorDia] = useState<{ [dia: string]: number }>({});

  const standardTimes = [
    '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30',
  ];

  const adminTimes = [
    '08:40', '09:40', '10:40', '11:40', '13:40', '14:40', '15:40', '16:40', '17:40', '18:40',
  ];

  const router = useRouter();

  const fetchHoje = async () => {
    try {
      const appointments = await buscarAgendamentosDeHoje();
      setTodayAppointments(appointments);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    }
  };

  const fetchHorariosDisponiveis = async (date: Date | null, profissional: string) => {
    if (!date || !profissional) return;

    setIsLoadingTimes(true);

    try {
      const times = await buscarHorariosDisponiveis(
        date,
        profissional,
        user?.tipo,
        blockedTimes,
        standardTimes,
        adminTimes
      );
      setAvailableTimes(times);
    } catch (error) {
      console.error('Erro ao buscar horários disponíveis:', error);
    } finally {
      setIsLoadingTimes(false);
    }
  };

  const fetchDiasBloqueados = async () => {
    try {
      const days = await buscarDiasBloqueados();
      setBlockedDays(days);
    } catch (error) {
      console.error('Erro ao buscar dias bloqueados:', error);
    }
  };

  const handleBloquearDiaFuncionario = async () => {
    if (!selectedDate || !appointmentData.profissional) return;

    try {
      await bloquearDiaParaFuncionario(selectedDate, appointmentData.profissional);
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      setBlockedTimes((prev) => [
        ...prev,
        { date: formattedDate, time: 'all', profissional: appointmentData.profissional },
      ]);
      setError('');
    } catch (error) {
      console.error('Erro ao bloquear o dia do profissional:', error);
      setError('Erro ao bloquear o dia do profissional. Tente novamente.');
    }
  };

  const fetchHorariosBloqueados = async (date: Date) => {
    try {
      const times = await buscarHorariosBloqueados(date);
      setBlockedTimes(times);
    } catch (error) {
      console.error('Erro ao buscar horários bloqueados:', error);
    }
  };

  useEffect(() => {
    if (selectedDate && appointmentData.profissional) {
      fetchHorariosDisponiveis(selectedDate, appointmentData.profissional);
    }
  }, [selectedDate, appointmentData.profissional, user, blockedTimes]);

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

    fetchDiasBloqueados();
    fetchHoje();

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchProfissionais = async () => {
      if (!user) return;
      let empresaId = null;
      if (user.tipo === 'admin') {
        const empresaDoc = await getDocs(query(collection(firestore, 'empresas'), where('adminId', '==', user.uid)));
        if (!empresaDoc.empty) {
          empresaId = empresaDoc.docs[0].id;
        }
      } else {
        const empresaDoc = await getDocs(collection(firestore, 'empresas'));
        if (!empresaDoc.empty) {
          empresaId = empresaDoc.docs[0].id;
        }
      }
      if (!empresaId) return;

      const profissionaisSnap = await getDocs(query(collection(firestore, 'profissionais'), where('empresaId', '==', empresaId)));
      const profs: Profissional[] = profissionaisSnap.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome,
        empresaId: doc.data().empresaId,
      }));

      const emilioExists = profs.some(p => p.nome === 'Emilio');
      if (!emilioExists) {
        profs.unshift({ id: 'emilio', nome: 'Emilio', empresaId });
      }
      setProfissionais(profs);
    };

    fetchProfissionais();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAppointmentData((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }));
  };

  const handleNomePacienteChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newNomesPacientes = [...appointmentData.nomesPacientes];
    newNomesPacientes[index] = e.target.value;
    setAppointmentData((prevData) => ({
      ...prevData,
      nomesPacientes: newNomesPacientes,
    }));
  };

  const handleTimeClick = (time: string, index: number) => {
    if (!availableTimes.includes(time)) {
      setError('Este horário já foi reservado. Escolha outro horário disponível.');
      return;
    }

    const newTimes = [...appointmentData.times];
    newTimes[index] = time;
    setAppointmentData((prevData) => ({
      ...prevData,
      times: newTimes,
    }));
    setError('');
  };

  const addChild = () => {
    setAppointmentData((prevData) => ({
      ...prevData,
      nomesPacientes: [...prevData.nomesPacientes, ''],
      times: [...prevData.times, ''],
    }));
  };

  const isDateValid = (date: Date) => {
    const today = new Date();
    const isMonday = date.getDay() === 1;
    const isSunday = date.getDay() === 0;
    const isPastDay = format(date, 'yyyy-MM-dd') < format(today, 'yyyy-MM-dd');
    const isNotCurrentYear = getYear(date) !== getYear(today);
    const isBlockedDay = blockedDays.includes(format(date, 'yyyy-MM-dd'));

    if (user?.tipo === 'admin') {
      return !isPastDay && !isNotCurrentYear;
    }

    return !isPastDay && !isMonday && !isSunday && !isNotCurrentYear && !isBlockedDay;
  };

  const handleDateClick = (date: Date) => {
    if (!isDateValid(date)) {
      setError('Você não pode agendar para datas passadas, domingos, segundas, anos fora do atual ou dias bloqueados.');
      setSelectedDate(null);
      return;
    }

    setSelectedDate(date);
    setAppointmentData({
      ...appointmentData,
      date: format(date, 'yyyy-MM-dd'),
    });
    setError('');
    setModalIsOpen(true);
    fetchHorariosBloqueados(date);
  };

  const handleEnviarEmail = async () => {
    try {
      if (!user?.email || !user.uid) {
        console.error('Usuário sem e-mail.');
        return;
      }
      await enviarEmailDeConfirmacao(user.email, user.uid, appointmentData);
    } catch (error) {
      console.error('Erro ao enviar o email:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      setError('Aguarde enquanto processamos seu agendamento.');
      return;
    }

    setIsSubmitting(true);

    if (!user) {
      setError('Você precisa estar logado para fazer um agendamento.');
      setIsSubmitting(false);
      return;
    }

    if (
      !appointmentData.profissional ||
      !appointmentData.date ||
      appointmentData.times.some(time => !time) ||
      appointmentData.nomesPacientes.some(nome => !nome)
    ) {
      setError('Todos os campos são obrigatórios.');
      setIsSubmitting(false);
      return;
    }

    if (appointmentData.nomesPacientes.length !== appointmentData.times.length) {
      setError('Erro interno: número de nomes e horários não correspondem.');
      setIsSubmitting(false);
      return;
    }

    if (
      availableTimes.length === 0 ||
      appointmentData.times.some(time => !availableTimes.includes(time))
    ) {
      setError('Um ou mais horários selecionados já foram reservados. Atualize a página e tente novamente.');
      setIsSubmitting(false);
      return;
    }

    try {
      await criarAgendamento(appointmentData, { uid: user.uid, email: user.email });

      await fetchHoje();

      await handleEnviarEmail();

      router.push('/admin/agendamentos');
    } catch (error: any) {
      console.error('Erro ao salvar agendamento:', error);
      setError(error?.message || 'Erro ao salvar o agendamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBloquearDia = async () => {
    if (!selectedDate) return;

    try {
      await bloquearDia(selectedDate);
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      setBlockedDays((prev) => [...prev, formattedDate]);
      setError('');
    } catch (error) {
      console.error('Erro ao bloquear o dia:', error);
      setError('Erro ao bloquear o dia. Tente novamente.');
    }
  };

  const handleBloquearHorario = async () => {
    if (!selectedDate || !appointmentData.times[0] || !appointmentData.profissional) return;

    try {
      await bloquearHorario(selectedDate, appointmentData.times[0], appointmentData.profissional);
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      setBlockedTimes((prev) => [
        ...prev,
        { date: formattedDate, time: appointmentData.times[0], profissional: appointmentData.profissional }
      ]);
      setError('');
    } catch (error) {
      console.error('Erro ao bloquear o horário:', error);
      setError('Erro ao bloquear o horário. Tente novamente.');
    }
  };

  const handleCancel = () => {
    setAppointmentData({
      date: '',
      times: [''],
      nomesPacientes: [''],
      profissional: '',
      detalhes: '',
    });
    setAvailableTimes([]);
    setModalIsOpen(false);
  };

  const openDetails = (ag: any) => {
    setSelectedAppointment(ag);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setSelectedAppointment(null);
    setDetailsOpen(false);
  };

  useEffect(() => {
    if (user && user.tipo !== 'admin') {
      router.replace('/indexCliente');
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

            <div className={styles.calendarAndAppointments}>
              <Calendar
                className={styles.reactCalendar}
                onClickDay={handleDateClick}
                value={selectedDate}
                tileDisabled={({ date }) => !isDateValid(date)}
                tileClassName={({ date, view }) =>
                  view === 'month' && blockedDays.includes(format(date, 'yyyy-MM-dd'))
                    ? styles.blockedDay
                    : ''
                }
              />

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
                      todayAppointments.slice(0, 4).map((appointment) => (
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
                            <span className={styles.statusConfirmado}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="11" stroke="#22c55e" strokeWidth="1.2" fill="#e7f9ef"/>
                                <path d="M8 12.5l2.5 2.5 5-5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Confirmado
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
          </div>

          {/* Sidebar centralizado na coluna da direita */}
          <div className={styles.sidebarRight}>
            <Sidebar />
          </div>
        </div>
      </div>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleCancel}
        className={styles.modalContent}
        overlayClassName={styles.modalOverlay}
      >
        <h3>Agendar Serviço para {format(selectedDate || new Date(), 'dd/MM/yyyy')}</h3>
        <form onSubmit={handleSubmit} className={styles.form}>
          {isSubmitting && (
            <div className={styles.modalLoadingOverlay}>
              <div className={styles.modalSpinner}></div>
              <span className={styles.modalLoadingText}>Aguarde...</span>
            </div>
          )}
          <div className={styles.inputGroup}>
            <select
              name="profissional"
              value={appointmentData.profissional}
              onChange={(e) => {
                setAppointmentData((prev) => ({ ...prev, profissional: e.target.value }));
                fetchHorariosDisponiveis(selectedDate, e.target.value);
              }}
              required
              className={styles.inputoption}
              disabled={isSubmitting}
            >
              <option value="">Selecione um profissional</option>
              {profissionais.map((prof) => (
                <option key={prof.id} value={prof.nome}>{prof.nome}</option>
              ))}
            </select>
          </div>

          {appointmentData.nomesPacientes.map((nome, index) => (
            <div key={index} className={styles.inputGroup}>
              <input
                type="text"
                name={`nomePaciente-${index}`}
                value={nome}
                onChange={(e) => handleNomePacienteChange(e, index)}
                placeholder="Nome do Paciente"
                required
                className={styles.inputnome}
                disabled={isSubmitting}
              />
            </div>
          ))}

          <div className={styles.inputGroup}>
            <textarea
              name="detalhes"
              value={appointmentData.detalhes}
              onChange={(e) => setAppointmentData((prev) => ({ ...prev, detalhes: e.target.value }))}
              placeholder="Descreva detalhadamente o motivo da consulta"
              className={styles.inputoption}
              rows={4}
              required
              disabled={isSubmitting}
            />
          </div>

          {isLoadingTimes ? (
            <p style={{ color: 'blue', fontWeight: 'bold', marginTop: '10px' }}>
              Carregando horários disponíveis...
            </p>
          ) : availableTimes.length > 0 ? (
            <div>
              <strong>Horários Disponíveis:</strong>
              <div className={styles.times}>
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    type="button"
                    className={`${styles.timeButton} ${appointmentData.times.includes(time) ? styles.activeTime : ''}`}
                    onClick={() => handleTimeClick(time, appointmentData.times.length - 1)}
                    disabled={!availableTimes.includes(time) || isSubmitting}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            appointmentData.profissional && !isLoadingTimes && (
              <p style={{ color: 'red', fontWeight: 'bold', marginTop: '10px' }}>
                Todos os horários nesta data para o profissional já foram reservados. Entre em contato conosco para possível encaixe.
              </p>
            )
          )}

          {user?.tipo === 'admin' && (
            <button
              type="button"
              onClick={handleBloquearDia}
              className={styles.blockButton}
              disabled={isSubmitting}
              style={isSubmitting ? { backgroundColor: '#ccc', color: '#888', cursor: 'not-allowed', border: 'none' } : {}}
            >
              Bloquear Dia
            </button>
          )}

          {user?.tipo === 'admin' && appointmentData.times[0] && (
            <button
              type="button"
              onClick={handleBloquearHorario}
              className={styles.blockButton}
              disabled={isSubmitting}
              style={isSubmitting ? { backgroundColor: '#ccc', color: '#888', cursor: 'not-allowed', border: 'none' } : {}}
            >
              Bloquear Horário
            </button>
          )}

          {user?.tipo === 'admin' && appointmentData.profissional && (
            <button
              type="button"
              onClick={handleBloquearDiaFuncionario}
              className={styles.blockButton}
              disabled={isSubmitting}
              style={isSubmitting ? { backgroundColor: '#ccc', color: '#888', cursor: 'not-allowed', border: 'none' } : {}}
            >
              Bloquear Dia do Profissional
            </button>
          )}

          {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={handleCancel}
              className={styles.buttonSecondary}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.button}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Aguarde...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </Modal>
      <AppointmentDetailsModal
        appointment={selectedAppointment}
        isOpen={detailsOpen}
        onClose={closeDetails}
      />
    </ProtectedRoute>
  );
};

export default Index;
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Calendar from 'react-calendar';
import Modal from 'react-modal';
import 'react-calendar/dist/Calendar.css';
import { collection, query, where, getDocs, setDoc, doc, writeBatch, runTransaction, orderBy } from 'firebase/firestore';
import { auth, firestore } from '../firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import styles from "@/styles/Home.module.css";
import { format, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SidebarAdmin from '@/components/SidebarAdmin'; // Importação do SidebarAdmin
import Sidebar from '@/components/Sidebar'; // Importação do Sidebar
import Breadcrumb from '@/components/Breadcrumb';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';

Modal.setAppElement('#__next'); // Necessário para acessibilidade

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
    times: [''], // Array para múltiplos horários
    nomesPacientes: [''], // Array para múltiplos nomes de pacientes
    profissional: '',
    detalhes: '',
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false); // Novo estado para evitar piscar a mensagem
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); //  Novo estado para bloquear múltiplos cliques
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [blockedDays, setBlockedDays] = useState<string[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<{ date: string, time: string, profissional: string }[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([
    { id: 'emilio', nome: 'Emilio', empresaId: 'default' }
  ]);

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

  const fetchTodayAppointments = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Busca os agendamentos do dia atual
      const todayAppointmentsQuery = query(
        collection(firestore, 'agendamentos'),
        where('data', '==', today),
        orderBy('hora', 'asc') // Ordena por horário
      );
      const todayAppointmentsSnapshot = await getDocs(todayAppointmentsQuery);

      if (!todayAppointmentsSnapshot.empty) {
        const appointments = todayAppointmentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTodayAppointments(appointments);
      } else {
        // Caso não existam agendamentos no dia atual, busca a data mais próxima com agendamentos futuros
        const futureAppointmentsQuery = query(
          collection(firestore, 'agendamentos'),
          where('data', '>=', today), // Inclui a data de hoje para garantir que agendamentos futuros sejam buscados
          orderBy('data', 'asc'),
          orderBy('hora', 'asc') // Ordena por data e horário
        );
        const futureAppointmentsSnapshot = await getDocs(futureAppointmentsQuery);

        if (!futureAppointmentsSnapshot.empty) {
          const appointments = futureAppointmentsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTodayAppointments(appointments);
        } else {
          setTodayAppointments([]); // Nenhum agendamento encontrado
        }
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    }
  };

  const fetchAvailableTimes = async (date: Date | null, profissional: string) => {
    if (!date || !profissional) return;
    
    setIsLoadingTimes(true);
    
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
  
      // Verifica se o profissional está bloqueado nesse dia
      const blockedDaysByEmployeeQuery = query(
        collection(firestore, 'blockedDaysByEmployee'),
        where('date', '==', formattedDate),
        where('funcionaria', '==', profissional)
      );
      const blockedDaysByEmployeeSnapshot = await getDocs(blockedDaysByEmployeeQuery);
  
      // Se o profissional estiver bloqueado, não exibe horários
      if (!blockedDaysByEmployeeSnapshot.empty) {
        setAvailableTimes([]);
        return;
      }
  
      // Se o profissional não estiver bloqueado, continua normalmente
      const appointmentsQuery = query(
        collection(firestore, 'agendamentos'),
        where('data', '==', formattedDate),
        where('profissional', '==', profissional)
      );
  
      const appointmentDocs = await getDocs(appointmentsQuery);
      const bookedTimes = appointmentDocs.docs.map((doc) => doc.data().hora);
  
      const now = new Date();
      const allTimes = user?.tipo === 'admin' ? [...standardTimes, ...adminTimes] : standardTimes;
  
      const filteredTimes = allTimes.filter((time) => {
        if (bookedTimes.includes(time.trim()) || blockedTimes.some(blockedTime => blockedTime.time === time.trim() && blockedTime.profissional === profissional)) return false;
  
        if (formattedDate === format(now, 'yyyy-MM-dd')) {
          const [hours, minutes] = time.split(':');
          const appointmentTime = new Date();
          appointmentTime.setHours(parseInt(hours));
          appointmentTime.setMinutes(parseInt(minutes));
          return appointmentTime > now;
        }
        return true;
      });
  
      setAvailableTimes(filteredTimes);
    } catch (error) {
      console.error('Erro ao buscar horários disponíveis:', error);
    } finally {
      setIsLoadingTimes(false);
    }
  };
  
  

  const fetchBlockedDays = async () => {
    try {
      const blockedDaysQuery = query(collection(firestore, 'blockedDays'));
      const blockedDaysSnapshot = await getDocs(blockedDaysQuery);
      const fetchedBlockedDays = blockedDaysSnapshot.docs.map((doc) => doc.data().date);
      setBlockedDays(fetchedBlockedDays);
    } catch (error) {
      console.error('Erro ao buscar dias bloqueados:', error);
    }
  };

  const handleBlockDayForEmployee = async () => {
    if (!selectedDate || !appointmentData.profissional) return;
  
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      await setDoc(doc(firestore, 'blockedDaysByEmployee', `${formattedDate}_${appointmentData.profissional}`), {
        date: formattedDate,
        funcionaria: appointmentData.profissional,
      });
  
      // Atualiza os bloqueios apenas para o profissional
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
  

  const fetchBlockedTimes = async (date: Date) => {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
  
      // Busca bloqueios gerais
      const blockedTimesQuery = query(
        collection(firestore, 'blockedTimes'),
        where('date', '==', formattedDate)
      );
      const blockedTimesSnapshot = await getDocs(blockedTimesQuery);
      const fetchedBlockedTimes = blockedTimesSnapshot.docs.map((doc) => doc.data() as { date: string, time: string, profissional: string });
  
      // Busca bloqueios por profissional
      const blockedDaysByEmployeeQuery = query(
        collection(firestore, 'blockedDaysByEmployee'),
        where('date', '==', formattedDate)
      );
      const blockedDaysByEmployeeSnapshot = await getDocs(blockedDaysByEmployeeQuery);
      const fetchedBlockedDaysByEmployee = blockedDaysByEmployeeSnapshot.docs.map((doc) => doc.data() as { date: string, time: string, profissional: string });
  
      // Atualiza o estado de bloqueios
      setBlockedTimes([...fetchedBlockedTimes, ...fetchedBlockedDaysByEmployee]);
    } catch (error) {
      console.error('Erro ao buscar horários bloqueados:', error);
    }
  };
  

  useEffect(() => {
    if (selectedDate && appointmentData.profissional) {
      fetchAvailableTimes(selectedDate, appointmentData.profissional);
    }
  }, [selectedDate, appointmentData.profissional, user, blockedTimes]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userQuery = query(
            collection(firestore, 'users'),
            where('__name__', '==', currentUser.uid),
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
  
    fetchBlockedDays();
    fetchTodayAppointments(); // Busca os agendamentos do dia ou da data mais próxima
  
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

      // Garante que Emilio sempre aparece na lista
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
    setError(''); // Limpa o erro ao selecionar um horário válido
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

    // Permitir que administradores agendem em qualquer dia, mas destacar dias bloqueados
    if (user?.tipo === 'admin') {
      return !isPastDay && !isNotCurrentYear;
    }

    // Bloquear domingos, segundas, datas passadas e dias bloqueados para usuários comuns
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
    setModalIsOpen(true); // Abre o modal
    fetchBlockedTimes(date); // Buscar horários bloqueados para a data selecionada
  };

  const sendConfirmationEmail = async () => {
    try {
      if (!user?.email) {
        console.error('Usuário sem e-mail.');
        return;
      }
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          userId: user?.uid,
          date: appointmentData.date,
          times: appointmentData.times,
          profissional: appointmentData.profissional,
          nomesPacientes: appointmentData.nomesPacientes,
          detalhes: appointmentData.detalhes,
          isEdit: false,
          isDelete: false,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error('Erro ao enviar email de confirmação: ' + errText);
      }
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
  
    if (!appointmentData.profissional || !appointmentData.date || appointmentData.times.some(time => !time) || appointmentData.nomesPacientes.some(nome => !nome)) {
      setError('Todos os campos são obrigatórios.');
      setIsSubmitting(false);
      return;
    }
  
    if (appointmentData.nomesPacientes.length !== appointmentData.times.length) {
      setError('Erro interno: número de nomes e horários não correspondem.');
      setIsSubmitting(false);
      return;
    }
  
    // Validação extra para experiência do usuário
    if (availableTimes.length === 0 || appointmentData.times.some(time => !availableTimes.includes(time))) {
      setError('Um ou mais horários selecionados já foram reservados. Atualize a página e tente novamente.');
      setIsSubmitting(false);
      return;
    }
  
    try {
      await runTransaction(firestore, async (transaction) => {
        for (let index = 0; index < appointmentData.nomesPacientes.length; index++) {
          const nome = appointmentData.nomesPacientes[index];
  
          const appointmentRef = doc(
            firestore,
            'agendamentos',
            `${appointmentData.date}_${appointmentData.profissional}_${appointmentData.times[index]}`
          );
  
          const existing = await transaction.get(appointmentRef);
          if (existing.exists()) {
            throw new Error(`O horário ${appointmentData.times[index]} já foi reservado.`);
          }
  
          transaction.set(appointmentRef, {
            nomePaciente: nome,
            data: appointmentData.date,
            hora: appointmentData.times[index],
            usuarioId: user?.uid,
            usuarioEmail: user?.email,
            status: 'agendado',
            profissional: appointmentData.profissional,
            detalhes: appointmentData.detalhes,
          });
        }
      });
  
      // Atualiza os próximos agendamentos após salvar
      await fetchTodayAppointments();

      // Envia o e-mail de confirmação
      await sendConfirmationEmail();
  
      // Redireciona para "Meus Agendamentos"
      router.push('/agendamentos');
    } catch (error: any) {
      console.error('Erro ao salvar agendamento:', error);
      setError(error?.message || 'Erro ao salvar o agendamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleBlockDay = async () => {
    if (!selectedDate) return;

    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      await setDoc(doc(firestore, 'blockedDays', formattedDate), {
        date: formattedDate,
      });
      setBlockedDays((prev) => [...prev, formattedDate]);
      setError('');
    } catch (error) {
      console.error('Erro ao bloquear o dia:', error);
      setError('Erro ao bloquear o dia. Tente novamente.');
    }
  };

  const handleBlockTime = async () => {
    if (!selectedDate || !appointmentData.times[0] || !appointmentData.profissional) return;

    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      await setDoc(doc(firestore, 'blockedTimes', `${formattedDate}_${appointmentData.times[0]}_${appointmentData.profissional}`), {
        date: formattedDate,
        time: appointmentData.times[0],
        profissional: appointmentData.profissional,
      });
      setBlockedTimes((prev) => [...prev, { date: formattedDate, time: appointmentData.times[0], profissional: appointmentData.profissional }]);
      setError('');
    } catch (error) {
      console.error('Erro ao bloquear o horário:', error);
      setError('Erro ao bloquear o horário. Tente novamente.');
    }
  };

  const handleCancel = () => {
    // Resetar o estado do appointmentData e availableTimes
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

  // Redireciona para indexCliente se não for admin
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
        {/* SidebarAdmin fixo à esquerda */}
        <SidebarAdmin />

        <div className={styles.mainContent}>
          <div className={styles.formContainer}>
            {/* Breadcrumb, título, subtítulo */}
            <div className={styles.breadcrumbWrapper}>
              <span className={styles.breadcrumb}>
                Menu Principal &gt; <span className={styles.breadcrumbActive}>Dashboard</span>
              </span>
            </div>
            <h2 className={styles.titleDashboard}>
              Dashboard
            </h2>
            <div className={styles.dashboardSubtitle}>
              Acesse uma visão detalhada de métricas e resultados dos pacientes
            </div>

            {/* Gráfico de volume de pacientes */}
            <div className={styles.pacientesChartBox}>
              <div className={styles.pacientesChartTitle}>
                Volume de Pacientes por Dia da Semana
              </div>
              <Bar data={chartData} options={chartOptions} height={180} />
            </div>
            {/* Calendário alinhado à esquerda */}
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

              {/* Próximos Agendamentos */}
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
                          <td className={`${styles.upcomingStatusCell} ${appointment.status === 'agendado' ? styles.statusConfirmado : ''}`}>
                            {appointment.status === 'agendado' ? 'Confirmado' : appointment.status}
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
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            minWidth: 340,
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <Sidebar />
          </div>
        </div>
      </div>

      {/* Modal implementado */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleCancel}
        className={styles.modalContent}
        overlayClassName={styles.modalOverlay}
      >
        <h3>Agendar Serviço para {format(selectedDate || new Date(), 'dd/MM/yyyy')}</h3>
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Loading spinner sobreposto ao modal durante envio */}
          {isSubmitting && (
            <div className={styles.modalLoadingOverlay}>
              <div className={styles.modalSpinner}></div>
              <span className={styles.modalLoadingText}>Aguarde...</span>
            </div>
          )}
          <div className={styles.inputGroup}>
            {/* Select de Profissional */}
            <select
              name="profissional"
              value={appointmentData.profissional}
              onChange={(e) => {
                setAppointmentData((prev) => ({ ...prev, profissional: e.target.value }));
                fetchAvailableTimes(selectedDate, e.target.value);
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

          {/* Campo de detalhes */}
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
              onClick={handleBlockDay}
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
              onClick={handleBlockTime}
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
              onClick={handleBlockDayForEmployee}
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
    </ProtectedRoute>
  );
};

export default Index;
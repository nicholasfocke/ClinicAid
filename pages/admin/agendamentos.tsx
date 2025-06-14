import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, firestore } from '../../firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/router';
import styles from "@/styles/admin/agendamentos.module.css";
import breadcrumbStyles from "@/styles/Breadcrumb.module.css";
import { format, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExternalLink, CheckCircle2 } from 'lucide-react';
import AppointmentDetailsModal from '@/components/modals/AppointmentDetailsModal';
import Modal from 'react-modal';
import { statusAgendamento, buscarAgendamentosPorData, criarAgendamento } from '@/functions/agendamentosFunction';
import CreateAppointment from '@/components/modals/CreateAppointment';
import { buscarHorariosPorMedico, ScheduleData } from '@/functions/scheduleFunctions';


Modal.setAppElement('#__next');

interface Agendamento {
  id: string;
  data: string;
  hora: string;
  profissional: string;
  nomePaciente: string;
  status: string;
  detalhes: string;
  usuarioId: string;
  convenio?: string;
  procedimento?: string;
}

interface Profissional {
  id: string;
  nome: string;
  empresaId: string;
}

const Agendamentos = () => {
  interface User {
    uid: string;
    email: string;
  }

  const [user, setUser] = useState<User | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const [todayAppointments, setTodayAppointments] = useState<Agendamento[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Agendamento[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);

  const [selectedAppointment, setSelectedAppointment] = useState<Agendamento | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  const [showDateSelector, setShowDateSelector] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [appointmentData, setAppointmentData] = useState({
    date: '',
    time: '',
    nomePaciente: '',
    profissional: '',
    detalhes: '',
    convenio: '',
    procedimento: '',
  });
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [horariosProfissional, setHorariosProfissional] = useState<ScheduleData[]>([]);
  const [diasDisponiveis, setDiasDisponiveis] = useState<string[]>([]);



  // Novos estados para calendário/modal
  // const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // const [isModalOpen, setIsModalOpen] = useState(false);

  // Novo estado para armazenar todos os agendamentos
  const [allAgendamentos, setAllAgendamentos] = useState<Agendamento[]>([]);

const fetchAgendamentos = async () => {
    try {
      const q = query(collection(firestore, 'agendamentos'));
      const querySnapshot = await getDocs(q);

      const fetchedAgendamentos: Agendamento[] = [];
      querySnapshot.forEach((doc) => {
        const agendamentoData = doc.data();
        if (!agendamentoData.data || !agendamentoData.hora) return;

        fetchedAgendamentos.push({
          id: doc.id,
          data: agendamentoData.data,
          hora: agendamentoData.hora,
          profissional: agendamentoData.profissional,
          nomePaciente: agendamentoData.nomePaciente,
          status: agendamentoData.status || 'agendado',
          detalhes: agendamentoData.detalhes || '',
          usuarioId: agendamentoData.usuarioId || '',
          convenio: agendamentoData.convenio || '',
          procedimento: agendamentoData.procedimento || '',
        });
      });

      // Organiza por data
      fetchedAgendamentos.sort((a, b) => {
        const dateA = new Date(`${a.data}T${a.hora}`);
        const dateB = new Date(`${b.data}T${b.hora}`);
        return dateA.getTime() - dateB.getTime();
      });

      setAgendamentos(fetchedAgendamentos);

      const today = new Date();
      const todayList: Agendamento[] = [];
      const futureByDay: { [date: string]: Agendamento[] } = {};

      fetchedAgendamentos.forEach((ag) => {
        const agDate = new Date(`${ag.data}T${ag.hora}`);
        if (
          agDate.getDate() === today.getDate() &&
          agDate.getMonth() === today.getMonth() &&
          agDate.getFullYear() === today.getFullYear()
        ) {
          todayList.push(ag);
        } else if (isAfter(agDate, today)) {
          const dateKey = ag.data;
          if (!futureByDay[dateKey]) futureByDay[dateKey] = [];
          futureByDay[dateKey].push(ag);
        }
      });

      const futureDates = Object.keys(futureByDay).sort();

      let finalList: Agendamento[] = [];

      if (todayList.length > 0) {
        finalList = todayList;
      } else if (futureDates.length > 0) {
        finalList = futureByDay[futureDates[0]];
      }

      setTodayAppointments(finalList.slice(0, 5));
      setUpcomingAppointments([]);
      if (finalList.length > 0) {
        setSelectedDateFilter(finalList[0].data);
      } else {
        setSelectedDateFilter(format(today, 'yyyy-MM-dd'));
      }
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      setError('Erro ao buscar agendamentos.');
    }
  };



  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      try {
        if (currentUser) {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email || '',
          });
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setError('Erro ao verificar autenticação.');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    // Busca todos os agendamentos do banco de dados
    const fetchAllAgendamentos = async () => {
      try {
       const q = query(
        collection(firestore, 'agendamentos'),
        where('status', '==', statusAgendamento.CONFIRMADO)
      );

        const querySnapshot = await getDocs(q);
        const fetched: Agendamento[] = [];
        querySnapshot.forEach((doc) => {
          const agendamentoData = doc.data();
          fetched.push({
            id: doc.id,
            data: agendamentoData.data,
            hora: agendamentoData.hora,
            profissional: agendamentoData.profissional,
            nomePaciente: agendamentoData.nomePaciente,
            status: agendamentoData.status,
            detalhes: agendamentoData.detalhes || '',
            usuarioId: agendamentoData.usuarioId || '',
            convenio: agendamentoData.convenio || '',
            procedimento: agendamentoData.procedimento || ''
            // especialidade e valor removidos
          });
        });
        // Ordena por data/hora
        fetched.sort((a, b) => {
          const dateA = new Date(`${a.data}T${a.hora}`);
          const dateB = new Date(`${b.data}T${b.hora}`);
          return dateA.getTime() - dateB.getTime();
        });
        setAllAgendamentos(fetched);
      } catch (error) {
        setError('Erro ao buscar agendamentos.');
      }
    };
    fetchAllAgendamentos();
  }, []);

  useEffect(() => {
    const fetchProfissionais = async () => {
      if (!user) return;
      let empresaId = null;
      // Busca empresa do usuário (ajuste conforme sua estrutura)
      const empresaDoc = await getDocs(collection(firestore, 'empresas'));
      if (!empresaDoc.empty) {
        empresaId = empresaDoc.docs[0].id;
      }
      if (!empresaId) return;

      const profissionaisSnap = await getDocs(query(collection(firestore, 'profissionais'), where('empresaId', '==', empresaId)));
      const profs: Profissional[] = profissionaisSnap.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome,
        empresaId: doc.data().empresaId,
      }));

      setProfissionais(profs);
    };

    fetchProfissionais();
  }, [user]);

  useEffect(() => {
    const loadSchedule = async () => {
      if (!appointmentData.profissional) {
        setHorariosProfissional([]);
        setDiasDisponiveis([]);
        return;
      }
      try {
        const prof = profissionais.find(p => p.nome === appointmentData.profissional);
        if (!prof) return;
        const horarios = await buscarHorariosPorMedico(prof.id);
        setHorariosProfissional(horarios as ScheduleData[]);
        setDiasDisponiveis(horarios.map(h => h.dia));
        if (appointmentData.date) {
          fetchAvailableTimes(appointmentData.date, appointmentData.profissional);
        }
      } catch (err) {
        console.error('Erro ao buscar horários do profissional:', err);
        setHorariosProfissional([]);
        setDiasDisponiveis([]);
      }
    };
    loadSchedule();
  }, [appointmentData.profissional]);

  useEffect(() => {
    fetchAgendamentos();
  }, [user]);

  const handleRemove = async (id: string) => {
    const confirmDelete = window.confirm('Deseja excluir o agendamento?');
    if (!confirmDelete) return;

    try {
      const agendamentoDoc = await getDoc(doc(firestore, 'agendamentos', id));
      const agendamentoData = agendamentoDoc.exists() ? agendamentoDoc.data() : null;

      //  Excluir do Firestore
      await deleteDoc(doc(firestore, 'agendamentos', id));

      //  Atualiza todos os estados locais de forma sincronizada
      setAllAgendamentos(prev => prev.filter(ag => ag.id !== id));
      setAgendamentos(prev => prev.filter(ag => ag.id !== id));
      setTodayAppointments(prev => prev.filter(ag => ag.id !== id));
      setUpcomingAppointments(prev => prev.filter(ag => ag.id !== id));

      // Envia email, se aplicável
      if (agendamentoData && user?.email) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            userId: user.uid,
            date: agendamentoData.data,
            times: [agendamentoData.hora],
            profissional: agendamentoData.profissional,
            nomesPacientes: [agendamentoData.nomePaciente],
            detalhes: agendamentoData.detalhes,
            isEdit: false,
            isDelete: true,
          }),
        });
      }

    } catch (error) {
      console.error('Erro ao remover agendamento: ', error);
      setError('Erro ao remover o agendamento.');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await updateDoc(doc(firestore, 'agendamentos', id), { status: statusAgendamento.CONCLUIDO });
      await fetchAgendamentos();
      closeDetails();
    } catch (error) {
      console.error('Erro ao concluir agendamento: ', error);
      setError('Erro ao concluir o agendamento.');
    }
  };

  const openDetails = (ag: Agendamento) => {
    setSelectedAppointment(ag);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setSelectedAppointment(null);
    setDetailsOpen(false);
  };

  const getDayName = (dateStr: string) => {
    const dateObj = new Date(dateStr + 'T00:00');
    const name = format(dateObj, 'eeee', { locale: ptBR }).toLowerCase();
    const map: Record<string, string> = {
      'segunda-feira': 'Segunda',
      'terça-feira': 'Terça',
      'quarta-feira': 'Quarta',
      'quinta-feira': 'Quinta',
      'sexta-feira': 'Sexta',
      'sábado': 'Sábado',
      'domingo': 'Domingo',
    };
    return map[name];
  };

  const generateTimes = (
    inicio: string,
    fim: string,
    almocoInicio?: string,
    almocoFim?: string,
    step = 30
  ) => {
    const times: string[] = [];
    const [sh, sm] = inicio.split(':').map(Number);
    const [eh, em] = fim.split(':').map(Number);
    const start = new Date();
    start.setHours(sh, sm, 0, 0);
    const end = new Date();
    end.setHours(eh, em, 0, 0);
    let breakStart: Date | null = null;
    let breakEnd: Date | null = null;
    if (almocoInicio && almocoFim) {
      breakStart = new Date();
      breakEnd = new Date();
      const [bsh, bsm] = almocoInicio.split(':').map(Number);
      const [beh, bem] = almocoFim.split(':').map(Number);
      breakStart.setHours(bsh, bsm, 0, 0);
      breakEnd.setHours(beh, bem, 0, 0);
    }
    for (let d = new Date(start); d <= end; d.setMinutes(d.getMinutes() + step)) {
      if (breakStart && breakEnd && d >= breakStart && d < breakEnd) {
        continue;
      }
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      times.push(`${hh}:${mm}`);
    }
    return times;
  };

  const getScheduleForDate = (dateStr: string) => {
    const dayName = getDayName(dateStr);
    return (
      horariosProfissional.find(h => h.dia === dateStr) ||
      horariosProfissional.find(h => h.dia === dayName)
    );
  };

  const fetchAvailableTimes = async (date: string, profissional: string) => {
    if (!date || !profissional) {
      setAvailableTimes([]);
      return;
    }
    try {
      const schedule = getScheduleForDate(date);
      if (!schedule) {
        setAvailableTimes([]);
        return;
      }
      const ags = await buscarAgendamentosPorData(date);
      const reserved = ags
        .filter(ag => ag.profissional === profissional)
        .map(ag => ag.hora.trim());
      const generated = generateTimes(
        schedule.horaInicio,
        schedule.horaFim,
        schedule.almocoInicio,
        schedule.almocoFim
      );
      setAvailableTimes(generated.filter(t => !reserved.includes(t)));
    } catch (e) {
      console.error('Erro ao buscar horários:', e);
      setAvailableTimes([]);
    }
  };

  const handleDateFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSelectedDateFilter(value);
    const filtered = allAgendamentos.filter(ag => ag.data === value);
    setTodayAppointments(filtered);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await criarAgendamento(
        {
          date: appointmentData.date,
          times: [appointmentData.time],
          nomesPacientes: [appointmentData.nomePaciente],
          profissional: appointmentData.profissional,
          detalhes: appointmentData.detalhes,
          convenio: appointmentData.convenio,
          procedimento: appointmentData.procedimento,
        },
        { uid: user.uid, email: user.email }
      );
      setCreateModalOpen(false);
      setAppointmentData({ date: '', time: '', nomePaciente: '', profissional: '', detalhes: '', convenio: '', procedimento: '' });
      await fetchAgendamentos();
    } catch (err) {
      console.error('Erro ao criar agendamento:', err);
      setError('Erro ao criar agendamento');
    } finally {
      setIsSubmitting(false);
    }
  };


  if (loading) {
    return <p>Carregando agendamentos...</p>;
  }

  if (error) {
    return <p className={styles.error}>{error}</p>;
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb e título */}
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumbActive}>Agendamentos</span>
        </span>
      </div>
      <h1 className={styles.titleAgendamentos}>Agendamentos</h1>
      <div className={styles.subtitleAgendamentos}>
        Acesse uma visão geral detalhada dos agendamentos e resultados dos pacientes
      </div>

      {/* Botões de ação alinhados à direita */}
      <div className={styles.actionButtonsWrapper}>
        <button className={styles.buttonAgendar} onClick={() => setCreateModalOpen(true)}>
          + Agendar consulta
        </button>
        <button className={styles.buttonAgendar} onClick={() => setShowDateSelector(!showDateSelector)}>
          Visualizar agendamentos
        </button>
        {showDateSelector && (
          <input
            type="date"
            value={selectedDateFilter}
            onChange={handleDateFilterChange}
            className={styles.datePicker}
          />
        )}
      </div>

      {/* Tabela de agendamentos */}
      <div className={styles.agendamentosTableWrapper}>
        <table className={styles.agendamentosTable}>
          <thead>
            <tr>
              <th>PACIENTE</th>
              <th>DATA</th>
              <th>DOUTOR</th>
              <th>STATUS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {todayAppointments.map((ag) => (
              <tr key={ag.id}>
                <td>{ag.nomePaciente}</td>
                <td>
                  {ag.data && ag.hora
                    ? `${format(new Date(ag.data + 'T' + ag.hora), 'dd/MM/yy, HH:mm')}`
                    : ''}
                </td>
                <td>{ag.profissional}</td>
                <td style={{ display: 'flex', alignItems: 'center' }}>
                  <span className={styles.statusConfirmado}>
                    <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
                    Confirmado
                  </span>
                  <button
                    onClick={() => handleRemove(ag.id)}
                    className={styles.statusExcluido}
                    title="Excluir agendamento"
                  >
                    Excluir
                  </button>
                </td>
                <td>
                  <button onClick={() => openDetails(ag)} className={styles.externalLink} title="Ver detalhes">
                    <ExternalLink size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CreateAppointment
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateAppointment}
        isSubmitting={isSubmitting}
        appointmentData={appointmentData}
        setAppointmentData={setAppointmentData}
        availableTimes={availableTimes}
        profissionais={profissionais}
        fetchAvailableTimes={fetchAvailableTimes}
        availableDays={diasDisponiveis}
      />

      {/* Calendário removido */}
      <AppointmentDetailsModal
        appointment={selectedAppointment}
        isOpen={detailsOpen}
        onClose={closeDetails}
        onComplete={handleComplete}
      />
    </div>
  );
};

export default Agendamentos;
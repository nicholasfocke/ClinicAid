import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, firestore } from '../../firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/router';
import styles from "@/styles/admin/agendamentos/agendamentos.module.css";
import breadcrumbStyles from "@/styles/Breadcrumb.module.css";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExternalLink } from 'lucide-react';
import AppointmentDetailsModal from '@/components/modals/AppointmentDetailsModal';
import Modal from 'react-modal';
import { statusAgendamento, buscarAgendamentosPorData, criarAgendamento } from '@/functions/agendamentosFunction';
import CreateAppointment from '@/components/modals/CreateAppointment';
import { buscarHorariosPorMedico, ScheduleData } from '@/functions/scheduleFunctions';
import { buscarProcedimentos, ProcedimentoData } from '@/functions/procedimentosFunctions';


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

  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [selectedProfissional, setSelectedProfissional] = useState<string>('');
  const [selectedAppointment, setSelectedAppointment] = useState<Agendamento | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  interface AppointmentData {
    date: string;
    time: string;
    fim: string;
    pacienteId: string;
    nomePaciente: string;
    email: string;
    cpf: string;
    telefone: string;
    dataNascimento: string;
    profissional: string;
    detalhes: string;
    convenio: string;
    procedimento: string;
  }

  const [appointmentData, setAppointmentData] = useState<AppointmentData>({
    date: '',
    time: '',
    fim: '',
    pacienteId: '',
    nomePaciente: '',
    email: '',
    cpf: '',
    telefone: '',
    dataNascimento: '',
    profissional: '',
    detalhes: '',
    convenio: '',
    procedimento: '',
  });
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [reservedTimes, setReservedTimes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [horariosProfissional, setHorariosProfissional] = useState<ScheduleData[]>([]);
  const [diasDisponiveis, setDiasDisponiveis] = useState<string[]>([]);
  const [procedimentos, setProcedimentos] = useState<ProcedimentoData[]>([]);

  // Novo: controle de semana exibida no calendário
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const daysOfWeek = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  const diasSemana = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

  // Busca agendamentos da semana
  const fetchAgendamentosSemana = async () => {
    try {
      const baseRef = collection(firestore, 'agendamentos');
      const q = selectedProfissional
        ? query(baseRef, where('profissional', '==', selectedProfissional))
        : query(baseRef);
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
      setAgendamentos(fetchedAgendamentos);
      setLoading(false);
    } catch (error) {
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
        setError('Erro ao verificar autenticação.');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    fetchAgendamentosSemana();
  }, [user, currentWeekStart, selectedProfissional]);

  useEffect(() => {
    const fetchProfissionais = async () => {
      if (!user) return;
      let empresaId = null;
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
    const fetchProcs = async () => {
      try {
        const procs = await buscarProcedimentos();
        setProcedimentos(procs as ProcedimentoData[]);
      } catch (err) {
        setProcedimentos([]);
      }
    };
    fetchProcs();
  }, []);

  useEffect(() => {
    const loadSchedule = async () => {
      if (!selectedProfissional) {
        setHorariosProfissional([]);
        setDiasDisponiveis([]);
        return;
      }
      try {
        const prof = profissionais.find(p => p.nome === selectedProfissional);
        if (!prof) return;
        const horarios = await buscarHorariosPorMedico(prof.id);
        setHorariosProfissional(horarios as ScheduleData[]);
        setDiasDisponiveis(horarios.map(h => h.dia));
        if (appointmentData.date) {
          // fetchAvailableTimes(appointmentData.date, appointmentData.profissional);
        }
      } catch (err) {
        setHorariosProfissional([]);
        setDiasDisponiveis([]);
      }
    };
    loadSchedule();
  }, [selectedProfissional]);

  useEffect(() => {
    setAppointmentData(prev => ({ ...prev, profissional: selectedProfissional }));
  }, [selectedProfissional]);

  // Funções para navegação de semana
  const handlePrevWeek = () => setCurrentWeekStart(prev => addDays(prev, -7));
  const handleNextWeek = () => setCurrentWeekStart(prev => addDays(prev, 7));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));

  // Gera os horários do calendário (exemplo: 08:00 até 18:00, de 15 em 15 min)
  const horarios: string[] = [];
  for (let h = 8; h <= 18; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      horarios.push(hora);
    }
  }

  // Mapeia agendamentos por dia/hora
  const agendamentosSemana: { [key: string]: { [hora: string]: Agendamento[] } } = {};
  daysOfWeek.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    agendamentosSemana[dateStr] = {};
    horarios.forEach(hora => {
      agendamentosSemana[dateStr][hora] = [];
    });
  });
  agendamentos.forEach(ag => {
    if (agendamentosSemana[ag.data] && agendamentosSemana[ag.data][ag.hora]) {
      agendamentosSemana[ag.data][ag.hora].push(ag);
    }
  });

  const statusClassMap: Record<string, string> = {
    [statusAgendamento.AGENDADO]: styles.statusAgendado,
    [statusAgendamento.CONFIRMADO]: styles.statusConfirmado,
    [statusAgendamento.CANCELADO]: styles.statusCancelado,
    [statusAgendamento.CONCLUIDO]: styles.statusConcluido,
    [statusAgendamento.PENDENTE]: styles.statusPendente,
  };

  const handleRemove = async (id: string) => {
    const confirmDelete = window.confirm('Deseja excluir o agendamento?');
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(firestore, 'agendamentos', id));
      fetchAgendamentosSemana();
    } catch (error) {
      setError('Erro ao remover o agendamento.');
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
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const pacienteId = appointmentData.pacienteId || doc(collection(firestore, 'pacientes')).id;
      await criarAgendamento(
        {
          date: appointmentData.date,
          times: [appointmentData.time],
          nomesPacientes: [appointmentData.nomePaciente],
          profissional: appointmentData.profissional,
          detalhes: appointmentData.detalhes,
          convenio: appointmentData.convenio,
          procedimento: appointmentData.procedimento,
          email: appointmentData.email,
          cpf: appointmentData.cpf,
          telefone: appointmentData.telefone,
          dataNascimento: appointmentData.dataNascimento,
        },
        { uid: pacienteId, email: appointmentData.email }
      );
      setCreateModalOpen(false);
      setAppointmentData({
        date: '',
        time: '',
        fim: '',
        pacienteId: '',
        nomePaciente: '',
        email: '',
        cpf: '',
        telefone: '',
        dataNascimento: '',
        profissional: '',
        detalhes: '',
        convenio: '',
        procedimento: '',
      });
      fetchAgendamentosSemana();
    } catch (err) {
      setError('Erro ao criar agendamento');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleCalendarCellClick = (dateStr: string, hora: string) => {
    // calcula fim padrão (15min após o início)
    const [h, m] = hora.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m + 15, 0, 0);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const fimPadrao = `${hh}:${mm}`;
    const diaLabel = diasSemana[new Date(dateStr).getDay()];
    if (!diasDisponiveis.includes(diaLabel)) {
      alert('Profissional não trabalha nesse dia.');
      return;
    }
    setAppointmentData(prev => ({
      ...prev,
      date: dateStr,
      time: hora,
      fim: fimPadrao,
      profissional: selectedProfissional,
      detalhes: '',
      pacienteId: '',
      nomePaciente: '',
      email: '',
      cpf: '',
      telefone: '',
      dataNascimento: '',
      convenio: '',
      procedimento: '',
    }));
    setCreateModalOpen(true);
  };

  const handleOpenModal = () => {
    if (!selectedProfissional) {
      alert('Selecione um profissional');
      return;
    }
    setAppointmentData(prev => ({ ...prev, profissional: selectedProfissional }));
    setCreateModalOpen(true);
  };

  // Função para obter o horário de término do agendamento (considerando duração do procedimento)
  function getAgendamentoFim(ag: Agendamento) {
    // Procura duração do procedimento
    const proc = procedimentos.find(p => p.nome === ag.procedimento);
    const duracao = proc?.duracao || 15; // padrão 15min se não achar
    const [h, m] = ag.hora.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m + duracao, 0, 0);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

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
        Visualize e gerencie os agendamentos da semana.
      </div>

      {/* Botões de ação alinhados à direita */}
      <div className={styles.actionButtonsWrapper}>
        <button className={styles.buttonAgendar} onClick={handleOpenModal}>
          + Agendar consulta
        </button>
        <select
          value={selectedProfissional}
          onChange={e => setSelectedProfissional(e.target.value)}
          className={styles.selectProfissional}
        >
          <option value="">Selecione o profissional</option>
          {profissionais.map(p => (
            <option key={p.id} value={p.nome}>{p.nome}</option>
          ))}
        </select>
        <button className={styles.buttonAgendar} onClick={handleToday}>
          Hoje
        </button>
        <button className={styles.buttonAgendar} onClick={handlePrevWeek}>
          &lt; Semana anterior
        </button>
        <button className={styles.buttonAgendar} onClick={handleNextWeek}>
          Próxima semana &gt;
        </button>
      </div>

      {/* Calendário semanal */}
      <div className={styles.calendarWrapper}>
        <table className={styles.calendarTable}>
          <thead>
            <tr>
              <th>Horário</th>
              {daysOfWeek.map(day => (
                <th key={day.toISOString()}>
                  <div>
                    <span className={styles.calendarDayName}>
                      {format(day, 'EEEE', { locale: ptBR })}
                    </span>
                  </div>
                  <div>
                    <span className={styles.calendarDayDate}>
                      {format(day, 'dd/MM')}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horarios.map(hora => (
              <tr key={hora}>
                <td className={styles.calendarHourCell}>{hora}</td>
                {daysOfWeek.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const ags = agendamentosSemana[dateStr]?.[hora] || [];
                  // Só mostra o card no início do agendamento
                  const ag = ags.length > 0 ? ags[0] : null;
                  // Se este horário é o início do agendamento
                  const isInicio = ag && ag.hora === hora;
                  let rowSpan = 1;
                  if (isInicio && ag.procedimento) {
                    // calcula duração em minutos
                    const proc = procedimentos.find(p => p.nome === ag.procedimento);
                    const duracao = proc?.duracao || 15;
                    rowSpan = Math.max(1, Math.ceil(duracao / 15));
                  }
                  return (
                    <td
                      key={dateStr + hora}
                      className={styles.calendarCell}
                      onClick={e => {
                        if (!ag) handleCalendarCellClick(dateStr, hora);
                      }}
                      style={{ cursor: !ag ? 'pointer' : 'default', position: 'relative', verticalAlign: 'top' }}
                    >
                      {isInicio && (
                        <div
                          className={`${styles.calendarAppointment} ${statusClassMap[ag.status] || styles.statusAgendado}`}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: `calc(${rowSpan * 48}px - 4px)`, // 48px por linha, ajuste se necessário
                            zIndex: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                          }}
                          onClick={ev => {
                            ev.stopPropagation();
                            openDetails(ag);
                          }}
                          title={`${ag.nomePaciente} - ${ag.profissional}`}
                        >
                          <span className={styles.calendarAppointmentTime}>
                            {ag.hora} - {getAgendamentoFim(ag)}
                          </span>
                          <span className={styles.calendarAppointmentName}>
                            {ag.nomePaciente}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
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
        reservedTimes={reservedTimes}
        fetchAvailableTimes={() => {}}
        availableDays={diasDisponiveis}
        selectedProfessional={selectedProfissional}
      />

      <AppointmentDetailsModal
        appointment={selectedAppointment}
        isOpen={detailsOpen}
        onClose={closeDetails}
        onComplete={() => {}}
      />
    </div>
  );
};

export default Agendamentos;
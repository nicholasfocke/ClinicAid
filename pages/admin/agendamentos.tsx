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
      // Busca todos os profissionais, sem filtro de empresa
      const profissionaisSnap = await getDocs(collection(firestore, 'profissionais'));
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

  // Gera os horários do calendário de acordo com o expediente do profissional selecionado
  // Inclui horários "quebrados" de início/fim dos agendamentos
  let horariosSet = new Set<string>();
  let minInicio = 24, minMin = 0, maxFim = 0, maxMax = 0;
  if (selectedProfissional && horariosProfissional.length > 0) {
    horariosProfissional.forEach(h => {
      if (h.horaInicio) {
        const [h1, m1] = h.horaInicio.split(":").map(Number);
        if (h1 < minInicio || (h1 === minInicio && m1 < minMin)) {
          minInicio = h1;
          minMin = m1;
        }
      }
      if (h.horaFim) {
        const [h2, m2] = h.horaFim.split(":").map(Number);
        if (h2 > maxFim || (h2 === maxFim && m2 > maxMax)) {
          maxFim = h2;
          maxMax = m2;
        }
      }
    });
  } else {
    minInicio = 8; minMin = 0; maxFim = 18; maxMax = 0;
  }
  // Gera horários regulares de 15 em 15 min
  let h = minInicio, m = minMin;
  while (h < maxFim || (h === maxFim && m <= maxMax)) {
    horariosSet.add(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += 15;
    if (m >= 60) {
      m = 0;
      h++;
    }
  }
  // Adiciona horários de início e fim de todos os agendamentos da semana
  agendamentos.forEach(ag => {
    if (ag.data && ag.hora) {
      horariosSet.add(ag.hora);
      // Calcular fim do agendamento
      let duracao = 15;
      if (ag.procedimento) {
        const proc = procedimentos.find(p => p.nome === ag.procedimento);
        if (proc && proc.duracao) duracao = proc.duracao;
      }
      const [hA, mA] = ag.hora.split(":").map(Number);
      const d = new Date();
      d.setHours(hA, mA + duracao, 0, 0);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      horariosSet.add(`${hh}:${mm}`);
    }
  });
  // Ordena os horários
  let horarios = Array.from(horariosSet);
  horarios.sort((a, b) => {
    const [ha, ma] = a.split(":").map(Number);
    const [hb, mb] = b.split(":").map(Number);
    return ha !== hb ? ha - hb : ma - mb;
  });

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
    // Verifica se já existe agendamento para o mesmo profissional, data e hora
    const existeAgendamento = agendamentos.some(ag =>
      ag.profissional === appointmentData.profissional &&
      ag.data === appointmentData.date &&
      ag.hora === appointmentData.time
    );
    if (existeAgendamento) {
      window.alert('Horário indisponível! Já existe um agendamento para este profissional neste dia e horário.');
      return;
    }
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
  const handleCalendarCellClick = (dateStr: string, hora: string, diaSemana: string) => {
    // Só permite se profissional selecionado e trabalha nesse dia
    if (!selectedProfissional) return;
    if (!diasDisponiveis.includes(diaSemana)) return;
    // calcula fim padrão (15min após o início)
    const [h, m] = hora.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m + 15, 0, 0);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const fimPadrao = `${hh}:${mm}`;
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
      window.alert('Selecione o profissional antes de agendar uma consulta.');
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
  const [draggedAgendamento, setDraggedAgendamento] = useState<Agendamento | null>(null);
  
  // Inicia o drag
  const handleDragStart = (ag: Agendamento) => {
    setDraggedAgendamento(ag);
  };
  
  // Permite drop
  const handleDragOver = (e: React.DragEvent<HTMLTableCellElement>) => {
    e.preventDefault();
  };
  
  // Drop: atualiza agendamento
  const handleDrop = async (dateStr: string, hora: string, diaSemana: string) => {
    if (!draggedAgendamento) return;
    // Só permite se profissional selecionado e trabalha nesse dia
    if (!selectedProfissional) return;
    if (!diasDisponiveis.includes(diaSemana)) return;
    // Verifica se já existe agendamento nesse slot
    const existeAgendamento = agendamentos.some(ag =>
      ag.profissional === selectedProfissional &&
      ag.data === dateStr &&
      ag.hora === hora
    );
    if (existeAgendamento) {
      window.alert('Horário indisponível! Já existe um agendamento para este profissional neste dia e horário.');
      setDraggedAgendamento(null);
      return;
    }
    // Atualiza no Firebase
    try {
      // Calcula novo fim
      const proc = procedimentos.find(p => p.nome === draggedAgendamento.procedimento);
      const duracao = proc?.duracao || 15;
      const [h, m] = hora.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m + duracao, 0, 0);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const novoFim = `${hh}:${mm}`;
      await updateDoc(doc(firestore, 'agendamentos', draggedAgendamento.id), {
        data: dateStr,
        hora: hora,
        fim: novoFim,
      });
      setDraggedAgendamento(null);
      fetchAgendamentosSemana();
    } catch (err) {
      setError('Erro ao mover agendamento');
      setDraggedAgendamento(null);
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
        Visualize e gerencie os agendamentos da semana.
      </div>

      {/* Botões de ação alinhados à direita */}
      <div className={styles.actionButtonsWrapper}>
        <button
          className={styles.buttonAgendar}
          style={{ minWidth: 200, maxWidth: 200, height: 48, borderRadius: 10, margin: '0 6px' }}
          onClick={handleOpenModal}
        >
          + Agendar consulta
        </button>
        <select
          value={selectedProfissional}
          onChange={e => setSelectedProfissional(e.target.value)}
          className={styles.selectProfissionalCustom}
        >
          <option value="" style={{ textAlign: 'center' }}>Selecione o profissional</option>
          {profissionais.map(p => (
            <option key={p.id} value={p.nome} style={{ textAlign: 'center' }}>{p.nome}</option>
          ))}
        </select>
        <button
          className={styles.buttonAgendar}
          style={{ minWidth: 200, maxWidth: 200, height: 48, borderRadius: 10, margin: '0 6px' }}
          onClick={handleToday}
        >
          Hoje
        </button>
        <button
          className={styles.buttonAgendar}
          style={{ minWidth: 200, maxWidth: 200, height: 48, borderRadius: 10, margin: '0 6px' }}
          onClick={handlePrevWeek}
        >
          &lt; Semana anterior
        </button>
        <button
          className={styles.buttonAgendar}
          style={{ minWidth: 200, maxWidth: 200, height: 48, borderRadius: 10, margin: '0 6px' }}
          onClick={handleNextWeek}
        >
          Próxima semana &gt;
        </button>
      </div>

      {/* Calendário semanal */}
      {!selectedProfissional ? (
        <div className={styles.selectProfissionalMessageWrapper}>
          <div className={styles.selectProfissionalMessageBox}>
            <h2 className={styles.selectProfissionalMessageTitle}>
              Selecione um profissional para visualizar os agendamentos
            </h2>
            <p className={styles.selectProfissionalMessageText}>
              Por favor, escolha um profissional no menu acima para exibir o calendário de agendamentos.
            </p>
          </div>
        </div>
      ) : (
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
              {/* Nova lógica para cards ocupando linhas conforme duração, com rowSpan dinâmico */}
              {(() => {
                // Para cada coluna (dia), manter controle dos horários ocupados
                const ocupadosPorDia: { [dateStr: string]: Set<string> } = {};
                daysOfWeek.forEach(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  ocupadosPorDia[dateStr] = new Set();
                });
                // Agrupar horários por hora cheia, mas agora de forma dinâmica
                // Para cada hora cheia, pegue todos os horários até a próxima hora cheia
                const horasCheias: string[] = horarios.filter(horario => horario.endsWith(':00'));
                const horariosPorHora: { [hora: string]: string[] } = {};
                for (let i = 0; i < horasCheias.length; i++) {
                  const horaCheia = horasCheias[i];
                  const idxInicio = horarios.indexOf(horaCheia);
                  const idxFim = i + 1 < horasCheias.length ? horarios.indexOf(horasCheias[i + 1]) : horarios.length;
                  horariosPorHora[horaCheia] = horarios.slice(idxInicio, idxFim);
                }
                return horasCheias.map(horaCheia => (
                  horariosPorHora[horaCheia].map((hora, idx) => (
                    <tr key={hora}>
                      {/* Só mostra a célula da hora na primeira linha do bloco */}
                      {idx === 0 ? (
                        <td className={styles.calendarHourCell} rowSpan={horariosPorHora[horaCheia].length}>{horaCheia}</td>
                      ) : null}
                      {daysOfWeek.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const ags = agendamentosSemana[dateStr]?.[hora] || [];
                        const ag = ags.length > 0 ? ags[0] : null;
                        // Verifica se este horário já está ocupado por um card anterior
                        if (ocupadosPorDia[dateStr].has(hora)) {
                          return null;
                        }
                        // Verifica se pode agendar nesse dia
                        const diaSemana = diasSemana[day.getDay()];
                        const podeAgendar = selectedProfissional && diasDisponiveis.includes(diaSemana);
                        // Se existe agendamento iniciando neste horário
                        if (ag && ag.hora === hora) {
                          let rowSpan = 1;
                          if (ag.procedimento) {
                            const proc = procedimentos.find(p => p.nome === ag.procedimento);
                            const duracao = proc?.duracao || 15;
                            // rowSpan = Math.max(1, Math.ceil(duracao / 15));
                            // Novo: calcular rowSpan baseado nos horários reais
                            // Encontre todos os horários seguintes que estão dentro do intervalo do agendamento
                            const [hIni, mIni] = hora.split(":").map(Number);
                            const dIni = new Date();
                            dIni.setHours(hIni, mIni, 0, 0);
                            const dFim = new Date(dIni.getTime() + duracao * 60000);
                            let count = 0;
                            for (let i = horarios.indexOf(hora); i < horarios.length; i++) {
                              const [hTest, mTest] = horarios[i].split(":").map(Number);
                              const dTest = new Date();
                              dTest.setHours(hTest, mTest, 0, 0);
                              if (dTest >= dIni && dTest < dFim) {
                                count++;
                              } else {
                                break;
                              }
                            }
                            rowSpan = Math.max(1, count);
                          }
                          // Marcar horários ocupados por este agendamento
                          let h = Number(hora.split(':')[0]);
                          let m = Number(hora.split(':')[1]);
                          for (let i = 0; i < rowSpan; i++) {
                            const horaOcupada = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                            ocupadosPorDia[dateStr].add(horaOcupada);
                            // Avança para o próximo horário real do array
                            const idxAtual = horarios.indexOf(hora) + i;
                            if (idxAtual + 1 < horarios.length) {
                              const [hNext, mNext] = horarios[idxAtual + 1].split(":").map(Number);
                              h = hNext;
                              m = mNext;
                            }
                          }
                          return (
                            <td
                              key={dateStr + hora}
                              className={styles.calendarCell}
                              rowSpan={rowSpan}
                              onClick={e => {
                                if (!ag && podeAgendar) handleCalendarCellClick(dateStr, hora, diaSemana);
                              }}
                              onDragOver={handleDragOver}
                              onDrop={e => {
                                handleDrop(dateStr, hora, diaSemana);
                              }}
                              style={{
                                cursor: !ag && podeAgendar ? 'pointer' : 'not-allowed',
                                position: 'relative',
                                verticalAlign: 'top',
                                opacity: !ag && !podeAgendar ? 0.4 : 1,
                                padding: 0,
                              }}
                            >
                              <div
                                className={`${styles.calendarAppointment} ${statusClassMap[ag.status] || styles.statusAgendado}`}
                                style={{
                                zIndex: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                width: '100%',
                                height: '100%',
                                }}
                                draggable
                                onDragStart={ev => {
                                  handleDragStart(ag);
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
                            </td>
                          );
                        }
                        // Se não há agendamento, renderiza célula normal
                        return (
                          <td
                            key={dateStr + hora}
                            className={
                              `${styles.calendarCell} ${!ag && podeAgendar ? styles.calendarCellHoverable : ''}`
                            }
                            onClick={e => {
                              if (!ag && podeAgendar) handleCalendarCellClick(dateStr, hora, diaSemana);
                            }}
                            onDragOver={handleDragOver}
                            onDrop={e => {
                              handleDrop(dateStr, hora, diaSemana);
                            }}
                            style={
                              {
                                cursor: !ag && podeAgendar ? 'pointer' : 'not-allowed',
                                position: 'relative',
                                verticalAlign: 'top',
                                opacity: !ag && !podeAgendar ? 0.4 : 1,
                              }
                            }
                          >
                            {/* Overlay do horário no hover */}
                            {!ag && podeAgendar && (
                              <span className={styles.calendarCellHoverOverlay}>{hora}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}

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
        agendamentosDoDia={agendamentos
          .filter(
            ag => ag.data === appointmentData.date && ag.profissional === selectedProfissional
          )
          .map(ag => ({
            ...ag,
            procedimento: ag.procedimento ?? '',
          }))}
      />

      <AppointmentDetailsModal
        appointment={selectedAppointment}
        isOpen={detailsOpen}
        onClose={closeDetails}
        onComplete={id => {
          fetchAgendamentosSemana();
          closeDetails();
        }}
      />
    </div>
  );
};

export default Agendamentos;
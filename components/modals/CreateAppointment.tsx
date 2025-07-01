import React, { useEffect, useRef, useState } from 'react';
import Modal from 'react-modal';
import styles from '@/styles/admin/agendamentos/CreateAppointment.module.css';
import { format, addDays, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { firestore } from '@/firebase/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { buscarConvenios } from '@/functions/conveniosFunctions';
import { buscarProcedimentos } from '@/functions/procedimentosFunctions';
import { buscarPacientesComDetalhes, PacienteDetails } from '@/functions/pacientesFunctions';

const getPeriod = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  if (h < 12 || (h === 12 && m === 0)) return 'Manhã';
  if (h < 18) return 'Tarde';
  return 'Noite';
};

const periodLabels = ['Manhã', 'Tarde', 'Noite'];

const getFirstIndexOfPeriod = (times: string[], period: string) => {
  return times.findIndex((time) => getPeriod(time) === period);
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  appointmentData: {
    date: string;
    time: string;
    profissional: string;
    detalhes: string;
    pacienteId?: string;
    nomePaciente: string;
    email: string;
    cpf: string;
    telefone: string;
    dataNascimento: string;
    convenio: string;
    procedimento: string;
  };
  setAppointmentData: React.Dispatch<React.SetStateAction<any>>;
  availableTimes: string[];
  reservedTimes: string[];
  profissionais: { id: string; nome: string }[];
  fetchAvailableTimes: (date: string, profissional: string) => void;
  availableDays: string[];
}

const CreateAppointmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  appointmentData,
  setAppointmentData,
  availableTimes,
  reservedTimes,
  profissionais,
  fetchAvailableTimes,
  availableDays,
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<'Manhã' | 'Tarde' | 'Noite'>('Manhã');
  const daysContainerRef = useRef<HTMLDivElement>(null);
  const timesContainerRef = useRef<HTMLDivElement>(null);

  // Gera todos os dias do mês atual exibido
  const getDaysOfMonth = (month: Date) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) {
      days.push(d);
    }
    return days;
  };

  const getDayLabel = (day: Date) => {
    const name = format(day, 'eeee', { locale: ptBR }).toLowerCase();
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

  // Estado para armazenar os dias disponíveis do profissional selecionado
  const [diasDisponiveis, setDiasDisponiveis] = useState<string[]>([]);

  // Atualiza os dias disponíveis ao selecionar profissional
  useEffect(() => {
    const fetchDiasDisponiveis = async () => {
      if (!appointmentData.profissional) {
        setDiasDisponiveis([]);
        return;
      }
      const profSnap = await getDocs(collection(firestore, 'profissionais'));
      const profDoc = profSnap.docs.find(
        d => d.data().nome === appointmentData.profissional
      );
      if (!profDoc) {
        setDiasDisponiveis([]);
        return;
      }
      // Busca os dias da subcoleção 'horarios'
      const horariosSnap = await getDocs(collection(
        firestore,
        'profissionais',
        profDoc.id,
        'horarios'
      ));
      const dias = horariosSnap.docs.map(d => d.data().dia);
      setDiasDisponiveis(dias);
    };
    fetchDiasDisponiveis();
  }, [appointmentData.profissional]);

  // Padronize o array de dias da semana
  const diasSemana = [
    'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
  ];

  // Altere isDayEnabled para usar diasDisponiveis e padronize o label
  const isDayEnabled = (day: Date) => {
    const label = diasSemana[day.getDay()];
    return diasDisponiveis.includes(label);
  };

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Atualiza o dia selecionado ao abrir o modal
  useEffect(() => {
    if (appointmentData.date) {
      // Ao converter a string (yyyy-MM-dd) para Date, use parse para evitar
      // o deslocamento de fuso horário causado por new Date('yyyy-MM-dd').
      const parsed = parse(appointmentData.date, 'yyyy-MM-dd', new Date());
      setSelectedDate(parsed);
    } else {
      setSelectedDate(new Date());
      setCurrentMonth(new Date());
    }
  }, [isOpen, appointmentData.date]);

  // Navegação dos meses
  const handlePrevMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  // Resetar ao fechar
  const handleClose = () => {
    setAppointmentData({
      date: '',
      time: '',
      profissional: '',
      detalhes: '',
      pacienteId: '',
      nomePaciente: '',
      email: '',
      cpf: '',
      telefone: '',
      dataNascimento: '',
      convenio: '',
      procedimento: '',
    });
    setSelectedPeriod('Manhã');
    setIsNewPatient(true);
    setPacientes([]);
    setPacienteQuery('');
    onClose();
  };

  // Novo estado para controlar o índice de início do scroll dos dias
  const [daysScrollIndex, setDaysScrollIndex] = useState(0);

  // Corrija: calcule daysOfMonth antes dos efeitos
  const daysOfMonth = getDaysOfMonth(currentMonth);

  // Atualiza o índice de scroll ao trocar de mês ou abrir o modal
  useEffect(() => {
    setDaysScrollIndex(0);
  }, [currentMonth, isOpen]);

  // Garante que o dia selecionado esteja visível ao trocar de mês ou ao abrir o modal
  useEffect(() => {
    const idx = daysOfMonth.findIndex((d) => isSameDay(d, selectedDate));
    if (idx >= 0) {
      if (idx < daysScrollIndex) {
        setDaysScrollIndex(idx);
      } else if (idx >= daysScrollIndex + 6) {
        setDaysScrollIndex(idx - 5);
      }
    }
  }, [currentMonth, selectedDate, daysScrollIndex, daysOfMonth]);

  // Função para mostrar todos os dias do mês (não mais só 6)
  const visibleDays = daysOfMonth;

  // Adicione uma ref para o container dos dias
  const daysScrollRef = useRef<HTMLDivElement>(null);

  // Função para navegar pelos dias (scroll lateral infinito)
  const scrollDays = (direction: 'left' | 'right') => {
    if (daysScrollRef.current) {
      const width = daysScrollRef.current.offsetWidth;
      daysScrollRef.current.scrollBy({
        left: direction === 'left' ? -width : width,
        behavior: 'smooth',
      });
    }
  };

  // Corrige: use o índice correto do dia clicado em daysOfMonth
  const handleDayClick = (date: Date) => {
    if (!isDayEnabled(date)) return;
    setSelectedDate(date);
    const formatted = format(date, 'yyyy-MM-dd');
    setAppointmentData((prev: any) => ({ ...prev, date: formatted, time: '' }));
    fetchAvailableTimes(formatted, appointmentData.profissional);
    setSelectedPeriod('Manhã');
    setTimeout(() => {
      if (timesContainerRef.current) timesContainerRef.current.scrollTo({ left: 0 });
    }, 0);

    // Corrigido: ajuste o scroll para garantir que o dia clicado fique visível
    const idx = daysOfMonth.findIndex((d) => isSameDay(d, date));
    if (idx >= 0) {
      if (idx < daysScrollIndex) {
        setDaysScrollIndex(idx);
      } else if (idx >= daysScrollIndex + 6) {
        setDaysScrollIndex(idx - 5);
      }
    }
  };

  // Novo estado para controlar o índice de scroll dos horários
  const [timesScrollIndex, setTimesScrollIndex] = useState(0);
  const [convenios, setConvenios] = useState<{ id: string; nome: string }[]>([]);
  const [procedimentos, setProcedimentos] = useState<{ id: string; nome: string }[]>([]);
  const [isNewPatient, setIsNewPatient] = useState(true);
  const [pacientes, setPacientes] = useState<PacienteDetails[]>([]);
  const [pacienteQuery, setPacienteQuery] = useState('');

  // Atualiza o índice de scroll dos horários ao mudar o período
  useEffect(() => {
    setTimesScrollIndex(0);
  }, [selectedPeriod, availableTimes]);

  useEffect(() => {
    const fetchData = async () => {
      if (isOpen) {
        try {
          const [convDocs, procDocs] = await Promise.all([
            buscarConvenios(),
            buscarProcedimentos(),
          ]);
          setConvenios(convDocs as any);
          setProcedimentos(procDocs as any);
        } catch (err) {
          console.error('Erro ao buscar dados:', err);
        }
      }
    };
    fetchData();
  }, [isOpen, setAppointmentData]);

  // Novo: busca pacientes do banco ao abrir o modal
  useEffect(() => {
    const fetchPacientes = async () => {
      if (isOpen) {
        try {
          const snap = await getDocs(collection(firestore, 'pacientes'));
          const list: PacienteDetails[] = [];
          snap.forEach(doc => {
            const data = doc.data();
            list.push({
              id: doc.id,
              nome: data.nome || '',
              email: data.email || '',
              cpf: data.cpf || '',
              telefone: data.telefone || '',
              dataNascimento: data.dataNascimento || '',
              convenio: data.convenio || '',
            });
          });
          setPacientes(list);
        } catch (err) {
          setPacientes([]);
        }
      }
    };
    fetchPacientes();
  }, [isOpen]);

  // Navegação dos horários
  const scrollTimes = (direction: 'left' | 'right') => {
    if (timesContainerRef.current) {
      const width = timesContainerRef.current.offsetWidth;
      timesContainerRef.current.scrollBy({
        left: direction === 'left' ? -width : width,
        behavior: 'smooth',
      });
    }
  };

  // Botão de período: apenas faz scroll até o primeiro horário do período, não filtra
  const handlePeriodClick = (period: 'Manhã' | 'Tarde' | 'Noite') => {
    setSelectedPeriod(period);
    setTimeout(() => {
      if (timesContainerRef.current && horariosGerados.length > 0) {
        const idx = horariosGerados.findIndex((time) => getPeriod(time) === period);
        if (idx >= 0) {
          const btns = Array.from(timesContainerRef.current.querySelectorAll('button'));
          if (btns[idx]) {
            // Corrigido: scroll apenas para o botão, sem arrastar o container inteiro
            (btns[idx] as HTMLElement).scrollIntoView({
              behavior: 'smooth',
              inline: 'center', // centraliza o botão na view
              block: 'nearest'
            });
          }
        }
      }
    }, 0);
  };

  // Estado para profissionais cadastrados no sistema
  const [profissionaisCadastrados, setProfissionaisCadastrados] = useState<
    { id: string; nome: string; procedimentos?: string[]; convenio?: string[] }[]
  >([]);

  // Buscar profissionais do Firestore ao abrir o modal
  useEffect(() => {
    const fetchProfissionais = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'profissionais'));
        const list: { id: string; nome: string; procedimentos?: string[]; convenio?: string[] }[] = [];
        snap.forEach(doc => {
          const data = doc.data();
          if (data.nome) {
            list.push({
              id: doc.id,
              nome: data.nome,
              procedimentos: Array.isArray(data.procedimentos) ? data.procedimentos : [],
              convenio: Array.isArray(data.convenio) ? data.convenio : [],
            });
          }
        });
        setProfissionaisCadastrados(list);
      } catch (err) {
        setProfissionaisCadastrados([]);
      }
    };
    if (isOpen) fetchProfissionais();
  }, [isOpen, isSubmitting]); // Adicione isSubmitting para atualizar após edição

  // Novo: procedimentos e convenios do profissional selecionado
  const [procedimentosProfissional, setProcedimentosProfissional] = useState<string[]>([]);
  const [conveniosProfissional, setConveniosProfissional] = useState<string[]>([]);

  useEffect(() => {
    if (appointmentData.profissional) {
      const prof = profissionaisCadastrados.find(p => p.nome === appointmentData.profissional);
      setProcedimentosProfissional(prof?.procedimentos || []);
      setConveniosProfissional(prof?.convenio || []);
    } else {
      setProcedimentosProfissional([]);
      setConveniosProfissional([]);
    }
  }, [appointmentData.profissional, profissionaisCadastrados]);

  // Buscar horários do profissional selecionado para o dia da semana
  const [horarioDoDia, setHorarioDoDia] = useState<any>(null);

  useEffect(() => {
    const fetchHorario = async () => {
      if (!appointmentData.profissional || !selectedDate) {
        setHorarioDoDia(null);
        return;
      }
      const profSnap = await getDocs(collection(
        firestore,
        'profissionais'
      ));
      const profDoc = profSnap.docs.find(
        d => d.data().nome === appointmentData.profissional
      );
      if (!profDoc) {
        setHorarioDoDia(null);
        return;
      }
      const horariosSnap = await getDocs(collection(
        firestore,
        'profissionais',
        profDoc.id,
        'horarios'
      ));
      // Use o mesmo array diasSemana para garantir igualdade
      const diaSemana = diasSemana[selectedDate.getDay()];
      const horario = horariosSnap.docs
        .map(d => d.data())
        .find(h => h.dia === diaSemana);
      setHorarioDoDia(horario || null);
    };
    fetchHorario();
  }, [appointmentData.profissional, selectedDate]);

  // Gera todos os horários disponíveis do dia, sem filtrar por período
  const gerarHorarios = () => {
    if (
      !horarioDoDia ||
      typeof horarioDoDia.horaInicio !== 'string' ||
      typeof horarioDoDia.horaFim !== 'string' ||
      !horarioDoDia.horaInicio.match(/^\d{2}:\d{2}$/) ||
      !horarioDoDia.horaFim.match(/^\d{2}:\d{2}$/) ||
      !horarioDoDia.intervaloConsultas ||
      isNaN(Number(horarioDoDia.intervaloConsultas)) ||
      Number(horarioDoDia.intervaloConsultas) < 5
    ) return [];

    const horarios: string[] = [];
    let [h, m] = horarioDoDia.horaInicio.split(':').map(Number);
    const [endH, endM] = horarioDoDia.horaFim.split(':').map(Number);
    const almocoInicio = typeof horarioDoDia.almocoInicio === 'string' && horarioDoDia.almocoInicio.match(/^\d{2}:\d{2}$/)
      ? horarioDoDia.almocoInicio
      : null;
    const almocoFim = typeof horarioDoDia.almocoFim === 'string' && horarioDoDia.almocoFim.match(/^\d{2}:\d{2}$/)
      ? horarioDoDia.almocoFim
      : null;
    const intervalo = Number(horarioDoDia.intervaloConsultas);

    const pad = (n: number) => n.toString().padStart(2, '0');

    while (h < endH || (h === endH && m <= endM)) {
      const horaStr = `${pad(h)}:${pad(m)}`;
      // Pula horários dentro do intervalo de almoço
      if (
        almocoInicio && almocoFim &&
        horaStr >= almocoInicio && horaStr < almocoFim
      ) {
        const [almocoEndH, almocoEndM] = almocoFim.split(':').map(Number);
        h = almocoEndH;
        m = almocoEndM;
        continue;
      }
      horarios.push(horaStr);
      m += intervalo;
      while (m >= 60) {
        m -= 60;
        h += 1;
      }
      if (h > endH || (h === endH && m > endM)) break;
    }
    return horarios;
  };

  const horariosGerados = horarioDoDia ? gerarHorarios() : availableTimes;
  const normalize = (t: string) => t.trim().slice(0, 5);
  const normalizedReserved = reservedTimes.map(normalize);
  const isTimeDisabled = (time: string) => normalizedReserved.includes(normalize(time));
  const filteredPacientes = pacientes.filter(p =>
    p.nome.toLowerCase().includes(pacienteQuery.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      className={styles.modalContent}
      overlayClassName={styles.modalOverlay}
    >
      <form onSubmit={onSubmit} className={styles.form} style={{ position: 'relative' }}>
        {isSubmitting && (
          <div className={styles.modalLoadingOverlay}>
            <div className={styles.modalSpinner}></div>
            <span className={styles.modalLoadingText}>Aguarde...</span>
          </div>
        )}
        {/* Header com mês/ano e botões de navegação centralizados */}
        <div className={styles.modalHeader}>
          <div className={styles.monthNavGroup}>
            <button
              type="button"
              aria-label="Mês anterior"
              className={styles.monthNavBtn}
              onClick={handlePrevMonth}
            >
              &#8592;
            </button>
            <span className={styles.modalTitle}>
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
            <button
              type="button"
              aria-label="Próximo mês"
              className={styles.monthNavBtn}
              onClick={handleNextMonth}
            >
              &#8594;
            </button>
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={handleClose} aria-label="Fechar">
            ×
          </button>
        </div>

        {/* Linha dos dias com scroll visual, sem setas */}
        <div className={styles.daysNavWrapper}>
          <div className={styles.daysContainer} ref={daysScrollRef}>
            {visibleDays.map((day) => (
              <button
                key={day.toDateString()}
                type="button"
                onClick={() => handleDayClick(day)}
                disabled={!isDayEnabled(day)}
                className={`${styles.dayCard} ${isSameDay(day, selectedDate) ? styles.activeDay : ''} ${!isDayEnabled(day) ? styles.disabledDay : ''}`}
              >
                <div className={styles.dayName}>{format(day, 'EEE', { locale: ptBR })}</div>
                <div className={styles.dayNumber}>{format(day, 'dd')}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Botões de período */}
        <div className={styles.periodFilter}>
          {periodLabels.map((label) => (
            <button
              key={label}
              type="button"
              className={`${styles.periodButton} ${selectedPeriod === label ? styles.activePeriod : ''}`}
              onClick={() => handlePeriodClick(label as 'Manhã' | 'Tarde' | 'Noite')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Horários disponíveis com scroll, sem setas */}
        <div className={styles.timesNavWrapper}>
          <div
            className={styles.timeSelectorWrapper}
            ref={timesContainerRef}
          >
            {(horariosGerados.length > 0) ? (
              horariosGerados.map((time) => (
                <button
                  key={time}
                  type="button"
                  className={`${styles.timeButton} ${appointmentData.time === time ? styles.activeTime : ''} ${isTimeDisabled(time) ? styles.disabledTime : ''}`}
                  onClick={() => setAppointmentData((prev: any) => ({ ...prev, time }))}
                  disabled={isTimeDisabled(time)}
                >
                  {time}
                </button>
              ))
            ) : (
              <p className={styles.noTime}>Nenhum horário disponível para este período ou selecione um profissional e dia da semana para visualizar os horários disponíveis.</p>
            )}
          </div>
        </div>

        {/* Box de resumo, seleção de profissional e paciente */}
        <div className={styles.summaryBoxStyled}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Profissional:</span>
            <span className={styles.summaryValue}>{appointmentData.profissional || 'Sem preferência'}</span>
          </div>
          <div className={styles.patientTypeContainer}>
            <button
              type="button"
              className={`${styles.patientTypeButton} ${isNewPatient ? styles.activeType : ''}`}
              onClick={() => setIsNewPatient(true)}
            >
              Paciente Novo
            </button>
            <button
              type="button"
              className={`${styles.patientTypeButton} ${!isNewPatient ? styles.activeType : ''}`}
              onClick={() => setIsNewPatient(false)}
            >
              Paciente Existente
            </button>
          </div>
          {isNewPatient ? (
            <>
              <div className={styles.selectGroup}>
                <input
                  type="text"
                  value={appointmentData.nomePaciente}
                  onChange={e =>
                    setAppointmentData((prev: any) => ({ ...prev, nomePaciente: e.target.value }))
                  }
                  placeholder="Nome do paciente"
                  className={styles.selectStyled}
                />
              </div>
              <div className={styles.selectGroup}>
                <input
                  type="email"
                  value={appointmentData.email}
                  onChange={e => setAppointmentData((prev: any) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  className={styles.selectStyled}
                />
              </div>
              <div className={styles.selectGroup}>
                <input
                  type="text"
                  value={appointmentData.cpf}
                  onChange={e => setAppointmentData((prev: any) => ({ ...prev, cpf: e.target.value }))}
                  placeholder="CPF"
                  className={styles.selectStyled}
                />
              </div>
              <div className={styles.selectGroup}>
                <input
                  type="text"
                  value={appointmentData.telefone}
                  onChange={e => setAppointmentData((prev: any) => ({ ...prev, telefone: e.target.value }))}
                  placeholder="Telefone"
                  className={styles.selectStyled}
                />
              </div>
              <div className={styles.selectGroup}>
                <input
                  type="text"
                  value={appointmentData.dataNascimento}
                  onChange={e => setAppointmentData((prev: any) => ({ ...prev, dataNascimento: e.target.value }))}
                  placeholder="Nascimento (DD/MM/AAAA)"
                  className={styles.selectStyled}
                />
              </div>
            </>
          ) : (
            <div className={styles.selectGroup}>
              <select
                value={appointmentData.pacienteId || ''}
                onChange={e => {
                  const selectedId = e.target.value;
                  setAppointmentData((prev: typeof appointmentData) => {
                    const selected = pacientes.find(p => p.id === selectedId);
                    if (selected) {
                      return {
                        ...prev,
                        pacienteId: selected.id,
                        nomePaciente: selected.nome,
                        email: selected.email || '',
                        cpf: selected.cpf || '',
                        telefone: selected.telefone || '',
                        dataNascimento: selected.dataNascimento || '',
                        convenio: selected.convenio || '',
                      };
                    }
                    return { ...prev, pacienteId: '', nomePaciente: '' };
                  });
                }}
                className={styles.selectStyled}
                onInput={e => {
                  // Filtra pacientes conforme digitação no select (funciona em navegadores modernos)
                  const input = (e.target as HTMLSelectElement).value.toLowerCase();
                  setPacienteQuery(input);
                }}
              >
                <option value="">Buscar paciente</option>
                {pacientes
                  .filter(p => p.nome.toLowerCase().includes(pacienteQuery.toLowerCase()))
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.cpf ? `- ${p.cpf}` : ''}
                    </option>
                  ))}
              </select>
            </div>
          )}
          {/* Profissional */}
          <div className={styles.selectGroup}>
            <select
              value={appointmentData.profissional}
              onChange={(e) => {
                setAppointmentData((prev: any) => ({
                  ...prev,
                  profissional: e.target.value,
                  convenio: '',
                  procedimento: '',
                }));
                if (appointmentData.date) {
                  fetchAvailableTimes(appointmentData.date, e.target.value);
                }
              }}
              required
              className={styles.selectStyled}
            >
              <option value="">Selecione um profissional</option>
              {profissionaisCadastrados.map((p) => (
                <option key={p.id} value={p.nome}>{p.nome}</option>
              ))}
            </select>
          </div>

          {/* Convenio só aparece após selecionar profissional */}
          {appointmentData.profissional && (
            <div className={styles.selectGroup}>
              <select
                value={appointmentData.convenio}
                onChange={e => setAppointmentData((prev: typeof appointmentData) => ({ ...prev, convenio: e.target.value }))
                }
                className={styles.selectStyled}
              >
                <option value="">Selecione o convênio</option>
                <option value="Particular">Particular</option>
                {conveniosProfissional.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Procedimento só aparece após selecionar profissional */}
          {appointmentData.profissional && (
            <div className={styles.selectGroup}>
              <select
                value={appointmentData.procedimento}
                onChange={e => setAppointmentData((prev: typeof appointmentData) => ({ ...prev, procedimento: e.target.value }))
                }
                className={styles.selectStyled}
              >
                <option value="">Selecione o procedimento</option>
                {procedimentosProfissional.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Descrição menor */}
        <textarea
          placeholder="Descrição"
          value={appointmentData.detalhes}
          onChange={(e) => setAppointmentData((prev: any) => ({ ...prev, detalhes: e.target.value }))}
          className={styles.inputDescricao}
          style={{ minHeight: 40, maxHeight: 60 }}
        />

        {/* Footer com botões lado a lado e do mesmo tamanho */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            onClick={handleClose}
            className={styles.buttonSecondary}
            style={{ flex: 1, borderRadius: "10px 0 0 10px", margin: 0, minWidth: 0 }}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.buttonStyled}
            style={{ flex: 1, borderRadius: "0 10px 10px 0", margin: 0, minWidth: 0 }}
            disabled={
              isSubmitting ||
              !appointmentData.date ||
              !appointmentData.profissional ||
              !appointmentData.time ||
              !appointmentData.nomePaciente
            }
          >
            {isSubmitting ? 'Aguarde...' : 'Confirmar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateAppointmentModal;
import React, { useEffect, useRef, useState } from 'react';
import Modal from 'react-modal';
import styles from '@/styles/admin/agendamentos/CreateAppointment.module.css';
import { format, addDays, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, parse, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { firestore } from '@/firebase/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { buscarConvenios } from '@/functions/conveniosFunctions';
import { buscarProcedimentos } from '@/functions/procedimentosFunctions';
import { calculateAvailableSlots } from '@/utils/schedule';
import { buscarPacientesComDetalhes, PacienteDetails } from '@/functions/pacientesFunctions';

// Máscaras de formatação
const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
};

const formatTelefone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
};

const maskDataNascimento = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1/$2')
    .replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3')
    .slice(0, 10);
};

// Validação de CPF
function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /(\d)\1+$/.test(cpf)) return false;
  let soma = 0,
    resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf[i - 1]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf[i - 1]) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[10])) return false;
  return true;
}

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

interface AgendamentoDia {
  hora: string;
  procedimento: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  appointmentData: {
    date: string;
    time: string;
    fim: string;
    profissional: string;
    detalhes: string;
    motivo: string;
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
  agendamentosDoDia: AgendamentoDia[]; // <-- ensure this prop exists
  fetchAvailableTimes: (date: string, profissional: string) => void;
  availableDays: string[];
  selectedProfessional: string;
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
  agendamentosDoDia, // <-- add this to the destructuring
  fetchAvailableTimes,
  availableDays,
  selectedProfessional,
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<'Manhã' | 'Tarde' | 'Noite'>('Manhã');
  const daysContainerRef = useRef<HTMLDivElement>(null);
  const timesContainerRef = useRef<HTMLDivElement>(null);
  const [cpfError, setCpfError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAppointmentData((prev: typeof appointmentData) => ({ ...prev, profissional: selectedProfessional }));
    }
  }, [isOpen, selectedProfessional, setAppointmentData]);

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
    const today = startOfToday();
    return diasDisponiveis.includes(label) && day >= today;
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

  // Função para resetar o formulário ao fechar o modal
  const handleClose = () => {
    setAppointmentData({
      date: '',
      time: '',
      fim: '',
      profissional: '',
      detalhes: '',
      motivo: '',
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
  const [procedimentos, setProcedimentos] = useState<{ id: string; nome: string; duracao: number }[]>([]);
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

  // Gera horários disponíveis considerando a duração do procedimento
  const gerarHorarios = () => {
    if (!horarioDoDia) return [] as string[];
    const selProc = procedimentos.find(p => p.nome === appointmentData.procedimento);
    const duracao = selProc ? selProc.duracao : Number(horarioDoDia.intervaloConsultas);
    if (!duracao || duracao < 5) return [] as string[];

    const slots = calculateAvailableSlots(
      {
        start: horarioDoDia.horaInicio,
        end: horarioDoDia.horaFim,
        lunchStart: horarioDoDia.almocoInicio,
        lunchEnd: horarioDoDia.almocoFim,
        reserved: reservedTimes,
      },
      duracao
    );

    // Garanta que nenhum horário já reservado seja exibido
    return slots.filter(s => !reservedTimes.includes(s));
  };

  // Função para bloquear horários que estejam dentro do intervalo de agendamentos já existentes
  const bloquearHorariosSobrepostos = (horarios: string[]) => {
    // Para cada horário possível, bloqueie se ele estiver dentro do intervalo de algum agendamento
    return horarios.filter(horario => {
      const [h, m] = horario.split(':').map(Number);
      const inicioNovo = new Date(0, 0, 0, h, m, 0, 0);
      // Não pode começar se estiver >= início e < fim de algum agendamento
      for (const ag of agendamentosDoDia) {
        const proc = procedimentos.find(p => p.nome === ag.procedimento);
        const duracao = proc ? proc.duracao : 15;
        const [hA, mA] = ag.hora.split(':').map(Number);
        const inicioAg = new Date(0, 0, 0, hA, mA, 0, 0);
        const fimAg = new Date(inicioAg.getTime() + duracao * 60000);
        if (inicioNovo >= inicioAg && inicioNovo < fimAg) {
          return false;
        }
      }
      return true;
    });
  };

  const horariosGerados = horarioDoDia ? bloquearHorariosSobrepostos(gerarHorarios()) : bloquearHorariosSobrepostos(availableTimes);
  const normalize = (t: string) => t.trim().slice(0, 5);
const normalizedReserved = reservedTimes.map(normalize);
// Bloqueia horários sobrepostos também na função de desabilitar
const isTimeDisabled = (time: string) => {
  // Verifica se está bloqueado por sobreposição
  const [h, m] = time.split(':').map(Number);
  const inicioNovo = new Date(0, 0, 0, h, m, 0, 0);
  for (const ag of agendamentosDoDia) {
    const proc = procedimentos.find(p => p.nome === ag.procedimento);
    const duracao = proc ? proc.duracao : 15;
    const [hA, mA] = ag.hora.split(':').map(Number);
    const inicioAg = new Date(0, 0, 0, hA, mA, 0, 0);
    const fimAg = new Date(inicioAg.getTime() + duracao * 60000);
    if (inicioNovo >= inicioAg && inicioNovo < fimAg) {
      return true;
    }
  }
  if (normalizedReserved.includes(normalize(time))) return true;
  if (isSameDay(selectedDate, startOfToday())) {
    const [h, m] = time.split(':').map(Number);
    const timeDate = new Date();
    timeDate.setHours(h, m, 0, 0);
    if (timeDate < new Date()) return true;
  }
  return false;
};
  const filteredPacientes = pacientes.filter(p =>
    p.nome.toLowerCase().includes(pacienteQuery.toLowerCase())
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (appointmentData.cpf && !isValidCPF(appointmentData.cpf)) {
      setCpfError('CPF inválido');
      return;
    }
    setCpfError('');

    // Verifica se o profissional trabalha no dia selecionado
    if (appointmentData.date && appointmentData.profissional) {
      const diasSemana = [
        'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
      ];
      const selectedDateObj = parse(appointmentData.date, 'yyyy-MM-dd', new Date());
      const diaSemana = diasSemana[selectedDateObj.getDay()];
      if (!diasDisponiveis.includes(diaSemana)) {
        window.alert('O profissional selecionado não trabalha neste dia da semana. Escolha outro dia.');
        return;
      }
    }

    // Verifica se o horário já está reservado ou sobreposto
    const [h, m] = appointmentData.time.split(':').map(Number);
    const inicioNovo = new Date(0, 0, 0, h, m, 0, 0);
    let bloqueado = false;
    for (const ag of agendamentosDoDia) {
      const proc = procedimentos.find(p => p.nome === ag.procedimento);
      const duracao = proc ? proc.duracao : 15;
      const [hA, mA] = ag.hora.split(':').map(Number);
      const inicioAg = new Date(0, 0, 0, hA, mA, 0, 0);
      const fimAg = new Date(inicioAg.getTime() + duracao * 60000);
      if (inicioNovo >= inicioAg && inicioNovo < fimAg) {
        bloqueado = true;
        break;
      }
    }
    if (bloqueado || normalizedReserved.includes(normalize(appointmentData.time))) {
      window.alert('Horário indisponível! Já existe um agendamento para este profissional neste dia e horário.');
      return;
    }
    onSubmit(e);
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      className={styles.modalContent}
      overlayClassName={styles.modalOverlay}
    >
      <form onSubmit={handleFormSubmit} className={styles.form} style={{ position: 'relative' }}>
        {isSubmitting && (
          <div className={styles.modalLoadingOverlay}>
            <div className={styles.modalSpinner}></div>
            <span className={styles.modalLoadingText}>Aguarde...</span>
          </div>
        )}
        {/* Header do modal */}
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>
            Novo Agendamento
          </span>
          <button type="button" className={styles.modalCloseBtn} onClick={handleClose} aria-label="Fechar">
            ×
          </button>
        </div>
        {/* Mostra data e horário selecionados, editáveis */}
        <div className={styles.selectedDateTimeRow}>
          <div className={styles.selectGroup}>
            <label className={styles.selectedDateTimeLabel}>Data:</label>
            <input
              type="date"
              value={appointmentData.date}
              onChange={e =>
                setAppointmentData((prev: any) => ({ ...prev, date: e.target.value }))
              }
              className={styles.selectStyled}
              required
            />
          </div>
          <div className={styles.selectGroup}>
            <label className={styles.selectedDateTimeLabel}>Início:</label>
            <input
              type="time"
              value={appointmentData.time}
              onChange={e =>
                setAppointmentData((prev: any) => ({ ...prev, time: e.target.value }))
              }
              className={styles.selectStyled}
              required
            />
          </div>
        </div>
        {/* Box de resumo, seleção de profissional e paciente */}
        <div className={styles.summaryBoxStyled}>
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
                  onChange={e =>
                    setAppointmentData((prev: any) => ({
                      ...prev,
                      cpf: formatCPF(e.target.value),
                    }))
                  }
                  onBlur={() =>
                    setCpfError(
                      appointmentData.cpf && !isValidCPF(appointmentData.cpf)
                        ? 'CPF inválido'
                        : ''
                    )
                  }
                  placeholder="CPF"
                  className={styles.selectStyled}
                />
                {cpfError && <span className={styles.error}>{cpfError}</span>}
              </div>
              <div className={styles.selectGroup}>
                <input
                  type="text"
                  value={appointmentData.telefone}
                  onChange={e =>
                    setAppointmentData((prev: any) => ({
                      ...prev,
                      telefone: formatTelefone(e.target.value),
                    }))
                  }
                  placeholder="Telefone"
                  className={styles.selectStyled}
                />
              </div>
              <div className={styles.selectGroup}>
                <input
                  type="text"
                  value={appointmentData.dataNascimento}
                  onChange={e =>
                    setAppointmentData((prev: any) => ({
                      ...prev,
                      dataNascimento: maskDataNascimento(e.target.value),
                    }))
                  }
                  placeholder="Nascimento (DD/MM/AAAA)"
                  className={styles.selectStyled}
                />
              </div>
            </>
          ) : (
            <div className={styles.selectGroup}>
              <input
                type="text"
                placeholder="Buscar paciente"
                value={pacienteQuery}
                onChange={e => setPacienteQuery(e.target.value)}
                className={styles.selectStyled}
                style={{ marginBottom: 8 }}
              />
              <select
                value={appointmentData.pacienteId || ''}
                onChange={e => {
                  const selectedId = e.target.value;
                  setAppointmentData((prev: typeof appointmentData) => {
                    const selected = pacientes.find(p => p.id === selectedId);
                    if (selected) {
                      setPacienteQuery(selected.nome);
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
              >
                <option value="">Selecione um paciente</option>
                {pacientes
                  .filter(p =>
                    p.nome.toLowerCase().includes(pacienteQuery.toLowerCase()) ||
                    (p.cpf || '').toLowerCase().includes(pacienteQuery.toLowerCase())
                  )
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.cpf ? `- ${p.cpf}` : ''}
                    </option>
                  ))}
              </select>
            </div>
          )}
          {/* Profissional: sempre mostra o select, mas já vem selecionado se veio de fora */}
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
              }}
              required
              className={styles.selectStyled}
              disabled={!!selectedProfessional && profissionaisCadastrados.some(p => p.nome === selectedProfessional)}
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
          <div className={styles.selectGroup}>
            <select
              value={appointmentData.motivo}
              onChange={e =>
                setAppointmentData((prev: typeof appointmentData) => ({ ...prev, motivo: e.target.value }))
              }
              className={styles.selectStyled}
            >
              <option value="">Motivo da consulta</option>
              <option value="Urgência">Urgência</option>
              <option value="Retorno">Retorno</option>
              <option value="Primeira consulta">Primeira consulta</option>
              <option value="Acompanhamento">Acompanhamento</option>
              <option value="Exame de rotina">Exame de rotina</option>
              <option value="Encaminhamento">Encaminhamento</option>
            </select>
          </div>
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
              !appointmentData.nomePaciente ||
              !appointmentData.email ||
              !appointmentData.cpf ||
              !isValidCPF(appointmentData.cpf) ||
              !appointmentData.telefone ||
              !appointmentData.dataNascimento ||
              !appointmentData.motivo
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
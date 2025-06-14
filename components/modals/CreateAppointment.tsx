import React, { useEffect, useRef, useState } from 'react';
import Modal from 'react-modal';
import styles from '@/styles/CreateAppointment.module.css';
import { format, addDays, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { auth, firestore } from '@/firebase/firebaseConfig';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { buscarConvenios } from '@/functions/conveniosFunctions';

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
    nomePaciente: string;
    convenio: string;
    procedimento: string;
  };
  setAppointmentData: React.Dispatch<React.SetStateAction<any>>;
  availableTimes: string[];
  profissionais: { id: string; nome: string }[];
  procedimentos: { id: string; nome: string; duracao: number }[];
  fetchAvailableTimes: (date: string, profissional: string, duracao?: number) => void;
}

const CreateAppointmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  appointmentData,
  setAppointmentData,
  availableTimes,
  profissionais,
  procedimentos,
  fetchAvailableTimes,
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
      nomePaciente: '',
      convenio: '',
      procedimento: '',
    });
    setSelectedPeriod('Manhã');
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

  // Função para mostrar 6 dias por vez
  const visibleDays = daysOfMonth.slice(daysScrollIndex, daysScrollIndex + 6);

  // Corrija: use o índice correto do dia clicado em daysOfMonth
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const formatted = format(date, 'yyyy-MM-dd');
    setAppointmentData((prev: any) => ({ ...prev, date: formatted, time: '' }));
    const proc = procedimentos.find(p => p.nome === appointmentData.procedimento);
    fetchAvailableTimes(formatted, appointmentData.profissional, proc?.duracao);
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

  // Função para navegar pelos dias
  const scrollDays = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      setDaysScrollIndex((prev) => Math.max(0, prev - 1));
    } else {
      setDaysScrollIndex((prev) => Math.min(daysOfMonth.length - 6, prev + 1));
    }
  };

  // Novo estado para controlar o índice de scroll dos horários
  const [timesScrollIndex, setTimesScrollIndex] = useState(0);
  const [convenios, setConvenios] = useState<{ id: string; nome: string }[]>([]);
  const [userInfo, setUserInfo] = useState<{ nome: string } | null>(null);

  // Atualiza o índice de scroll dos horários ao mudar o período
  useEffect(() => {
    setTimesScrollIndex(0);
  }, [selectedPeriod, availableTimes]);

  useEffect(() => {
    const fetchData = async () => {
      if (isOpen) {
        try {
          const convDocs = await buscarConvenios();
          setConvenios(convDocs as any);

          const current = auth.currentUser;
          if (current) {
            const snap = await getDoc(doc(firestore, 'users', current.uid));
            if (snap.exists()) {
              const data = snap.data();
              const nome = data.nome || '';
              setUserInfo({ nome });
              setAppointmentData((prev: typeof appointmentData) => ({ ...prev, nomePaciente: nome }));
            }
          }
        } catch (err) {
          console.error('Erro ao buscar dados:', err);
        }
      }
    };
    fetchData();
  }, [isOpen, setAppointmentData]);

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

  // Ao clicar no período, faz scroll até o primeiro horário daquele período
  const handlePeriodClick = (period: 'Manhã' | 'Tarde' | 'Noite') => {
    setSelectedPeriod(period);
    setTimeout(() => {
      if (timesContainerRef.current && availableTimes.length > 0) {
        const idx = getFirstIndexOfPeriod(availableTimes, period);
        if (idx >= 0) {
          const btns = timesContainerRef.current.querySelectorAll('button');
          if (btns[idx]) {
            const btn = btns[idx] as HTMLElement;
            btn.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
          }
        }
      }
    }, 0);
  };

  // Estado para profissionais cadastrados no sistema
  const [profissionaisCadastrados, setProfissionaisCadastrados] = useState<{ id: string; nome: string }[]>([]);

  // Buscar profissionais do Firestore ao abrir o modal
  useEffect(() => {
    const fetchProfissionais = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'profissionais'));
        const list: { id: string; nome: string }[] = [];
        snap.forEach(doc => {
          const data = doc.data();
          if (data.nome) {
            list.push({ id: doc.id, nome: data.nome });
          }
        });
        setProfissionaisCadastrados(list);
      } catch (err) {
        setProfissionaisCadastrados([]);
      }
    };
    if (isOpen) fetchProfissionais();
  }, [isOpen]);

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
        <div
          className={styles.modalHeader}
          style={{
            justifyContent: "center",
            gap: 24,
            position: "relative",
          display: "flex",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          aria-label="Mês anterior"
          style={{
            border: 'none',
            background: 'none',
            fontSize: 28,
            color: '#b0b0b0',
            cursor: 'pointer',
            padding: 0,
            width: 36,
            height: 36,
            borderRadius: '50%',
            boxShadow: '0 2px 8px #0001',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={handlePrevMonth}
        >
          &#8592;
        </button>
        <span className={styles.modalTitle} style={{ flex: "unset", minWidth: 180, textAlign: "center" }}>
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </span>
        <button
          type="button"
          aria-label="Próximo mês"
          style={{
            border: 'none',
            background: 'none',
            fontSize: 28,
            color: '#b0b0b0',
            cursor: 'pointer',
            padding: 0,
            width: 36,
            height: 36,
            borderRadius: '50%',
            boxShadow: '0 2px 8px #0001',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={handleNextMonth}
        >
          &#8594;
        </button>
        <button type="button" className={styles.modalCloseBtn} onClick={handleClose} aria-label="Fechar">
          ×
        </button>
      </div>

      {/* Linha dos dias com scroll visual e botões de navegação */}
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', marginBottom: 8, marginTop: 8 }}>
        <button
          type="button"
          aria-label="Dias anteriores"
          style={{
            border: 'none',
            background: 'none',
            fontSize: 28,
            color: '#b0b0b0',
            cursor: 'pointer',
            padding: 0,
            marginRight: 4,
            width: 36,
            height: 36,
            borderRadius: '50%',
            boxShadow: '0 2px 8px #0001',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => scrollDays('left')}
          disabled={daysScrollIndex === 0}
        >
          &#8592;
        </button>
        <div
          className={styles.daysContainer}
          style={{
            flex: 1,
            overflowX: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollBehavior: 'smooth',
            justifyContent: "center",
            gap: 12,
            padding: "24px 0 0 0"
          }}
        >
          {visibleDays.map((day) => (
            <button
              key={day.toDateString()}
              type="button"
              onClick={() => handleDayClick(day)}
              className={`${styles.dayCard} ${isSameDay(day, selectedDate) ? styles.activeDay : ''}`}
            >
              <div className={styles.dayName}>{format(day, 'EEE', { locale: ptBR })}</div>
              <div className={styles.dayNumber}>{format(day, 'dd')}</div>
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Próximos dias"
          style={{
            border: 'none',
            background: 'none',
            fontSize: 28,
            color: '#b0b0b0',
            cursor: 'pointer',
            padding: 0,
            marginLeft: 4,
            width: 36,
            height: 36,
            borderRadius: '50%',
            boxShadow: '0 2px 8px #0001',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => scrollDays('right')}
          disabled={daysScrollIndex + 6 >= daysOfMonth.length}
        >
          &#8594;
        </button>
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

      {/* Horários disponíveis com navegação */}
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', marginBottom: 8, marginTop: 16 }}>
        <button
          type="button"
          aria-label="Horários anteriores"
          style={{
            border: 'none',
            background: 'none',
            fontSize: 28,
            color: '#b0b0b0',
            cursor: 'pointer',
            padding: 0,
            marginRight: 8,
            width: 36,
            height: 36,
            borderRadius: '50%',
            boxShadow: '0 2px 8px #0001',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => scrollTimes('left')}
          tabIndex={-1}
        >
          &#8592;
        </button>
        <div
          className={styles.timeSelectorWrapper}
          ref={timesContainerRef}
        >
          {availableTimes.length > 0 ? (
            availableTimes.map((time) => (
              <button
                key={time}
                type="button"
                className={`${styles.timeButton} ${appointmentData.time === time ? styles.activeTime : ''}`}
                onClick={() => setAppointmentData((prev: any) => ({ ...prev, time }))}
                style={{
                  borderRadius: 14,
                  fontWeight: 700,
                  fontSize: "1.08rem",
                  background: appointmentData.time === time ? "#1992b7" : "#f3f4f6",
                  color: appointmentData.time === time ? "#fff" : "#222",
                  border: appointmentData.time === time ? "2px solid #1992b7" : "2px solid #e5e7eb",
                  boxShadow: appointmentData.time === time ? "0 2px 8px #1992b722" : "none",
                  transition: "all 0.2s"
                }}
              >
                {time}
              </button>
            ))
          ) : (
            <p className={styles.noTime}>Nenhum horário disponível para este período</p>
          )}
        </div>
        <button
          type="button"
          aria-label="Próximos horários"
          style={{
            border: 'none',
            background: 'none',
            fontSize: 28,
            color: '#b0b0b0',
            cursor: 'pointer',
            padding: 0,
            marginLeft: 8,
            width: 36,
            height: 36,
            borderRadius: '50%',
            boxShadow: '0 2px 8px #0001',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => scrollTimes('right')}
          tabIndex={-1}
        >
          &#8594;
        </button>
      </div>

      {/* Box de resumo, seleção de profissional e paciente */}
      <div className={styles.summaryBoxStyled}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Profissional:</span>
          <span className={styles.summaryValue}>{appointmentData.profissional || 'Sem preferência'}</span>
        </div>
        <div className={styles.selectGroup}>
          <select
            value={appointmentData.profissional}
            onChange={(e) => {
              setAppointmentData((prev: any) => ({ ...prev, profissional: e.target.value }));
              if (appointmentData.date) {
                const proc = procedimentos.find(p => p.nome === appointmentData.procedimento);
                fetchAvailableTimes(appointmentData.date, e.target.value, proc?.duracao);
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
        <div className={styles.selectGroup}>
          <input
            type="text"
            value={userInfo?.nome || appointmentData.nomePaciente || ''}
            readOnly
            className={styles.selectStyled}
          />
        </div>

        <div className={styles.selectGroup}>
          <select
            value={appointmentData.convenio}
            onChange={e => setAppointmentData((prev: typeof appointmentData) => ({ ...prev, convenio: e.target.value }))}
            className={styles.selectStyled}
          >
            <option value="">Selecione o convênio</option>
            <option value="Particular">Particular</option>
            {convenios.map(c => (
              <option key={c.id} value={c.nome}>{c.nome}</option>
            ))}
          </select>
        </div>

        <div className={styles.selectGroup}>
          <select
            value={appointmentData.procedimento}
            onChange={e => {
              setAppointmentData((prev: typeof appointmentData) => ({ ...prev, procedimento: e.target.value }));
              const proc = procedimentos.find(p => p.nome === e.target.value);
              if (appointmentData.date && appointmentData.profissional && proc) {
                fetchAvailableTimes(appointmentData.date, appointmentData.profissional, proc.duracao);
              }
            }}
            className={styles.selectStyled}
          >
            <option value="">Selecione o procedimento</option>
            {procedimentos.map(p => (
              <option key={p.id} value={p.nome}>{p.nome}</option>
            ))}
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
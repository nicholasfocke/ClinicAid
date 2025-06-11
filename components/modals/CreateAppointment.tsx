import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import styles from '@/styles/CreateAppointment.module.css';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';



interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  appointmentData: {
    date: string;
    time: string;
    profissional: string;
    detalhes: string;
  };
  setAppointmentData: React.Dispatch<React.SetStateAction<any>>;
  availableTimes: string[];
  profissionais: { id: string; nome: string }[];
  fetchAvailableTimes: (date: string, profissional: string) => void;
}

const CreateAppointmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  appointmentData,
  setAppointmentData,
  availableTimes,
  profissionais,
  fetchAvailableTimes,
}) => {
  const [days, setDays] = useState<Date[]>([]);

  useEffect(() => {
    const today = new Date();
    const upcomingDays = Array.from({ length: 10 }, (_, i) => addDays(today, i));
    setDays(upcomingDays);
  }, []);

  const handleDayClick = (date: Date) => {
    const formatted = format(date, 'yyyy-MM-dd');
    setAppointmentData((prev: any) => ({ ...prev, date: formatted, time: '' }));
    fetchAvailableTimes(formatted, appointmentData.profissional);
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className={styles.modalContent}
      overlayClassName={styles.modalOverlay}
    >
      <div className={styles.modalHeader}><h2>Agendamento</h2></div>

      <div className={styles.daysContainer}>
        {days.map((day) => (
          <button
            key={day.toDateString()}
            onClick={() => handleDayClick(day)}
            className={`${styles.dayCard} ${appointmentData.date === format(day, 'yyyy-MM-dd') ? styles.activeDay : ''}`}
          >
            <div className={styles.dayName}>{format(day, 'EEE', { locale: ptBR })}</div>
            <div className={styles.dayNumber}>{format(day, 'dd')}</div>
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className={styles.formStyled}>
        <div className={styles.timeSelectorWrapper}>
          {availableTimes.length > 0 ? (
            availableTimes.map((time) => (
              <button
                key={time}
                type="button"
                className={`${styles.timeButton} ${appointmentData.time === time ? styles.activeTime : ''}`}
                onClick={() => setAppointmentData((prev: any) => ({ ...prev, time }))}
              >
                {time}
              </button>
            ))
          ) : (
            <p className={styles.noTime}>Nenhum horário disponível</p>
          )}
        </div>

        <div className={styles.summaryBoxStyled}>
          <p><strong>Funcionário:</strong> {appointmentData.profissional || 'Sem preferência'}</p>
          <div className={styles.selectGroup}>
            <select
              value={appointmentData.profissional}
              onChange={(e) => {
                setAppointmentData((prev: any) => ({ ...prev, profissional: e.target.value }));
                if (appointmentData.date) {
                  fetchAvailableTimes(appointmentData.date, e.target.value);
                }
              }}
              required
              className={styles.selectStyled}
            >
              <option value="">Selecione um profissional</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.nome}>{p.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <textarea
          placeholder="Descrição"
          value={appointmentData.detalhes}
          onChange={(e) => setAppointmentData((prev: any) => ({ ...prev, detalhes: e.target.value }))}
          className={styles.inputDescricao}
        />

        <div className={styles.modalFooter}>
          <button type="button" onClick={onClose} className={styles.buttonSecondary}>Cancelar</button>
          <button
            type="submit"
            className={styles.buttonStyled}
            disabled={!appointmentData.date || !appointmentData.profissional || !appointmentData.time}
          >
            Continuar
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateAppointmentModal;
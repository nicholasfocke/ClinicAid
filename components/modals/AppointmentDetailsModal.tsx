import { useEffect, useState } from 'react';
import styles from '@/styles/admin/agendamentos/appointmentDetails.module.css';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { buscarConvenios } from '@/functions/conveniosFunctions';
import { buscarProcedimentos } from '@/functions/procedimentosFunctions';
import { buscarMedicos } from '@/functions/medicosFunctions';
import { format as formatDateFns, parse as parseDateFns } from 'date-fns';
import { statusAgendamento } from '@/functions/agendamentosFunction';
import { criarNotificacao } from '@/functions/notificacoesFunctions';

interface Appointment {
  id: string;
  data: string;
  hora: string;
  profissional: string;
  nomePaciente: string;
  detalhes: string;
  usuarioId: string;
  convenio?: string;
  procedimento?: string;
  status: string;
}

interface UserData {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
}

interface Props {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (id: string) => void;
}

const AppointmentDetailsModal = ({ appointment, isOpen, onClose, onComplete }: Props) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [convenios, setConvenios] = useState<{ id: string; nome: string }[]>([]);
  const [procedimentos, setProcedimentos] = useState<{ id: string; nome: string }[]>([]);
  const [medicos, setMedicos] = useState<{ id: string; nome: string }[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (appointment?.usuarioId) {
        const ref = doc(firestore, 'users', appointment.usuarioId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setUserData({
            nome: data.nome || '',
            email: data.email || '',
            cpf: data.cpf || '',
            telefone: data.telefone || '',
          });
        }
      }
    };
    if (isOpen) {
      fetchUser();
    }
  }, [isOpen, appointment]);

  // Buscar convênios, procedimentos e médicos do sistema ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;
    const fetchAll = async () => {
      try {
        const [conv, procs, meds] = await Promise.all([
          buscarConvenios(),
          buscarProcedimentos(),
          buscarMedicos(),
        ]);
        setConvenios(conv);
        setProcedimentos(procs);
        setMedicos(meds);
      } catch {}
    };
    fetchAll();
  }, [isOpen]);

  // Função para atualizar status do agendamento
  const handleStatusChange = async (newStatus: string) => {
    if (!appointment) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      await updateDoc(doc(firestore, 'agendamentos', appointment.id), { status: newStatus });
      // Atualiza o status localmente (opcional, depende do parent atualizar)
      appointment.status = newStatus;

      try {
        const pacienteRef = doc(firestore, 'pacientes', appointment.usuarioId);
        const pacienteSnap = await getDoc(pacienteRef);
        if (pacienteSnap.exists()) {
          const pacienteData = pacienteSnap.data();
          const ags: any[] = pacienteData.agendamentos || [];
          const idx = ags.findIndex(
            ag =>
              ag.data === appointment.data &&
              ag.hora === appointment.hora &&
              ag.profissional === appointment.profissional
          );
          if (idx > -1) {
            ags[idx].status = newStatus;
            await updateDoc(pacienteRef, { agendamentos: ags });
          }
        }
      } catch {}

      if (
        newStatus === statusAgendamento.PENDENTE ||
        newStatus === statusAgendamento.CANCELADO
      ) {
        const texto =
          newStatus === statusAgendamento.PENDENTE
            ? 'Paciente não compareceu'
            : 'Consulta cancelada';
        const icone = newStatus === statusAgendamento.PENDENTE ? 'yellow' : 'red';
        await criarNotificacao({
          titulo: 'Agendamento',
          descricao: texto,
          icone,
          criadoEm: new Date().toISOString(),
          tipo: 'agendamento',
          lida: false,
          detalhes: { ...appointment },
        });
      }

      setStatusLoading(false);
      setStatusError(null);
    } catch (err) {
      setStatusLoading(false);
      setStatusError('Erro ao atualizar status.');
    }
  };

  if (!isOpen || !appointment) return null;

  // Busca pelo id ou nome salvo no agendamento
  const convenioNome =
    convenios.find(c => c.id === appointment.convenio)?.nome ||
    convenios.find(c => c.nome === appointment.convenio)?.nome ||
    appointment.convenio ||
    '-';
  const procedimentoNome =
    procedimentos.find(p => p.id === appointment.procedimento)?.nome ||
    procedimentos.find(p => p.nome === appointment.procedimento)?.nome ||
    appointment.procedimento ||
    '-';
  const profissionalNome =
    medicos.find(m => m.id === appointment.profissional)?.nome ||
    medicos.find(m => m.nome === appointment.profissional)?.nome ||
    appointment.profissional ||
    '-';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          X
        </button>
        <h3 className={styles.title}>Detalhes do Agendamento</h3>
        <p><strong>Paciente:</strong> {appointment.nomePaciente}</p>
        <p>
          <strong>Data:</strong>{' '}
          {appointment.data
            ? (() => {
                try {
                  let d = appointment.data;
                  let parsed = d.includes('-')
                    ? parseDateFns(d, 'yyyy-MM-dd', new Date())
                    : parseDateFns(d, 'dd/MM/yyyy', new Date());
                  return formatDateFns(parsed, 'dd-MM-yyyy');
                } catch {
                  return appointment.data;
                }
              })()
            : '-'
          }
        </p>
        <p><strong>Hora:</strong> {appointment.hora}</p>
        <p><strong>Profissional:</strong> {profissionalNome}</p>
        <p><strong>Convênio:</strong> {convenioNome}</p>
        <p><strong>Procedimento:</strong> {procedimentoNome}</p>
        <p><strong>Descrição:</strong> {appointment.detalhes}</p>
        <p>
          <strong>Status:</strong>{' '}
          <span
            className={`${styles.statusText} ${
              styles[appointment.status] || styles.statusAgendado
            }`}
          >
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </span>
        </p>
        <div className={styles.statusButtonsRow}>
          <button
            disabled={statusLoading || appointment.status === statusAgendamento.AGENDADO}
            className={`${styles.statusButton} ${appointment.status === statusAgendamento.AGENDADO ? styles.statusButtonActive : ''}`}
            onClick={() => handleStatusChange(statusAgendamento.AGENDADO)}
            type="button"
          >
            Agendado
          </button>
          <button
            disabled={statusLoading || appointment.status === statusAgendamento.CONFIRMADO}
            className={`${styles.statusButton} ${appointment.status === statusAgendamento.CONFIRMADO ? styles.statusButtonActive : ''}`}
            onClick={() => handleStatusChange(statusAgendamento.CONFIRMADO)}
            type="button"
          >
            Confirmado
          </button>
          <button
            disabled={statusLoading || appointment.status === statusAgendamento.CANCELADO}
            className={`${styles.statusButton} ${appointment.status === statusAgendamento.CANCELADO ? styles.statusButtonActive : ''}`}
            onClick={() => handleStatusChange(statusAgendamento.CANCELADO)}
            type="button"
          >
            Cancelado
          </button>
          <button
            disabled={statusLoading || appointment.status === statusAgendamento.CONCLUIDO}
            className={`${styles.statusButton} ${appointment.status === statusAgendamento.CONCLUIDO ? styles.statusButtonActive : ''}`}
            onClick={() => handleStatusChange(statusAgendamento.CONCLUIDO)}
            type="button"
          >
            Concluído
          </button>
          <button
            disabled={statusLoading || appointment.status === statusAgendamento.PENDENTE}
            className={`${styles.statusButton} ${appointment.status === statusAgendamento.PENDENTE ? styles.statusButtonActive : ''}`}
            onClick={() => handleStatusChange(statusAgendamento.PENDENTE)}
            type="button"
          >
            Pendente
          </button>
        </div>
        {statusError && <p className={styles.statusError}>{statusError}</p>}
      </div>
    </div>
  );
};

export default AppointmentDetailsModal;

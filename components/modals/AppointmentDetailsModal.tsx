import { useEffect, useState } from 'react';
import styles from '@/styles/admin/agendamentos/appointmentDetails.module.css';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { buscarConvenios } from '@/functions/conveniosFunctions';
import { buscarProcedimentos } from '@/functions/procedimentosFunctions';
import { buscarMedicos } from '@/functions/medicosFunctions';

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
        <h3>Detalhes do Agendamento</h3>
        <p><strong>Paciente:</strong> {appointment.nomePaciente}</p>
        <p><strong>Data:</strong> {appointment.data}</p>
        <p><strong>Hora:</strong> {appointment.hora}</p>
        <p><strong>Profissional:</strong> {profissionalNome}</p>
        <p><strong>Convênio:</strong> {convenioNome}</p>
        <p><strong>Procedimento:</strong> {procedimentoNome}</p>
        <p><strong>Descrição:</strong> {appointment.detalhes}</p>
        {userData && (
          <div className={styles.userSection}>
            <p><strong>Usuário:</strong> {userData.nome}</p>
            <p><strong>Email:</strong> {userData.email}</p>
            <p><strong>CPF:</strong> {userData.cpf}</p>
            <p><strong>Telefone:</strong> {userData.telefone}</p>
          </div>
        )}
        {onComplete && (
          <button
            className={styles.completeButton}
            onClick={() => onComplete(appointment.id)}
          >
            Marcar como concluído
          </button>
        )}
      </div>
    </div>
  );
};

export default AppointmentDetailsModal;

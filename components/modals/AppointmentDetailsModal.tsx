import { useEffect, useState } from 'react';
import styles from '@/styles/appointmentDetails.module.css';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

interface Appointment {
  id: string;
  data: string;
  hora: string;
  profissional: string;
  nomePaciente: string;
  detalhes: string;
  usuarioId: string;
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

  if (!isOpen || !appointment) return null;

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
        <p><strong>Profissional:</strong> {appointment.profissional}</p>
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

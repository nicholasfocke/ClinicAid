import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface ScheduleData {
  profissionalId: string;
  dia: string; // YYYY-MM-DD or nome do dia
  horaInicio: string;
  horaFim: string;
  almocoInicio: string;
  almocoFim: string;
  intervaloConsultas: number; // Adicione este campo no tipo!
}

export async function criarHorario(
  profissionalId: string,
  horario: {
    dia: string;
    horaInicio: string;
    horaFim: string;
    almocoInicio: string;
    almocoFim: string;
    intervaloConsultas: number; // Adicione este campo no tipo!
  }
) {
  // Salva na subcoleção 'horarios' do profissional
  await addDoc(
    collection(firestore, 'profissionais', profissionalId, 'horarios'),
    horario
  );
}

export const buscarHorariosPorMedico = async (medicoId: string) => {
  const snap = await getDocs(collection(firestore, `profissionais/${medicoId}/horarios`));
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as ScheduleData) }));
};

export const excluirHorario = async (medicoId: string, id: string) => {
  await deleteDoc(doc(firestore, `profissionais/${medicoId}/horarios`, id));
};

export const atualizarHorario = async (medicoId: string, id: string, data: Partial<ScheduleData>) => {
  await updateDoc(doc(firestore, `profissionais/${medicoId}/horarios`, id), data);
};

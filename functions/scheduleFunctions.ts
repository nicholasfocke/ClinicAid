import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface ScheduleData {
  dia: string; // YYYY-MM-DD or nome do dia
  horaInicio: string;
  horaFim: string;
  almocoInicio: string;
  almocoFim: string;
}

export const criarHorario = async (medicoId: string, data: ScheduleData) => {
  await addDoc(collection(firestore, `profissionais/${medicoId}/horarios`), data);
};

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

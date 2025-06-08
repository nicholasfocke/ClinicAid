import { addDoc, collection, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface MedicoData {
  nome: string;
  especialidade: string;
  diasAtendimento: string;
  horaInicio: string;
  horaFim: string;
  telefone: string;
  cpf: string;
  email: string;
  convenio: string;
  valorConsulta: string;
  foto?: string;
  fotoPath?: string;
}

export const buscarMedicos = async () => {
  const snap = await getDocs(collection(firestore, 'profissionais'));
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as MedicoData) }));
};

export const medicoExiste = async (cpf: string, email: string) => {
  const qCpf = query(collection(firestore, 'profissionais'), where('cpf', '==', cpf));
  const snapCpf = await getDocs(qCpf);
  if (!snapCpf.empty) return true;

  const qEmail = query(collection(firestore, 'profissionais'), where('email', '==', email));
  const snapEmail = await getDocs(qEmail);
  return !snapEmail.empty;
};

export const criarMedico = async (data: MedicoData) => {
  await addDoc(collection(firestore, 'profissionais'), data);
};

export const excluirMedico = async (id: string) => {
  await deleteDoc(doc(firestore, 'profissionais', id));
};

export const atualizarMedico = async (id: string, data: Partial<MedicoData>) => {
  await updateDoc(doc(firestore, 'profissionais', id), data);
};
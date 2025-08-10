import { addDoc, collection, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface MedicoData {
  nome: string;
  especialidade: string;
  diasAtendimento: string[];
  especialidadeId?: string;
  telefone: string;
  cpf: string;
  email: string;
  convenio: string[];
  intervaloConsultas?: number; // em minutos
  foto?: string;
  fotoPath?: string;
  procedimentos?: string[]; // garantir campo procedimentos
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
  // Garante que procedimentos seja array (mesmo se vier undefined)
  const dataToSave = {
    ...data,
    procedimentos: Array.isArray(data.procedimentos) ? data.procedimentos : [],
  };
  const ref = await addDoc(collection(firestore, 'profissionais'), dataToSave);
  return ref;
};

export const excluirMedico = async (id: string) => {
  await deleteDoc(doc(firestore, 'profissionais', id));
};

export const atualizarMedico = async (id: string, data: Partial<MedicoData>) => {
  // Garante que procedimentos seja array (mesmo se vier undefined)
  const dataToUpdate = {
    ...data,
    ...(data.procedimentos !== undefined
      ? { procedimentos: Array.isArray(data.procedimentos) ? data.procedimentos : [] }
      : {}),
  };
  await updateDoc(doc(firestore, 'profissionais', id), dataToUpdate);
};
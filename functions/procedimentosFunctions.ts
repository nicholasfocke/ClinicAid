import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface ProcedimentoData {
  nome: string;
  valor: number;
  duracao: number;
  convenio: boolean;
  tipo: 'consulta' | 'exame';
}

export const buscarProcedimentos = async () => {
  const snap = await getDocs(collection(firestore, 'procedimentos'));
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as ProcedimentoData) }));
};

export const criarProcedimento = async (data: ProcedimentoData) => {
  await addDoc(collection(firestore, 'procedimentos'), data);
};

export const excluirProcedimento = async (id: string) => {
  await deleteDoc(doc(firestore, 'procedimentos', id));
};

export const atualizarProcedimento = async (id: string, data: Partial<ProcedimentoData>) => {
  await updateDoc(doc(firestore, 'procedimentos', id), data);
};

export const buscarConsultas = async () => {
  const q = query(collection(firestore, 'procedimentos'), where('tipo', '==', 'consulta'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as ProcedimentoData) }));
};
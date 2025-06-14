import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface ProcedimentoData {
  nome: string;
  valor: number;
  duracao: number;
  convenio: boolean;
  tipo: 'consulta' | 'exame';
  profissionalId?: string;
}

export const buscarProcedimentos = async (profissionalId?: string) => {
  const ref = collection(firestore, 'procedimentos');
  const qRef = profissionalId ? query(ref, where('profissionalId', '==', profissionalId)) : ref;
  const snap = await getDocs(qRef);
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

export const buscarConsultas = async (profissionalId?: string) => {
  let qRef = query(collection(firestore, 'procedimentos'), where('tipo', '==', 'consulta'));
  if (profissionalId) {
    qRef = query(collection(firestore, 'procedimentos'), where('tipo', '==', 'consulta'), where('profissionalId', '==', profissionalId));
  }
  const snap = await getDocs(qRef);
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as ProcedimentoData) }));
};
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface ConvenioData {
  nome: string;
  numeroPacientes: number;
  comissao: number;
  telefone?: string;
}

export const buscarConvenios = async () => {
  const snap = await getDocs(collection(firestore, 'convenios'));
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as ConvenioData) }));
};

export const criarConvenio = async (data: ConvenioData) => {
  await addDoc(collection(firestore, 'convenios'), data);
};

export const excluirConvenio = async (id: string) => {
  await deleteDoc(doc(firestore, 'convenios', id));
};

export const atualizarConvenio = async (id: string, data: Partial<ConvenioData>) => {
  await updateDoc(doc(firestore, 'convenios', id), data);
};
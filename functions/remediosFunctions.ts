import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface RemedioData {
  nome: string;
  quantidade: number;
  dosagem: string;
  uso: string;
}

export const buscarRemedios = async () => {
  const snap = await getDocs(collection(firestore, 'remedios'));
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as RemedioData) }));
};

export const criarRemedio = async (data: RemedioData) => {
  await addDoc(collection(firestore, 'remedios'), data);
};

export const excluirRemedio = async (id: string) => {
  await deleteDoc(doc(firestore, 'remedios', id));
};

export const atualizarRemedio = async (id: string, data: Partial<RemedioData>) => {
  await updateDoc(doc(firestore, 'remedios', id), data);
};
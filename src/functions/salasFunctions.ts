import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface SalaData {
  nome: string;
  profissionalId: string | null;
  ativo: boolean;
}

export const buscarSalas = async () => {
  const snap = await getDocs(collection(firestore, 'salas'));
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as SalaData) }));
};

export const criarSala = async (data: SalaData) => {
  await addDoc(collection(firestore, 'salas'), data);
};

export const excluirSala = async (id: string) => {
  await deleteDoc(doc(firestore, 'salas', id));
};

export const atualizarSala = async (id: string, data: Partial<SalaData>) => {
  await updateDoc(doc(firestore, 'salas', id), data);
};

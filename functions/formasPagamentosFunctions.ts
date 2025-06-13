import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface FormaPagamentoData {
  nome: string;
  taxa: number;
}

export const buscarFormasPagamento = async () => {
  const snap = await getDocs(collection(firestore, 'formasPagamento'));
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as FormaPagamentoData) }));
};

export const criarFormaPagamento = async (data: FormaPagamentoData) => {
  await addDoc(collection(firestore, 'formasPagamento'), data);
};

export const excluirFormaPagamento = async (id: string) => {
  await deleteDoc(doc(firestore, 'formasPagamento', id));
};

export const atualizarFormaPagamento = async (id: string, data: Partial<FormaPagamentoData>) => {
  await updateDoc(doc(firestore, 'formasPagamento', id), data);
};
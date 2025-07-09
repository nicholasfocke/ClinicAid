import { addDoc, collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { Lote } from './lotesFunctions';

export interface DescarteMedicamento {
  medicamento: string;
  medicamentoId: string;
  loteId?: string;
  lote: string;
  quantidade: number;
  metodo: string;
  usuario: string;
  documentoUrl?: string;
  dataHora?: string;
  loteData?: Omit<Lote, 'medicamentoId'>;
}

export const registrarDescarteMedicamento = async (
  data: DescarteMedicamento,
) => {
  const docRef = await addDoc(collection(firestore, 'descartesMedicamentos'), {
    ...data,
    dataHora: new Date().toISOString(),
  });
  return docRef.id;
};

export const buscarDescartesMedicamentos = async () => {
  const snap = await getDocs(collection(firestore, 'descartesMedicamentos'));
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as DescarteMedicamento) }));
};

export const excluirDescarteMedicamento = async (id: string) => {
  await deleteDoc(doc(firestore, 'descartesMedicamentos', id));
};

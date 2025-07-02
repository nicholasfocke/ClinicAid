import { addDoc, collection, collectionGroup, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface Lote {
  numero_lote: string;
  data_fabricacao: string;
  validade: string;
  quantidade_inicial: number;
  custo_unitario: number;
  fabricante: string;
  localizacao_fisica: string;
  status: string;
  medicamentoId?: string;
}

export const buscarLotes = async () => {
  const snap = await getDocs(collectionGroup(firestore, 'lotes'));
  return snap.docs
    .map(doc => ({
      id: doc.id,
      medicamentoId: doc.ref.parent.parent?.id,
      ...(doc.data() as Lote),
    }))
    .sort((a, b) => a.validade.localeCompare(b.validade));
};

export const criarLote = async (medicamentoId: string, data: Lote) => {
  await addDoc(collection(firestore, 'medicamentos', medicamentoId, 'lotes'), data);
};

export const excluirLote = async (medicamentoId: string, id: string) => {
  await deleteDoc(doc(firestore, 'medicamentos', medicamentoId, 'lotes', id));
};

export const atualizarLote = async (
  medicamentoId: string,
  id: string,
  data: Partial<Lote>,
) => {
  await updateDoc(doc(firestore, 'medicamentos', medicamentoId, 'lotes', id), data);
};
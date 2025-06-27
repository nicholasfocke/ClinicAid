import { addDoc, collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface MovimentacaoMedicamento {
  medicamento: string;
  quantidade: number;
  motivo: string;
  data: string;
  usuario: string;
  paciente?: string;
  profissional?: string;
}

export const registrarEntradaMedicamento = async (data: MovimentacaoMedicamento) => {
  await addDoc(collection(firestore, 'entradasMedicamentos'), data);
};

export const registrarSaidaMedicamento = async (data: MovimentacaoMedicamento) => {
  await addDoc(collection(firestore, 'saidasMedicamentos'), data);
};

export const buscarEntradasMedicamentos = async () => {
  const snap = await getDocs(collection(firestore, 'entradasMedicamentos'));
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as MovimentacaoMedicamento) }));
};

export const buscarSaidasMedicamentos = async () => {
  const snap = await getDocs(collection(firestore, 'saidasMedicamentos'));
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as MovimentacaoMedicamento) }));
};

export const excluirEntradaMedicamento = async (id: string) => {
  await deleteDoc(doc(firestore, 'entradasMedicamentos', id));
};

export const excluirSaidaMedicamento = async (id: string) => {
  await deleteDoc(doc(firestore, 'saidasMedicamentos', id));
};

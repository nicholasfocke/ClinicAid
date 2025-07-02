import { addDoc, collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestore } from '@/firebase/firebaseConfig';

export interface MovimentacaoMedicamento {
  medicamento: string;
  quantidade: number;
  motivo: string;
  data: string;
  usuario: string;
  lote?: string;
  documentoUrl?: string;
  receitaUrl?: string;
  paciente?: string;
  profissional?: string;
}

export const registrarEntradaMedicamento = async (
  data: MovimentacaoMedicamento,
) => {
  const docRef = await addDoc(collection(firestore, 'entradasMedicamentos'), data);
  return docRef.id;
};

export const registrarSaidaMedicamento = async (
  data: MovimentacaoMedicamento,
) => {
  const docRef = await addDoc(collection(firestore, 'saidasMedicamentos'), data);
  return docRef.id;
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

export const uploadDocumentoMovimentacao = async (file: File) => {
  const storage = getStorage();
  const uniqueName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `movimentacoes_docs/${uniqueName}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

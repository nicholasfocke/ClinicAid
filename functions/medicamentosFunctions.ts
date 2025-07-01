import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface MedicamentoData {
  nome_comercial: string;
  quantidade: number;
  valor: number;
  lote: string;
  validade: string;
  dcb: string;
  forma_farmaceutica: string;
  concentracao: string;
  unidade: string;
  via_administracao: string;
  fabricante: string;
  registro_anvisa: string;
  controlado: boolean;
  tipo_receita: string;
  classificacao: string;
  descricao: string;
  estoque_minimo: number;
}

export const buscarMedicamentos = async () => {
  const snap = await getDocs(collection(firestore, 'medicamentos'));
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as MedicamentoData) }));
};

export const criarMedicamento = async (data: MedicamentoData) => {
  await addDoc(collection(firestore, 'medicamentos'), data);
};

export const excluirMedicamento = async (id: string) => {
  await deleteDoc(doc(firestore, 'medicamentos', id));
};

export const atualizarMedicamento = async (id: string, data: Partial<MedicamentoData>) => {
  await updateDoc(doc(firestore, 'medicamentos', id), data);
};

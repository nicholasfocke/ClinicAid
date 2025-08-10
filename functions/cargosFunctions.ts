import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc, increment } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface CargoData {
  nome: string;
  quantidadeUsuarios: number;
  profissionalSaude: boolean;
}

export const buscarCargos = async () => {
  const snap = await getDocs(collection(firestore, 'cargos'));
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as CargoData) }));
};

export const buscarCargosSaude = async () => {
  const snap = await getDocs(collection(firestore, 'cargos'));
  return snap.docs
    .filter(d => (d.data() as CargoData).profissionalSaude)
    .map(doc => ({ id: doc.id, ...(doc.data() as CargoData) }));
};

export const buscarCargosNaoSaude = async () => {
  const snap = await getDocs(collection(firestore, 'cargos'));
  return snap.docs
    .filter(d => !(d.data() as CargoData).profissionalSaude)
    .map(doc => ({ id: doc.id, ...(doc.data() as CargoData) }));
};

export const criarCargo = async (data: CargoData) => {
  await addDoc(collection(firestore, 'cargos'), { ...data });
};

export const excluirCargo = async (id: string) => {
  await deleteDoc(doc(firestore, 'cargos', id));
};

export const atualizarCargo = async (id: string, data: Partial<CargoData>) => {
  await updateDoc(doc(firestore, 'cargos', id), data);
};

export const ajustarNumeroUsuariosCargo = async (
  id: string,
  delta: number,
) => {
  await updateDoc(doc(firestore, 'cargos', id), {
    quantidadeUsuarios: increment(delta),
  });
};
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc, increment } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface EspecialidadeData {
  nome: string;
  quantidadeUsuarios: number;
  profissionalSaude: boolean;
}

export const buscarEspecialidades = async () => {
  const snap = await getDocs(collection(firestore, 'especialidades'));
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as EspecialidadeData) }));
};

export const buscarEspecialidadesSaude = async () => {
  const snap = await getDocs(collection(firestore, 'especialidades'));
  return snap.docs
    .filter(d => (d.data() as EspecialidadeData).profissionalSaude)
    .map(doc => ({ id: doc.id, ...(doc.data() as EspecialidadeData) }));
};

export const criarEspecialidade = async (data: EspecialidadeData) => {
  await addDoc(collection(firestore, 'especialidades'), { ...data });
};

export const excluirEspecialidade = async (id: string) => {
  await deleteDoc(doc(firestore, 'especialidades', id));
};

export const atualizarEspecialidade = async (id: string, data: Partial<EspecialidadeData>) => {
  await updateDoc(doc(firestore, 'especialidades', id), data);
};

export const ajustarNumeroUsuariosEspecialidade = async (
  id: string,
  delta: number,
) => {
  await updateDoc(doc(firestore, 'especialidades', id), {
    quantidadeUsuarios: increment(delta),
  });
};
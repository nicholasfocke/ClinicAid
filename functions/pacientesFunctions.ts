import { doc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestore } from '@/firebase/firebaseConfig';

export interface PacienteArquivo {
  nome: string;
  url: string;
  path: string;
}

export const atualizarPaciente = async (id: string, data: Partial<any>) => {
  await updateDoc(doc(firestore, 'pacientes', id), data);
};

export const excluirPaciente = async (id: string) => {
  await deleteDoc(doc(firestore, 'pacientes', id));
};

export const uploadArquivoPaciente = async (id: string, file: File) => {
  const storage = getStorage();
  const uniqueName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `paciente_files/${id}/${uniqueName}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  const arquivo: PacienteArquivo = { nome: file.name, url, path: storageRef.fullPath };
  await updateDoc(doc(firestore, 'pacientes', id), {
    arquivos: arrayUnion(arquivo),
  });
  return arquivo;
};

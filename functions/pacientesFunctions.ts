import { doc, updateDoc, deleteDoc, arrayUnion, collection, getDocs } from 'firebase/firestore';
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

// Upload file to a specific field (section) of the patient document
export const uploadArquivoPacienteSecao = async (
  id: string,
  file: File,
  campo: string
) => {
  const storage = getStorage();
  const uniqueName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `paciente_files/${id}/${campo}/${uniqueName}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  const arquivo: PacienteArquivo = { nome: file.name, url, path: storageRef.fullPath };
  await updateDoc(doc(firestore, 'pacientes', id), {
    [campo]: arrayUnion(arquivo),
  });
  return arquivo;
};

// Upload file to storage without updating Firestore
export const uploadArquivoTemp = async (
  id: string,
  file: File,
  pasta: string
) => {
  const storage = getStorage();
  const uniqueName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `paciente_files/${id}/${pasta}/${uniqueName}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  const arquivo: PacienteArquivo = { nome: file.name, url, path: storageRef.fullPath };
  return arquivo;
};

export const uploadArquivoPaciente = async (id: string, file: File) => {
  return uploadArquivoPacienteSecao(id, file, 'arquivos');
};

export interface EvolucaoClinica {
  data: string;
  profissional: string;
  diagnostico: string;
  procedimentos: string;
  prescricao?: string;
  arquivos?: PacienteArquivo[];
}

export const adicionarEvolucaoPaciente = async (
  id: string,
  evolucao: EvolucaoClinica
) => {
  await updateDoc(doc(firestore, 'pacientes', id), {
    prontuarios: arrayUnion(evolucao),
  });
};

export interface PacienteMin {
  id: string;
  nome: string;
}

export const buscarPacientes = async (): Promise<PacienteMin[]> => {
  const snap = await getDocs(collection(firestore, 'pacientes'));
  return snap.docs.map(doc => ({ id: doc.id, nome: doc.data().nome || '' }));
};

import { doc, updateDoc, deleteDoc, arrayUnion, collection, getDocs, addDoc, getDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestore } from '@/firebase/firebaseConfig';
import { differenceInYears } from 'date-fns';
import { parseDate } from '@/utils/dateUtils';

export interface PacienteArquivo {
  nome: string;
  url: string;
  path: string;
}

export interface PacienteDocumento {
  titulo: string;
  descricao: string;
  url: string;
  dataEnvio: any;
  tipo: string;
  path: string;
}

export interface EnderecoPaciente {
  logradouro: string;
  numero: string;
  complemento?: string;
  cep: string;
  bairro: string;
  estado: string;
  cidade: string;
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

export const uploadDocumentoPaciente = async ( id: string, file: File, titulo: string, descricao: string ) => {
  // if (!file) {
  //   throw new Error('Nenhum arquivo fornecido para upload de documento.');
  // }
  // if (!file.name) {
  //   throw new Error('Arquivo inválido: nome não disponível.');
  // }

  const storage = getStorage();
  const uniqueName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `paciente_files/${id}/documentos/${uniqueName}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  const documento: PacienteDocumento = {
    titulo,
    descricao,
    url,
    dataEnvio: Timestamp.now(),
    tipo: file.type || '',
    path: storageRef.fullPath
  };
  await updateDoc(doc(firestore, 'pacientes', id), {
    documentos: arrayUnion(documento)
  });
  return documento;
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

export interface PacienteDetails {
  id: string;
  nome: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  dataNascimento?: string;
  sexo?: string;
  convenio?: string;
  foto?: string;
  endereco?: EnderecoPaciente;
  idade?: number;
  numAgendamentos?: number;
}

export const buscarPacientesComDetalhes = async (): Promise<PacienteDetails[]> => {
  const snap = await getDocs(collection(firestore, 'pacientes'));
  return snap.docs.map(doc => {
    const data = doc.data();
    let idade: number | undefined;
    if (data.dataNascimento) {
      const birth = parseDate(data.dataNascimento);
      if (birth) {
        idade = differenceInYears(new Date(), birth);
      }
    }
    const numAgendamentos = Array.isArray(data.agendamentos)
      ? data.agendamentos.length
      : 0;
    return {
      id: doc.id,
      nome: data.nome || '',
      email: data.email || '',
      cpf: data.cpf || '',
      telefone: data.telefone || '',
      dataNascimento: data.dataNascimento || '',
      sexo: data.sexo || '',
      convenio: data.convenio || '',
      foto: data.foto || '',
      endereco: data.endereco || undefined,
      idade,
      numAgendamentos,
    };
  });
};

export interface CriarPacienteData {
  nome: string;
  email: string;
  cpf?: string;
  telefone?: string;
  convenio?: string;
  dataNascimento?: string;
  sexo?: string;
  foto?: string;
  fotoPath?: string;
  endereco?: EnderecoPaciente;
}

export const criarPaciente = async (data: CriarPacienteData) => {
  const docRef = await addDoc(collection(firestore, 'pacientes'), data);
  return docRef.id;
};

export const buscarPacientePorId = async (id: string): Promise<any | null> => {
  const ref = doc(firestore, 'pacientes', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  let idade: number | undefined;
  if (data.dataNascimento) {
    const birth = parseDate(data.dataNascimento);
    if (birth) {
      idade = differenceInYears(new Date(), birth);
    }
  }
  const numAgendamentos = Array.isArray(data.agendamentos) ? data.agendamentos.length : 0;
  const fotoValida = data.foto && typeof data.foto === 'string' && data.foto.length > 0 ? data.foto : '';

  return { id: snap.id, ...data, idade, foto: fotoValida, numAgendamentos };
};

import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, firestore } from '@/firebase/firebaseConfig';

export interface FuncionarioData {
  nome: string;
  email: string;
  senha: string;
  cargo: string;
}

export interface Funcionario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  tipo: string;
}

export const buscarFuncionarios = async () => {
  const snap = await getDocs(collection(firestore, 'funcionarios'));
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Funcionario, 'id'>) }));
};

export const criarFuncionario = async (data: FuncionarioData) => {
  const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.senha);
  await setDoc(doc(firestore, 'funcionarios', userCredential.user.uid), {
    nome: data.nome,
    email: data.email,
    cargo: data.cargo,
    tipo: 'admin',
  });
};


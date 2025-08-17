import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import bcrypt from 'bcryptjs';
import app, { firestore } from '@/firebase/firebaseConfig';

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
  const secondaryApp = getApps().find(a => a.name === 'Secondary') || initializeApp(app.options, 'Secondary');
  const secondaryAuth = getAuth(secondaryApp);
  const userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.senha);
  await signOut(secondaryAuth);
  const hashedPassword = await bcrypt.hash(data.senha, 10);
  const cargoLower = data.cargo.toLowerCase();
  let tipo = 'assistente';
  if (cargoLower.includes('admin')) {
    tipo = 'admin';
  } else if (cargoLower.includes('gerente')) {
    tipo = 'gerente';
  }
  await setDoc(doc(firestore, 'funcionarios', userCredential.user.uid), {
    nome: data.nome,
    email: data.email,
    cargo: data.cargo,
    senha: hashedPassword,
    tipo,
  });
};


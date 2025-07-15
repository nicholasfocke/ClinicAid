import { addDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface NotificacaoData {
  titulo: string;
  descricao: string;
  icone: 'red' | 'yellow' | 'green' | 'gray';
  criadoEm: string;
}

export const criarNotificacao = async (data: NotificacaoData) => {
  await addDoc(collection(firestore, 'notificacoes'), data);
};

export const buscarNotificacoes = async () => {
  const q = query(collection(firestore, 'notificacoes'), orderBy('criadoEm', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as NotificacaoData) }));
};

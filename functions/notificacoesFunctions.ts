import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc, where, QueryConstraint, } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface NotificacaoData {
  [x: string]: any | null | undefined;
  titulo: string;
  descricao: string;
  icone: 'red' | 'yellow' | 'green' | 'gray';
  criadoEm: string;
  lida: boolean;
  tipo: string;
}

export const criarNotificacao = async (data: NotificacaoData) => {
  await addDoc(collection(firestore, 'notificacoes'), {
    ...data,
  });
};

interface BuscarOptions {
  apenasNaoLidas?: boolean;
  tipo?: string;
}

export const buscarNotificacoes = async (opcoes?: BuscarOptions) => {
  const constraints: QueryConstraint[] = [];

  if (opcoes?.apenasNaoLidas) {
    constraints.push(where('lida', '==', false));
  }


  if (opcoes?.tipo) {
    constraints.push(where('tipo', '==', opcoes.tipo));
  }

  const q =
    constraints.length > 0
      ? query(collection(firestore, 'notificacoes'), ...constraints)
      : query(collection(firestore, 'notificacoes'), orderBy('criadoEm', 'desc'));

  const snap = await getDocs(q);
  const list = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as NotificacaoData) }));
  return list.sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
  );
};

export const marcarNotificacaoLida = async (id: string) => {
  await updateDoc(doc(firestore, 'notificacoes', id), { lida: true });
};

export const marcarNotificacoesLidas = async (ids: string[]) => {
  await Promise.all(ids.map(id => updateDoc(doc(firestore, 'notificacoes', id), { lida: true })));
};

export const deletarNotificacoes = async (ids: string[]) => {
  await Promise.all(
    ids.map(id => deleteDoc(doc(firestore, 'notificacoes', id)))
  );
};

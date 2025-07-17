import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  QueryConstraint,
} from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface NotificacaoData {
  [x: string]: any | null | undefined;
  titulo: string;
  descricao: string;
  icone: 'red' | 'yellow' | 'green' | 'gray';
  criadoEm: string;
  lida: boolean;
  tipo: string;
  removida: boolean;
}

export const criarNotificacao = async (data: NotificacaoData) => {
  await addDoc(collection(firestore, 'notificacoes'), {
    lida: false,
    removida: false,
    ...data,
  });
};

interface BuscarOptions {
  apenasNaoLidas?: boolean;
  apenasNaoRemovidas?: boolean;
  tipo?: string;
}

export const buscarNotificacoes = async (opcoes?: BuscarOptions) => {
  const constraints: QueryConstraint[] = [orderBy('criadoEm', 'desc')];

  if (opcoes?.apenasNaoLidas) {
    constraints.push(where('lida', '==', false));
  }

  if (opcoes?.apenasNaoRemovidas) {
    constraints.push(where('removida', '==', false));
  }

  if (opcoes?.tipo) {
    constraints.push(where('tipo', '==', opcoes.tipo));
  }

  const q = query(collection(firestore, 'notificacoes'), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as NotificacaoData) }));
};

export const marcarNotificacaoLida = async (id: string) => {
  await updateDoc(doc(firestore, 'notificacoes', id), { lida: true });
};

export const marcarNotificacoesLidas = async (ids: string[]) => {
  await Promise.all(ids.map(id => updateDoc(doc(firestore, 'notificacoes', id), { lida: true })));
};

export const marcarNotificacoesRemovidas = async (ids: string[]) => {
  await Promise.all(ids.map(id => updateDoc(doc(firestore, 'notificacoes', id), { removida: true })));
};

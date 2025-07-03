import { addDoc, collection, query, where, getDocs, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';

export interface IAChatMessage {
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
}

export interface IAChat {
  id: string;
  title: string;
  folderId: string | null;
  messages: IAChatMessage[];
}

export interface IAFolder {
  id: string;
  name: string;
  userId: string;
}

export const buscarPastas = async (userId: string): Promise<IAFolder[]> => {
  const q = query(collection(firestore, 'iaFolders'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<IAFolder, 'id'>) }));
};

export const criarPasta = async (name: string, userId: string) => {
  const ref = await addDoc(collection(firestore, 'iaFolders'), { name, userId });
  return { id: ref.id, name, userId } as IAFolder;
};

export const excluirPasta = async (id: string) => {
  await deleteDoc(doc(firestore, 'iaFolders', id));
};

export const buscarChats = async (folderId: string): Promise<IAChat[]> => {
  const snap = await getDocs(collection(firestore, 'iaFolders', folderId, 'chats'));
  return snap.docs.map(d => ({ id: d.id, folderId, ...(d.data() as Omit<IAChat, 'id' | 'folderId'>) }));
};

export const criarChat = async (folderId: string, title: string) => {
  const ref = await addDoc(collection(firestore, 'iaFolders', folderId, 'chats'), { title, messages: [] });
  return { id: ref.id, title, folderId, messages: [] } as IAChat;
};

export const excluirChat = async (folderId: string, chatId: string) => {
  await deleteDoc(doc(firestore, 'iaFolders', folderId, 'chats', chatId));
};

export const atualizarChat = async (folderId: string, chatId: string, data: Partial<Omit<IAChat, 'id' | 'folderId'>>) => {
  await updateDoc(doc(firestore, 'iaFolders', folderId, 'chats', chatId), data);
};

export const obterChat = async (folderId: string, chatId: string): Promise<IAChat | null> => {
  const snap = await getDoc(doc(firestore, 'iaFolders', folderId, 'chats', chatId));
  return snap.exists() ? ({ id: snap.id, folderId, ...(snap.data() as Omit<IAChat, 'id' | 'folderId'>) }) : null;
};

export const atualizarPasta = async (folderId: string, data: Partial<Omit<IAFolder, 'id' | 'userId'>>) => {
  await updateDoc(doc(firestore, 'iaFolders', folderId), data);
};

// ---- Chats fora de pastas ----

export const buscarChatsSoltos = async (userId: string): Promise<IAChat[]> => {
  const q = query(collection(firestore, 'iaChats'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, folderId: null, ...(d.data() as Omit<IAChat, 'id' | 'folderId'>) }));
};

export const criarChatSolto = async (userId: string, title: string) => {
  const ref = await addDoc(collection(firestore, 'iaChats'), { userId, title, messages: [] });
  return { id: ref.id, title, folderId: null, messages: [] } as IAChat;
};

export const excluirChatSolto = async (chatId: string) => {
  await deleteDoc(doc(firestore, 'iaChats', chatId));
};

export const atualizarChatSolto = async (chatId: string, data: Partial<Omit<IAChat, 'id' | 'folderId'>>) => {
  await updateDoc(doc(firestore, 'iaChats', chatId), data);
};

export const obterChatSolto = async (chatId: string): Promise<IAChat | null> => {
  const snap = await getDoc(doc(firestore, 'iaChats', chatId));
  return snap.exists() ? ({ id: snap.id, folderId: null, ...(snap.data() as Omit<IAChat, 'id' | 'folderId'>) }) : null;
};

export const moverChat = async (chatId: string, origem: string | null, destino: string | null, userId: string) => {
  let chat: IAChat | null = null;
  if (origem) {
    chat = await obterChat(origem, chatId);
    if (chat) await excluirChat(origem, chatId);
  } else {
    chat = await obterChatSolto(chatId);
    if (chat) await excluirChatSolto(chatId);
  }
  if (!chat) return null;
  if (destino) {
    await setDoc(doc(firestore, 'iaFolders', destino, 'chats', chatId), { title: chat.title, messages: chat.messages });
    return { ...chat, folderId: destino };
  } else {
    await setDoc(doc(firestore, 'iaChats', chatId), { userId, title: chat.title, messages: chat.messages });
    return { ...chat, folderId: null };
  }
};

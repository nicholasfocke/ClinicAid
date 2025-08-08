import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import app from '@/firebase/firebaseConfig';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Faz upload de uma imagem para o Firebase Storage.
 * Pode remover uma imagem antiga, caso o caminho seja informado.
 * @param file Arquivo de imagem selecionado pelo usuário
 * @param folder Pasta no Storage onde a imagem será salva
 * @param uniqueName Nome único do arquivo
 * @param oldPath Caminho da imagem antiga para remoção opcional
 */
export const uploadImage = async (
  file: File,
  folder: string,
  uniqueName: string,
  oldPath?: string
): Promise<UploadResult> => {
  const storage = getStorage(app);

  if (oldPath) {
    try {
      const oldRef = ref(storage, oldPath);
      await deleteObject(oldRef);
    } catch (err) {
      // ignora se não houver imagem antiga
    }
  }

  const storageRef = ref(storage, `${folder}/${uniqueName}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  return { url, path: storageRef.fullPath };
};

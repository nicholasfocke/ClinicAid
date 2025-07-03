import { addDoc, collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { differenceInCalendarDays } from 'date-fns';
import { parseDate } from '@/utils/dateUtils';

export interface Lote {
  numero_lote: string;
  data_fabricacao: string;
  validade: string;
  quantidade_inicial: number;
  valor_compra: number;
  valor_venda: number;
  fabricante: string;
  localizacao_fisica: string;
  status: string;
  medicamentoId?: string;
}

export const statusLote = {
  VALIDO: 'Válido',
  EM_OBSERVACAO: 'Em observação',
  PROXIMO_VENCIMENTO: 'Próx. Vencimento',
  VENCIDO: 'Vencido',
  ESGOTADO: 'Esgotado',
} as const;

export const calcularStatusLote = (
  validade: string,
  quantidade: number,
) => {
  if (quantidade <= 0) return statusLote.ESGOTADO;
  const validadeDate = parseDate(validade) ?? new Date(validade);
  const dias = differenceInCalendarDays(validadeDate, new Date());
  if (dias <= 0) return statusLote.VENCIDO;
  if (dias <= 30) return statusLote.PROXIMO_VENCIMENTO;
  if (dias <= 90) return statusLote.EM_OBSERVACAO;
  return statusLote.VALIDO;
};

export const buscarLotes = async () => {
  const snap = await getDocs(collectionGroup(firestore, 'lotes'));
  return snap.docs
    .map(doc => {
      const data = doc.data() as Lote;
      const status = calcularStatusLote(data.validade, data.quantidade_inicial);
      return {
        id: doc.id,
        medicamentoId: doc.ref.parent.parent?.id,
        ...data,
        status,
      };
    })
    .sort((a, b) => a.validade.localeCompare(b.validade));
};

export const criarLote = async (
  medicamentoId: string,
  data: Omit<Lote, 'status' | 'medicamentoId'>,
) => {
  const status = calcularStatusLote(data.validade, data.quantidade_inicial);
  const docRef = await addDoc(
    collection(firestore, 'medicamentos', medicamentoId, 'lotes'),
    { ...data, status },
  );
  return { id: docRef.id, status };
};

export const excluirLote = async (medicamentoId: string, id: string) => {
  await deleteDoc(doc(firestore, 'medicamentos', medicamentoId, 'lotes', id));
};

export const atualizarLote = async (
  medicamentoId: string,
  id: string,
  data: Partial<Lote>,
) => {
  if (data.validade !== undefined || data.quantidade_inicial !== undefined) {
    const snap = await getDoc(
      doc(firestore, 'medicamentos', medicamentoId, 'lotes', id),
    );
    const atual = snap.data() as Lote;
    const validade = data.validade ?? atual.validade;
    const quantidade = data.quantidade_inicial ?? atual.quantidade_inicial;
    data.status = calcularStatusLote(validade, quantidade);
  }
  await updateDoc(doc(firestore, 'medicamentos', medicamentoId, 'lotes', id), data);
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case statusLote.VALIDO:
      return '#16a34a';
    case statusLote.EM_OBSERVACAO:
      return '#ffdb58';
    case statusLote.PROXIMO_VENCIMENTO:
      return '#f59e0b';
    case statusLote.VENCIDO:
      return '#dc2626';
    case statusLote.ESGOTADO:
      return '#9ca3af';
    default:
      return '#6b7280';
  }
};
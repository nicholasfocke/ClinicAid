import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { differenceInCalendarDays, subDays } from 'date-fns';
import { buscarLotes } from './lotesFunctions';
import { buscarSaidasMedicamentos } from './movimentacoesMedicamentosFunctions';
import { criarNotificacao } from './notificacoesFunctions';
import { parseDate } from '@/utils/dateUtils';

export interface MedicamentoData {
  nome_comercial: string;
  quantidade: number;
  valor: number;
  lote: string;
  validade: string;
  dcb: string;
  forma_farmaceutica: string;
  concentracao: string;
  unidade: string;
  via_administracao: string;
  fabricante: string;
  registro_anvisa: string;
  controlado: boolean;
  tipo_receita: string;
  classificacao: string;
  descricao: string;
  estoque_minimo: number;
}

export const buscarMedicamentos = async () => {
  const snap = await getDocs(collection(firestore, 'medicamentos'));
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as MedicamentoData) }));
};

export const criarMedicamento = async (data: MedicamentoData) => {
  const docRef = await addDoc(collection(firestore, 'medicamentos'), data);
  return docRef.id;
};

export const excluirMedicamento = async (id: string) => {
  await deleteDoc(doc(firestore, 'medicamentos', id));
};

export const atualizarMedicamento = async (id: string, data: Partial<MedicamentoData>) => {
  await updateDoc(doc(firestore, 'medicamentos', id), data);
};

export const verificarNotificacoesMedicamentos = async () => {
  const [medicamentos, lotes, saidas] = await Promise.all([
    buscarMedicamentos(),
    buscarLotes(),
    buscarSaidasMedicamentos(),
  ]);

  const medMap: Record<string, string> = {};
  medicamentos.forEach(m => {
    medMap[m.id] = m.nome_comercial;
  });

  const saidas30 = saidas.filter(s => new Date(s.data) >= subDays(new Date(), 30));

  for (const m of medicamentos) {
    const total = saidas30
      .filter(s => s.medicamento === m.nome_comercial)
      .reduce((sum, s) => sum + s.quantidade, 0);
    if (total > 0) {
      const consumoMedio = total / 30;
      if (consumoMedio > 0) {
        const cobertura = m.quantidade / consumoMedio;
        if (cobertura <= 0) {
          await criarNotificacao({
            titulo: 'Farmácia',
            descricao: `A cobertura do remédio "${m.nome_comercial}" esgotou.`,
            icone: 'red',
            criadoEm: new Date().toISOString(),
            tipo: 'farmacia',
            lida: false,
          });
        } else if (cobertura < 5) {
          await criarNotificacao({
            titulo: 'Farmácia',
            descricao: `A cobertura do remédio "${m.nome_comercial}" está abaixo de 5 dias.`,
            icone: 'yellow',
            criadoEm: new Date().toISOString(),
            tipo: 'farmacia',
            lida: false,
          });
        }
      }
    }

    if (m.estoque_minimo && m.quantidade < m.estoque_minimo) {
      await criarNotificacao({
        titulo: 'Farmácia',
        descricao: `O saldo do remédio "${m.nome_comercial}" está abaixo do recomendado.`,
        icone: 'yellow',
        criadoEm: new Date().toISOString(),
        tipo: 'farmacia',
        lida: false,
      });
    }
  }

  for (const l of lotes) {
    const nome = medMap[l.medicamentoId ?? ''] || '-';
    const validadeDate = parseDate(l.validade) ?? new Date(l.validade);
    const dias = differenceInCalendarDays(validadeDate, new Date());
    if ([30, 15, 5].includes(dias)) {
      await criarNotificacao({
        titulo: 'Farmácia',
        descricao: `O lote ${l.numero_lote} do remédio "${nome}" vence em ${dias} dias.`,
        icone: 'yellow',
        criadoEm: new Date().toISOString(),
        tipo: 'farmacia',
        lida: false,
      });
    } else if (dias === 0) {
      await criarNotificacao({
        titulo: 'Farmácia',
        descricao: `O lote ${l.numero_lote} do remédio "${nome}" venceu.`,
        icone: 'red',
        criadoEm: new Date().toISOString(),
        tipo: 'farmacia',
        lida: false,
      });
    }
  }
};

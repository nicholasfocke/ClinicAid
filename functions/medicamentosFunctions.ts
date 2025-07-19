import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { differenceInCalendarDays, subDays } from 'date-fns';
import { buscarLotes } from './lotesFunctions';
import { buscarSaidasMedicamentos } from './movimentacoesMedicamentosFunctions';
import { buscarNotificacoes, criarNotificacao } from './notificacoesFunctions';
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
  const [medicamentos, lotes, saidas, notificacoes] = await Promise.all([
    buscarMedicamentos(),
    buscarLotes(),
    buscarSaidasMedicamentos(),
    buscarNotificacoes({ tipo: 'farmacia' }),
  ]);

  const temNotificacao = (descricao: string) =>
    notificacoes.some(n => n.descricao === descricao);

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
          const desc = `A cobertura do remédio "${m.nome_comercial}" esgotou.`;
          if (!temNotificacao(desc)) {
            await criarNotificacao({
              titulo: 'Farmácia',
              descricao: desc,
              icone: 'red',
              criadoEm: new Date().toISOString(),
              tipo: 'farmacia',
              lida: false,
              detalhes: {
                medicamento: m.nome_comercial,
                quantidade: m.quantidade,
              },
            });
          }
        } else if (cobertura < 5) {
          const desc = `A cobertura do remédio "${m.nome_comercial}" está abaixo de 5 dias.`;
          if (!temNotificacao(desc)) {
            await criarNotificacao({
              titulo: 'Farmácia',
              descricao: desc,
              icone: 'yellow',
              criadoEm: new Date().toISOString(),
              tipo: 'farmacia',
              lida: false,
              detalhes: {
                medicamento: m.nome_comercial,
                quantidade: m.quantidade,
              },
            });
          }
        }
      }
    }

    if (m.estoque_minimo && m.quantidade < m.estoque_minimo) {
      const desc = `O saldo do remédio "${m.nome_comercial}" está abaixo do recomendado.`;
      if (!temNotificacao(desc)) {
        await criarNotificacao({
          titulo: 'Farmácia',
          descricao: desc,
          icone: 'yellow',
          criadoEm: new Date().toISOString(),
          tipo: 'farmacia',
          lida: false,
          detalhes: { medicamento: m.nome_comercial, quantidade: m.quantidade },
        });
      }
    }
  }

  for (const l of lotes) {
    const nome = medMap[l.medicamentoId ?? ''] || '-';
    const validadeDate = parseDate(l.validade) ?? new Date(l.validade);
    const dias = differenceInCalendarDays(validadeDate, new Date());
    if ([30, 15, 5].includes(dias)) {
      const desc = `O lote "${l.numero_lote}" do remédio "${nome}" vence em ${dias} dias.`;
      if (!temNotificacao(desc)) {
        await criarNotificacao({
          titulo: 'Farmácia',
          descricao: desc,
          icone: 'yellow',
          criadoEm: new Date().toISOString(),
          tipo: 'farmacia',
          lida: false,
          detalhes: { lote: l.numero_lote, medicamento: nome, validade: l.validade },
        });
      }
    } else if (dias === 0) {
      const desc = `O lote "${l.numero_lote}" do remédio "${nome}" venceu.`;
      if (!temNotificacao(desc)) {
        await criarNotificacao({
          titulo: 'Farmácia',
          descricao: desc,
          icone: 'red',
          criadoEm: new Date().toISOString(),
          tipo: 'farmacia',
          lida: false,
          detalhes: { lote: l.numero_lote, medicamento: nome, validade: l.validade },
        });
      }
    }
  }
};

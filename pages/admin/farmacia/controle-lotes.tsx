import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/farmacia/farmacia.module.css';
import tableStyles from '@/styles/admin/farmacia/controleLotes.module.css';
import { buscarLotes } from '@/functions/lotesFunctions';
import { buscarMedicamentos } from '@/functions/medicamentosFunctions';
import { differenceInCalendarDays } from 'date-fns';
import { formatDateSafe, parseDate } from '@/utils/dateUtils';

interface Lote {
  id?: string;
  numero_lote: string;
  validade: string;
  quantidade_inicial: number;
  valor_compra: number;
  localizacao_fisica: string;
  medicamentoId?: string;
}

interface Medicamento {
  id: string;
  nome_comercial: string;
}

interface LoteExpirado extends Lote {
  medicamentoNome: string;
  diasVencido: number;
  custo: number;
}

const ControleLotes = () => {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'vencidos' | 'descartes'>('vencidos');
  const [vencidos, setVencidos] = useState<LoteExpirado[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, current => {
      if (current) {
        setUser(current);
      } else {
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const loadData = async () => {
      const [lotes, medicamentos] = await Promise.all([
        buscarLotes(),
        buscarMedicamentos(),
      ]);
      const map: Record<string, string> = {};
      (medicamentos as any).forEach((m: Medicamento) => {
        map[m.id] = m.nome_comercial;
      });
      const exp = (lotes as any)
        .filter((l: Lote) => {
          const d = parseDate(l.validade) ?? new Date(l.validade);
          return d < new Date();
        })
        .map((l: Lote) => {
          const dataVal = parseDate(l.validade) ?? new Date(l.validade);
          const dias = differenceInCalendarDays(new Date(), dataVal);
          return {
            ...l,
            medicamentoNome: map[l.medicamentoId || ''] || '-',
            diasVencido: dias,
            custo: l.quantidade_inicial * (l.valor_compra || 0),
          } as LoteExpirado;
        });
      setVencidos(exp);
    };
    loadData();
  }, []);

  return (
    <ProtectedRoute>
      <div className={layoutStyles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt;{' '}
            <span className={breadcrumbStyles.breadcrumb}>Gestão de Farmácias &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Controle dos Lotes</span>
          </span>
        </div>
        <h1 className={layoutStyles.titleFarmacia}>Controle dos Lotes</h1>
        <div className={layoutStyles.subtitleFarmacia}>Acompanhe lotes vencidos e descartes</div>
        <div className={tableStyles.tabsWrapper}>
          <button
            className={`${tableStyles.tabButton} ${activeTab === 'vencidos' ? tableStyles.activeTab : ''}`}
            onClick={() => setActiveTab('vencidos')}
          >
            Vencidos
          </button>
          <button
            className={`${tableStyles.tabButton} ${activeTab === 'descartes' ? tableStyles.activeTab : ''}`}
            onClick={() => setActiveTab('descartes')}
          >
            Descartes
          </button>
        </div>
        {activeTab === 'vencidos' && (
          <div className={tableStyles.tableWrapper}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Nome do medicamento</th>
                  <th>N° do lote</th>
                  <th>Validade</th>
                  <th>Dias vencido</th>
                  <th>Quantidade</th>
                  <th>Local</th>
                  <th>Custo</th>
                </tr>
              </thead>
              <tbody>
                {vencidos.map(l => (
                  <tr key={`${l.medicamentoId}-${l.numero_lote}`}>
                    <td>{l.medicamentoNome}</td>
                    <td>{l.numero_lote}</td>
                    <td>{formatDateSafe(l.validade, 'dd/MM/yyyy')}</td>
                    <td>{l.diasVencido}</td>
                    <td>{l.quantidade_inicial}</td>
                    <td>{l.localizacao_fisica}</td>
                    <td>{l.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'descartes' && (
          <div className={tableStyles.tableWrapper}>
            {/* Conteúdo futuro para descartes */}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default ControleLotes;

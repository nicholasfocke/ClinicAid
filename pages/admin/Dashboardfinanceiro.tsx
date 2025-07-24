import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/financeiro/Dashboardfinanceiro.module.css';
import { Bar } from 'react-chartjs-2';
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const DashboardFinanceiro = () => {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/auth/login');
    });
    return () => unsubscribe();
  }, [router]);

  const receitaMensal = [6000, 8500, 5000, 10000, 12000, 25000];
  const despesasMensal = [4000, 6000, 3500, 6500, 7000, 18500];
  const lucroMensal = receitaMensal.map((v, i) => v - despesasMensal[i]);

const [meta, setMeta] = useState(20000);

const totalReceita = receitaMensal.reduce((a, b) => a + b, 0);
const totalDespesas = despesasMensal.reduce((a, b) => a + b, 0);
const totalSaido = totalReceita - totalDespesas;

const porcentagem = (totalReceita / meta) * 100;

  const chartData = {
    labels: ['15/04', '23/04', '25/04', '05/04', '15/04', '31/04'],
    datasets: [
      {
        label: 'Receita',
        data: receitaMensal,
        backgroundColor: '#3b82f6',
      },
      {
        label: 'Despesas',
        data: despesasMensal,
        backgroundColor: '#f97316',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const transacoesRecentes = [
    { data: '05/04/2024', descricao: 'Pagamento de consulta', categoria: 'Receita', valor: 150 },
    { data: '03/04/2024', descricao: 'Compra de suprimentos', categoria: 'Despesas', valor: -250 },
    { data: '29/03/2024', descricao: 'Pagamento de aluguel', categoria: 'Despesas', valor: -4000 },
    { data: '28/03/2024', descricao: 'Consulta de retorno', categoria: 'Receita', valor: 250 },
    { data: '26/03/2024', descricao: 'Pagamento laboratório', categoria: 'Despesas', valor: -600 },
  ];

  return (
    <div className={styles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumbActive}>Financeiro</span>
        </span>
      </div>

      <h1 className={styles.titleFinanceiro}>Financeiro</h1>
      <p className={styles.subtitleFinanceiro}>
        Gerencie e acompanhe as receitas, despesas e o fluxo de caixa da sua clínica
      </p>

      <div className={styles.metricCards}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <TrendingUp color="#22c55e" size={18} />
            <span>Receita</span>
          </div>
          <strong>{totalReceita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <TrendingDown color="#ef4444" size={18} />
            <span>Despesas</span>
          </div>
          <strong>{totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <DollarSign color="#3b82f6" size={18} />
            <span>Saído</span>
          </div>
          <strong>{totalSaido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>
      </div>

      <div className={styles.chartSection}>
        <h3>Receita e Despesas - Últimos 30 Dias</h3>
        <Bar data={chartData} options={chartOptions} />
        <div className={styles.chartLegend}>
          <span className={styles.legendBlue}>■ Receita</span>
          <span className={styles.legendOrange}>■ Despesas</span>
        </div>
      </div>
      <div className={styles.metaMes}>
      <h3>Meta do mês:</h3>
      <div className={styles.metaWrapper}>
        <input
          type="number"
          className={styles.metaInput}
          value={meta}
          onChange={(e) => setMeta(Number(e.target.value))}
        />
        <span>R$ {meta.toLocaleString('pt-BR')}</span>
      </div>
      <div className={styles.progressoTexto}>
        Realizado: R$ {totalReceita.toLocaleString('pt-BR')} ({porcentagem.toFixed(0)}%)
      </div>
      <div className={styles.progressBar}>
        <div
          className={styles.progressBarInner}
          style={{ width: `${Math.min(porcentagem, 100)}%` }}
        />
      </div>
    </div>
      <div className={styles.transacoes}>
        <h3>Transações Recentes</h3>
        <table>
          <thead>
            <tr>
              <th>DATA</th>
              <th>DESCRIÇÃO</th>
              <th>CATEGORIA</th>
              <th>VALOR</th>
            </tr>
          </thead>
          <tbody>
            {transacoesRecentes.map((t, index) => (
              <tr key={index}>
                <td>{t.data}</td>
                <td>{t.descricao}</td>
                <td>{t.categoria}</td>
                <td className={t.valor < 0 ? styles.valorNegativo : styles.valorPositivo}>
                  {t.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardFinanceiro;

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/router';
import { auth } from '@/firebase/firebaseConfig';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/financeiro/financeiro.module.css';
import { Bar } from 'react-chartjs-2';
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const DashboardFinanceiro = () => {
  const router = useRouter();

  const receitaMensal = [10000, 15000, 8000, 20000, 17000, 22000];
  const despesasMensal = [5000, 7000, 6000, 8000, 6500, 7000];
  const lucroMensal = receitaMensal.map((v, i) => v - despesasMensal[i]);

  const totalReceita = receitaMensal.reduce((a, b) => a + b, 0);
  const totalDespesas = despesasMensal.reduce((a, b) => a + b, 0);
  const totalLucro = totalReceita - totalDespesas;

  const chartData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Receita',
        data: receitaMensal,
        backgroundColor: '#3b82f6',
      },
      {
        label: 'Despesas',
        data: despesasMensal,
        backgroundColor: '#ef4444',
      },
      {
        label: 'Lucro',
        data: lucroMensal,
        backgroundColor: '#16a34a',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' as const },
    },
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className={styles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt;{' '}
          <span className={breadcrumbStyles.breadcrumbActive}>
            Dashboard Financeiro
          </span>
        </span>
      </div>
       <h1 className={styles.titleFinanceiro}>Dashboard Financeiro</h1>
      <p className={styles.subtitleFinanceiro}>
        Área destinada ao controle financeiro.
      </p>
      <div className={styles.metricsPanel}>
        <div className={styles.metricCard}>
          <TrendingUp className={styles.metricIcon} color="#3b82f6" />
          <div>
            <div className={styles.metricTitle}>Receita</div>
            <div className={styles.metricValue}>
              {totalReceita.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </div>
        </div>
        <div className={styles.metricCard}>
          <TrendingDown className={styles.metricIcon} color="#ef4444" />
          <div>
            <div className={styles.metricTitle}>Despesas</div>
            <div className={styles.metricValue}>
              {totalDespesas.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </div>
        </div>
        <div className={styles.metricCard}>
          <DollarSign className={styles.metricIcon} color="#16a34a" />
          <div>
            <div className={styles.metricTitle}>Lucro</div>
            <div className={styles.metricValue}>
              {totalLucro.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.chartWrapper}>
        <Bar data={chartData} options={chartOptions} height={200} />
      </div>

      <div className={styles.movimentacoesPlaceholder}>
        Movimentações e relatórios serão exibidos aqui.
      </div>
    </div>
  );
};

export default DashboardFinanceiro;

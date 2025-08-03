import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/financeiro/Dashboardfinanceiro.module.css';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

Chart.register(
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

const DashboardFinanceiro = () => {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/auth/login');
    });
    return () => unsubscribe();
  }, [router]);

  // Dados reais do Firestore
  const [receitas, setReceitas] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [contasPagar, setContasPagar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Contas a receber (receitas)
      const receitasSnap = await getDocs(collection(firestore, 'contasAReceber'));
      const receitasList = receitasSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      // Contas a pagar
      const contasPagarSnap = await getDocs(collection(firestore, 'contasAPagar'));
      const contasPagarList = contasPagarSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      // Despesas
      const despesasSnap = await getDocs(collection(firestore, 'despesas'));
      const despesasList = despesasSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setReceitas(receitasList);
      setContasPagar(contasPagarList);
      setDespesas(despesasList);
      setLoading(false);
    };
    fetchData();
  }, []);



// Meta do mês: input controlado, se vazio usa receita
const [metaInput, setMetaInput] = useState('');

// Carrega meta salva
useEffect(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('metaMes');
    if (saved !== null) {
      setMetaInput(saved);
    }
  }
}, []);

// Salva meta manual no localStorage
useEffect(() => {
  if (typeof window !== 'undefined') {
    if (metaInput !== '') {
      localStorage.setItem('metaMes', metaInput);
    } else {
      localStorage.removeItem('metaMes');
    }
  }
}, [metaInput]);



// Receita: soma de contas a receber (status Recebido OU Pendente)
const totalReceita = receitas.reduce((acc, r) => acc + (typeof r.valor === 'number' ? r.valor : 0), 0);
// Despesas: soma de contas a pagar + despesas
const totalDespesas = contasPagar.reduce((acc, d) => acc + (typeof d.valor === 'number' ? d.valor : 0), 0)
  + despesas.reduce((acc, d) => acc + (typeof d.valor === 'number' ? d.valor : 0), 0);
const totalSaido = totalReceita - totalDespesas;

const meta = metaInput === '' ? totalReceita : Number(metaInput);
const porcentagem = meta > 0 ? (totalReceita / meta) * 100 : 0;


const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
const [dataType, setDataType] = useState<'both' | 'Receita' | 'Despesas'>('both');

// Agrupamento por mês/ano para gráfico (exemplo: MM/YYYY)
function agruparPorMesAno(lista: any[], campoData: string) {
  const agrupado: { [mesAno: string]: number } = {};
  lista.forEach(item => {
    let dataStr = item[campoData];
    if (!dataStr) return;
    // Aceita formatos dd/mm/yyyy ou yyyy-mm-dd
    let partes = dataStr.includes('/') ? dataStr.split('/') : dataStr.split('-').reverse();
    let mesAno = `${partes[1]}/${partes[2]}`;
    agrupado[mesAno] = (agrupado[mesAno] || 0) + (typeof item.valor === 'number' ? item.valor : 0);
  });
  return agrupado;
}

const receitasPorMes = agruparPorMesAno(receitas, 'vencimento');
const contasPagarPorMes = agruparPorMesAno(contasPagar, 'vencimento');
const despesasPorMes = agruparPorMesAno(despesas, 'data');

// Meses presentes nos dados
const meses = Array.from(new Set([
  ...Object.keys(receitasPorMes),
  ...Object.keys(contasPagarPorMes),
  ...Object.keys(despesasPorMes),
])).sort((a, b) => {
  // Ordena por ano/mês
  const [ma, aa] = a.split('/').map(Number);
  const [mb, ab] = b.split('/').map(Number);
  return aa !== ab ? aa - ab : ma - mb;
});

const receitaMensal = meses.map(m => receitasPorMes[m] || 0);
const despesasMensal = meses.map(m => (contasPagarPorMes[m] || 0) + (despesasPorMes[m] || 0));
const lucroMensal = meses.map((_, i) => receitaMensal[i] - despesasMensal[i]);


  const baseChartData = {
    labels: meses,
    datasets: [
      {
        label: 'Receita',
        data: receitaMensal,
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
        fill: false,
        tension: 0.4,
      },
      {
        label: 'Despesas',
        data: despesasMensal,
        backgroundColor: '#f97316',
        borderColor: '#f97316',
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const chartData = {
    ...baseChartData,
    datasets: baseChartData.datasets.filter((d) =>
      dataType === 'both' ? true : d.label === dataType
    ),
  };

  const pieChartData = {
    labels:
      dataType === 'both'
        ? ['Receita', 'Despesas']
        : [dataType],
    datasets: [
      {
        label: 'Receita x Despesas',
        data:
          dataType === 'both'
            ? [totalReceita, totalDespesas]
            : [dataType === 'Receita' ? totalReceita : totalDespesas],
        backgroundColor:
          dataType === 'both' ? ['#3b82f6', '#f97316'] : [dataType === 'Receita' ? '#3b82f6' : '#f97316'],
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
    scales: {
    y: {
      beginAtZero: true,
      max: 100000 // Altere para o valor máximo desejado
    }
  }
  };


  // Transações recentes: últimas 10 de receitas, contas a pagar e despesas
  const transacoesRecentes = [
    ...receitas.map(r => ({
      data: r.vencimento || '',
      descricao: r.descricao || r.cliente || '',
      categoria: 'Receita',
      valor: typeof r.valor === 'number' ? r.valor : 0,
    })),
    ...contasPagar.map(d => ({
      data: d.vencimento || '',
      descricao: d.descricao || d.fornecedor || '',
      categoria: 'Conta a Pagar',
      valor: typeof d.valor === 'number' ? -d.valor : 0,
    })),
    ...despesas.map(d => ({
      data: d.data || '',
      descricao: d.descricao || '',
      categoria: 'Despesa',
      valor: typeof d.valor === 'number' ? -d.valor : 0,
    })),
  ]
    .sort((a, b) => {
      // Ordena por data (mais recente primeiro)
      const [da, ma, aa] = a.data.includes('/') ? a.data.split('/').map(Number) : [0, 0, 0];
      const [db, mb, ab] = b.data.includes('/') ? b.data.split('/').map(Number) : [0, 0, 0];
      const dateA = new Date(aa, ma - 1, da).getTime();
      const dateB = new Date(ab, mb - 1, db).getTime();
      return dateB - dateA;
    })
    .slice(0, 10);

  return (
    <div className={styles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumbActive}> Dashboard Financeiro</span>
        </span>
      </div>

      <h1 className={styles.titleFinanceiro}>Dashboard Financeiro</h1>
      <p className={styles.subtitleFinanceiro}>
        Gerencie e acompanhe as receitas, despesas e o fluxo de caixa da sua clínica
      </p>

      <div className={styles.metricCards}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <TrendingUp color="#22c55e" size={18} />
            <span>Receita</span>
          </div>
          <strong>{loading ? '...' : totalReceita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <TrendingDown color="#ef4444" size={18} />
            <span>Despesas</span>
          </div>
          <strong>{loading ? '...' : totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <DollarSign color="#3b82f6" size={18} />
            <span>Saldo</span>
          </div>
          <strong>{loading ? '...' : totalSaido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>
      </div>

      <div className={styles.chartSection}>
        <h3>Receita e Despesas - Últimos Meses</h3>
        <div className={styles.chartTypeButtons}>
          <button
            className={`${styles.chartTypeButton} ${
              chartType === 'bar' ? styles.activeChartType : ''
            }`}
            onClick={() => setChartType('bar')}
          >
            Barras
          </button>
          <button
            className={`${styles.chartTypeButton} ${
              chartType === 'line' ? styles.activeChartType : ''
            }`}
            onClick={() => setChartType('line')}
          >
            Linhas
          </button>
          <button
            className={`${styles.chartTypeButton} ${
              chartType === 'pie' ? styles.activeChartType : ''
            }`}
            onClick={() => setChartType('pie')}
          >
            Pizza
          </button>
        </div>
        <div className={styles.dataTypeButtons}>
          <button
            className={`${styles.dataTypeButton} ${
              dataType === 'both' ? styles.activeDataType : ''
            }`}
            onClick={() => setDataType('both')}
          >
            Ambos
          </button>
          <button
            className={`${styles.dataTypeButton} ${
              dataType === 'Receita' ? styles.activeDataType : ''
            }`}
            onClick={() => setDataType('Receita')}
          >
            Receita
          </button>
          <button
            className={`${styles.dataTypeButton} ${
              dataType === 'Despesas' ? styles.activeDataType : ''
            }`}
            onClick={() => setDataType('Despesas')}
          >
            Despesa
          </button>
        </div>
        {chartType === 'bar' && <Bar data={chartData} options={chartOptions} />}
        {chartType === 'line' && <Line data={chartData} options={chartOptions} />}
        {chartType === 'pie' && (
          <div className={styles.chartWrapper}>
            <Pie data={pieChartData} />
          </div>
        )}
      </div>
      <div className={styles.chartSection}>
        <h3>Evolução financeira</h3>
        <div className={styles.chartWrapperFull}>
          <Line
            data={{
              labels: meses,
              datasets: [
                {
                  label: 'Receita Bruta',
                  data: receitaMensal,
                  borderColor: '#3b82f6',
                  backgroundColor: '#3b82f6',
                  fill: false,
                  tension: 0.4,
                },
                {
                  label: 'Despesas',
                  data: despesasMensal,
                  borderColor: '#f97316',
                  backgroundColor: '#f97316',
                  fill: false,
                  tension: 0.4,
                },
                {
                  label: 'Lucro Líquido',
                  data: lucroMensal,
                  borderColor: '#22c55e',
                  backgroundColor: '#22c55e',
                  fill: false,
                  tension: 0.4,
                },
              ],
            }}
            options={chartOptions}
          />
        </div>
      </div>
      <div className={styles.metaMes}>
        <h3>Meta do mês:</h3>
        <div className={styles.metaWrapper}>
          <input
            type="number"
            className={styles.metaInput}
            placeholder="Defina a meta ou deixe em branco para usar o faturamento"
            min={0}
            value={metaInput}
            onChange={e => setMetaInput(e.target.value)}
          />
          <span>
            {`R$ ${meta.toLocaleString('pt-BR')}`}
            {metaInput === '' && <span style={{ color: '#888', marginLeft: 8 }}>(usando faturamento)</span>}
          </span>
        </div>
        <div className={styles.progressoTexto}>
          <>Realizado: R$ {totalReceita.toLocaleString('pt-BR')} ({porcentagem.toFixed(0)}%)</>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressBarInner}
            style={{ width: meta > 0 ? `${Math.min(porcentagem, 100)}%` : '0%' }}
          />
        </div>
      </div>

      {/* Forecast Section */}
      <div className={styles.chartSection}>
        <h3>Gráfico de Projeção de Receita e Despesa (Forecast)</h3>
        <p style={{ color: '#666', marginBottom: 12, fontSize: 15 }}>
          Previsão baseada na média dos últimos 3 a 6 meses (ou menos, se houver poucos dados).
        </p>
        {
          (() => {
            // Pega os últimos 6 meses com dados
            const n = Math.min(6, meses.length);
            const ultimosMeses = meses.slice(-n);
            const receitaUltimos = receitaMensal.slice(-n);
            const despesaUltimos = despesasMensal.slice(-n);
            // Média dos últimos 3 meses (ou menos)
            const n3 = Math.min(3, receitaUltimos.length);
            const mediaReceita = n3 > 0 ? (receitaUltimos.slice(-n3).reduce((a, b) => a + b, 0) / n3) : 0;
            const mediaDespesa = n3 > 0 ? (despesaUltimos.slice(-n3).reduce((a, b) => a + b, 0) / n3) : 0;
            // Projeção para os próximos 3 meses
            const projLabels = [
              ...ultimosMeses,
              ...Array.from({ length: 3 }, (_, i) => {
                // Gera próximo mês/ano
                const [m, a] = ultimosMeses.length > 0 ? ultimosMeses[ultimosMeses.length - 1].split('/').map(Number) : [1, new Date().getFullYear()];
                const next = new Date(a, m - 1 + i + 1, 1);
                return `${String(next.getMonth() + 1).padStart(2, '0')}/${next.getFullYear()}`;
              })
            ];
            // Dados reais e previstos separados
            const realReceita = [...receitaUltimos];
            const prevReceita = Array(3).fill(mediaReceita);
            const realDespesa = [...despesaUltimos];
            const prevDespesa = Array(3).fill(mediaDespesa);
            return (
              <div className={styles.chartWrapperFull}>
                <Line
                  data={{
                    labels: projLabels,
                    datasets: [
                      {
                        label: 'Receita (real)',
                        data: [...realReceita, ...Array(3).fill(null)],
                        borderColor: '#3b82f6',
                        backgroundColor: '#3b82f6',
                        fill: false,
                        borderDash: undefined,
                        pointRadius: realReceita.map(() => 3).concat([0, 0, 0]),
                        pointBackgroundColor: realReceita.map(() => '#3b82f6').concat(['transparent', 'transparent', 'transparent']),
                        tension: 0.4,
                        spanGaps: true,
                      },
                      {
                        label: 'Receita (previsão)',
                        data: [...Array(realReceita.length).fill(null), ...prevReceita],
                        borderColor: '#60a5fa',
                        backgroundColor: '#60a5fa',
                        fill: false,
                        borderDash: [6, 6],
                        pointRadius: [0, 0, 0, ...prevReceita.map(() => 5)],
                        pointBackgroundColor: [
                          ...Array(realReceita.length).fill('transparent'),
                          ...prevReceita.map(() => '#60a5fa')
                        ],
                        tension: 0.4,
                        spanGaps: true,
                      },
                      {
                        label: 'Despesa (real)',
                        data: [...realDespesa, ...Array(3).fill(null)],
                        borderColor: '#f97316',
                        backgroundColor: '#f97316',
                        fill: false,
                        borderDash: undefined,
                        pointRadius: realDespesa.map(() => 3).concat([0, 0, 0]),
                        pointBackgroundColor: realDespesa.map(() => '#f97316').concat(['transparent', 'transparent', 'transparent']),
                        tension: 0.4,
                        spanGaps: true,
                      },
                      {
                        label: 'Despesa (previsão)',
                        data: [...Array(realDespesa.length).fill(null), ...prevDespesa],
                        borderColor: '#fdba74',
                        backgroundColor: '#fdba74',
                        fill: false,
                        borderDash: [6, 6],
                        pointRadius: [0, 0, 0, ...prevDespesa.map(() => 5)],
                        pointBackgroundColor: [
                          ...Array(realDespesa.length).fill('transparent'),
                          ...prevDespesa.map(() => '#fdba74')
                        ],
                        tension: 0.4,
                        spanGaps: true,
                      },
                    ],
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { position: 'bottom' },
                    },
                    scales: {
                      ...chartOptions.scales,
                      y: { ...chartOptions.scales.y, beginAtZero: true },
                    },
                  }}
                />
              </div>
            );
          })()
        }
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

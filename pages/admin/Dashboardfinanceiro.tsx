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



// Filtros globais (padrão: 'todos')
const [filtroReceita, setFiltroReceita] = useState('todos');
const [filtroContaPagar, setFiltroContaPagar] = useState('todos');
const [filtroDespesa, setFiltroDespesa] = useState('todos');


// Filtro de período
const [periodo, setPeriodo] = useState<'mensal' | 'trimestral' | 'anual' | 'personalizado'>('anual');
const [dataInicio, setDataInicio] = useState('');
const [dataFim, setDataFim] = useState('');

// Máscara para DD/MM/AAAA
function aplicarMascaraData(valor: string) {
  let v = valor.replace(/\D/g, '');
  if (v.length > 8) v = v.slice(0, 8);
  if (v.length > 4) v = v.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
  else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,2})/, '$1/$2');
  return v;
}

// Função para filtrar meses conforme o período
function filtrarMesesPorPeriodo(meses: string[]) {
  if (periodo === 'personalizado' && dataInicio.length === 10 && dataFim.length === 10) {
    // datas no formato DD/MM/AAAA
    const [di, mi, ai] = dataInicio.split('/').map(Number);
    const [df, mf, af] = dataFim.split('/').map(Number);
    const dataIni = new Date(ai, mi - 1, di);
    const dataFinal = new Date(af, mf - 1, df);
    return meses.filter(m => {
      // m = MM/YYYY
      const [mm, aa] = m.split('/').map(Number);
      // Considera o mês inteiro
      const dataMesIni = new Date(aa, mm - 1, 1);
      const dataMesFim = new Date(aa, mm, 0, 23, 59, 59, 999);
      return dataMesFim >= dataIni && dataMesIni <= dataFinal;
    });
  }
  if (periodo === 'mensal') {
    return meses.slice(-1);
  }
  if (periodo === 'trimestral') {
    return meses.slice(-3);
  }
  if (periodo === 'anual') {
    return meses.slice(-12);
  }
  return meses;
}


// Funções de filtro com opção 'Nenhum' para ocultar todos
const receitasFiltradas = filtroReceita === 'nenhum' ? [] : receitas.filter(r => {
  if (!filtroReceita || filtroReceita === 'todos') return true;
  const desc = (r.descricao || '').toLowerCase();
  const cli = (r.cliente || '').toLowerCase();
  return desc === filtroReceita || cli === filtroReceita;
});
const contasPagarFiltradas = filtroContaPagar === 'nenhum' ? [] : contasPagar.filter(d => {
  if (!filtroContaPagar || filtroContaPagar === 'todos') return true;
  const forn = (d.fornecedor || '').toLowerCase();
  const desc = (d.descricao || '').toLowerCase();
  return forn === filtroContaPagar || desc === filtroContaPagar;
});
const despesasFiltradas = filtroDespesa === 'nenhum' ? [] : despesas.filter(d => {
  if (!filtroDespesa || filtroDespesa === 'todos') return true;
  const cat = (d.categoria || '').toLowerCase();
  return cat === filtroDespesa;
});

// Opções dos filtros (únicos) com 'Nenhum' e 'Todos'
const opcoesReceita = ['nenhum', 'todos', ...Array.from(new Set(receitas.map(r => (r.descricao || r.cliente || '').toLowerCase()).filter(Boolean)))];
const opcoesContaPagar = ['nenhum', 'todos', ...Array.from(new Set(contasPagar.map(d => (d.fornecedor || d.descricao || '').toLowerCase()).filter(Boolean)))];
const opcoesDespesa = ['nenhum', 'todos', ...Array.from(new Set(despesas.map(d => (d.categoria || '').toLowerCase()).filter(Boolean)))];



// Receita: soma de contas a receber (status Recebido OU Pendente)
const totalReceita = receitasFiltradas.reduce((acc, r) => acc + (typeof r.valor === 'number' ? r.valor : 0), 0);

// Despesas: soma de contas a pagar agrupadas por fornecedor + despesas agrupadas por categoria
// Para o gráfico, queremos mostrar cada fornecedor (contas a pagar) e cada categoria (despesas)
const despesasPorFornecedor = contasPagarFiltradas.reduce((acc, d) => {
  const key = (d.fornecedor || 'Outro').toLowerCase();
  acc[key] = (acc[key] || 0) + (typeof d.valor === 'number' ? d.valor : 0);
  return acc;
}, {} as Record<string, number>);
const despesasPorCategoria = despesasFiltradas.reduce((acc, d) => {
  const key = (d.categoria || 'Outro').toLowerCase();
  acc[key] = (acc[key] || 0) + (typeof d.valor === 'number' ? d.valor : 0);
  return acc;
}, {} as Record<string, number>);
// Soma total para saldo
const totalDespesas = ([
  ...Object.values<number>(despesasPorFornecedor),
  ...Object.values<number>(despesasPorCategoria)
].reduce((a, b) => a + b, 0));
const totalSaido = totalReceita - totalDespesas;

const meta = metaInput === '' ? totalReceita : Number(metaInput);
const porcentagem = meta > 0 ? (totalReceita / meta) * 100 : 0;


const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
const [dataType, setDataType] = useState<'both' | 'Receita' | 'Despesas'>('both');


// Agrupamento por mês/ano para gráfico (exemplo: MM/YYYY)
function agruparPorMesAno(lista: any[], campoData: string, agrupador: (item: any) => string) {
  const agrupado: { [mesAno: string]: Record<string, number> } = {};
  lista.forEach(item => {
    let dataStr = item[campoData];
    if (!dataStr) return;
    let partes = dataStr.includes('/') ? dataStr.split('/') : dataStr.split('-').reverse();
    let mesAno = `${partes[1]}/${partes[2]}`;
    const key = agrupador(item);
    if (!agrupado[mesAno]) agrupado[mesAno] = {};
    agrupado[mesAno][key] = (agrupado[mesAno][key] || 0) + (typeof item.valor === 'number' ? item.valor : 0);
  });
  return agrupado;
}

const receitasPorMes = agruparPorMesAno(receitasFiltradas, 'vencimento', r => 'Receita');
const contasPagarPorMes = agruparPorMesAno(contasPagarFiltradas, 'vencimento', d => (d.fornecedor || 'Outro').toLowerCase());
const despesasPorMes = agruparPorMesAno(despesasFiltradas, 'data', d => (d.categoria || 'Outro').toLowerCase());



// Meses presentes nos dados
const todosMeses = Array.from(new Set([
  ...Object.keys(receitasPorMes),
  ...Object.keys(contasPagarPorMes),
  ...Object.keys(despesasPorMes),
])).sort((a, b) => {
  // Ordena por ano/mês
  const [ma, aa] = a.split('/').map(Number);
  const [mb, ab] = b.split('/').map(Number);
  return aa !== ab ? aa - ab : ma - mb;
});

const meses = filtrarMesesPorPeriodo(todosMeses);
const receitaMensal = meses.map(m => (receitasPorMes[m]?.['Receita'] || 0));
// Despesas mensal: soma de todos fornecedores e categorias
const despesasMensal = meses.map(m => {
  const fornecedores = contasPagarPorMes[m] ? Object.values(contasPagarPorMes[m]) : [];
  const categorias = despesasPorMes[m] ? Object.values(despesasPorMes[m]) : [];
  return fornecedores.reduce((a, b) => a + b, 0) + categorias.reduce((a, b) => a + b, 0);
});
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
    ...receitasFiltradas.map(r => ({
      data: r.vencimento || '',
      descricao: r.descricao || r.cliente || '',
      categoria: 'Receita',
      valor: typeof r.valor === 'number' ? r.valor : 0,
    })),
    ...contasPagarFiltradas.map(d => ({
      data: d.vencimento || '',
      descricao: d.descricao || d.fornecedor || '',
      categoria: 'Conta a Pagar',
      valor: typeof d.valor === 'number' ? -d.valor : 0,
    })),
    ...despesasFiltradas.map(d => ({
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

      {/* Filtros movidos para logo abaixo dos cards */}
      <div className={styles.filtrosDashboard}>
        <div>
          <label>Período:</label>
          <select value={periodo} onChange={e => setPeriodo(e.target.value as any)}>
            <option value="mensal">Mensal</option>
            <option value="trimestral">Trimestral</option>
            <option value="anual">Anual</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </div>
        {periodo === 'personalizado' && (
          <>
            <div>
              <label>Início (DD/MM/AAAA):</label>
              <input
                type="text"
                placeholder="DD/MM/AAAA"
                value={dataInicio}
                onChange={e => setDataInicio(aplicarMascaraData(e.target.value))}
                maxLength={10}
                style={{ width: 130 }}
                inputMode="numeric"
                pattern="\d{2}/\d{2}/\d{4}"
              />
            </div>
            <div>
              <label>Fim (DD/MM/AAAA):</label>
              <input
                type="text"
                placeholder="DD/MM/AAAA"
                value={dataFim}
                onChange={e => setDataFim(aplicarMascaraData(e.target.value))}
                maxLength={10}
                style={{ width: 130 }}
                inputMode="numeric"
                pattern="\d{2}/\d{2}/\d{4}"
              />
            </div>
          </>
        )}
        <div>
          <label>Tipo de Receita:</label>
          <select
            value={filtroReceita}
            onChange={e => setFiltroReceita(e.target.value)}
          >
            {opcoesReceita.map((op, i) => (
              <option key={op + i} value={op}>
                {op === 'nenhum' ? 'Nenhum' : op === 'todos' ? 'Todos' : op.charAt(0).toUpperCase() + op.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Tipo de Conta a Pagar:</label>
          <select
            value={filtroContaPagar}
            onChange={e => setFiltroContaPagar(e.target.value)}
          >
            {opcoesContaPagar.map((op, i) => (
              <option key={op + i} value={op}>
                {op === 'nenhum' ? 'Nenhum' : op === 'todos' ? 'Todos' : op.charAt(0).toUpperCase() + op.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Categoria da Despesa:</label>
          <select
            value={filtroDespesa}
            onChange={e => setFiltroDespesa(e.target.value)}
          >
            {opcoesDespesa.map((op, i) => (
              <option key={op + i} value={op}>
                {op === 'nenhum' ? 'Nenhum' : op === 'todos' ? 'Todos' : op.charAt(0).toUpperCase() + op.slice(1)}
              </option>
            ))}
          </select>
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

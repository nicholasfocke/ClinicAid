import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/financeiro/movimentacoes.module.css';
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { ModalContaReceber } from '@/components/modals/ModalContaReceber';
import ConfirmationModal from '@/components/modals/ConfirmationModal';

type TipoMovimentacao = 'Receber' | 'Pagar' | 'Despesa';
interface Movimentacao {
  id: string;
  tipo: TipoMovimentacao;
  pessoa: string; // cliente, fornecedor ou vazio
  descricao: string;
  valor: number;
  data: string; // vencimento ou data
  status: string;
  formaPagamento?: string;
}

const MovimentacoesFinanceiras = () => {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'Todos' | TipoMovimentacao>('Todos');
  const [periodoFiltro, setPeriodoFiltro] = useState<'mes' | 'periodo'>('mes');
  const [mesSelecionado, setMesSelecionado] = useState<string>('Todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Contas a Receber
        const contasReceberSnap = await getDocs(collection(firestore, 'contasAReceber'));
        const contasReceber: Movimentacao[] = contasReceberSnap.docs.map(doc => ({
          id: doc.id,
          tipo: 'Receber',
          pessoa: doc.data().cliente || '',
          descricao: doc.data().descricao,
          valor: doc.data().valor,
          data: doc.data().vencimento,
          status: doc.data().status,
          formaPagamento: doc.data().formaPagamento || '',
        }));

        // Contas a Pagar
        const contasPagarSnap = await getDocs(collection(firestore, 'contasAPagar'));
        const contasPagar: Movimentacao[] = contasPagarSnap.docs.map(doc => ({
          id: doc.id,
          tipo: 'Pagar',
          pessoa: doc.data().fornecedor || '',
          descricao: doc.data().descricao,
          valor: doc.data().valor,
          data: doc.data().vencimento,
          status: doc.data().status,
          formaPagamento: doc.data().formaPagamento || '',
        }));

        // Despesas
        const despesasSnap = await getDocs(collection(firestore, 'despesas'));
        const despesas: Movimentacao[] = despesasSnap.docs.map(doc => ({
          id: doc.id,
          tipo: 'Despesa',
          pessoa: '',
          descricao: doc.data().descricao,
          valor: doc.data().valor,
          data: doc.data().data || doc.data().vencimento || '',
          status: doc.data().status || 'Paga',
          formaPagamento: doc.data().formaPagamento || '',
        }));

        // Junta tudo e ordena por data decrescente
        const todas = [...contasReceber, ...contasPagar, ...despesas].sort((a, b) => {
          // Ordena por data decrescente
          const [da, ma, ya] = (a.data || '').split(/[\/\-]/).map(Number);
          const [db, mb, yb] = (b.data || '').split(/[\/\-]/).map(Number);
          const dateA = new Date(ya || 0, (ma || 1) - 1, da || 1).getTime();
          const dateB = new Date(yb || 0, (mb || 1) - 1, db || 1).getTime();
          return dateB - dateA;
        });

        setMovimentacoes(todas);
      } catch {
        setMovimentacoes([]);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);



  // Filtro de pesquisa, tipo e período
  const movimentacoesFiltradas = movimentacoes.filter(mov => {
    const texto = `${mov.data} ${mov.tipo} ${mov.pessoa} ${mov.descricao} ${mov.valor} ${mov.formaPagamento || ''} ${mov.status}`.toLowerCase();
    const pesquisaOk = search.trim() === '' || texto.includes(search.trim().toLowerCase());
    const tipoOk = tipoFiltro === 'Todos' || mov.tipo === tipoFiltro;

    // Filtro de período
    let periodoOk = true;
    if (periodoFiltro === 'mes' && mesSelecionado !== 'Todos') {
      // mesSelecionado está no formato MM/AAAA
      const [mesFiltro, anoFiltro] = mesSelecionado.split('/');
      let [dia, mes, ano] = mov.data.includes('/') ? mov.data.split('/') : mov.data.split('-').reverse();
      if (mov.data.includes('-')) {
        ano = mov.data.split('-')[0];
        mes = mov.data.split('-')[1];
      }
      periodoOk = mes === mesFiltro && ano === anoFiltro;
    } else if (periodoFiltro === 'periodo' && dataInicio && dataFim) {
      // Converter datas para Date
      const [di, mi, ai] = dataInicio.split('-');
      const [df, mf, af] = dataFim.split('-');
      const dataMov = mov.data.includes('-') ? new Date(mov.data) : new Date(mov.data.split('/').reverse().join('-'));
      const dataIni = new Date(`${ai}-${mi}-${di}`);
      const dataFi = new Date(`${af}-${mf}-${df}`);
      periodoOk = dataMov >= dataIni && dataMov <= dataFi;
    }

    return pesquisaOk && tipoOk && periodoOk;
  });

  // Meses e anos disponíveis
  const meses = [
    { value: 'Todos', label: 'Todos os meses' },
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];
  const anos = Array.from(new Set(movimentacoes.map(m => {
    const parts = m.data.includes('-') ? m.data.split('-') : m.data.split('/').reverse();
    return m.data.includes('-') ? parts[0] : parts[2];
  }))).filter(Boolean);
  anos.unshift('Todos');

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Financeiro &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Movimentações</span>
          </span>
        </div>
        <h1 className={styles.titleFinanceiro}>Movimentações</h1>
        <div className={styles.subtitleFinanceiro}>Acompanhe as movimentações financeiras da clínica</div>

        {/* Filtros - imitando layout da imagem */}
        <div className={styles.filtrosBox}>
          <input
            type="text"
            placeholder="Pesquisar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.pesquisaInput}
          />
          <button
            type="button"
            onClick={() => setPeriodoFiltro('mes')}
            className={periodoFiltro === 'mes' ? styles.filtroToggleBtnAtivo : styles.filtroToggleBtn}
          >Mês/Ano</button>
          <button
            type="button"
            onClick={() => setPeriodoFiltro('periodo')}
            className={periodoFiltro === 'periodo' ? styles.filtroToggleBtnAtivo : styles.filtroToggleBtn}
          >Período</button>
          {periodoFiltro === 'mes' && (
            <select
              value={mesSelecionado}
              onChange={e => setMesSelecionado(e.target.value)}
              className={styles.selectMesExtrato}
            >
              <option value="Todos">Todos os meses</option>
              {Array.from(new Set(
                movimentacoes
                  .map(m => {
                    const parts = m.data.includes('-') ? m.data.split('-') : m.data.split('/').reverse();
                    const mes = m.data.includes('-') ? parts[1] : parts[1];
                    const ano = m.data.includes('-') ? parts[0] : parts[2];
                    return `${mes.padStart(2, '0')}/${ano}`;
                  })
              ))
                .filter(Boolean)
                .sort((a, b) => {
                  // Ordena por ano/mês
                  const [ma, aa] = a.split('/').map(Number);
                  const [mb, ab] = b.split('/').map(Number);
                  return ab !== aa ? ab - aa : mb - ma;
                })
                .map(mesAno => (
                  <option key={mesAno} value={mesAno}>{mesAno}</option>
                ))}
            </select>
          )}
          {periodoFiltro === 'periodo' && (
            <>
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className={styles.inputPeriodoExtrato}
              />
              <span className={styles.ateLabel}>até</span>
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className={styles.inputPeriodoExtrato}
              />
            </>
          )}
          <select
            value={tipoFiltro}
            onChange={e => setTipoFiltro(e.target.value as any)}
            className={styles.selectStatusExtrato}
          >
            <option value="Todos">Todos os tipos</option>
            <option value="Receber">Contas a Receber</option>
            <option value="Pagar">Contas a Pagar</option>
            <option value="Despesa">Despesas</option>
          </select>
        </div>

        <div className={styles.tabelaWrapper}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px' }}>Carregando...</div>
          ) : (
            <table className={styles.tabelaContasReceber}>
              <thead>
                <tr>
                  <th>DATA</th>
                  <th>TIPO</th>
                  <th>CLIENTE/FORNECEDOR</th>
                  <th>DESCRIÇÃO</th>
                  <th>VALOR</th>
                  <th>FORMA PAGAMENTO</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoesFiltradas.map(mov => (
                  <tr key={mov.tipo + '-' + mov.id}>
                    <td>{mov.data}</td>
                    <td>{mov.tipo}</td>
                    <td>{mov.pessoa}</td>
                    <td>{mov.descricao}</td>
                    <td>{mov.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td>{mov.formaPagamento || '-'}</td>
                    <td>
                      <span className={
                        mov.tipo === 'Receber'
                          ? mov.status === 'Recebido' ? styles.statusRecebido : styles.statusPendente
                          : mov.tipo === 'Pagar' || mov.tipo === 'Despesa'
                            ? (mov.status === 'Pago' || mov.status === 'Paga' ? styles.statusRecebido : styles.statusPendente)
                            : ''
                      }>
                        {mov.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default MovimentacoesFinanceiras;

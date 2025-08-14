import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/financeiro/movimentacoes.module.css';
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { ModalContaReceber } from '@/components/modals/ModalContaReceber';
import ConfirmationModal from '@/components/modals/ConfirmationModal';
import { gerarExtratoMovimentacoes } from '@/utils/gerarMovimentacoes';

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
  categoria?: string;
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
      let mes, ano;
      if (mov.data.includes('-')) {
        // yyyy-mm-dd
        const parts = mov.data.split('-');
        ano = parts[0];
        mes = parts[1];
      } else {
        // dd/mm/yyyy
        const parts = mov.data.split('/');
        mes = parts[1];
        ano = parts[2];
      }
      periodoOk = mes === mesFiltro && ano === anoFiltro;
    } else if (periodoFiltro === 'periodo' && dataInicio && dataFim) {
      // Converter datas para Date, aceitando tanto yyyy-mm-dd quanto dd/mm/yyyy
      const parseData = (data: string) => {
        if (!data) return null;
        if (data.includes('-')) {
          // yyyy-mm-dd
          return new Date(data + 'T00:00:00');
        } else if (data.includes('/')) {
          // dd/mm/yyyy
          const [dia, mes, ano] = data.split('/');
          return new Date(`${ano}-${mes}-${dia}T00:00:00`);
        }
        return null;
      };
      const dataMov = parseData(mov.data);
      const dataIni = parseData(dataInicio);
      const dataFi = parseData(dataFim);
      if (dataMov && dataIni && dataFi) {
        // Considera o dia inteiro de dataFim
        dataFi.setHours(23,59,59,999);
        periodoOk = dataMov >= dataIni && dataMov <= dataFi;
      } else {
        periodoOk = false;
      }
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

  const baixarExtrato = async () => {
    // Filtra movimentações conforme filtros ativos
    const movimentacoesExtrato = movimentacoes.filter(m => {
      // Adapte os filtros conforme sua lógica de pesquisa
      let matchSearch = search ? (m.descricao?.toLowerCase().includes(search.toLowerCase()) || m.categoria?.toLowerCase().includes(search.toLowerCase())) : true;
      let matchTipo = tipoFiltro !== 'Todos' ? m.tipo === tipoFiltro : true;
      let matchPeriodo = true;
      if (periodoFiltro === 'mes') {
        if (mesSelecionado && mesSelecionado !== 'Todos') {
          let v = m.data;
          if (!v) return false;
          let partes = v.includes('/') ? v.split('/') : v.split('-').reverse();
          const mesAno = `${partes[1]}/${partes[2]}`;
          matchPeriodo = mesAno === mesSelecionado;
        }
      } else if (periodoFiltro === 'periodo') {
        if (dataInicio || dataFim) {
          let v = m.data;
          if (!v) return false;
          let partes = v.includes('/') ? v.split('/') : v.split('-').reverse();
          const dataPadrao = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
          if (dataInicio && dataFim) {
            matchPeriodo = dataPadrao >= dataInicio && dataPadrao <= dataFim;
          } else if (dataInicio) {
            matchPeriodo = dataPadrao >= dataInicio;
          } else if (dataFim) {
            matchPeriodo = dataPadrao <= dataFim;
          }
        }
      }
      return matchSearch && matchTipo && matchPeriodo;
    });

    if (movimentacoesExtrato.length === 0) {
      alert('Não há movimentações para gerar o extrato.');
      return;
    }

    const dados = movimentacoesExtrato.map(m => [
      m.data,
      m.categoria || '-',
      m.descricao || '-',
      m.valor ? m.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-',
      m.tipo || '-'
    ]);

    await gerarExtratoMovimentacoes({
      titulo: 'Extrato de Movimentações',
      colunas: ['Data', 'Categoria', 'Descrição', 'Valor', 'Tipo'],
      dados,
      nomeArquivo: 'extrato_movimentacoes.pdf',
    });
  };

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
                    // Extrai mês e ano, ignora dia
                    let mes, ano;
                    if (m.data.includes('-')) {
                      // yyyy-mm-dd
                      const parts = m.data.split('-');
                      ano = parts[0];
                      mes = parts[1];
                    } else {
                      // dd/mm/yyyy
                      const parts = m.data.split('/');
                      mes = parts[1];
                      ano = parts[2];
                    }
                    return mes && ano ? `${mes.padStart(2, '0')}/${ano}` : undefined;
                  })
              ))
                .filter((v): v is string => Boolean(v))
                .sort((a, b) => {
                  // Ordena por ano/mês
                  const [ma, aa] = a.split('/').map(Number);
                  const [mb, ab] = b.split('/').map(Number);
                  return ab !== aa ? ab - aa : mb - ma;
                })
                .map((mesAno: string) => (
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
          <button
            type="button"
            style={{ background: '#22c55e', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: '1rem', cursor: 'pointer', marginLeft: 8 }}
            onClick={baixarExtrato}
          >Baixar extrato</button>
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

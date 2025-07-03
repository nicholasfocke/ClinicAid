import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/farmacia/farmacia.module.css';
import tableStyles from '@/styles/admin/farmacia/movimentacoes.module.css';
import modalStyles from '@/styles/admin/farmacia/modalMedicamento.module.css';
import { buscarEntradasMedicamentos, buscarSaidasMedicamentos, excluirEntradaMedicamento, excluirSaidaMedicamento, 
  MovimentacaoMedicamento, registrarEntradaMedicamento, registrarSaidaMedicamento, uploadDocumentoMovimentacao, } from '@/functions/movimentacoesMedicamentosFunctions';
import { buscarMedicamentos, atualizarMedicamento } from '@/functions/medicamentosFunctions';
import { buscarLotes, atualizarLote } from '@/functions/lotesFunctions';
import { buscarPacientes, PacienteMin } from '@/functions/pacientesFunctions';
import { buscarMedicos } from '@/functions/medicosFunctions';
import { format } from 'date-fns';
import { formatDateSafe, parseDate } from '@/utils/dateUtils';

const formatValor = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Movimentacao extends MovimentacaoMedicamento {
  id: string;
  tipo: 'entrada' | 'saida';
}

interface User {
  uid: string;
  email: string;
}

interface Medicamento {
  id: string;
  nome_comercial: string;
  quantidade: number;
  controlado?: boolean;
}

interface Lote {
  id?: string;
  numero_lote: string;
  quantidade_inicial: number;
  validade: string;
  medicamentoId?: string;
  custo_unitario: number;
}

const Movimentacoes = () => {
  const [user, setUser] = useState<User | null>(null);
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState<Medicamento[]>([]);
  const [lotes, setLotes] = useState<Record<string, Lote[]>>({});
  const [showEntradaModal, setShowEntradaModal] = useState(false);
  const [produtoSearch, setProdutoSearch] = useState('');
  const [selectedProduto, setSelectedProduto] = useState<Medicamento | null>(null);
  const [selectedLote, setSelectedLote] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [motivo, setMotivo] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [showSaidaModal, setShowSaidaModal] = useState(false);
  const [produtoSearchSaida, setProdutoSearchSaida] = useState('');
  const [selectedProdutoSaida, setSelectedProdutoSaida] = useState<Medicamento | null>(null);
  const [selectedLoteSaida, setSelectedLoteSaida] = useState('');
  const [quantidadeSaida, setQuantidadeSaida] = useState(1);
  const [motivoSaida, setMotivoSaida] = useState('');
  const [documentoSaida, setDocumentoSaida] = useState<File | null>(null);
  const [pacientes, setPacientes] = useState<PacienteMin[]>([]);
  const [profissionais, setProfissionais] = useState<{ id: string; nome: string }[]>([]);
  const [pacienteSaida, setPacienteSaida] = useState('');
  const [profissionalSaida, setProfissionalSaida] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'entradas' | 'saidas'>('todos');
  const router = useRouter();

  const validadeLote = (num: string) => {
    const all = Object.values(lotes).flat();
    const l = all.find((lt) => lt.numero_lote === num);
    return l ? formatDateSafe(l.validade, 'dd/MM/yyyy') : '-';
  };

  const isExpired = (date: string) => {
    if (!date) return false;
    const d = parseDate(date) ?? new Date(date);
    return d < new Date();
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, current => {
      if (current) {
        setUser({ uid: current.uid, email: current.email || '' });
      } else {
        router.push('/auth/login');
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const fetchData = async () => {
      const [entradas, saidas] = await Promise.all([
        buscarEntradasMedicamentos(),
        buscarSaidasMedicamentos(),
      ]);
      const all: Movimentacao[] = [
        ...(entradas as any).map((e: any) => ({ ...e, tipo: 'entrada' })),
        ...(saidas as any).map((s: any) => ({ ...s, tipo: 'saida' })),
      ];
      all.sort((a, b) => b.data.localeCompare(a.data));
      setMovs(all);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const load = async () => {
      const meds = await buscarMedicamentos();
      setProdutos(meds as any);
      const ls = await buscarLotes();
      const grouped: Record<string, Lote[]> = {};
      (ls as any).forEach((l: any) => {
        const medId = l.medicamentoId || '';
        if (!grouped[medId]) grouped[medId] = [];
        grouped[medId].push(l as Lote);
      });
      setLotes(grouped);
    };
    load();
  }, []);

  useEffect(() => {
    const fetchAuxiliares = async () => {
      try {
        const pacs = await buscarPacientes();
        setPacientes(pacs);
        const profs = await buscarMedicos();
        setProfissionais(profs.map(p => ({ id: p.id, nome: p.nome })));
      } catch (err) {
        console.error('Erro ao buscar pacientes ou profissionais:', err);
      }
    };
    fetchAuxiliares();
  }, []);

  const handleDelete = async (id: string, tipo: 'entrada' | 'saida') => {
    if (!confirm('Deseja excluir este registro?')) return;
    const mov = movs.find(m => m.id === id);
    if (!mov) return;
    const med = produtos.find(p => p.nome_comercial === mov.medicamento);
    const medId = med?.id || '';
    let loteArr: Lote[] = [];
    let lote: Lote | undefined;
    if (med && mov.lote) {
      loteArr = lotes[med.id] || [];
      lote = loteArr.find(l => l.numero_lote === mov.lote);
    }
    if (tipo === 'entrada') {
      await excluirEntradaMedicamento(id);
      if (med) {
        const novaQtdMed = Math.max(0, med.quantidade - mov.quantidade);
        await atualizarMedicamento(med.id, { quantidade: novaQtdMed });
        setProdutos(prev =>
          prev.map(p => (p.id === med.id ? { ...p, quantidade: novaQtdMed } : p)),
        );
      }
      if (med && lote && lote.id) {
        const novaQtdLote = Math.max(0, lote.quantidade_inicial - mov.quantidade);
        await atualizarLote(med.id, lote.id, { quantidade_inicial: novaQtdLote });
        setLotes(prev => ({
          ...prev,
          [medId]: loteArr.map(l =>
            l.numero_lote === mov.lote ? { ...l, quantidade_inicial: novaQtdLote } : l,
          ),
        }));
      }
    } else {
      await excluirSaidaMedicamento(id);
      if (med) {
        const novaQtdMed = med.quantidade + mov.quantidade;
        await atualizarMedicamento(med.id, { quantidade: novaQtdMed });
        setProdutos(prev =>
          prev.map(p => (p.id === med.id ? { ...p, quantidade: novaQtdMed } : p)),
        );
      }
      if (med && lote && lote.id) {
        const novaQtdLote = lote.quantidade_inicial + mov.quantidade;
        await atualizarLote(med.id, lote.id, { quantidade_inicial: novaQtdLote });
        setLotes(prev => ({
          ...prev,
          [medId]: loteArr.map(l =>
            l.numero_lote === mov.lote ? { ...l, quantidade_inicial: novaQtdLote } : l,
          ),
        }));
      }
    }
    setMovs(prev => prev.filter(e => e.id !== id));
  };

  const openEntrada = (prod?: Medicamento) => {
    if (prod) setSelectedProduto(prod);
    setProdutoSearch('');
    setSelectedLote('');
    setQuantidade(1);
    setDocumentoFile(null);
    setMotivo('');
    setShowEntradaModal(true);
  };

  const openSaida = (prod?: Medicamento) => {
    if (prod) setSelectedProdutoSaida(prod);
    setProdutoSearchSaida('');
    setSelectedLoteSaida('');
    setQuantidadeSaida(1);
    setMotivoSaida('');
    setDocumentoSaida(null);
    setPacienteSaida('');
    setProfissionalSaida('');
    setShowSaidaModal(true);
  };

  const salvarEntrada = async () => {
    if (!selectedProduto || !selectedLote || quantidade < 1) return;
    let docUrl = '';
    if (documentoFile) {
      docUrl = await uploadDocumentoMovimentacao(documentoFile);
    }

    const loteArr = lotes[selectedProduto.id] || [];
    const lote = loteArr.find(l => l.numero_lote === selectedLote);
    const valorTotal = lote ? quantidade * lote.custo_unitario : 0;

    const data = {
      medicamento: selectedProduto.nome_comercial,
      quantidade,
      motivo,
      data: new Date().toISOString(),
      usuario: user?.email || '',
      lote: selectedLote,
      documentoUrl: docUrl,
      valorTotal
    } as MovimentacaoMedicamento;
    await registrarEntradaMedicamento(data);
    await atualizarMedicamento(selectedProduto.id, {
      quantidade: selectedProduto.quantidade + quantidade,
    });
    if (lote && lote.id) {
      const novaQtd = lote.quantidade_inicial + quantidade;
      await atualizarLote(selectedProduto.id, lote.id, {
        quantidade_inicial: novaQtd,
      });
      setLotes(prev => ({
        ...prev,
        [selectedProduto.id]: loteArr.map(l =>
          l.numero_lote === selectedLote
            ? { ...l, quantidade_inicial: novaQtd }
            : l,
        ),
      }));
    }
    setShowEntradaModal(false);
    setShowSnackbar(true);
    // refresh list
    const [entradas, saidas] = await Promise.all([
      buscarEntradasMedicamentos(),
      buscarSaidasMedicamentos(),
    ]);
    const all: Movimentacao[] = [
      ...(entradas as any).map((e: any) => ({ ...e, tipo: 'entrada' })),
      ...(saidas as any).map((s: any) => ({ ...s, tipo: 'saida' })),
    ];
    all.sort((a, b) => b.data.localeCompare(a.data));
    setMovs(all);
  };

  const salvarSaida = async () => {
    if (!selectedProdutoSaida || !selectedLoteSaida || quantidadeSaida < 1) return;
    const loteArr = lotes[selectedProdutoSaida.id] || [];
    const lote = loteArr.find(l => l.numero_lote === selectedLoteSaida);
    if (lote && quantidadeSaida > lote.quantidade_inicial) {
      alert('Quantidade superior à disponível no lote.');
      return;
    }
    if (lote && isExpired(lote.validade)) {
      alert('O lote está vencido');
      return;
    }
    let docUrl = '';
    if (documentoSaida) {
      docUrl = await uploadDocumentoMovimentacao(documentoSaida);
    }
    const valorTotal = lote ? quantidadeSaida * lote.custo_unitario : 0;
    const data = {
      medicamento: selectedProdutoSaida.nome_comercial,
      quantidade: quantidadeSaida,
      motivo: motivoSaida,
      data: new Date().toISOString(),
      usuario: user?.email || '',
      lote: selectedLoteSaida,
      receitaUrl: docUrl,
      paciente: pacienteSaida,
      profissional: profissionalSaida,
      valorTotal,
    } as MovimentacaoMedicamento;
    await registrarSaidaMedicamento(data);
    await atualizarMedicamento(selectedProdutoSaida.id, {
      quantidade: Math.max(0, selectedProdutoSaida.quantidade - quantidadeSaida),
    });
    if (lote && lote.id) {
      const novaQtd = Math.max(0, lote.quantidade_inicial - quantidadeSaida);
      await atualizarLote(selectedProdutoSaida.id, lote.id, {
        quantidade_inicial: novaQtd,
      });
      setLotes(prev => ({
        ...prev,
        [selectedProdutoSaida.id]: loteArr.map(l =>
          l.numero_lote === selectedLoteSaida
            ? { ...l, quantidade_inicial: novaQtd }
            : l,
        ),
      }));
    }
    setShowSaidaModal(false);
    // refresh list
    const [entradas, saidas] = await Promise.all([
      buscarEntradasMedicamentos(),
      buscarSaidasMedicamentos(),
    ]);
    const all: Movimentacao[] = [
      ...(entradas as any).map((e: any) => ({ ...e, tipo: 'entrada' })),
      ...(saidas as any).map((s: any) => ({ ...s, tipo: 'saida' })),
    ];
    all.sort((a, b) => b.data.localeCompare(a.data));
    setMovs(all);
  };

  const registrarOutra = () => {
    setShowSnackbar(false);
    if (selectedProduto) {
      openEntrada(selectedProduto);
    }
  };

  const fecharSnackbar = () => {
    setShowSnackbar(false);
    setSelectedProduto(null);
  };

  const searchFiltered = movs.filter(e =>
    e.medicamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.paciente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.profissional || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const entradas = searchFiltered.filter(e => e.tipo === 'entrada');
  const saidas = searchFiltered.filter(e => e.tipo === 'saida');
  const filtered =
    activeTab === 'entradas' ? entradas : activeTab === 'saidas' ? saidas : searchFiltered;

  return (
    <ProtectedRoute>
      <div className={layoutStyles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt;{' '}
            <span className={breadcrumbStyles.breadcrumb}>Gestão de Farmácias &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Movimentações</span>
          </span>
        </div>
        <h1 className={layoutStyles.titleFarmacia}>Movimentações</h1>
        <div className={layoutStyles.subtitleFarmacia}>Entradas e saídas registradas</div>
        <div className={tableStyles.tabsWrapper}>
          <button
            className={`${tableStyles.tabButton} ${activeTab === 'todos' ? tableStyles.activeTab : ''}`}
            onClick={() => setActiveTab('todos')}
          >
            Todos
          </button>
          <button
            className={`${tableStyles.tabButton} ${activeTab === 'entradas' ? tableStyles.activeTab : ''}`}
            onClick={() => setActiveTab('entradas')}
          >
            Entradas
          </button>
          <button
            className={`${tableStyles.tabButton} ${activeTab === 'saidas' ? tableStyles.activeTab : ''}`}
            onClick={() => setActiveTab('saidas')}
          >
            Saídas
          </button>
        </div>
        <div className={tableStyles.topBar}>
          <div className={tableStyles.actionButtonsWrapper}>
            <button
              className={tableStyles.buttonEntrada}
              onClick={() => openEntrada()}
            >
              + Adicionar entrada
            </button>
            <button
              className={tableStyles.buttonSaida}
              onClick={() => openSaida()}
            >
              + Adicionar saída
            </button>
          </div>
          <div className={tableStyles.searchContainer}>
            <input
              type="text"
              placeholder="🔍 Pesquisar"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={tableStyles.searchInput}
            />
          </div>
        </div>
        <div className={tableStyles.medicamentosTableWrapper}>
          <table className={tableStyles.medicamentosTable}>
            <thead>
              {activeTab === 'todos' && (
                <tr>
                  <th>PRODUTO</th>
                  <th>Nº Lote</th>
                  <th>QTDE</th>
                  <th>VALOR</th>
                  <th>VALIDADE</th>
                  <th>TIPO</th>
                  <th></th>
                </tr>
              )}
              {activeTab === 'saidas' && (
                <tr>
                  <th>PRODUTO</th>
                  <th>Nº Lote</th>
                  <th>PACIENTE</th>
                  <th>PROFISSIONAL</th>
                  <th>MOTIVO</th>
                  <th>QTDE</th>
                  <th>VALOR</th>
                  <th>RECEITA</th>
                  <th></th>
                </tr>
              )}
              {activeTab === 'entradas' && (
                <tr>
                  <th>PRODUTO</th>
                  <th>Nº Lote</th>
                  <th>MOTIVO</th>
                  <th>QTDE</th>
                  <th>VALOR</th>
                  <th></th>
                </tr>
              )}
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  {activeTab === 'todos' && (
                    <>
                      <td>{e.medicamento}</td>
                      <td>{e.lote || '-'}</td>
                      <td>{e.quantidade}</td>
                      <td>{formatValor(e.valorTotal || 0)}</td>
                      <td>{e.lote ? validadeLote(e.lote) : '-'}</td>
                      <td>
                        <span
                          className={`${tableStyles.tipoQuad} ${
                            e.tipo === 'entrada'
                              ? tableStyles.entrada
                              : tableStyles.saida
                          }`}
                        ></span>
                        {e.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </td>
                    </>
                  )}
                  {activeTab === 'saidas' && (
                    <>
                      <td>{e.medicamento}</td>
                      <td>{e.lote || '-'}</td>
                      <td>{e.paciente || '-'}</td>
                      <td>{e.profissional || '-'}</td>
                      <td>{e.motivo}</td>
                      <td>{e.quantidade}</td>
                      <td>{formatValor(e.valorTotal || 0)}</td>
                      <td>
                        {e.receitaUrl ? (
                          <a href={e.receitaUrl} target="_blank" rel="noopener noreferrer">
                            Arquivo
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </>
                  )}
                  {activeTab === 'entradas' && (
                    <>
                      <td>{e.medicamento}</td>
                      <td>{e.lote || '-'}</td>
                      <td>{e.motivo}</td>
                      <td>{e.quantidade}</td>
                      <td>{formatValor(e.valorTotal || 0)}</td>
                    </>
                  )}
                  <td>
                    <button
                      className={tableStyles.buttonExcluir}
                      onClick={() => handleDelete(e.id, e.tipo)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showEntradaModal && (
          <div
            className={modalStyles.overlay}
            onClick={() => setShowEntradaModal(false)}
          >
            <div
              className={modalStyles.modal}
              onClick={e => e.stopPropagation()}
            >
              <button
                className={modalStyles.closeButton}
                onClick={() => setShowEntradaModal(false)}
              >
                X
              </button>
              <h3>Registrar Entrada</h3>
              <div className={modalStyles.formGrid}>
                <div
                  className={modalStyles.fieldWrapper}
                  style={{ gridColumn: 'span 3' }}
                >
                  <label className={modalStyles.label}>Pesquisar produto</label>
                  <input
                    type="text"
                    className={modalStyles.input}
                    value={produtoSearch}
                    onChange={e => setProdutoSearch(e.target.value)}
                  />
                </div>
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Produto</label>
                  <select
                    className={modalStyles.select}
                    value={selectedProduto?.id || ''}
                    onChange={e =>
                      setSelectedProduto(
                        produtos.find(p => p.id === e.target.value) || null,
                      )
                    }
                  >
                    <option value="">Selecione</option>
                    {produtos
                      .filter(p =>
                        p.nome_comercial
                          .toLowerCase()
                          .includes(produtoSearch.toLowerCase()),
                      )
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome_comercial}
                        </option>
                      ))}
                  </select>
                </div>
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Lote</label>
                  <select
                    className={modalStyles.select}
                    value={selectedLote}
                    onChange={e => setSelectedLote(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {(selectedProduto ? lotes[selectedProduto.id] || [] : []).map(
                      l => (
                        <option key={l.numero_lote} value={l.numero_lote}>
                          {l.numero_lote}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    className={modalStyles.input}
                    value={quantidade}
                    onChange={e => setQuantidade(Number(e.target.value))}
                  />
                </div>
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Documento (XML/NF-e)</label>
                  <input
                    type="file"
                    className={modalStyles.input}
                    onChange={e =>
                      setDocumentoFile(e.target.files?.[0] || null)
                    }
                  />
                </div>
                <div
                  className={modalStyles.fieldWrapper}
                  style={{ gridColumn: 'span 3' }}
                >
                  <label className={modalStyles.label}>Motivo</label>
                  <textarea
                    className={modalStyles.textarea}
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                  />
                </div>
              </div>
              <button className={modalStyles.buttonSalvar} onClick={salvarEntrada}>
                Salvar
              </button>
            </div>
          </div>
        )}
        {showSnackbar && (
          <div className={tableStyles.snackbar}>
            Entrada registrada – deseja registrar outra entrada para o mesmo
            produto?
            <button onClick={registrarOutra}>Sim</button>
            <button onClick={fecharSnackbar}>Não</button>
          </div>
        )}
        {showSaidaModal && (
          <div
            className={modalStyles.overlay}
            onClick={() => setShowSaidaModal(false)}
          >
            <div
              className={modalStyles.modal}
              onClick={e => e.stopPropagation()}
            >
              <button
                className={modalStyles.closeButton}
                onClick={() => setShowSaidaModal(false)}
              >
                X
              </button>
              <h3>Registrar Saída</h3>
              <div className={modalStyles.formGrid}>
                <div
                  className={modalStyles.fieldWrapper}
                  style={{ gridColumn: 'span 3' }}
                >
                  <label className={modalStyles.label}>Pesquisar produto</label>
                  <input
                    type="text"
                    className={modalStyles.input}
                    value={produtoSearchSaida}
                    onChange={e => setProdutoSearchSaida(e.target.value)}
                  />
                </div>
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Produto</label>
                  <select
                    className={modalStyles.select}
                    value={selectedProdutoSaida?.id || ''}
                    onChange={e =>
                      setSelectedProdutoSaida(
                        produtos.find(p => p.id === e.target.value) || null,
                      )
                    }
                  >
                    <option value="">Selecione</option>
                    {produtos
                      .filter(p =>
                        p.nome_comercial
                          .toLowerCase()
                          .includes(produtoSearchSaida.toLowerCase()),
                      )
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome_comercial}
                        </option>
                      ))}
                  </select>
                </div>
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Lote</label>
                  <select
                    className={modalStyles.select}
                    value={selectedLoteSaida}
                    onChange={e => setSelectedLoteSaida(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {(selectedProdutoSaida ? lotes[selectedProdutoSaida.id] || [] : []).map(l => (
                      <option key={l.numero_lote} value={l.numero_lote}>
                        {`${l.numero_lote} - Val: ${formatDateSafe(
                          l.validade,
                          'dd/MM/yyyy',
                        )} - Qtde: ${l.quantidade_inicial}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    className={modalStyles.input}
                    value={quantidadeSaida}
                    onChange={e => setQuantidadeSaida(Number(e.target.value))}
                  />
                </div>
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Receita</label>
                  <input
                    type="file"
                    className={modalStyles.input}
                    onChange={e =>
                      setDocumentoSaida(e.target.files?.[0] || null)
                    }
                  />
                </div>
                <div
                  className={modalStyles.fieldWrapper}
                  style={{ gridColumn: 'span 3' }}
                >
                  <label className={modalStyles.label}>Motivo</label>
                  <textarea
                    className={modalStyles.textarea}
                    value={motivoSaida}
                    onChange={e => setMotivoSaida(e.target.value)}
                  />
                </div>
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Paciente</label>
                  <select
                    className={modalStyles.input}
                    value={pacienteSaida}
                    onChange={e => setPacienteSaida(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {pacientes.map(p => (
                      <option key={p.id} value={p.nome}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Profissional</label>
                  <select
                    className={modalStyles.input}
                    value={profissionalSaida}
                    onChange={e => setProfissionalSaida(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {profissionais.map(p => (
                      <option key={p.id} value={p.nome}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button className={modalStyles.buttonSalvar} onClick={salvarSaida}>
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default Movimentacoes;
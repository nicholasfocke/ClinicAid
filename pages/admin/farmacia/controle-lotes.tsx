import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/farmacia/farmacia.module.css';
import tableStyles from '@/styles/admin/farmacia/controleLotes.module.css';
import loteDetailsStyles from '@/styles/admin/farmacia/loteDetails.module.css';
import modalStyles from '@/styles/admin/farmacia/modalMedicamento.module.css';
import { ExternalLink, Trash } from 'lucide-react';
import { buscarLotes, excluirLote, Lote as LoteData } from '@/functions/lotesFunctions';
import { buscarMedicamentos } from '@/functions/medicamentosFunctions';
import {
  buscarDescartesMedicamentos,
  registrarDescarteMedicamento,
  excluirDescarteMedicamento,
  DescarteMedicamento,
} from '@/functions/descartesMedicamentosFunctions';
import { uploadDocumentoMovimentacao } from '@/functions/movimentacoesMedicamentosFunctions';
import { differenceInCalendarDays } from 'date-fns';
import { formatDateSafe, parseDate } from '@/utils/dateUtils';

interface Medicamento {
  id: string;
  nome_comercial: string;
}

interface LoteExpirado extends LoteData {
  medicamentoNome: string;
  diasVencido: number;
  custo: number;
}

const ControleLotes = () => {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'vencidos' | 'descartes'>('vencidos');
  const [vencidos, setVencidos] = useState<LoteExpirado[]>([]);
  const [showLoteDetails, setShowLoteDetails] = useState(false);
  const [selectedLote, setSelectedLote] = useState<LoteExpirado | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [discardLote, setDiscardLote] = useState<LoteExpirado | null>(null);
  const [discardMetodo, setDiscardMetodo] = useState('incineração');
  const [discardQuantidade, setDiscardQuantidade] = useState(0);
  const [discardDocumento, setDiscardDocumento] = useState<File | null>(null);
  const [descartes, setDescartes] = useState<(DescarteMedicamento & { id: string })[]>([]);
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
        .filter((l: LoteData) => {
          const d = parseDate(l.validade) ?? new Date(l.validade);
          return d < new Date();
        })
        .map((l: LoteData) => {
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

  useEffect(() => {
    const loadDescartes = async () => {
      const d = await buscarDescartesMedicamentos();
      setDescartes(d as any);
    };
    loadDescartes();
  }, []);

  const openLoteDetails = (lote: LoteExpirado) => {
    setSelectedLote(lote);
    setShowLoteDetails(true);
  };

  const closeLoteDetails = () => setShowLoteDetails(false);

  const openDiscardModal = (lote: LoteExpirado) => {
    setDiscardLote(lote);
    setDiscardMetodo('incineração');
    setDiscardQuantidade(lote.quantidade_inicial);
    setDiscardDocumento(null);
    setShowDiscardModal(true);
  };

  const closeDiscardModal = () => setShowDiscardModal(false);

  const registerDiscard = async () => {
    if (!discardLote) return;
    let docUrl = '';
    if (discardDocumento) {
      docUrl = await uploadDocumentoMovimentacao(discardDocumento);
    }
    const data: DescarteMedicamento = {
      medicamento: discardLote.medicamentoNome,
      lote: discardLote.numero_lote,
      quantidade: discardQuantidade,
      metodo: discardMetodo,
      usuario: user?.email || '',
      documentoUrl: docUrl,
    };
    await registrarDescarteMedicamento(data);
    if (discardLote.medicamentoId && discardLote.id) {
      await excluirLote(discardLote.medicamentoId, discardLote.id);
    }
    setVencidos(prev => prev.filter(l => l.id !== discardLote.id));
    const d = await buscarDescartesMedicamentos();
    setDescartes(d as any);
    setShowDiscardModal(false);
  };

  const revertDiscard = async (id: string) => {
    if (!confirm('Deseja reverter este descarte?')) return;
    await excluirDescarteMedicamento(id);
    setDescartes(prev => prev.filter(d => d.id !== id));
  };

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
          <>
            <div className={tableStyles.summaryCard}>
              <span>
                Lotes vencidos: <strong>{vencidos.length}</strong>
              </span>
              <span>
                Pendentes de descartes:{' '}
                <strong>{vencidos.filter(l => l.diasVencido > 60).length}</strong>
              </span>
            </div>
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
                  <th>Ações</th>
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
                    <td>
                      <button
                        className={tableStyles.externalLink}
                        title="Ver detalhes"
                        onClick={() => openLoteDetails(l)}
                      >
                        <ExternalLink size={16} />
                      </button>
                      <button
                        className={tableStyles.trashButton}
                        title="Descartar lote"
                        onClick={() => openDiscardModal(l)}
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
        {activeTab === 'descartes' && (
          <>
            <div className={tableStyles.summaryCard}>
              <span>
                Lotes vencidos: <strong>{vencidos.length}</strong>
              </span>
              <span>
                Pendentes de descartes:{' '}
                <strong>
                  {vencidos.filter(l => l.diasVencido > 60).length}
                </strong>
              </span>
            </div>
            <div className={tableStyles.tableWrapper}>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Produto</th>
                    <th>Lote</th>
                    <th>Qtde</th>
                    <th>Método</th>
                    <th>Responsável</th>
                    <th>Documento</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {descartes.map(d => (
                    <tr key={d.id}>
                      <td>{formatDateSafe(d.dataHora || '', 'dd/MM/yy HH:mm')}</td>
                      <td>{d.medicamento}</td>
                      <td>{d.lote}</td>
                      <td>{d.quantidade}</td>
                      <td>{d.metodo}</td>
                      <td>{d.usuario}</td>
                      <td>
                        {d.documentoUrl ? (
                          <a href={d.documentoUrl} target="_blank" rel="noopener noreferrer">
                            📎
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        <button
                          className={tableStyles.revertButton}
                          onClick={() => revertDiscard(d.id)}
                        >
                          ↩️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {showLoteDetails && selectedLote && (
          <div className={loteDetailsStyles.overlay} onClick={closeLoteDetails}>
            <div className={loteDetailsStyles.card} onClick={(e) => e.stopPropagation()}>
              <h3>Informações do lote</h3>
              <p>
                <strong>Número do lote:</strong> {selectedLote.numero_lote}
              </p>
              <p>
                <strong>Data de fabricação:</strong>{' '}
                {formatDateSafe(selectedLote.data_fabricacao, 'dd/MM/yyyy')}
              </p>
              <p>
                <strong>Validade:</strong>{' '}
                {formatDateSafe(selectedLote.validade, 'dd/MM/yyyy')}
              </p>
              <p>
                <strong>Quantidade:</strong> {selectedLote.quantidade_inicial}
              </p>
              <p>
                <strong>Valor compra:</strong>{' '}
                {selectedLote.valor_compra.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
              <p>
                <strong>Valor venda:</strong>{' '}
                {selectedLote.valor_venda.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
              <p>
                <strong>Fabricante:</strong> {selectedLote.fabricante}
              </p>
              <p>
                <strong>Localização:</strong> {selectedLote.localizacao_fisica}
              </p>
              <p>
                <strong>Status:</strong> {selectedLote.status}
              </p>
              <button className={loteDetailsStyles.buttonFechar} onClick={closeLoteDetails}>X</button>
            </div>
          </div>
        )}

        {showDiscardModal && discardLote && (
          <div className={loteDetailsStyles.overlay} onClick={closeDiscardModal}>
            <div className={loteDetailsStyles.card} onClick={(e) => e.stopPropagation()}>
              <h3>Registrar descarte</h3>
              <div className={modalStyles.formGrid}>
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Método de descarte</label>
                  <select
                    className={loteDetailsStyles.inputEditar}
                    value={discardMetodo}
                    onChange={(e) => setDiscardMetodo(e.target.value)}
                  >
                    {['incineração', 'devolução', 'doação'].map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Quant. a descartar</label>
                  <input
                    type="number"
                    className={loteDetailsStyles.inputEditar}
                    value={discardQuantidade}
                    onChange={(e) => setDiscardQuantidade(Number(e.target.value))}
                  />
                </div>
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Laudo/Recibo</label>
                  <input
                    type="file"
                    className={loteDetailsStyles.inputEditar}
                    onChange={(e) => setDiscardDocumento(e.target.files?.[0] || null)}
                  />
                </div>
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Responsável</label>
                  <input
                    type="text"
                    className={loteDetailsStyles.inputEditar}
                    value={user?.email || ''}
                    readOnly
                  />
                </div>
              </div>
              <div className={loteDetailsStyles.buttons}>
                <button className={loteDetailsStyles.buttonCancelar} onClick={closeDiscardModal}>Cancelar</button>
                <button className={loteDetailsStyles.buttonEditar} onClick={registerDiscard}>Registrar descarte</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default ControleLotes;

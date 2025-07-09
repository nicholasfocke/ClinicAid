import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
import { useRouter } from "next/router";
import Link from "next/link";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import breadcrumbStyles from "@/styles/Breadcrumb.module.css";
import layoutStyles from "@/styles/admin/farmacia/farmacia.module.css";
import tableStyles from "@/styles/admin/farmacia/medicamentos.module.css";
import modalStyles from "@/styles/admin/farmacia/modalMedicamento.module.css";
import detailsStyles from "@/styles/admin/farmacia/medicamentosDetails.module.css";
import loteDetailsStyles from "@/styles/admin/farmacia/loteDetails.module.css";
import { ExternalLink, LogIn, LogOut, PlusCircle, ChevronDown, ChevronRight, Trash } from "lucide-react";
import { buscarMedicamentos, criarMedicamento, excluirMedicamento, atualizarMedicamento, MedicamentoData } from "@/functions/medicamentosFunctions";
import { registrarEntradaMedicamento, registrarSaidaMedicamento, uploadDocumentoMovimentacao, buscarSaidasMedicamentos, MovimentacaoMedicamento } from "@/functions/movimentacoesMedicamentosFunctions";
import { registrarDescarteMedicamento, DescarteMedicamento } from "@/functions/descartesMedicamentosFunctions";
import { format, parseISO, subDays } from "date-fns";
import { formatDateSafe } from "@/utils/dateUtils";
import { buscarMedicos } from "@/functions/medicosFunctions";
import { buscarPacientes, PacienteMin } from "@/functions/pacientesFunctions";
import { buscarLotes, criarLote, atualizarLote, excluirLote, getStatusColor, statusLote } from "@/functions/lotesFunctions";

const formatValor = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const parseValor = (valor: string) => {
  const digits = valor.replace(/\D/g, "");
  return Number(digits) / 100;
}

interface Medicamento extends MedicamentoData {
  id: string;
  selected?: boolean;
}

interface Lote {
  id?: string;
  numero_lote: string;
  data_fabricacao: string;
  validade: string;
  quantidade_inicial: number;
  valor_compra: number;
  valor_venda: number;
  fabricante: string;
  localizacao_fisica: string;
  status: string;
  medicamentoId?: string;
}

interface User {
  uid: string;
  email: string;
}

const formasFarmaceuticas = [
  "Comprimido",
  "Cápsula",
  "Solução oral",
  "Xarope",
  "Injetável",
  "Pomada",
  "Creme",
  "Suspensão",
  "Gotas",
  "Spray",
  "Supositório",
  "Adesivo transdérmico",
];

const unidades = ["mg", "g", "mL", "UI", "mcg", "%", "gotas", "ampola", "dose"];

const viasAdministracao = [
  "Oral",
  "Tópica",
  "Intravenosa",
  "Intramuscular",
  "Subcutânea",
  "Inalatória",
  "Ocular",
  "Retal",
  "Vaginal",
  "Nasal",
  "Sublingual",
];

const tiposReceita = [
  "Branca Comum",
  "Branca Especial",
  "Azul (Receita B)",
  "Amarela (Receita A)",
  "Receita C1",
  "Receita C2",
  "Receita C3",
  "Sem necessidade de receita",
];

const classificacoes = [
  "Analgésico",
  "Antibiótico",
  "Anti-inflamatório",
  "Antialérgico",
  "Antidepressivo",
  "Anticonvulsivante",
  "Antipirético",
  "Anticoagulante",
  "Antipsicótico",
  "Anti-hipertensivo",
  "Antidiabético",
];

const Medicamentos = () => {
  const [user, setUser] = useState<User | null>(null);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [newMedicamento, setNewMedicamento] = useState<MedicamentoData>({
    nome_comercial: "",
    dcb: "",
    quantidade: 0,
    valor: 0,
    lote: "",
    validade: "",
    forma_farmaceutica: "",
    concentracao: "",
    unidade: "",
    via_administracao: "",
    fabricante: "",
    registro_anvisa: "",
    controlado: false,
    tipo_receita: "",
    classificacao: "",
    descricao: "",
    estoque_minimo: 0,
  });

  const [selectedMedicamento, setSelectedMedicamento] = useState<Medicamento | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailsData, setDetailsData] = useState<Partial<MedicamentoData>>({});
  const [showMovModal, setShowMovModal] = useState(false);
  const [movType, setMovType] = useState<"entrada" | "saida">("entrada");
  const [movMedicamento, setMovMedicamento] = useState<Medicamento | null>( null );
  const [movQuantidade, setMovQuantidade] = useState(0);
  const [movMotivo, setMovMotivo] = useState("");
  const [movLote, setMovLote] = useState("");
  const [movDocumento, setMovDocumento] = useState<File | null>(null);
  const [movPaciente, setMovPaciente] = useState("");
  const [movProfissional, setMovProfissional] = useState("");
  const [pacientes, setPacientes] = useState<PacienteMin[]>([]);
  const [profissionais, setProfissionais] = useState <{ id: string; nome: string }[]>([]);
  const [lotes, setLotes] = useState<Record<string, Lote[]>>({});
  const [saidas, setSaidas] = useState<MovimentacaoMedicamento[]>([]);
  const [showLoteModal, setShowLoteModal] = useState(false);
  const [newLote, setNewLote] = useState<Lote>({
    numero_lote: "",
    data_fabricacao: "",
    validade: "",
    quantidade_inicial: 0,
    valor_compra: 0,
    valor_venda: 0,
    fabricante: "",
    localizacao_fisica: "",
    status: "",
  });
  const [valorCompraInput, setValorCompraInput] = useState("");
  const [valorVendaInput, setValorVendaInput] = useState("");
  const [currentMedId, setCurrentMedId] = useState<string>("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showLoteDetails, setShowLoteDetails] = useState(false);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [selectedLoteMedId, setSelectedLoteMedId] = useState("");
  const [loteEditing, setLoteEditing] = useState(false);
  const [confirmDeleteLote, setConfirmDeleteLote] = useState(false);
  const [loteDetailsData, setLoteDetailsData] = useState<Partial<Lote>>({});
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [discardLote, setDiscardLote] = useState<Lote | null>(null);
  const [discardMedId, setDiscardMedId] = useState("");
  const [discardMetodo, setDiscardMetodo] = useState("incineração");
  const [discardQuantidade, setDiscardQuantidade] = useState(0);
  const [discardDocumento, setDiscardDocumento] = useState<File | null>(null);

  const selectedIds = medicamentos.filter((m) => m.selected).map((m) => m.id);
  const allSelected =
    medicamentos.length > 0 && selectedIds.length === medicamentos.length;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({ uid: currentUser.uid, email: currentUser.email || "" });
      } else {
        router.push("/auth/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchMedicamentos = async () => {
      try {
        const docs = await buscarMedicamentos();
        const lista = docs.map((d) => ({
          ...d,
          selected: false,
        })) as Medicamento[];
        setMedicamentos(lista);
      } catch (err) {
        setError("Erro ao buscar medicamentos.");
      }
    };
    fetchMedicamentos();
  }, []);

  useEffect(() => {
    const fetchAuxiliares = async () => {
      try {
        const pacs = await buscarPacientes();
        setPacientes(pacs);
        const profs = await buscarMedicos();
        setProfissionais(profs.map((p) => ({ id: p.id, nome: p.nome })));
      } catch (err) {
        console.error("Erro ao buscar pacientes ou profissionais:", err);
      }
    };
    fetchAuxiliares();
  }, []);

  useEffect(() => {
    const fetchLotes = async () => {
      try {
        const docs = await buscarLotes();
        const grouped: Record<string, Lote[]> = {};
        docs.forEach((l: any) => {
          const medId = l.medicamentoId || "";
          if (!grouped[medId]) grouped[medId] = [];
          grouped[medId].push(l as Lote);
        });
        setLotes(grouped);
      } catch (err) {
        console.error("Erro ao buscar lotes:", err);
      }
    };
    fetchLotes();
  }, []);

  useEffect(() => {
    const fetchSaidas = async () => {
      try {
        const docs = await buscarSaidasMedicamentos();
        setSaidas(docs as any);
      } catch (err) {
        console.error("Erro ao buscar saídas:", err);
      }
    };
    fetchSaidas();
  }, []);

  const filtered = medicamentos.filter((m) =>
    m.nome_comercial.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const openDetails = (m: Medicamento) => {
    setSelectedMedicamento(m);
    setDetailsData(m);
    setShowDetails(true);
    setEditing(false);
    setConfirmDelete(false);
  };

  const openMovimento = (m: Medicamento, tipo: "entrada" | "saida") => {
    setMovMedicamento(m);
    setMovType(tipo);
    setMovQuantidade(0);
    setMovMotivo("");
    setMovLote("");
    setMovDocumento(null);
    setMovPaciente("");
    setMovProfissional("");
    setShowMovModal(true);
  };

  const registrarMov = async () => {
    if (!movMedicamento || movQuantidade <= 0) return;
    const data = new Date().toISOString();
    const usuario = user?.email || "";
    if (movType === "entrada") {
      let docUrl = "";
      if (movDocumento) {
        docUrl = await uploadDocumentoMovimentacao(movDocumento);
      }
      const loteArr = lotes[movMedicamento.id] || [];
      const lote = loteArr.find((l) => l.numero_lote === movLote);
      const valorTotal = lote ? movQuantidade * lote.valor_compra : 0;
      await registrarEntradaMedicamento({
        medicamento: movMedicamento.nome_comercial,
        quantidade: movQuantidade,
        motivo: movMotivo,
        data,
        usuario,
        lote: movLote,
        documentoUrl: docUrl,
        valorTotal,
      });
      const nova = movMedicamento.quantidade + movQuantidade;
      await atualizarMedicamento(movMedicamento.id, { quantidade: nova });
      setMedicamentos((prev) =>
        prev.map((m) =>
          m.id === movMedicamento.id ? { ...m, quantidade: nova } : m,
        ),
      );
      if (movLote) {
        const loteArr = lotes[movMedicamento.id] || [];
        const lote = loteArr.find((l) => l.numero_lote === movLote);
        if (lote && (lote as any).id) {
          const atual = lote.quantidade_inicial + movQuantidade;
          await atualizarLote(movMedicamento.id, (lote as any).id, {
            quantidade_inicial: atual,
          });
          setLotes((prev) => ({
            ...prev,
            [movMedicamento.id]: loteArr.map((l) =>
              l.numero_lote === movLote
                ? { ...l, quantidade_inicial: atual }
                : l,
            ),
          }));
        }
      }
    } else {
      if (movLote) {
        const loteArr = lotes[movMedicamento.id] || [];
        const lote = loteArr.find((l) => l.numero_lote === movLote);
        if (lote && lote.status === statusLote.VENCIDO) {
          alert('O lote está vencido');
          return;
        }
        if (lote && movQuantidade > lote.quantidade_inicial) {
          alert('Quantidade superior à disponível no lote.');
          return;
        }
      }
      let docUrl = '';
      if (movDocumento) {
        docUrl = await uploadDocumentoMovimentacao(movDocumento);
      }
      const loteArrSaida = lotes[movMedicamento.id] || [];
      const loteSaida = loteArrSaida.find((l) => l.numero_lote === movLote);
      const valorTotalSaida = loteSaida ? movQuantidade * loteSaida.valor_venda : 0;
      await registrarSaidaMedicamento({
        medicamento: movMedicamento.nome_comercial,
        quantidade: movQuantidade,
        motivo: movMotivo,
        data,
        usuario,
        paciente: movPaciente,
        profissional: movProfissional,
        lote: movLote,
        receitaUrl: docUrl,
        valorTotal: valorTotalSaida,
      });
      const nova = Math.max(0, movMedicamento.quantidade - movQuantidade);
      await atualizarMedicamento(movMedicamento.id, { quantidade: nova });
      setMedicamentos((prev) =>
        prev.map((m) =>
          m.id === movMedicamento.id ? { ...m, quantidade: nova } : m,
        ),
      );
      if (movLote) {
        const loteArr = lotes[movMedicamento.id] || [];
        const lote = loteArr.find((l) => l.numero_lote === movLote);
        if (lote && (lote as any).id) {
          const atual = Math.max(0, lote.quantidade_inicial - movQuantidade);
          await atualizarLote(movMedicamento.id, (lote as any).id, {
            quantidade_inicial: atual,
          });
          setLotes((prev) => ({
            ...prev,
            [movMedicamento.id]: loteArr.map((l) =>
              l.numero_lote === movLote
                ? { ...l, quantidade_inicial: atual }
                : l,
            ),
          }));
        }
      }
    }
    setShowMovModal(false);
  };

  const closeDetails = () => setShowDetails(false);

  const handleDetailsChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setDetailsData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const saveDetails = async () => {
    if (!selectedMedicamento) return;
    try {
      await atualizarMedicamento(selectedMedicamento.id, detailsData);
      setMedicamentos((prev) =>
        prev.map((m) =>
          m.id === selectedMedicamento.id
            ? { ...m, ...(detailsData as MedicamentoData) }
            : m,
        ),
      );
      setEditing(false);
      setShowDetails(false);
    } catch (err) {
      setError("Erro ao atualizar.");
    }
  };

  const confirmDeleteMedicamento = async () => {
    if (!selectedMedicamento) return;
    await excluirMedicamento(selectedMedicamento.id);
    setMedicamentos((prev) =>
      prev.filter((m) => m.id !== selectedMedicamento.id),
    );
    setShowDetails(false);
  };

  const handleNewChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setNewMedicamento((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleNewTextAreaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setNewMedicamento((prev) => ({ ...prev, [name]: value }));
  };

  const createMedicamento = async () => {
    if (
      !newMedicamento.nome_comercial.trim() ||
      !newMedicamento.dcb.trim() ||
      !newMedicamento.concentracao.trim() ||
      !newMedicamento.registro_anvisa.trim() ||
      !newMedicamento.forma_farmaceutica ||
      !newMedicamento.unidade ||
      !newMedicamento.via_administracao ||
      !newMedicamento.tipo_receita ||
      !newMedicamento.classificacao ||
      !newMedicamento.descricao.trim() ||
      newMedicamento.estoque_minimo <= 0
    ){
      setError("Preencha todos os campos do medicamento.");
      return;
    }
    try {
      const id = await criarMedicamento(newMedicamento);
      setMedicamentos((prev) => [
        ...prev,
        {
          id,
          ...newMedicamento,
          selected: false,
        } as Medicamento,
      ]);
      setShowModal(false);
      setNewMedicamento({
        nome_comercial: "",
        quantidade: 0,
        valor: 0,
        lote: "",
        validade: "",
        dcb: "",
        forma_farmaceutica: "",
        concentracao: "",
        unidade: "",
        via_administracao: "",
        fabricante: "",
        registro_anvisa: "",
        controlado: false,
        tipo_receita: "",
        classificacao: "",
        descricao: "",
        estoque_minimo: 0,
      });
      setError("");
    } catch (err) {
      setError("Erro ao criar medicamento.");
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = window.confirm("Deseja excluir este medicamento?");
    if (!confirm) return;
    await excluirMedicamento(id);
    setMedicamentos((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleSelect = (id: string) => {
    setMedicamentos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, selected: !m.selected } : m)),
    );
  };

  const toggleSelectAll = () => {
    setMedicamentos((prev) =>
      prev.map((m) => ({ ...m, selected: !allSelected })),
    );
  };

  const deleteSelected = async () => {
    const confirm = window.confirm(
      "Deseja excluir os medicamentos selecionados?",
    );
    if (!confirm) return;
    for (const id of selectedIds) {
      await excluirMedicamento(id);
    }
    setMedicamentos((prev) => prev.filter((m) => !selectedIds.includes(m.id)));
  };

  const openLoteModal = (medId: string) => {
    setCurrentMedId(medId);
      setValorCompraInput("");
    setValorVendaInput("");
    setShowLoteModal(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  const createLote = async () => {
    if (
      !newLote.numero_lote.trim() ||
      !newLote.data_fabricacao ||
      !newLote.validade ||
      newLote.quantidade_inicial <= 0 ||
      newLote.valor_compra <= 0 ||
      newLote.valor_venda <= 0 ||
      !newLote.fabricante.trim() ||
      !newLote.localizacao_fisica.trim()
    ) {
      setError('Preencha todos os campos do lote.');
      return;
    }

    const { id, status } = await criarLote(currentMedId, { ...newLote });

    const med = medicamentos.find(m => m.id === currentMedId);
    if (med) {
      const data = new Date().toISOString();
      const usuario = user?.email || "";
      await registrarEntradaMedicamento({
        medicamento: med.nome_comercial,
        quantidade: newLote.quantidade_inicial,
        motivo: "Cadastro de novo lote",
        data,
        usuario,
        lote: newLote.numero_lote,
      });

      const novaQtd = med.quantidade + newLote.quantidade_inicial;
      await atualizarMedicamento(med.id, { quantidade: novaQtd });
      setMedicamentos(prev =>
        prev.map(m => (m.id === med.id ? { ...m, quantidade: novaQtd } : m)),
      );
    }

    setLotes((prev) => ({
      ...prev,
      [currentMedId]: [
        ...(prev[currentMedId] || []),
        { ...newLote, id, status },
      ],
    }));
    setNewLote({
      numero_lote: "",
      data_fabricacao: "",
      validade: "",
      quantidade_inicial: 0,
      valor_compra: 0,
      valor_venda: 0,
      fabricante: "",
      localizacao_fisica: "",
      status: "",
    });
    setValorCompraInput("");
    setValorVendaInput("");
    setShowLoteModal(false);
    setError("")
  };

  const isExpired = (date: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const isNearExpiry = (date: string) => {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000;
  };

    const calcularCobertura = (m: Medicamento, dias = 30): string => {
    const inicio = subDays(new Date(), dias);
    const total = saidas
      .filter(
        s =>
          s.medicamento === m.nome_comercial &&
          new Date(s.data) >= inicio,
      )
      .reduce((sum, s) => sum + s.quantidade, 0);
    if (total === 0) return '-';
    const consumoMedio = total / dias;
    if (consumoMedio === 0) return '-';
    const saldoAtual = (lotes[m.id] || [])
      .filter(l => !isExpired(l.validade))
      .reduce((sum, l) => sum + l.quantidade_inicial, 0);
    if (saldoAtual === 0) return '0d';
    return `${Math.round(saldoAtual / consumoMedio)}d`;
  };


  const openLoteDetails = (medId: string, lote: Lote) => {
    setSelectedLote(lote);
    setSelectedLoteMedId(medId);
    setLoteDetailsData(lote);
    setShowLoteDetails(true);
    setLoteEditing(false);
    setConfirmDeleteLote(false);
  };

  const openDiscardModal = (medId: string, lote: Lote) => {
    setDiscardLote(lote);
    setDiscardMedId(medId);
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
      medicamento:
      medicamentos.find((m) => m.id === discardMedId)?.nome_comercial || '',
      medicamentoId: discardMedId,
      loteId: discardLote.id,
      lote: discardLote.numero_lote,
      quantidade: discardQuantidade,
      metodo: discardMetodo,
      usuario: user?.email || '',
      documentoUrl: docUrl,
      loteData: {
        numero_lote: discardLote.numero_lote,
        data_fabricacao: discardLote.data_fabricacao,
        validade: discardLote.validade,
        quantidade_inicial: discardLote.quantidade_inicial,
        valor_compra: discardLote.valor_compra,
        valor_venda: discardLote.valor_venda,
        fabricante: discardLote.fabricante,
        localizacao_fisica: discardLote.localizacao_fisica,
        status: discardLote.status,
      },
    };
    await registrarDescarteMedicamento(data);
    if (discardLote.id) {
      await excluirLote(discardMedId, discardLote.id);
    }
    setLotes((prev) => ({
      ...prev,
      [discardMedId]: (prev[discardMedId] || []).filter((l) => l.id !== discardLote.id),
    }));
    setShowDiscardModal(false);
  };

  const closeLoteDetails = () => setShowLoteDetails(false);

  const handleLoteDetailsChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value, type } = e.target;
    setLoteDetailsData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const saveLoteDetails = async () => {
    if (!selectedLote) return;
    await atualizarLote(selectedLoteMedId, selectedLote.id!, loteDetailsData);
    setLotes((prev) => ({
      ...prev,
      [selectedLoteMedId]: (prev[selectedLoteMedId] || []).map((l) =>
        l.id === selectedLote.id ? { ...l, ...(loteDetailsData as Lote) } : l,
      ),
    }));
    setLoteEditing(false);
    setShowLoteDetails(false);
  };

  const confirmDeleteLoteFn = async () => {
    if (!selectedLote) return;
    await excluirLote(selectedLoteMedId, selectedLote.id!);
    setLotes((prev) => ({
      ...prev,
      [selectedLoteMedId]: (prev[selectedLoteMedId] || []).filter(
        (l) => l.id !== selectedLote.id,
      ),
    }));
    setShowLoteDetails(false);
  };

  return (
    <ProtectedRoute>
      <div className={layoutStyles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt;{" "}
            <span className={breadcrumbStyles.breadcrumb}>
              Gestão de Farmácias &gt;{" "}
            </span>
            <span className={breadcrumbStyles.breadcrumbActive}>
              Medicamentos
            </span>
          </span>
        </div>
        <h1 className={tableStyles.titleMedicamentos}>Medicamentos</h1>
        <div className={tableStyles.subtitleMedicamentos}>
          Gerencie os medicamentos cadastrados
        </div>
        {error && (
          <p className={tableStyles.errorMessage}>{error}</p>
        )}
        <div className={tableStyles.topBar}>
          <div className={tableStyles.actionButtonsWrapper}>
            <button
              className={tableStyles.buttonAdicionar}
              onClick={() => setShowModal(true)}
            >
              + Adicionar medicamento
            </button>
            <Link href="/admin/farmacia/controle-lotes" className={tableStyles.buttonAdicionar}>
              Controle dos Lotes
            </Link>
            {selectedIds.length > 0 && (
              <button
                className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`}
                onClick={deleteSelected}
              >
                Excluir selecionados
              </button>
            )}
          </div>
          <div className={tableStyles.searchContainer}>
            <input
              type="text"
              placeholder="🔍 Pesquisar medicamento"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={tableStyles.searchInput}
            />
          </div>
        </div>

        <div className={tableStyles.medicamentosTableWrapper}>
          <table className={tableStyles.medicamentosTable}>
            <thead>
              <tr>
                <th className={tableStyles.checkboxHeader}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className={tableStyles.expandHeader}></th>
                <th>NOME</th>
                <th>SALDO</th>
                <th>MÍN.</th>
                <th>COBERTURA (dias)</th>
                <th>PRÓX. VALIDADE</th>
                <th>LOTES</th>
                <th>AÇÕES</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <React.Fragment key={m.id}>
                  <tr>
                  <td className={tableStyles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={m.selected || false}
                      onChange={() => toggleSelect(m.id)}
                    />
                  </td>
                  <td className={tableStyles.expandCell}>
                    <button
                      className={tableStyles.expandButton}
                      onClick={() => toggleExpand(m.id)}
                    >
                      {expandedRow === m.id ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </button>
                  </td>
                  <td>{m.nome_comercial}</td>
                  <td>
                    {(lotes[m.id] || [])
                      .filter(l => !isExpired(l.validade))
                      .reduce((sum, l) => sum + l.quantidade_inicial, 0)}
                  </td>
                  <td>{m.estoque_minimo || 0}</td>
                  <td>{calcularCobertura(m)}</td>
                  <td>
                    {(() => {
                      const ls = lotes[m.id] || [];
                      if (ls.length === 0) return "";
                      const sorted = ls
                        .filter(l => !isExpired(l.validade))
                        .sort((a, b) => a.validade.localeCompare(b.validade));
                      if (sorted.length === 0) return "";
                      const first = sorted[0];
                      return (
                        <>
                          {formatDateSafe(first.validade, "dd/MM/yyyy")}
                          <span className={tableStyles.statusCircle} style={{ background: getStatusColor(first.status) }}
                            title={first.status} ></span>
                        </>
                      );
                    })()}
                  </td>
                  <td>
                    {(lotes[m.id] || []).filter(l => !isExpired(l.validade)).length}
                  </td>
                  <td>
                    <button
                      className={tableStyles.loteButton}
                      title="Novo lote"
                      onClick={() => openLoteModal(m.id)}
                    >
                      <PlusCircle size={18} />
                    </button>
                    <button
                      className={tableStyles.entryButton}
                      title="Registrar entrada"
                      onClick={() => openMovimento(m, "entrada")}
                    >
                      <LogIn size={18} />
                    </button>
                    <button
                      className={tableStyles.exitButton}
                      title="Registrar saída"
                      onClick={() => openMovimento(m, "saida")}
                    >
                      <LogOut size={18} />
                    </button>
                    <button
                      className={tableStyles.externalLink}
                      title="Ver detalhes"
                      onClick={() => openDetails(m)}
                    >
                      <ExternalLink size={19} />
                    </button>
                  </td>
                </tr>
                {expandedRow === m.id && (
                  <tr className={tableStyles.lotesRow}>
                    <td colSpan={9}>
                      <table className={tableStyles.lotesTable}>
                        <thead>
                          <tr>
                            <th>LOTE</th>
                            <th>VALIDADE</th>
                            <th>QTD.</th>
                            <th>LOCAL</th>
                            <th>STATUS</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(lotes[m.id] || [])
                            .filter(l => !isExpired(l.validade))
                            .slice()
                            .sort((a, b) => a.validade.localeCompare(b.validade))
                            .map((l) => (
                            <tr key={l.numero_lote}>
                              <td>{l.numero_lote}</td>
                              <td>
                                {formatDateSafe(l.validade, "dd/MM/yy")}
                                <span className={tableStyles.statusCircle} style={{ background: getStatusColor(l.status) }}
                                      title={l.status} ></span>
                              </td>
                              <td>{l.quantidade_inicial}</td>
                              <td>{l.localizacao_fisica}</td>
                              <td>
                                {isExpired(l.validade)
                                  ? "Vencido"
                                  : isNearExpiry(l.validade)
                                  ? "Próx. vencer"
                                  : l.status}
                              </td>
                              <td>
                                <button
                                  className={tableStyles.externalLink}
                                  title="Ver detalhes do lote"
                                  onClick={() => openLoteDetails(m.id, l)}
                                >
                                  <ExternalLink size={16} />
                                </button>
                                <button
                                  className={tableStyles.trashButton}
                                  title="Descartar lote"
                                  onClick={() => openDiscardModal(m.id, l)}
                                >
                                  <Trash size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div
          className={modalStyles.overlay}
          onClick={() => {setShowModal(false); setError("");}}
        >
          <div
            className={modalStyles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={modalStyles.closeButton}
              onClick={() => {setShowModal(false); setError("");}}
            >
              X
            </button>
            <h3>Novo Produto</h3>
              {error && (
                <p className={modalStyles.errorMessage}>{error}</p>
              )}
              <div className={modalStyles.formGrid}>
              {[
                  { label: "Nome Comercial", name: "nome_comercial", type: "text" },
                  { label: "DCB", name: "dcb", type: "text" },
                  { label: "Concentração", name: "concentracao", type: "text" },
                  { label: "Registro ANVISA", name: "registro_anvisa", type: "text" },
                  { label: "Estoque mínimo", name: "estoque_minimo", type: "number" },
              ].map(({ label, name, type }) => (
                <div key={name} className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>{label}</label>
                  <input
                    name={name}
                    type={type}
                    className={modalStyles.input}
                    value={(newMedicamento as any)[name]}
                    onChange={handleNewChange}
                  />
                </div>
              ))}

              {[
                {
                  label: "Forma Farmacêutica",
                  name: "forma_farmaceutica",
                  options: formasFarmaceuticas,
                },
                { label: "Unidade", name: "unidade", options: unidades },
                {
                  label: "Via de Administração",
                  name: "via_administracao",
                  options: viasAdministracao,
                },
                {
                  label: "Tipo de Receita",
                  name: "tipo_receita",
                  options: tiposReceita,
                },
                {
                  label: "Classificação",
                  name: "classificacao",
                  options: classificacoes,
                },
              ].map(({ label, name, options }) => (
                <div key={name} className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>{label}</label>
                  <select
                    name={name}
                    className={modalStyles.select}
                    value={(newMedicamento as any)[name]}
                    onChange={handleNewChange}
                  >
                    <option value="">Selecione</option>
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div className={modalStyles.checkboxWrapper}>
                <input
                  type="checkbox"
                  name="controlado"
                  checked={newMedicamento.controlado}
                  onChange={handleNewChange}
                />
                <label className={modalStyles.label}>Medicamento controlado</label>
              </div>

              <div
                className={modalStyles.fieldWrapper}
                style={{ gridColumn: "span 3" }}
              >
                <label className={modalStyles.label}>Descrição</label>
                <textarea
                  name="descricao"
                  className={modalStyles.textarea}
                  value={newMedicamento.descricao}
                  onChange={handleNewTextAreaChange}
                />
              </div>
            </div>

            <button
              className={modalStyles.buttonSalvar}
              onClick={createMedicamento}
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {showMovModal && movMedicamento && (
        <div
          className={modalStyles.overlay}
          onClick={() => setShowMovModal(false)}
        >
          <div
            className={modalStyles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={modalStyles.closeButton}
              onClick={() => setShowMovModal(false)}
            >
              X
            </button>
            <h3>
              {movType === "entrada" ? "Registrar Entrada" : "Registrar Saída"}
            </h3>
            <div className={modalStyles.formGrid}>
              {(movType === "entrada" || movType === "saida") && (
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Lote</label>
                  <select
                    className={modalStyles.select}
                    value={movLote}
                    onChange={(e) => setMovLote(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {(lotes[movMedicamento.id] || []).map((l) => (
                      <option key={l.numero_lote} value={l.numero_lote}>
                        {`${l.numero_lote} - Val: ${formatDateSafe(l.validade, "dd/MM/yyyy")} - Qtde: ${l.quantidade_inicial}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {movType === "entrada" && (
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Documento (XML/NF-e)</label>
                  <input
                    type="file"
                    className={modalStyles.input}
                    onChange={(e) => setMovDocumento(e.target.files?.[0] || null)}
                  />
                </div>
              )}
              {movType === "saida" && (
                <div className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>Receita</label>
                  <input
                    type="file"
                    className={modalStyles.input}
                    onChange={(e) => setMovDocumento(e.target.files?.[0] || null)}
                  />
                </div>
              )}
              <div className={modalStyles.fieldWrapper}>
                <label className={modalStyles.label}>Quantidade</label>
                <input
                  type="number"
                  className={modalStyles.input}
                  value={movQuantidade}
                  onChange={(e) => setMovQuantidade(Number(e.target.value))}
                />
              </div>
              <div
                className={modalStyles.fieldWrapper}
                style={{ gridColumn: "span 3" }}
              >
                <label className={modalStyles.label}>Motivo</label>
                <textarea
                  className={modalStyles.textarea}
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                />
              </div>
              {movType === "saida" && (
                <>
                  <div className={modalStyles.fieldWrapper}>
                    <label className={modalStyles.label}>Paciente</label>
                    <select
                      className={modalStyles.input}
                      value={movPaciente}
                      onChange={(e) => setMovPaciente(e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {pacientes.map((p) => (
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
                      value={movProfissional}
                      onChange={(e) => setMovProfissional(e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {profissionais.map((p) => (
                        <option key={p.id} value={p.nome}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            <button className={modalStyles.buttonSalvar} onClick={registrarMov}>
              Salvar
            </button>
          </div>
        </div>
      )}

      {showLoteModal && (
        <div
          className={modalStyles.overlay}
          onClick={() => {setShowModal(false); setError("");}}
        >
          <div
            className={modalStyles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={modalStyles.closeButton}
              onClick={() => {setShowModal(false); setError("");}}
            >
              X
            </button>
            <h3>Novo Lote</h3>
              {error && (
                <p className={modalStyles.errorMessage}>{error}</p>
              )}
              <div className={modalStyles.formGrid}>
              {[
                { label: "Número do lote", name: "numero_lote" },
                { label: "Data de fabricação", name: "data_fabricacao", type: "date", },
                { label: "Validade", name: "validade", type: "date" },
                { label: "Quantidade inicial", name: "quantidade_inicial", type: "number",},
                { label: "Valor Compra", name: "valor_compra", type: "text" },
                { label: "Valor Venda", name: "valor_venda", type: "text" },
                { label: "Fabricante", name: "fabricante" },
                { label: "Localização física", name: "localizacao_fisica" },
              ].map(({ label, name, type = "text" }) => (
                <div key={name} className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>{label}</label>
                  <input
                    name={name}
                    type={type}
                    className={modalStyles.input}
                    value={
                      name === "valor_compra"
                        ? valorCompraInput
                        : name === "valor_venda"
                        ? valorVendaInput
                        : (newLote as any)[name]
                    }
                    onChange={(e) => {
                      if (name === "valor_compra") {
                        const numeric = parseValor(e.target.value);
                        setValorCompraInput(formatValor(numeric));
                        setNewLote(prev => ({ ...prev, valor_compra: numeric }));
                      } else if (name === "valor_venda") {
                        const numeric = parseValor(e.target.value);
                        setValorVendaInput(formatValor(numeric));
                        setNewLote(prev => ({ ...prev, valor_venda: numeric }));
                      } else {
                        setNewLote(prev => ({
                          ...prev,
                          [name]: type === "number" ? Number(e.target.value) : e.target.value,
                        }));
                      }
                    }}
                  />
                </div>
              ))}
            </div>
            <button className={modalStyles.buttonSalvar} onClick={createLote}>
              Salvar
            </button>
          </div>
        </div>
      )}

      {showLoteDetails && selectedLote && (
        <div className={loteDetailsStyles.overlay} onClick={closeLoteDetails}>
          <div
            className={loteDetailsStyles.card}
            onClick={(e) => e.stopPropagation()}
          >
            {confirmDeleteLote ? (
              <div>
                <p>Confirmar exclusão?</p>
                <div className={loteDetailsStyles.buttons}>
                  <button
                    className={loteDetailsStyles.buttonExcluir}
                    onClick={confirmDeleteLoteFn}
                  >
                    Confirmar
                  </button>
                  <button
                    className={loteDetailsStyles.buttonEditar}
                    onClick={() => setConfirmDeleteLote(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : loteEditing ? (
              <div>
                <div className={modalStyles.formGrid}>
                  {[
                    { label: "Número do lote", name: "numero_lote" },
                    { label: "Data de fabricação", name: "data_fabricacao", type: "date" },
                    { label: "Validade", name: "validade", type: "date" },
                    { label: "Quantidade inicial", name: "quantidade_inicial", type: "number" },
                    { label: "Valor Compra", name: "valor_compra", type: "number" },
                    { label: "Valor Venda", name: "valor_venda", type: "number" },
                    { label: "Fabricante", name: "fabricante" },
                    { label: "Localização física", name: "localizacao_fisica" },
                  ].map(({ label, name, type = "text" }) => (
                    <div key={name} className={modalStyles.fieldWrapper}>
                      <label className={modalStyles.label}>{label}</label>
                      <input
                        name={name}
                        type={type}
                        className={loteDetailsStyles.inputEditar}
                        value={(loteDetailsData as any)[name] || ""}
                        onChange={handleLoteDetailsChange}
                      />
                    </div>
                  ))}
                </div>
                <div className={loteDetailsStyles.buttons}>
                  <button
                    className={loteDetailsStyles.buttonEditar}
                    onClick={saveLoteDetails}
                  >
                    Salvar
                  </button>
                  <button
                    className={loteDetailsStyles.buttonCancelar}
                    onClick={() => {
                      setLoteEditing(false);
                      setLoteDetailsData(selectedLote!);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3>Informações do lote</h3>
                <p>
                  <strong>Número do lote:</strong> {selectedLote.numero_lote}
                </p>
                <p>
                  <strong>Data de fabricação:</strong>{" "}
                  {formatDateSafe(selectedLote.data_fabricacao, "dd/MM/yyyy")}
                </p>
                <p>
                  <strong>Validade:</strong>{" "}
                  {formatDateSafe(selectedLote.validade, "dd/MM/yyyy")}
                  <span className={tableStyles.statusCircle} style={{ background: getStatusColor(selectedLote.status) }} ></span>
                </p>
                <p>
                  <strong>Quantidade inicial:</strong>{" "}
                  {selectedLote.quantidade_inicial}
                </p>
                <p>
                  <strong>Valor compra:</strong>{" "}
                  {formatValor(selectedLote.valor_compra)}
                </p>
                <p>
                  <strong>Valor venda:</strong>{" "}
                  {formatValor(selectedLote.valor_venda)}
                </p>
                <p>
                  <strong>Fabricante:</strong> {selectedLote.fabricante}
                </p>
                <p>
                  <strong>Localização física:</strong> {selectedLote.localizacao_fisica}
                </p>
                <p>
                  <strong>Status:</strong> {selectedLote.status}
                </p>
                <div className={loteDetailsStyles.buttons}>
                  <button
                    className={loteDetailsStyles.buttonExcluir}
                    onClick={() => setConfirmDeleteLote(true)}
                  >
                    Excluir lote
                  </button>
                  <button
                    className={loteDetailsStyles.buttonEditar}
                    onClick={() => {
                      setLoteEditing(true);
                      setLoteDetailsData(selectedLote);
                    }}
                  >
                    Editar lote
                  </button>
                </div>
                <button
                  className={loteDetailsStyles.buttonFechar}
                  onClick={closeLoteDetails}
                >
                  X
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showDetails && selectedMedicamento && (
        <div className={detailsStyles.overlay} onClick={closeDetails}>
          <div
            className={detailsStyles.card}
            onClick={(e) => e.stopPropagation()}
          >
            {confirmDelete ? (
              <div>
                <p>Confirmar exclusão?</p>
                <div className={detailsStyles.buttons}>
                  <button
                    className={detailsStyles.buttonExcluir}
                    onClick={confirmDeleteMedicamento}
                  >
                    Confirmar
                  </button>
                  <button
                    className={detailsStyles.buttonEditar}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : editing ? (
              <div>
                <div className={modalStyles.formGrid}>
                  {[
                    { label: "Nome Comercial", name: "nome_comercial", type: "text" },
                    { label: "DCB", name: "dcb", type: "text" },
                    { label: "Concentração", name: "concentracao", type: "text" },
                    { label: "Registro ANVISA", name: "registro_anvisa", type: "text" },
                    { label: "Estoque mínimo", name: "estoque_minimo", type: "number" },
                  ].map(({ label, name, type }) => (
                    <div key={name} className={modalStyles.fieldWrapper}>
                      <label className={modalStyles.label}>{label}</label>
                      <input
                        name={name}
                        type={type}
                        className={detailsStyles.inputEditar}
                        value={(detailsData as any)[name] || ""}
                        onChange={handleDetailsChange}
                      />
                    </div>
                  ))}

                  {[
                    {
                      label: "Forma Farmacêutica",
                      name: "forma_farmaceutica",
                      options: formasFarmaceuticas,
                    },
                    { label: "Unidade", name: "unidade", options: unidades },
                    {
                      label: "Via de Administração",
                      name: "via_administracao",
                      options: viasAdministracao,
                    },
                    {
                      label: "Tipo de Receita",
                      name: "tipo_receita",
                      options: tiposReceita,
                    },
                    {
                      label: "Classificação",
                      name: "classificacao",
                      options: classificacoes,
                    },
                  ].map(({ label, name, options }) => (
                    <div key={name} className={modalStyles.fieldWrapper}>
                      <label className={modalStyles.label}>{label}</label>
                      <select
                        name={name}
                        className={detailsStyles.inputEditar}
                        value={(detailsData as any)[name] || ""}
                        onChange={handleDetailsChange}
                      >
                        <option value="">Selecione</option>
                        {options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}

                  <div className={modalStyles.checkboxWrapper}>
                    <input
                      type="checkbox"
                      name="controlado"
                      checked={(detailsData as any).controlado || false}
                      onChange={handleDetailsChange}
                    />
                    <label className={modalStyles.label}>Medicamento controlado</label>
                  </div>

                  <div
                    className={modalStyles.fieldWrapper}
                    style={{ gridColumn: "span 3" }}
                  >
                    <label className={modalStyles.label}>Descrição</label>
                    <textarea
                      name="descricao"
                      className={modalStyles.textarea}
                      value={(detailsData as any).descricao || ""}
                      onChange={handleDetailsChange}
                    />
                  </div>
                </div>
                <div className={detailsStyles.buttons}>
                  <button
                    className={detailsStyles.buttonEditar}
                    onClick={saveDetails}
                  >
                    Salvar
                  </button>
                  <button
                    className={detailsStyles.buttonCancelar}
                    onClick={() => {
                      setEditing(false);
                      setDetailsData(selectedMedicamento!);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3>Informações do medicamento</h3>
                <p>
                  <strong>Nome Comercial:</strong>{" "}
                  {selectedMedicamento.nome_comercial}
                </p>
                <p>
                  <strong>DCB:</strong> {selectedMedicamento.dcb}
                </p>
                <p>
                  <strong>Forma Farmacêutica:</strong>{" "}
                  {selectedMedicamento.forma_farmaceutica}
                </p>
                <p>
                  <strong>Concentração:</strong>{" "}
                  {selectedMedicamento.concentracao}
                </p>
                <p>
                  <strong>Unidade:</strong> {selectedMedicamento.unidade}
                </p>
                <p>
                  <strong>Via de Administração:</strong>{" "}
                  {selectedMedicamento.via_administracao}
                </p>
                <p>
                  <strong>Registro ANVISA:</strong>{" "}
                  {selectedMedicamento.registro_anvisa}
                </p>
                <p>
                  <strong>Estoque mínimo:</strong> {selectedMedicamento.estoque_minimo}
                </p>
                <p>
                  <strong>Tipo de Receita:</strong>{" "}
                  {selectedMedicamento.tipo_receita}
                </p>
                <p>
                  <strong>Classificação:</strong>{" "}
                  {selectedMedicamento.classificacao}
                </p>
                <p>
                  <strong>Medicamento controlado:</strong>{" "}
                  {selectedMedicamento.controlado ? "Sim" : "Não"}
                </p>
                <p>
                  <strong>Descrição:</strong> {selectedMedicamento.descricao}
                </p>
                <div className={detailsStyles.buttons}>
                  <button
                    className={detailsStyles.buttonExcluir}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Excluir medicamento
                  </button>
                  <button
                    className={detailsStyles.buttonEditar}
                    onClick={() => {
                      setEditing(true);
                      setDetailsData(selectedMedicamento);
                    }}
                  >
                    Editar medicamento
                  </button>
                </div>
                <button
                  className={detailsStyles.buttonFechar}
                  onClick={closeDetails}
                >
                  X
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showDiscardModal && discardLote && (
        <div className={loteDetailsStyles.overlay} onClick={closeDiscardModal}>
          <div
            className={loteDetailsStyles.card}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Registrar descarte</h3>
            <div className={modalStyles.formGrid}>
              <div className={modalStyles.fieldWrapper}>
                <label className={modalStyles.label}>Método de descarte</label>
                <select
                  className={loteDetailsStyles.inputEditar}
                  value={discardMetodo}
                  onChange={(e) => setDiscardMetodo(e.target.value)}
                >
                  {['incineração', 'devolução', 'doação'].map((m) => (
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
              <button className={loteDetailsStyles.buttonEditar} onClick={registerDiscard}>
                Registrar descarte
              </button>
              <button className={loteDetailsStyles.buttonCancelar} onClick={closeDiscardModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
};

export default Medicamentos;
import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
import { useRouter } from "next/router";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import breadcrumbStyles from "@/styles/Breadcrumb.module.css";
import layoutStyles from "@/styles/admin/farmacia/farmacia.module.css";
import tableStyles from "@/styles/admin/farmacia/medicamentos.module.css";
import modalStyles from "@/styles/admin/farmacia/modalMedicamento.module.css";
import detailsStyles from "@/styles/admin/farmacia/medicamentosDetails.module.css";
import { ExternalLink, LogIn, LogOut, PlusCircle, ChevronDown, ChevronRight, } from "lucide-react";
import { buscarMedicamentos, criarMedicamento, excluirMedicamento, atualizarMedicamento, MedicamentoData } from "@/functions/medicamentosFunctions";
import { registrarEntradaMedicamento, registrarSaidaMedicamento } from "@/functions/movimentacoesMedicamentosFunctions";
import { format, parseISO } from "date-fns";
import { buscarMedicos } from "@/functions/medicosFunctions";
import { buscarPacientes, PacienteMin } from "@/functions/pacientesFunctions";
import { buscarLotes, criarLote } from "@/functions/lotesFunctions";

const formatValor = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Medicamento extends MedicamentoData {
  id: string;
  selected?: boolean;
}

interface Lote {
  numero_lote: string;
  data_fabricacao: string;
  validade: string;
  quantidade_inicial: number;
  custo_unitario: number;
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
  const [movPaciente, setMovPaciente] = useState("");
  const [movProfissional, setMovProfissional] = useState("");
  const [pacientes, setPacientes] = useState<PacienteMin[]>([]);
  const [profissionais, setProfissionais] = useState <{ id: string; nome: string }[]>([]);
  const [lotes, setLotes] = useState<Record<string, Lote[]>>({});
  const [showLoteModal, setShowLoteModal] = useState(false);
  const [newLote, setNewLote] = useState<Lote>({
    numero_lote: "",
    data_fabricacao: "",
    validade: "",
    quantidade_inicial: 0,
    custo_unitario: 0,
    fabricante: "",
    localizacao_fisica: "",
    status: "",
  });
  const [currentMedId, setCurrentMedId] = useState<string>("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
    setMovPaciente("");
    setMovProfissional("");
    setShowMovModal(true);
  };

  const registrarMov = async () => {
    if (!movMedicamento || movQuantidade <= 0) return;
    const data = new Date().toISOString();
    const usuario = user?.email || "";
    if (movType === "entrada") {
      await registrarEntradaMedicamento({
        medicamento: movMedicamento.nome_comercial,
        quantidade: movQuantidade,
        motivo: movMotivo,
        data,
        usuario,
      });
      const nova = movMedicamento.quantidade + movQuantidade;
      await atualizarMedicamento(movMedicamento.id, { quantidade: nova });
      setMedicamentos((prev) =>
        prev.map((m) =>
          m.id === movMedicamento.id ? { ...m, quantidade: nova } : m,
        ),
      );
    } else {
      await registrarSaidaMedicamento({
        medicamento: movMedicamento.nome_comercial,
        quantidade: movQuantidade,
        motivo: movMotivo,
        data,
        usuario,
        paciente: movPaciente,
        profissional: movProfissional,
      });
      const nova = Math.max(0, movMedicamento.quantidade - movQuantidade);
      await atualizarMedicamento(movMedicamento.id, { quantidade: nova });
      setMedicamentos((prev) =>
        prev.map((m) =>
          m.id === movMedicamento.id ? { ...m, quantidade: nova } : m,
        ),
      );
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
    if (!newMedicamento.nome_comercial.trim()) {
      setError("O nome do medicamento é obrigatório.");
      return;
    }
    try {
      await criarMedicamento(newMedicamento);
      setMedicamentos((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
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
    setShowLoteModal(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  const createLote = async () => {
    await criarLote(currentMedId, { ...newLote });
    setLotes((prev) => ({
      ...prev,
      [currentMedId]: [...(prev[currentMedId] || []), newLote],
    }));
    setNewLote({
      numero_lote: "",
      data_fabricacao: "",
      validade: "",
      quantidade_inicial: 0,
      custo_unitario: 0,
      fabricante: "",
      localizacao_fisica: "",
      status: "",
    });
    setShowLoteModal(false);
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
        {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
        <div className={tableStyles.topBar}>
          <div className={tableStyles.actionButtonsWrapper}>
            <button
              className={tableStyles.buttonAdicionar}
              onClick={() => setShowModal(true)}
            >
              + Adicionar medicamento
            </button>
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
                    {(lotes[m.id] || []).reduce(
                      (sum, l) => sum + l.quantidade_inicial,
                      0,
                    )}
                  </td>
                  <td>{m.estoque_minimo || 0}</td>
                  <td>-</td>
                  <td>
                    {(() => {
                      const ls = lotes[m.id] || [];
                      if (ls.length === 0) return "";
                      const sorted = [...ls].sort((a, b) =>
                        a.validade.localeCompare(b.validade),
                      );
                      return format(parseISO(sorted[0].validade), "dd/MM/yyyy");
                    })()}
                  </td>
                  <td>
                    { (lotes[m.id] || []).filter((l) => l.status !== "Inativo").length  }
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
                          </tr>
                        </thead>
                        <tbody>
                          {(lotes[m.id] || []).map((l) => (
                            <tr key={l.numero_lote}>
                              <td>{l.numero_lote}</td>
                              <td>{format(parseISO(l.validade), "dd/MM/yy")}</td>
                              <td>{l.quantidade_inicial}</td>
                              <td>{l.localizacao_fisica}</td>
                              <td>
                                {isExpired(l.validade)
                                  ? "Vencido"
                                  : isNearExpiry(l.validade)
                                  ? "Próx. vencer"
                                  : l.status}
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
          onClick={() => setShowModal(false)}
        >
          <div
            className={modalStyles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={modalStyles.closeButton}
              onClick={() => setShowModal(false)}
            >
              X
            </button>
            <h3>Novo Produto</h3>
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
          onClick={() => setShowLoteModal(false)}
        >
          <div
            className={modalStyles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={modalStyles.closeButton}
              onClick={() => setShowLoteModal(false)}
            >
              X
            </button>
            <h3>Novo Lote</h3>
            <div className={modalStyles.formGrid}>
              {[
                { label: "Número do lote", name: "numero_lote" },
                {
                  label: "Data de fabricação",
                  name: "data_fabricacao",
                  type: "date",
                },
                { label: "Validade", name: "validade", type: "date" },
                {
                  label: "Quantidade inicial",
                  name: "quantidade_inicial",
                  type: "number",
                },
                {
                  label: "Custo unitário",
                  name: "custo_unitario",
                  type: "number",
                },
                { label: "Fabricante", name: "fabricante" },
                { label: "Localização física", name: "localizacao_fisica" },
                { label: "Status", name: "status" },
              ].map(({ label, name, type = "text" }) => (
                <div key={name} className={modalStyles.fieldWrapper}>
                  <label className={modalStyles.label}>{label}</label>
                  <input
                    name={name}
                    type={type}
                    className={modalStyles.input}
                    value={(newLote as any)[name]}
                    onChange={(e) =>
                      setNewLote((prev) => ({
                        ...prev,
                        [name]:
                          type === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                      }))
                    }
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
    </ProtectedRoute>
  );
};

export default Medicamentos;
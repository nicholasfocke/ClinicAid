import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/farmacia/farmacia.module.css';
import tableStyles from '@/styles/admin/farmacia/medicamentos.module.css';
import modalStyles from '@/styles/admin/farmacia/modalMedicamento.module.css';
import { buscarMedicamentos, criarMedicamento, excluirMedicamento, atualizarMedicamento, MedicamentoData } from '@/functions/medicamentosFunctions';
import { format } from 'date-fns';

interface Medicamento extends MedicamentoData {
  id: string;
  selected?: boolean;
}

interface User {
  uid: string;
  email: string;
}

const formasFarmaceuticas = [
  'Comprimido',
  'Cápsula',
  'Solução oral',
  'Xarope',
  'Injetável',
  'Pomada',
  'Creme',
  'Suspensão',
  'Gotas',
  'Spray',
  'Supositório',
  'Adesivo transdérmico',
];

const unidades = [
  'mg',
  'g',
  'mL',
  'UI',
  'mcg',
  '%',
  'gotas',
  'ampola',
  'dose',
];

const viasAdministracao = [
  'Oral',
  'Tópica',
  'Intravenosa',
  'Intramuscular',
  'Subcutânea',
  'Inalatória',
  'Ocular',
  'Retal',
  'Vaginal',
  'Nasal',
  'Sublingual',
];

const tiposReceita = [
  'Branca Comum',
  'Branca Especial',
  'Azul (Receita B)',
  'Amarela (Receita A)',
  'Receita C1',
  'Receita C2',
  'Receita C3',
  'Sem necessidade de receita',
];

const classificacoes = [
  'Analgésico',
  'Antibiótico',
  'Anti-inflamatório',
  'Antialérgico',
  'Antidepressivo',
  'Anticonvulsivante',
  'Antipirético',
  'Anticoagulante',
  'Antipsicótico',
  'Anti-hipertensivo',
  'Antidiabético',
];

const Medicamentos = () => {
  const [user, setUser] = useState<User | null>(null);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const [formData, setFormData] = useState<Partial<MedicamentoData>>({
    nome_comercial: '',
    quantidade: 0,
    valor: 0,
    lote: '',
    validade: '',
  });

  const [showModal, setShowModal] = useState(false);
  const [newMedicamento, setNewMedicamento] = useState<MedicamentoData>({
    nome_comercial: '',
    dcb: '',
    quantidade: 0,
    valor: 0,
    lote: '',
    validade: '',
    forma_farmaceutica: '',
    concentracao: '',
    unidade: '',
    via_administracao: '',
    fabricante: '',
    registro_anvisa: '',
    controlado: false,
    tipo_receita: '',
    classificacao: '',
    descricao: '',
  });

  const selectedIds = medicamentos.filter(m => m.selected).map(m => m.id);
  const allSelected = medicamentos.length > 0 && selectedIds.length === medicamentos.length;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({ uid: currentUser.uid, email: currentUser.email || '' });
      } else {
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchMedicamentos = async () => {
      try {
        const docs = await buscarMedicamentos();
        const lista = docs.map(d => ({ ...d, selected: false })) as Medicamento[];
        setMedicamentos(lista);
      } catch (err) {
        setError('Erro ao buscar medicamentos.');
      }
    };
    fetchMedicamentos();
  }, []);

  const filtered = medicamentos.filter(m =>
    m.nome_comercial.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEdit = (m: Medicamento) => {
    setEditingId(m.id);
    setFormData({
      nome_comercial: m.nome_comercial,
      quantidade: m.quantidade,
      valor: m.valor,
      lote: m.lote,
      validade: m.validade,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const saveEdit = async (id: string) => {
    try {
      await atualizarMedicamento(id, formData);
      setMedicamentos(prev => prev.map(m => (m.id === id ? { ...m, ...(formData as MedicamentoData) } : m)));
      setEditingId(null);
    } catch (err) {
      setError('Erro ao atualizar.');
    }
  };

  const cancelEdit = () => setEditingId(null);

  const handleNewChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setNewMedicamento(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleNewTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewMedicamento(prev => ({ ...prev, [name]: value }));
  };

  const createMedicamento = async () => {
    if (!newMedicamento.nome_comercial.trim()) {
      setError('O nome do medicamento é obrigatório.');
      return;
    }
    try {
      await criarMedicamento(newMedicamento);
      setMedicamentos(prev => [
        ...prev,
        { id: Date.now().toString(), ...newMedicamento, selected: false } as Medicamento,
      ]);
      setShowModal(false);
      setNewMedicamento({
        nome_comercial: '',
        quantidade: 0,
        valor: 0,
        lote: '',
        validade: '',
        dcb: '',
        forma_farmaceutica: '',
        concentracao: '',
        unidade: '',
        via_administracao: '',
        fabricante: '',
        registro_anvisa: '',
        controlado: false,
        tipo_receita: '',
        classificacao: '',
        descricao: '',
      });
      setError('');
    } catch (err) {
      setError('Erro ao criar medicamento.');
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = window.confirm('Deseja excluir este medicamento?');
    if (!confirm) return;
    await excluirMedicamento(id);
    setMedicamentos(prev => prev.filter(m => m.id !== id));
  };

  const toggleSelect = (id: string) => {
    setMedicamentos(prev =>
      prev.map(m => (m.id === id ? { ...m, selected: !m.selected } : m))
    );
  };

  const toggleSelectAll = () => {
    setMedicamentos(prev =>
      prev.map(m => ({ ...m, selected: !allSelected }))
    );
  };

  const deleteSelected = async () => {
    const confirm = window.confirm('Deseja excluir os medicamentos selecionados?');
    if (!confirm) return;
    for (const id of selectedIds) {
      await excluirMedicamento(id);
    }
    setMedicamentos(prev => prev.filter(m => !selectedIds.includes(m.id)));
  };

  const isExpired = (date: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
  <ProtectedRoute>
    <div className={layoutStyles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Gestão de Farmácias &gt; </span>
          <span className={breadcrumbStyles.breadcrumbActive}>Medicamentos</span>
        </span>
      </div>
      <h1 className={tableStyles.titleMedicamentos}>Medicamentos</h1>
      <div className={tableStyles.subtitleMedicamentos}>Gerencie os medicamentos cadastrados</div>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      <div className={tableStyles.topBar}>
        <div className={tableStyles.actionButtonsWrapper}>
          <button className={tableStyles.buttonAdicionar} onClick={() => setShowModal(true)}>
            + Adicionar medicamento
          </button>
          {selectedIds.length > 0 && (
            <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={deleteSelected}>
              Excluir selecionados
            </button>
          )}
        </div>
        <div className={tableStyles.searchContainer}>
          <input
            type="text"
            placeholder="🔍 Pesquisar medicamento"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={tableStyles.searchInput}
          />
        </div>
      </div>

      <div className={tableStyles.medicamentosTableWrapper}>
        <table className={tableStyles.medicamentosTable}>
          <thead>
            <tr>
              <th className={tableStyles.checkboxHeader}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              </th>
              <th>NOME</th>
              <th>ESTOQUE</th>
              <th>VALOR</th>
              <th>LOTE</th>
              <th>VALIDADE</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id}>
                <td className={tableStyles.checkboxCell}>
                  <input type="checkbox" checked={m.selected || false} onChange={() => toggleSelect(m.id)} />
                </td>
                {editingId === m.id ? (
                  <>
                    <td><input name="nome_comercial" value={formData.nome_comercial} onChange={handleChange} /></td>
                    <td><input name="quantidade" type="number" value={formData.quantidade} onChange={handleChange} /></td>
                    <td><input name="valor" type="number" value={formData.valor} onChange={handleChange} /></td>
                    <td><input name="lote" value={formData.lote} onChange={handleChange} /></td>
                    <td><input name="validade" type="date" value={formData.validade} onChange={handleChange} /></td>
                    <td>
                      <button className={tableStyles.buttonAcao} onClick={() => saveEdit(m.id)}>Salvar</button>
                      <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={cancelEdit}>Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{m.nome_comercial}</td>
                    <td>{m.quantidade}</td>
                    <td>{Number(m.valor).toFixed(2)}</td>
                    <td>{m.lote}</td>
                    <td className={isExpired(m.validade) ? tableStyles.expired : ''}>
                      {m.validade ? format(new Date(m.validade), 'dd/MM/yyyy') : ''}
                    </td>
                    <td>
                      <button className={tableStyles.buttonAcao} onClick={() => startEdit(m)}>Editar</button>
                      <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={() => handleDelete(m.id)}>Excluir</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {showModal && (
      <div className={modalStyles.overlay} onClick={() => setShowModal(false)}>
        <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
          <button className={modalStyles.closeButton} onClick={() => setShowModal(false)}>X</button>
          <h3>Novo Medicamento</h3>
          <div className={modalStyles.formGrid}>
            {[
              { label: 'Nome Comercial', name: 'nome_comercial' },
              { label: 'DCB', name: 'dcb' },
              { label: 'Quantidade', name: 'quantidade', type: 'number' },
              { label: 'Valor', name: 'valor', type: 'number' },
              { label: 'Lote', name: 'lote' },
              { label: 'Validade', name: 'validade', type: 'date' },
              { label: 'Concentração', name: 'concentracao' },
              { label: 'Fabricante', name: 'fabricante' },
              { label: 'Registro ANVISA', name: 'registro_anvisa' },
            ].map(({ label, name, type = 'text' }) => (
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
              { label: 'Forma Farmacêutica', name: 'forma_farmaceutica', options: formasFarmaceuticas },
              { label: 'Unidade', name: 'unidade', options: unidades },
              { label: 'Via de Administração', name: 'via_administracao', options: viasAdministracao },
              { label: 'Tipo de Receita', name: 'tipo_receita', options: tiposReceita },
              { label: 'Classificação', name: 'classificacao', options: classificacoes },
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
                    <option key={o} value={o}>{o}</option>
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
              <label className={modalStyles.label}>Controlado</label>
            </div>

            <div className={modalStyles.fieldWrapper} style={{ gridColumn: 'span 3' }}>
              <label className={modalStyles.label}>Descrição</label>
              <textarea
                name="descricao"
                className={modalStyles.textarea}
                value={newMedicamento.descricao}
                onChange={handleNewTextAreaChange}
              />
            </div>
          </div>

          <button className={modalStyles.buttonSalvar} onClick={createMedicamento}>Salvar</button>
        </div>
      </div>
    )}
  </ProtectedRoute>
);}

export default Medicamentos;
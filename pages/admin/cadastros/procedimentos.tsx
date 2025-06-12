import { useEffect, useState } from 'react';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/medico/medicos.module.css';
import tableStyles from '@/styles/admin/procedimento/procedimentos.module.css';
import modalStyles from '@/styles/admin/procedimento/novoProcedimentoModal.module.css';
import { buscarProcedimentos, criarProcedimento, excluirProcedimento, atualizarProcedimento,ProcedimentoData, } from '@/functions/procedimentosFunctions';

interface Procedimento extends ProcedimentoData {
  id: string;
}

const formatValor = (valor: number) => {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const Procedimentos = () => {
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProcedimentoData>({
    nome: '',
    valor: 0,
    duracao: 0,
    convenio: false,
    tipo: 'consulta',
  });
  const [newProc, setNewProc] = useState<ProcedimentoData>({
    nome: '',
    valor: 0,
    duracao: 0,
    convenio: false,
    tipo: 'consulta',
  });
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'todos' | 'consultas' | 'exames'>('todos');

  useEffect(() => {
    const fetchData = async () => {
      const docs = await buscarProcedimentos();
      setProcedimentos(docs as Procedimento[]);
    };
    fetchData();
  }, []);

  const filteredProcedimentos = procedimentos.filter(p => {
    if (activeTab === 'consultas') return p.tipo === 'consulta';
    if (activeTab === 'exames') return p.tipo === 'exame';
    return true;
  });

  const startEdit = (p: Procedimento) => {
    setEditingId(p.id);
    setFormData({ nome: p.nome, valor: p.valor, duracao: p.duracao, convenio: p.convenio, tipo: p.tipo });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'valor' || name === 'duracao' ? Number(value) : value,
    }));
  };

  const saveEdit = async (id: string) => {
    const nomeTrim = formData.nome.trim();
    if(!nomeTrim){
      setError('O nome do procedimento não pode estar vazio.');
      return;
    }

    await atualizarProcedimento(id, formData);
    setProcedimentos(prev => prev.map(p => (p.id === id ? { id, ...formData } : p)));
    setEditingId(null);
    setError(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleNewChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setNewProc(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'valor' || name === 'duracao' ? Number(value) : value,
    }));
  };

  const createProcedimento = async () => {
    const nomeTrim = newProc.nome.trim();
    if(!nomeTrim){
      setError('O nome do procedimento não pode estar vazio.');
      return;
    }


    await criarProcedimento(newProc);
    setProcedimentos(prev => [...prev, { id: Date.now().toString(), ...newProc }]);
    setShowModal(false);
    setNewProc({ nome: '', valor: 0, duracao: 0, convenio: false, tipo: 'consulta' });
    setError(null);
  };

  const handleDelete = async (id: string) => {
    const confirm = window.confirm('Deseja excluir este procedimento?');
    if (!confirm) return;
    await excluirProcedimento(id);
    setProcedimentos(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className={layoutStyles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Cadastros &gt; </span>
          <span className={breadcrumbStyles.breadcrumbActive}>Procedimentos</span>
        </span>
      </div>
      <h1 className={layoutStyles.titleMedicos}>Procedimentos</h1>
      <div className={layoutStyles.subtitleMedicos}>Lista de procedimentos cadastrados</div>
      {error && (<p style={{ color: 'red', marginTop: '10px' }}>{error}</p>)}
      <div className={tableStyles.tabsWrapper}>
        <button
          className={`${tableStyles.tabButton} ${activeTab === 'todos' ? tableStyles.activeTab : ''}`}
          onClick={() => setActiveTab('todos')}
        >
          Todos
        </button>
        <button
          className={`${tableStyles.tabButton} ${activeTab === 'consultas' ? tableStyles.activeTab : ''}`}
          onClick={() => setActiveTab('consultas')}
        >
          Consultas
        </button>
        <button
          className={`${tableStyles.tabButton} ${activeTab === 'exames' ? tableStyles.activeTab : ''}`}
          onClick={() => setActiveTab('exames')}
        >
          Exames
        </button>
      </div>
      <div className={layoutStyles.actionButtonsWrapper}>
        <button className={layoutStyles.buttonAdicionar} onClick={() => setShowModal(true)}>
          + Adicionar procedimento
        </button>
      </div>
      <div className={tableStyles.procedimentosTableWrapper}>
        <table className={tableStyles.procedimentosTable}>
          <thead>
            <tr>
              <th>NOME</th>
              <th>VALOR</th>
              <th>DURAÇÃO (min)</th>
              <th>CONVÊNIO</th>
              <th>TIPO</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredProcedimentos.map(p => (
              <tr key={p.id}>
                {editingId === p.id ? (
                  <>
                    <td>
                      <input name="nome" value={formData.nome} onChange={handleChange} className={tableStyles.inputEdit} />
                    </td>
                    <td>
                      <input type="number" name="valor" value={formData.valor} onChange={handleChange} className={tableStyles.inputEdit} />
                    </td>
                    <td>
                      <input type="number" name="duracao" value={formData.duracao} onChange={handleChange} className={tableStyles.inputEdit} />
                    </td>
                    <td>
                      <input type="checkbox" name="convenio" checked={formData.convenio} onChange={handleChange} />
                    </td>
                    <td>
                      <select name="tipo" value={formData.tipo} onChange={handleChange} className={tableStyles.inputEdit}>
                        <option value="consulta">Consulta</option>
                        <option value="exame">Exame</option>
                      </select>
                    </td>
                    <td>
                      <button className={tableStyles.buttonAcao} onClick={() => saveEdit(p.id)}>Salvar</button>
                      <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={cancelEdit}>
                        Cancelar
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{p.nome}</td>
                    <td>{formatValor(p.valor)}</td>
                    <td>{p.duracao}</td>
                    <td>{p.convenio ? 'Sim' : 'Não'}</td>
                    <td>
                      <span
                        className={`${tableStyles.tipoQuad} ${
                          p.tipo === 'exame' ? tableStyles.exame : tableStyles.consulta
                        }`}
                      ></span>
                      {p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1)}
                    </td>
                    <td>
                      <button className={tableStyles.buttonAcao} onClick={() => startEdit(p)}>
                        Editar
                      </button>
                      <button
                        className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`}
                        onClick={() => handleDelete(p.id)}
                      >
                        Excluir
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className={modalStyles.overlay} onClick={() => setShowModal(false)}>
          <div className={modalStyles.modal} onClick={e => e.stopPropagation()}>
            <button className={modalStyles.closeButton} onClick={() => setShowModal(false)}>
              X
            </button>
            <h3>Novo Procedimento</h3>
            <label className={modalStyles.label}>Nome</label>
            <input
              name="nome"
              className={modalStyles.input}
              value={newProc.nome}
              onChange={handleNewChange}
            />
            <label className={modalStyles.label}>Valor</label>
            <input
              type="number"
              name="valor"
              className={modalStyles.input}
              value={newProc.valor}
              onChange={handleNewChange}
            />
            <label className={modalStyles.label}>Duração (minutos)</label>
            <input
              type="number"
              name="duracao"
              className={modalStyles.input}
              value={newProc.duracao}
              onChange={handleNewChange}
            />
            <label className={modalStyles.label}>Convênio?</label>
            <input
              type="checkbox"
              name="convenio"
              checked={newProc.convenio}
              onChange={handleNewChange}
            />
            <label className={modalStyles.label}>Tipo</label>
            <select name="tipo" className={modalStyles.input} value={newProc.tipo} onChange={handleNewChange}>
              <option value="consulta">Consulta</option>
              <option value="exame">Exame</option>
            </select>
            <button className={modalStyles.buttonSalvar} onClick={createProcedimento}>
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Procedimentos;
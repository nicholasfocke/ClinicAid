import { useEffect, useState } from 'react';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/medicos.module.css';
import tableStyles from '@/styles/admin/convenios.module.css';
import modalStyles from '@/styles/admin/novoConvenioModal.module.css';
import { buscarConvenios, excluirConvenio, atualizarConvenio, criarConvenio } from '@/functions/conveniosFunctions';

interface Convenio {
  id: string;
  nome: string;
  numeroPacientes: number;
  comissao: number;
  telefone?: string;
}

const formatTelefone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
};

const Convenios = () => {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ nome: string; numeroPacientes: number; comissao: number; telefone: string }>({
    nome: '',
    numeroPacientes: 0,
    comissao: 0,
    telefone: '',
  });

  const [showModal, setShowModal] = useState(false);
  const [newConvenio, setNewConvenio] = useState<{ nome: string; comissao: number; telefone: string }>({
    nome: '',
    comissao: 0,
    telefone: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      const docs = await buscarConvenios();
      setConvenios(docs as Convenio[]);
    };
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    const confirm = window.confirm('Deseja excluir este convênio?');
    if (!confirm) return;
    await excluirConvenio(id);
    setConvenios(prev => prev.filter(c => c.id !== id));
  };

  const startEdit = (c: Convenio) => {
    setEditingId(c.id);
    setFormData({ nome: c.nome, numeroPacientes: c.numeroPacientes, comissao: c.comissao, telefone: c.telefone || '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value: raw } = e.target;
    let value = raw;

    if (name === 'telefone') {
      value = formatTelefone(raw);
    }
    setFormData(prev => ({ ...prev, [name]: name === 'numeroPacientes' || name === 'comissao' ? Number(value) : value }));
  };

const saveEdit = async (id: string) => {
  const nomeTrim = formData.nome.trim();
  if (!nomeTrim || /^\d+$/.test(nomeTrim)) {
    setError('O nome do convênio não pode ser vazio nem apenas números');
    return;  // <-- impede de continuar
  } 

    await atualizarConvenio(id, formData);
    setConvenios(prev => prev.map(c => (c.id === id ? { id, ...formData } : c)));
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleNewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value: raw } = e.target;
    let value = raw;

    if (name === 'telefone') {
      value = formatTelefone(raw);
    }

    setNewConvenio(prev => ({ ...prev, [name]: name === 'comissao' ? Number(value) : value }));
  }

  const createConvenio = async () => {
    const nomeTrim = newConvenio.nome.trim();
    if (!nomeTrim || /^\d+$/.test(nomeTrim)) {
      setError('O nome do convênio não pode ser vazio nem apenas números');
      return;  // <-- impede de continuar
    }

    await criarConvenio({ nome: newConvenio.nome, numeroPacientes: 0, comissao: newConvenio.comissao, telefone: newConvenio.telefone });
    setConvenios(prev => [...prev, { id: Date.now().toString(), numeroPacientes: 0, ...newConvenio }]);
    setShowModal(false);
    setNewConvenio({ nome: '', comissao: 0, telefone: '' });
  };


  return (
    <>
    <div className={layoutStyles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Cadastros &gt; </span>
          <span className={breadcrumbStyles.breadcrumbActive}>Convênios</span>
        </span>
      </div>
        <h1 className={tableStyles.titleConvenios}>Convênios</h1>
      <div className={tableStyles.subtitleConvenios}>Lista de convênios cadastrados</div>
      <div className={tableStyles.actionButtonsWrapper}>
        <button className={tableStyles.buttonAdicionar} onClick={() => setShowModal(true)}>+ Adicionar convênio</button>
      </div>

      <div className={tableStyles.conveniosTableWrapper}>
        <table className={tableStyles.conveniosTable}>
          <thead>
            <tr>
              <th>CONVÊNIO</th>
              <th>PACIENTES</th>
              <th>COMISSÃO (%)</th>
              <th>TELEFONE</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {convenios.map(c => (
              <tr key={c.id}>
                {editingId === c.id ? (
                  <>
                    <td>
                      <input name="nome" value={formData.nome} onChange={handleChange} />
                    </td>
                    <td>
                      <input name="numeroPacientes" type="number" value={formData.numeroPacientes} onChange={handleChange} />
                    </td>
                    <td>
                      <input name="comissao" type="number" step="0.01" value={formData.comissao} onChange={handleChange} />
                    </td>
                    <td>
                      <input name="telefone" value={formData.telefone} onChange={handleChange} />
                    </td>
                    <td>
                      <button className={tableStyles.buttonAcao} onClick={() => saveEdit(c.id)}>Salvar</button>
                      <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={cancelEdit}>Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{c.nome}</td>
                    <td>{c.numeroPacientes}</td>
                    <td>{c.comissao}</td>
                    <td>{c.telefone || '-'}</td>
                    <td>
                      <button className={tableStyles.buttonAcao} onClick={() => startEdit(c)}>Editar</button>
                      <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={() => handleDelete(c.id)}>Excluir</button>
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
        <div className={modalStyles.modal} onClick={e => e.stopPropagation()}>
          <button className={modalStyles.closeButton} onClick={() => setShowModal(false)}>X</button>
          <h3>Novo Convênio</h3>
          <input
            name="nome"
            className={modalStyles.input}
            placeholder="Nome do convênio"
            value={newConvenio.nome}
            onChange={handleNewChange}
          />
          <input
            name="comissao"
            type="number"
            step="0.01"
            className={modalStyles.input}
            placeholder="Comissão (%)"
            value={newConvenio.comissao}
            onChange={handleNewChange}
          />
          <input
            name="telefone"
            className={modalStyles.input}
            placeholder="Telefone"
            value={newConvenio.telefone}
            onChange={handleNewChange}
          />
          <button className={modalStyles.buttonSalvar} onClick={createConvenio}>Salvar</button>
        </div>
      </div>
    )}
    </>
  );
};

export default Convenios;
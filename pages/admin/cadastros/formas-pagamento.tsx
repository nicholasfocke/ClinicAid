import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/medico/medicos.module.css';
import tableStyles from '@/styles/admin/cadastros/formapagamentos/formasPagamento.module.css';
import modalStyles from '@/styles/admin/cadastros/formapagamentos/novoFormaPagamentoModal.module.css';
import { buscarFormasPagamento, criarFormaPagamento, excluirFormaPagamento, atualizarFormaPagamento, } from '@/functions/formasPagamentosFunctions';

interface FormaPagamento {
  id: string;
  nome: string;
  taxa: number;
}

interface User {
  uid: string;
  email: string;
}

const FormasPagamento = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ nome: string; taxa: number }>({ nome: '', taxa: 0 });
  const [newForma, setNewForma] = useState<{ nome: string; taxa: number }>({ nome: '', taxa: 0 });
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      try {
        if (currentUser) {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email || '',
          });
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setError('Erro ao verificar autenticação.');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchData = async () => {
      const docs = await buscarFormasPagamento();
      setFormas(docs as FormaPagamento[]);
    };
    fetchData();
  }, []);

  const startEdit = (f: FormaPagamento) => {
    setEditingId(f.id);
    setFormData({ nome: f.nome, taxa: f.taxa });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'taxa' ? Number(value) : value }));
  };

  const saveEdit = async (id: string) => {
    const nomeTrim = formData.nome.trim();
    if (!nomeTrim) {
      setError('O nome não pode estar vazio.');
      return;
    }
    await atualizarFormaPagamento(id, { nome: nomeTrim, taxa: formData.taxa });
    setFormas(prev => prev.map(f => (f.id === id ? { id, ...formData } : f)));
    setEditingId(null);
    setError(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleNewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewForma(prev => ({ ...prev, [name]: name === 'taxa' ? Number(value) : value }));
  };

  const createForma = async () => {
    const nomeTrim = newForma.nome.trim();
    if (!nomeTrim) {
      setError('O nome não pode estar vazio.');
      return;
    }
    await criarFormaPagamento({ nome: nomeTrim, taxa: newForma.taxa });
    setFormas(prev => [...prev, { id: Date.now().toString(), nome: nomeTrim, taxa: newForma.taxa }]);
    setShowModal(false);
    setNewForma({ nome: '', taxa: 0 });
    setError(null);
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('Deseja excluir esta forma de pagamento?');
    if (!confirmDelete) return;
    await excluirFormaPagamento(id);
    setFormas(prev => prev.filter(f => f.id !== id));
  };

  return (
    <>
      <div className={layoutStyles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Cadastros &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Formas de pagamentos</span>
          </span>
        </div>
        <h1 className={tableStyles.titleFormasPagamento}>Formas de Pagamento</h1>
        <div className={tableStyles.subtitleFormasPagamento}>Lista de formas de pagamento cadastradas</div>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        <div className={layoutStyles.actionButtonsWrapper}>
          <button className={layoutStyles.buttonAdicionar} onClick={() => setShowModal(true)}>
            + Adicionar forma de pagamento
          </button>
        </div>
        <div className={tableStyles.formasPagamentoTableWrapper}>
          <table className={tableStyles.formasPagamentoTable}>
            <thead>
              <tr>
                <th>NOME</th>
                <th>TAXA (%)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {formas.map(f => (
                <tr key={f.id}>
                  {editingId === f.id ? (
                    <>
                      <td>
                        <input name="nome" value={formData.nome} onChange={handleChange} />
                      </td>
                      <td>
                        <input name="taxa" type="number" step="0.01" value={formData.taxa} onChange={handleChange} />
                      </td>
                      <td>
                        <button className={tableStyles.buttonAcao} onClick={() => saveEdit(f.id)}>Salvar</button>
                        <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={cancelEdit}>Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{f.nome}</td>
                      <td>{f.taxa}</td>
                      <td>
                        <button className={tableStyles.buttonAcao} onClick={() => startEdit(f)}>
                          Editar
                        </button>
                        <button
                          className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`}
                          onClick={() => handleDelete(f.id)}
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
      </div>
      {showModal && (
        <div className={modalStyles.overlay} onClick={() => setShowModal(false)}>
          <div className={modalStyles.modal} onClick={e => e.stopPropagation()}>
            <button className={modalStyles.closeButton} onClick={() => setShowModal(false)}>
              X
            </button>
            <h3>Nova Forma de Pagamento</h3>
            <label htmlFor="nome" className={modalStyles.label}>Nome</label>
            <input
              name="nome"
              className={modalStyles.input}
              value={newForma.nome}
              onChange={handleNewChange}
            />
            <label htmlFor="taxa" className={modalStyles.label}>Taxa (%)</label>
            <input
              name="taxa"
              type="number"
              step="0.01"
              className={modalStyles.input}
              value={newForma.taxa}
              onChange={handleNewChange}
            />
            <button className={modalStyles.buttonSalvar} onClick={createForma}>Salvar</button>
          </div>
        </div>
      )}
    </>
  );
};

export default FormasPagamento;
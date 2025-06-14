import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/medico/medicos.module.css';
import tableStyles from '@/styles/admin/cadastros/remedios/remedios.module.css';
import modalStyles from '@/styles/admin/cadastros/remedios/novoRemedioModal.module.css';
import { buscarRemedios, criarRemedio, excluirRemedio, atualizarRemedio } from '@/functions/remediosFunctions';

interface Remedio {
    id: string;
    nome: string;
    quantidade: number;
    dosagem: string;
    uso: string;
}

interface User {
    uid: string;
    email: string;
}

const Remedios = () => {
    const [error, setError] = useState('');
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [remedios, setRemedios] = useState<Remedio[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<{ nome: string; quantidade: number; dosagem: string; uso: string }>({
        nome: '',
        quantidade: 0,
        dosagem: '',
        uso: '',
    });
    const [showModal, setShowModal] = useState(false);
    const [newRemedio, setNewRemedio] = useState<{ nome: string; quantidade: number; dosagem: string; uso: string }>({
        nome: '',
        quantidade: 0,
        dosagem: '',
        uso: '',
    });

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
        const fetchRemedios = async () => {
            try {
                const docs = await buscarRemedios();
                setRemedios(docs as Remedio[]);
            } catch (error) {
                console.error('Erro ao buscar remédios:', error);
                setError('Erro ao buscar remédios.');
            }
        };

        fetchRemedios();
    }, []);

    const startEdit = (r: Remedio) => {
        setEditingId(r.id);
        setFormData({ nome: r.nome, quantidade: r.quantidade, dosagem: r.dosagem, uso: r.uso, });
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'quantidade' ? Number(value): value }));
    };


    const saveEdit = async (id: string) => {
        const nomeTrim = formData.nome.trim();
        if(!nomeTrim) {
            setError('O nome do remédio não pode estar vazio.');
            return;
        }

        await atualizarRemedio(id, { ...formData, nome: nomeTrim});
        setRemedios(prev => prev.map(r => (r.id === id ? { ...r, ...formData } : r)));
        setEditingId(null);
        setError('');
    };

    const cancelEdit = () => setEditingId(null);
    
    const handleNewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewRemedio(prev => ({ ...prev, [name]: name === 'quantidade' ? Number(value) : value }));
    };

    const createRemedio = async () => {
        const nomeTrim = newRemedio.nome.trim();
        if (!nomeTrim) {
            setError('O nome do remédio não pode estar vazio.');
            return;
        }

        await criarRemedio({ ...newRemedio, nome: nomeTrim });
        setRemedios(prev => [ ...prev, {id : Date.now().toString(), ...newRemedio, nome: nomeTrim}]);
        setShowModal(false);
        setNewRemedio({ nome: '', quantidade: 0, dosagem: '', uso: '' });
        setError('');
    };

    const handleDelete = async (id: string) => {
        const confirmDelete = confirm('Tem certeza que deseja excluir este remédio?');
        if (!confirmDelete) return;
        await excluirRemedio(id);
        setRemedios(prev => prev.filter(r => r.id !== id));
    };

    return(
    <>
      <div className={layoutStyles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Cadastros &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Remédios</span>
          </span>
        </div>
        <h1 className={tableStyles.titleRemedios}>Remédios</h1>
        <div className={tableStyles.subtitleRemedios}>Lista de remédios cadastrados</div>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        <div className={tableStyles.actionButtonsWrapper}>
          <button className={tableStyles.buttonAdicionar} onClick={() => setShowModal(true)}>+ Adicionar remédio</button>
        </div>
        <div className={tableStyles.remediosTableWrapper}>
          <table className={tableStyles.remediosTable}>
            <thead>
              <tr>
                <th>NOME</th>
                <th>QUANTIDADE</th>
                <th>DOSAGEM</th>
                <th>USO</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {remedios.map(r => (
                <tr key={r.id}>
                  {editingId === r.id ? (
                    <>
                      <td><input name="nome" value={formData.nome} onChange={handleChange} /></td>
                      <td><input name="quantidade" type="number" value={formData.quantidade} onChange={handleChange} /></td>
                      <td><input name="dosagem" value={formData.dosagem} onChange={handleChange} /></td>
                      <td><input name="uso" value={formData.uso} onChange={handleChange} /></td>
                      <td>
                        <button className={tableStyles.buttonAcao} onClick={() => saveEdit(r.id)}>Salvar</button>
                        <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={cancelEdit}>Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{r.nome}</td>
                      <td>{r.quantidade}</td>
                      <td>{r.dosagem}</td>
                      <td>{r.uso}</td>
                      <td>
                        <button className={tableStyles.buttonAcao} onClick={() => startEdit(r)}>Editar</button>
                        <button className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`} onClick={() => handleDelete(r.id)}>Excluir</button>
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
            <h3>Novo Remédio</h3>
            <label className={modalStyles.label}>Nome</label>
            <input name="nome" className={modalStyles.input} value={newRemedio.nome} onChange={handleNewChange} />
            <label className={modalStyles.label}>Quantidade</label>
            <input name="quantidade" type="number" className={modalStyles.input} value={newRemedio.quantidade} onChange={handleNewChange} />
            <label className={modalStyles.label}>Dosagem</label>
            <input name="dosagem" className={modalStyles.input} value={newRemedio.dosagem} onChange={handleNewChange} />
            <label className={modalStyles.label}>Uso</label>
            <input name="uso" className={modalStyles.input} value={newRemedio.uso} onChange={handleNewChange} />
            <button className={modalStyles.buttonSalvar} onClick={createRemedio}>Salvar</button>
          </div>
        </div>
      )}
    </>
  );
};

export default Remedios;
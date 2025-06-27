import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/farmacia/farmacia.module.css';
import tableStyles from '@/styles/admin/farmacia/medicamentos.module.css';
import { buscarEntradasMedicamentos, excluirEntradaMedicamento, MovimentacaoMedicamento } from '@/functions/movimentacoesMedicamentosFunctions';
import { format } from 'date-fns';

interface User { uid: string; email: string; }

const EntradasMedicamentos = () => {
  const [user, setUser] = useState<User | null>(null);
  const [entradas, setEntradas] = useState<(MovimentacaoMedicamento & {id:string})[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

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
      const docs = await buscarEntradasMedicamentos();
      setEntradas(docs as any);
    };
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este registro?')) return;
    await excluirEntradaMedicamento(id);
    setEntradas(prev => prev.filter(e => e.id !== id));
  };

  const filtered = entradas.filter(e =>
    e.medicamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.usuario.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className={layoutStyles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Gestão de Farmácias &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Entrada de remédios</span>
          </span>
        </div>
        <h1 className={layoutStyles.titleFarmacia}>Entrada de Remédios</h1>
        <div className={layoutStyles.subtitleFarmacia}>Registros de entrada</div>
        <div className={tableStyles.searchContainer}>
          <input
            type="text"
            placeholder="🔍 Pesquisar"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={tableStyles.searchInput}
          />
        </div>
        <div className={tableStyles.medicamentosTableWrapper}>
          <table className={tableStyles.medicamentosTable}>
            <thead>
              <tr>
                <th>MEDICAMENTO</th>
                <th>QUANTIDADE</th>
                <th>MOTIVO</th>
                <th>DATA</th>
                <th>USUÁRIO</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td>{e.medicamento}</td>
                  <td>{e.quantidade}</td>
                  <td>{e.motivo}</td>
                  <td>{format(new Date(e.data), 'dd/MM/yyyy')}</td>
                  <td>{e.usuario}</td>
                  <td>
                    <button className={tableStyles.buttonExcluir} onClick={() => handleDelete(e.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default EntradasMedicamentos;

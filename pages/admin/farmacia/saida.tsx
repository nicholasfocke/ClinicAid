import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import layoutStyles from '@/styles/admin/farmacia/farmacia.module.css';
import tableStyles from '@/styles/admin/farmacia/medicamentos.module.css';
import { buscarSaidasMedicamentos, excluirSaidaMedicamento, MovimentacaoMedicamento } from '@/functions/movimentacoesMedicamentosFunctions';
import { format } from 'date-fns';

interface User { uid: string; email: string; }

const SaidasMedicamentos = () => {
  const [user, setUser] = useState<User | null>(null);
  const [saidas, setSaidas] = useState<(MovimentacaoMedicamento & {id:string})[]>([]);
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
      const docs = await buscarSaidasMedicamentos();
      setSaidas(docs as any);
    };
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este registro?')) return;
    await excluirSaidaMedicamento(id);
    setSaidas(prev => prev.filter(e => e.id !== id));
  };

  const filtered = saidas.filter(e =>
    e.medicamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.paciente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.profissional || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className={layoutStyles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Gestão de Farmácias &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Saída de remédios</span>
          </span>
        </div>
        <h1 className={layoutStyles.titleFarmacia}>Saída de Remédios</h1>
        <div className={layoutStyles.subtitleFarmacia}>Registros de saída</div>
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
                <th>PACIENTE</th>
                <th>PROFISSIONAL</th>
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
                  <td>{e.paciente || '-'}</td>
                  <td>{e.profissional || '-'}</td>
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

export default SaidasMedicamentos;

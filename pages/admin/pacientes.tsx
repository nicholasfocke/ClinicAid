import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, firestore } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/pacientes.module.css';
import { ExternalLink } from 'lucide-react';

interface Paciente {
  id: string;
  nome: string;
  email: string;
  cpf?: string;
  telefone?: string;
  convenio?: string;
  dataNascimento?: string;
}

interface User {
  uid: string;
  email: string;
}

const Pacientes = () => {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser({ uid: currentUser.uid, email: currentUser.email || '' });
      } else {
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchPacientes = async () => {
      try {
        const q = query(collection(firestore, 'users'), where('tipo', '==', 'cliente'));
        const snap = await getDocs(q);
        const lista: Paciente[] = snap.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            nome: data.nome || '',
            email: data.email || '',
            cpf: data.cpf || '',
            telefone: data.telefone || '',
            convenio: data.convenio || '',
            dataNascimento: data.dataNascimento || '',
          };
        });
        setPacientes(lista);
      } catch (err) {
        console.error('Erro ao buscar pacientes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPacientes();
  }, []);

  if (loading) {
    return <p>Carregando pacientes...</p>;
  }

  return (
    <div className={styles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumbActive}>Pacientes</span>
        </span>
      </div>
      <h1 className={styles.titlePacientes}>Pacientes</h1>
      <div className={styles.subtitlePacientes}>Lista de pacientes cadastrados</div>
      <div className={styles.pacientesTableWrapper}>
        <table className={styles.pacientesTable}>
          <thead>
            <tr>
              <th>NOME</th>
              <th>EMAIL</th>
              <th>CPF</th>
              <th>TELEFONE</th>
              <th>CONVÊNIO</th>
              <th>NASCIMENTO</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map(p => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{p.email}</td>
                <td>{p.cpf || '-'}</td>
                <td>{p.telefone || '-'}</td>
                <td>{p.convenio || '-'}</td>
                <td>{p.dataNascimento || '-'}</td>
                <td>
                  <button className={styles.externalLink} title="Ver detalhes">
                    <ExternalLink size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Pacientes;

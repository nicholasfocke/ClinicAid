import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
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
        // Busca todos os agendamentos confirmados
        const agsSnap = await getDocs(
          query(collection(firestore, 'agendamentos'), where('status', '==', 'confirmado'))
        );
        // Extrai os IDs dos usuários (usuarioId) dos agendamentos
        const userIdsSet = new Set<string>();
        agsSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (data.usuarioId) userIdsSet.add(data.usuarioId);
        });
        const userIds = Array.from(userIdsSet);

        // Busca os dados dos usuários que fizeram agendamento
        const lista: Paciente[] = [];
        for (const uid of userIds) {
          const userDoc = await getDoc(doc(firestore, 'users', uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            lista.push({
              id: userDoc.id,
              nome: data.nome || '',
              email: data.email || '',
              cpf: data.cpf || '',
              telefone: data.telefone || '',
              convenio: data.convenio || '',
              dataNascimento: data.dataNascimento || '',
            });
          }
        }
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

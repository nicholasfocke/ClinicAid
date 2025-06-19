import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import { buscarMedicos } from '@/functions/medicosFunctions';
import DoctorCard, { Medico } from '@/components/admin/DoctorCard';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/medico/medicos.module.css';
import Link from 'next/link';

interface User {
  uid: string;
  email: string;
}

const Medicos = () => {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // Novo estado para busca

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
    const fetchMedicos = async () => {
      try {
        const docs = await buscarMedicos();
        setMedicos(docs as Medico[]);
      } catch (err) {
        console.error('Erro ao buscar médicos:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMedicos();
  }, []);

  // Atualiza lista ao editar um profissional
  const handleUpdate = (m: Medico) => {
    setMedicos((prev) => prev.map((p) => (p.id === m.id ? m : p)));
  };

  // Filtro de busca por nome
  const filteredMedicos = medicos.filter((m) =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <p>Carregando profissionais...</p>;
  }

  return (
    <div className={styles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumbActive}>Profissionais</span>
        </span>
      </div>
      <h1 className={styles.titleMedicos}>Profissionais</h1>
      <div className={styles.subtitleMedicos}>Lista de profissionais cadastrados</div>
      {/* Botões e campo de busca alinhados */}
      <div className={styles.searchContainer}>
        <div className={styles.actionButtonsWrapper}>
          <Link href="/admin/profissionais/novo" className={styles.buttonAdicionar}>+ Adicionar médico</Link>
          <Link href="/admin/profissionais/horarios" className={styles.buttonAdicionar}>
            Dias/Horários
          </Link>
        </div>
        <input
          type="text"
          placeholder="🔍 Pesquisar profissional"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>
      <div className={styles.medicosList}>
        {filteredMedicos.map((med) => (
          <DoctorCard
            key={med.id}
            medico={med}
            onDelete={(id) =>
              setMedicos((prev) => prev.filter((m) => m.id !== id))
            }
            onUpdate={handleUpdate}
          />
        ))}
      </div>
    </div>
  );
};

export default Medicos;
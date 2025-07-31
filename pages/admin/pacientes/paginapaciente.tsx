import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/pacientes/paginapaciente.module.css';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';

const PaginaPaciente = () => {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, currentUser => {
        if (currentUser) {
            setUser(currentUser);
        } else {
            router.push('/auth/login');
        }
        });

        return () => unsubscribe();
    }, [router]);

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>Menu Principal &gt; </span>
          <span className={breadcrumbStyles.breadcrumbActive}>Pagina do paciente</span>
        </div>
        <h1 className={styles.title}>Pagina do paciente</h1>
        <div className={styles.subtitlePacientes}>Gerencie informações sobre os pacientes.</div>
      </div>
    </ProtectedRoute>
  );
}

export default PaginaPaciente;
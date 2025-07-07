import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/router';
import { auth } from '@/firebase/firebaseConfig';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/financeiro.module.css';

const Financeiro = () => {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className={styles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt;{' '}
          <span className={breadcrumbStyles.breadcrumbActive}>Financeiro</span>
        </span>
      </div>
      <h1 className={styles.titleFinanceiro}>Financeiro</h1>
      <p className={styles.subtitleFinanceiro}>
        Área destinada ao controle financeiro.
      </p>
    </div>
  );
};

export default Financeiro;

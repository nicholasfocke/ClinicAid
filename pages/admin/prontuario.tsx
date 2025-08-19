import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/prontuario/prontuario.module.css';

const Prontuario = () => (
  <ProtectedRoute>
    <div className={styles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt;{' '}
          <span className={breadcrumbStyles.breadcrumbActive}>Prontuário</span>
        </span>
      </div>
      <h1 className={styles.title}>Prontuário</h1>
      <h2 className={styles.subtitle}>
        Página de prontuários da clínica
      </h2>
    </div>
  </ProtectedRoute>
);

export default Prontuario;

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/tratamentos/tratamentos.module.css';

const Tratamentos = () => (
  <ProtectedRoute>
    <div className={styles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt;{' '}
          <span className={breadcrumbStyles.breadcrumbActive}>Tratamentos</span>
        </span>
      </div>
      <h1 className={styles.title}>Tratamentos</h1>
      <h2 className={styles.subtitle}>
        Controle de retornos e tratamentos dos pacientes
      </h2>
    </div>
  </ProtectedRoute>
);

export default Tratamentos;

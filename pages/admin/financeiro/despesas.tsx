import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/financeiro/financeiro.module.css';

const Despesas = () => (
  <ProtectedRoute>
    <div className={styles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Financeiro &gt; </span>
          <span className={breadcrumbStyles.breadcrumbActive}>Despesas</span>
        </span>
      </div>
      <h1 className={styles.titleFinanceiro}>Despesas</h1>
      <div className={styles.subtitleFinanceiro}>Controle as despesas da clínica</div>
    </div>
  </ProtectedRoute>
);

export default Despesas;

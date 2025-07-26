import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/financeiro/financeiro.module.css';

const ContasAReceber = () => (
  <ProtectedRoute>
    <div className={styles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Financeiro &gt; </span>
          <span className={breadcrumbStyles.breadcrumbActive}>Contas a Receber</span>
        </span>
      </div>
      <h1 className={styles.titleFinanceiro}>Contas a Receber</h1>
      <div className={styles.subtitleFinanceiro}>Gerencie as contas a receber da clínica</div>
    </div>
  </ProtectedRoute>
);

export default ContasAReceber;

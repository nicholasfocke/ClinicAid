import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/farmacia/farmacia.module.css';

const SaidaRemedios = () => {
  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Gestão de Farmácias &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Saída de remédios</span>
          </span>
        </div>
        <h1 className={styles.titleFarmacia}>Saída de Remédios</h1>
        <div className={styles.subtitleFarmacia}>Registre a saída de medicamentos</div>
      </div>
    </ProtectedRoute>
  );
};

export default SaidaRemedios;
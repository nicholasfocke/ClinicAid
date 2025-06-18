import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/farmacia/farmacia.module.css';

const EntradaRemedios = () => {
  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Gestão de Farmácias &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Entrada de remédios</span>
          </span>
        </div>
        <h1 className={styles.titleFarmacia}>Entrada de Remédios</h1>
        <div className={styles.subtitleFarmacia}>Registre a entrada de medicamentos</div>
      </div>
    </ProtectedRoute>
  );
};

export default EntradaRemedios;
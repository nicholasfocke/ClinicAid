import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/farmacia/farmacia.module.css';

const Medicamentos = () => {
  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Gestão de Farmácias &gt; </span>
            <span className={breadcrumbStyles.breadcrumbActive}>Medicamentos</span>
          </span>
        </div>
        <h1 className={styles.titleFarmacia}>Medicamentos</h1>
        <div className={styles.subtitleFarmacia}>Gerencie os medicamentos cadastrados</div>
      </div>
    </ProtectedRoute>
  );
};

export default Medicamentos;
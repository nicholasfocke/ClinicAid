import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/recepcao/recepcao.module.css';

const Recepcao = () => (
  <ProtectedRoute>
    <div className={styles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt;{' '}
          <span className={breadcrumbStyles.breadcrumbActive}>Recepção</span>
        </span>
      </div>
      <h1 className={styles.title}>Recepção</h1>
      <h2 className={styles.subtitle}>
        Controle de pacientes dentro da clínica
      </h2>

      <div className={styles.buttonContainer}>
        <button className={styles.registerButton}>+ Registrar chegada</button>
      </div>

      <div className={styles.cardsWrapper}>

        <div className={styles.cardLeft}>
          <h3 className={styles.cardTitle}>Em atendimento</h3>
        </div>

        <div className={styles.cardRight}>
          <h3 className={styles.cardTitle}>Em espera</h3>
        </div>

      </div>
    </div>
  </ProtectedRoute>
);

export default Recepcao;

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/notificacoes.module.css';

const Notificacoes = () => {
  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt;{' '}
            <span className={breadcrumbStyles.breadcrumbActive}>Notificações</span>
          </span>
        </div>
        <h1 className={styles.titleNotificacoes}>Notificações</h1>
        <p className={styles.subtitleNotificacoes}>
          Veja todas as suas notificações recentes
        </p>
        <div className={styles.notificationsSection}>
          <h2>Farmácia</h2>
          <ul className={styles.notificationsList}>
            <li>Entrada de medicamentos</li>
            <li>Saída de medicamentos</li>
            <li>Medicamento com validade próxima (ex.: menos de 30 dias)</li>
            <li>Medicamento vencido</li>
          </ul>
        </div>
        <div className={styles.notificationsSection}>
          <h2>Agendamentos</h2>
          <ul className={styles.notificationsList}>
            <li>Paciente não compareceu</li>
            <li>Nova consulta agendada</li>
            <li>Consulta cancelada</li>
          </ul>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Notificacoes;

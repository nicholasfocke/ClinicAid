import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/notificacoes.module.css';

const notificacoes = [
  {
    tipo: 'danger',
    texto: 'Pagamento pendente do convênio',
    tempo: 'Há 2 horas',
  },
  {
    tipo: 'danger',
    texto: 'Pagamento pendente do convênio',
    tempo: 'Há 2 horas',
  },
  {
    tipo: 'warning',
    texto: 'Medicamento Dipirona próximo da data de validade',
    tempo: 'Há 3 horas',
  },
  {
    tipo: 'success',
    texto: 'Pagamento recebido de Nicholas de Góis Focke',
    tempo: 'Há 4 hora',
  },
  {
    tipo: 'success',
    texto: 'Entrada registrada para o medicamento Dipirona',
    tempo: 'Há 3 dias',
  },
];

const iconByType = {
  danger: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" fill="#fff" />
      <path d="M12 7v5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="#ef4444" />
    </svg>
  ),
  warning: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="#fbbf24" strokeWidth="2" fill="#fff" />
      <path d="M12 7v5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="#fbbf24" />
    </svg>
  ),
  success: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" fill="#fff" />
      <path
        d="M8 12l2.5 2.5L16 9"
        stroke="#22c55e"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

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
        {/* Filtro */}
        <div className={styles.filterRow}>
          <select className={styles.filterSelect}>
            <option>Todas</option>
          </select>
        </div>
        {/* Lista de notificações */}
        <div className={styles.notificationsCard}>
          <ul className={styles.notificationsList}>
            {notificacoes.map((n, idx) => (
              <li className={styles.notificationItem} key={idx}>
                <span className={styles.notificationIcon}>
                  {iconByType[n.tipo as keyof typeof iconByType]}
                </span>
                <span className={styles.notificationText}>{n.texto}</span>
                <span className={styles.notificationTime}>{n.tempo}</span>
              </li>
            ))}
          </ul>
          {/* Paginação */}
          <div className={styles.pagination}>
            <button className={styles.paginationBtn} disabled>
              1
            </button>
            <button className={styles.paginationBtn}>&gt;</button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Notificacoes;

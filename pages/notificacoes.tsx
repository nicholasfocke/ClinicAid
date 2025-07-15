import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/notificacoes.module.css';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { buscarNotificacoes, NotificacaoData } from '@/functions/notificacoesFunctions';

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
  const [notificacoes, setNotificacoes] = useState<NotificacaoData[]>([]);

  useEffect(() => {
    const fetchNotificacoes = async () => {
      try {
        const list = await buscarNotificacoes();
        setNotificacoes(list);
      } catch {}
    };
    fetchNotificacoes();
  }, []);

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
          {notificacoes.length === 0 ? (
            <p className={styles.noNotifications}>Não há notificações</p>
          ) : (
            <>
              <ul className={styles.notificationsList}>
                {notificacoes.map((n, idx) => (
                  <li className={styles.notificationItem} key={idx}>
                    <span className={styles.notificationIcon}>
                      {iconByType[n.icone as keyof typeof iconByType]}
                    </span>
                    <span className={styles.notificationText}>{n.descricao}</span>
                    <span className={styles.notificationTime}>
                      {formatDistanceToNow(new Date(n.criadoEm), { addSuffix: true })}
                    </span>
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
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Notificacoes;

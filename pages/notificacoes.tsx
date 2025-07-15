import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/notificacoes.module.css';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buscarNotificacoes, NotificacaoData } from '@/functions/notificacoesFunctions';



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
                    <span
                      className={styles.notificationIcon}
                      style={{
                        background:
                          n.icone === 'red'
                            ? '#ef4444'
                            : n.icone === 'yellow'
                            ? '#fbbf24'
                            : n.icone === 'green'
                            ? '#22c55e'
                            : '#8b98a9',
                      }}
                    />
                    <span className={styles.notificationText}>{n.descricao}</span>
                    <span className={styles.notificationTime}>
                      {formatDistanceToNow(new Date(n.criadoEm), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
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

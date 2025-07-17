import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/notificacoes.module.css';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  buscarNotificacoes,
  NotificacaoData,
  marcarNotificacoesLidas,
  marcarNotificacoesRemovidas,
} from '@/functions/notificacoesFunctions';



const Notificacoes = () => {
  const [notificacoes, setNotificacoes] = useState<NotificacaoData[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchNotificacoes = async () => {
      try {
        const list = await buscarNotificacoes({ apenasNaoRemovidas: true });
        setNotificacoes(list);
      } catch {}
    };
    fetchNotificacoes();
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const marcarLidas = async () => {
    await marcarNotificacoesLidas(selectedIds);
    setNotificacoes(prev =>
      prev.map(n =>
        selectedIds.includes(n.id as string) ? { ...n, lida: true } : n
      )
    );
    setSelectedIds([]);
  };

  const removerSelecionadas = async () => {
    const confirm = window.confirm('Deseja remover as notificações selecionadas?');
    if (!confirm) return;
    await marcarNotificacoesRemovidas(selectedIds);
    setNotificacoes(prev => prev.filter(n => !selectedIds.includes(n.id as string)));
    setSelectedIds([]);
  };

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
        {selectedIds.length > 0 && (
          <div className={styles.actionsRow}>
            <button className={`${styles.actionButton} ${styles.buttonRemove}`} onClick={removerSelecionadas}>
              Remover selecionadas
            </button>
            <button className={`${styles.actionButton} ${styles.buttonRead}`} onClick={marcarLidas}>
              Marcar como lida
            </button>
          </div>
        )}
        {/* Lista de notificações */}
        <div className={styles.notificationsCard}>
          {notificacoes.length === 0 ? (
            <p className={styles.noNotifications}>Não há notificações</p>
          ) : (
            <>
              <ul className={styles.notificationsList}>
                {notificacoes.map((n, idx) => (
                  <li className={styles.notificationItem} key={n.id ?? idx}>
                    <input
                      type="checkbox"
                      className={styles.notificationCheckbox}
                      checked={selectedIds.includes(n.id as string)}
                      onChange={() => toggleSelect(n.id as string)}
                    />
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

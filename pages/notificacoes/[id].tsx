import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/pages/notificacoes/[id].module.css';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { buscarNotificacao, NotificacaoData } from '@/functions/notificacoesFunctions';

const NotificacaoDetalhes = () => {
  const router = useRouter();
  const { id } = router.query;
  const [notificacao, setNotificacao] = useState<NotificacaoData | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (typeof id === 'string') {
        const data = await buscarNotificacao(id);
        setNotificacao(data);
      }
    };
    fetch();
  }, [id]);

  if (!notificacao) {
    return (
      <ProtectedRoute>
        <div className={styles.container}>Carregando...</div>
      </ProtectedRoute>
    );
  }

  const detalhes = notificacao.detalhes || {};

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={styles.headerContainer}>
          <div className={breadcrumbStyles.breadcrumbWrapper}>
            <span className={breadcrumbStyles.breadcrumb}>
              Notificações &gt;{' '}
              <span className={breadcrumbStyles.breadcrumbActive}>Detalhes</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push('/notificacoes')}
            className={styles.backButton}
          >
            Voltar para notificações
          </button>
        </div>
        <div className={styles.detailsContainer}>
          <h1 className={styles.title}>{notificacao.titulo}</h1>
          <p className={styles.desc}>{notificacao.descricao}</p>
          <div className={styles.section}>
            {Object.keys(detalhes).map(key => (
              <p key={key}>
                <span className={styles.label}>{key}:</span>{' '}
                <span className={styles.value}>{String(detalhes[key])}</span>
              </p>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default NotificacaoDetalhes;

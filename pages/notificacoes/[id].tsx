import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/notificacaoDetalhes.module.css';
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
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Notificações &gt;{' '}
            <span className={breadcrumbStyles.breadcrumbActive}>Detalhes</span>
          </span>
        </div>
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
    </ProtectedRoute>
  );
};

export default NotificacaoDetalhes;

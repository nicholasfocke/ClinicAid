import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/pages/notificacoes/[id].module.css';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { parseISO, isValid, format } from 'date-fns';
import { buscarNotificacao, marcarNotificacaoLida, NotificacaoData, } from '@/functions/notificacoesFunctions';

const NotificacaoDetalhes = () => {
  const router = useRouter();
  const { id } = router.query;
  const [notificacao, setNotificacao] = useState<NotificacaoData | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (typeof id === 'string') {
        const data = await buscarNotificacao(id);
        setNotificacao(data);
        if (data && !data.lida) {
          await marcarNotificacaoLida(id);
        }
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

  // Ordem desejada para exibição dos detalhes de agendamento
  const ordemPadrao = [
    'nomePaciente',
    'convenio',
    'data',
    'motivo',
    'detalhes',
    'profissional',
    'procedimento',
    'hora',
    'status',
  ];

  const formatarValor = (valor: unknown) => {
    if (typeof valor === 'string') {
      const data = parseISO(valor);
      if (isValid(data)) {
        return format(data, 'dd/MM/yyyy'); // aqui a mágica
      }
    }
    return String(valor);
  };

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
           {(
              ordemPadrao.filter(k => detalhes[k] !== undefined)
                .concat(
                  Object.keys(detalhes)
                    .filter(k => k !== 'id' && k !== 'usuarioId' && !ordemPadrao.includes(k))
                )
            ).map(key => (
              <p key={key}>
                <span className={styles.label}>{key}:</span>{' '}
                <span className={styles.value}>{formatarValor(detalhes[key])}</span>
              </p>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default NotificacaoDetalhes;
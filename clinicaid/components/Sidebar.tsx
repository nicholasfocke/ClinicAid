import React from 'react';
import styles from './Sidebar.module.css';
import { MessageSquare, User2, CalendarDays } from 'lucide-react';

const Sidebar = () => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <MessageSquare className={styles.icon} />
        </div>
        <h3 className={styles.title}>Assistente IA</h3>
        <p className={styles.description}>
          Assistente com inteligência artificial, oferece sugestões de tratamento,
          realiza diagnóstico e pronto para realizar prontuários e está disponível para responder.
        </p>
        <button className={styles.button}>Faça uma pergunta</button>
      </div>

      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <CalendarDays className={styles.icon} />
        </div>
        <h3 className={styles.title}>Agendamentos</h3>
        <p className={styles.description}>
          Acesse os agendamentos dos próximos dias ou datas futuras.
        </p>
        <button className={styles.button}>Acessar agenda</button>
      </div>

      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <User2 className={styles.icon} />
        </div>
        <h3 className={styles.title}>Perfil</h3>
        <p className={styles.description}>
          Visualize e edite as informações do seu perfil.
        </p>
        <button className={styles.button}>Acessar perfil</button>
      </div>
    </aside>
  );
};

export default Sidebar;

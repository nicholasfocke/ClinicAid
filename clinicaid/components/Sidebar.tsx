import React from 'react';
import styles from './Sidebar.module.css';
import { MessageSquare, User2 } from 'lucide-react';

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
          realiza diagnóstico; e está disponível para responder.
        </p>
        <button className={styles.button}>Faça uma pergunta</button>
      </div>

      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <User2 className={styles.icon} />
        </div>
        <h3 className={styles.title}>Assistente</h3>
        <p className={styles.description}>
          Oferece assistência aos planos de tratamento, exibe tarefas e responde.
        </p>
        <button className={styles.button}>Faça uma pergunta</button>
      </div>
    </aside>
  );
};

export default Sidebar;

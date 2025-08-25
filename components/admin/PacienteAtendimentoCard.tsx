import React from 'react';
import styles from '@/styles/admin/recepcao/pacienteAtendimentoCard.module.css';

interface PacienteCardProps {
  foto?: string;
  nome: string;
  idade: number;
  sexo: string;
  sala: string;
  status: string;
  inicio: string;
  tempoConsulta: string;
  motivo: string;
  profissional: string;
  alergias: string;
}

const PacienteAtendimentoCard: React.FC<PacienteCardProps> = ({
  foto,
  nome,
  idade,
  sexo,
  sala,
  status,
  inicio,
  tempoConsulta,
  motivo,
  profissional,
  alergias,
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        {foto ? (
          <img src={foto} alt={nome} className={styles.avatar} />
        ) : (
          <div className={styles.avatarPlaceholder}>👤</div>
        )}
        <div className={styles.nameBlock}>
          <div className={styles.topRow}>
            <span className={styles.name}>{nome}</span>
            <span className={styles.status}>
              <span className={styles.statusDot}></span>
              {status}
            </span>
          </div>
          <div className={styles.bottomRow}>
            <span className={styles.ageGender}>
              {idade} {idade === 1 ? 'ano' : 'anos'} | {sexo}
            </span>
            <span className={styles.room}><strong>{sala}</strong></span>
          </div>
        </div>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span><strong>Início:</strong> {inicio}</span>
          <span> <strong>Em consulta:</strong> {tempoConsulta}</span>
        </div>
        <div className={styles.detailRow}>
          <span><strong>Motivo:</strong> {motivo}</span>
        </div>
        <div className={styles.detailRow}>
          <span> <strong>Profissional:</strong> {profissional}</span>
        </div>
        <div className={styles.detailRow}>
          <span><strong>{alergias}</strong></span>
        </div>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.actions}>
        <button className={`${styles.actionButton} ${styles.finish}`}>✔️ Finalizar</button>
        <button className={`${styles.actionButton} ${styles.pause}`}>⏸️ Pausar</button>
      </div>
    </div>
  );
};

export default PacienteAtendimentoCard;
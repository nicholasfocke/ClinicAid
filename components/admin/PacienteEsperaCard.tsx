import React from 'react';
import styles from '@/styles/admin/recepcao/pacienteEsperaCard.module.css';

interface PacienteEsperaCardProps {
  foto?: string;
  nome: string;
  idade: number;
  sexo: string;
  sala: string;
  status: string;
  chegada: string;
  tempoEspera: string;
  motivo: string;
  profissional: string;
  alergias: string;
}

const PacienteEsperaCard: React.FC<PacienteEsperaCardProps> = ({
  foto,
  nome,
  idade,
  sexo,
  sala,
  status,
  chegada,
  tempoEspera,
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
          <span><strong>Chegada:</strong> {chegada}</span>
          <span><strong>Em espera:</strong> {tempoEspera}</span>
        </div>
        <div className={styles.detailRow}>
          <span><strong>Motivo:</strong> {motivo}</span>
        </div>
        <div className={styles.detailRow}>
          <span><strong>Profissional:</strong> {profissional}</span>
        </div>
        <div className={styles.detailRow}>
          <span><strong>Alergias:</strong> {alergias}</span>
        </div>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.actions}>
        <button className={`${styles.actionButton} ${styles.call}`}>➡️ Chamar</button>
        <button className={`${styles.actionButton} ${styles.cancel}`}>❌ Cancelar</button>
      </div>
    </div>
  );
};

export default PacienteEsperaCard;


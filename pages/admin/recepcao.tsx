import { useState } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import PacienteAtendimentoCard from '@/components/admin/PacienteAtendimentoCard';
import PacienteEsperaCard from '@/components/admin/PacienteEsperaCard';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/recepcao/recepcao.module.css';

const Recepcao = () => {
  const [activeTab, setActiveTab] = useState('clinica');

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt;{' '}
            <span className={breadcrumbStyles.breadcrumbActive}>Recepção</span>
          </span>
        </div>
        <h1 className={styles.title}>Recepção</h1>
        <h2 className={styles.subtitle}>
          Controle de pacientes dentro da clínica
        </h2>

        <div className={styles.buttonContainer}>
          <button className={styles.registerButton}>+ Registrar chegada</button>
        </div>

        <div className={styles.cardsWrapper}>

          <div className={styles.cardLeft}>
            <h3 className={styles.cardTitle}>Em atendimento</h3>
            <PacienteAtendimentoCard
              nome="Hugo Stankowich"
              idade={20}
              sexo="Masculino"
              sala="Sala 02"
              status="Em atendimento"
              inicio="11:00"
              tempoConsulta="00:15:32"
              motivo="Dor abdominal"
              profissional="Patricia Stankowich"
              alergias="Sem alergias registradas"
            />
          </div>

          <div className={styles.cardRight}>
            <h3 className={styles.cardTitle}>Em espera</h3>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'clinica' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('clinica')}
              >
                Em clínica
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'agendados' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('agendados')}
              >
                Agendados do dia
              </button>
            </div>
            <div className={styles.searchFilter}>
              <input
                type="text"
                placeholder="Pesquisar por nome ou profissional"
                className={styles.searchInput}
              />
              <div className={styles.filterGroup}>
                <span>Filtrar por:</span>
                <select className={styles.select}>
                  <option>Ordem de chegada</option>
                  <option>Profissional</option>
                  <option>Agendamentos</option>
                </select>
              </div>
            </div>
            <PacienteEsperaCard
              nome="Nicholas Focke"
              idade={30}
              sexo="Masculino"
              sala="Sala 04"
              status="Em espera"
              chegada="10:30"
              tempoEspera="00:25:14"
              motivo="Retorno de consulta"
              profissional="Dra. Patrícia Stankowich"
              alergias="Penicilina"
            />
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Recepcao;

import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import styles from '@/styles/admin/recepcao/RegistrarChegadaModal.module.css';
import { buscarPacientesComDetalhes, PacienteDetails } from '@/functions/pacientesFunctions';

interface Atendimento {
  id: number;
  hora: string;
  paciente: string;
  cpf: string;
  sexo: string;
  idade: number;
  profissional: string;
  sala: string;
  status: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const RegistrarChegadaModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'agendados' | 'sem'>('agendados');
  const [showPacienteModal, setShowPacienteModal] = useState(false);
  const [pacientes, setPacientes] = useState<PacienteDetails[]>([]);
  const [pacienteQuery, setPacienteQuery] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteDetails | null>(null);

  const atendimentos: Atendimento[] = [
    {
      id: 1,
      hora: '10:00',
      paciente: 'João da Silva',
      cpf: '123.456.789-00',
      sexo: 'M',
      idade: 32,
      profissional: 'Dra. Patrícia',
      sala: 'Sala 03',
      status: 'Confirmado',
    },
    {
      id: 2,
      hora: '10:20',
      paciente: 'Maria Oliveira',
      cpf: '987.654.321-00',
      sexo: 'F',
      idade: 45,
      profissional: 'Dr. Hugo',
      sala: 'Sala 04',
      status: 'Agendado',
    },
  ];

  useEffect(() => {
    const fetchPacientes = async () => {
      if (showPacienteModal) {
        try {
          const lista = await buscarPacientesComDetalhes();
          setPacientes(lista);
        } catch {
          setPacientes([]);
        }
      }
    };
    fetchPacientes();
  }, [showPacienteModal]);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      overlayClassName={styles.modalOverlay}
      className={styles.modalContent}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>Registrar Chegada</h2>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'agendados' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('agendados')}
        >
          Agendados do dia
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'sem' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('sem')}
        >
          Sem agendamento
        </button>
      </div>

      {activeTab === 'agendados' && (
        <div>
          <div className={styles.filters}>
            <input
              className={styles.searchInput}
              placeholder="Buscar por nome/CPF/telefone"
              type="text"
            />
            <select className={styles.select}>
              <option>Profissional</option>
            </select>
            <select className={styles.select}>
              <option>Hoje</option>
            </select>
            <select className={styles.select}>
              <option>Todas</option>
            </select>
            <select className={styles.select}>
              <option>Confirmados</option>
            </select>
          </div>
          <div className={styles.atendimentoList}>
            {atendimentos.map((a) => (
              <div key={a.id} className={styles.atendimentoItem}>
                <div className={styles.atendimentoRow}>
                  <span className={styles.hora}>{a.hora}</span>
                  <div className={styles.pacienteCell}>
                    <span>{a.paciente} - {a.cpf}</span>
                    <span className={styles.pacienteMeta}>{a.sexo} {a.idade} anos</span>
                  </div>
                  <span className={styles.profissional}>{a.profissional}</span>
                  <span className={styles.sala}>{a.sala}</span>
                  <span className={styles.status}>{a.status}</span>
                </div>
                <div className={styles.actions}>
                  <button className={styles.primaryButton}>Registrar chegada</button>
                  <button className={styles.secondaryButton}>Abrir ficha</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'sem' && (
        <div>
          <div className={styles.pacienteActions}>
            <button
              className={styles.selectButton}
              onClick={() => setShowPacienteModal(true)}
            >
              Selecionar paciente
            </button>
            <button className={styles.newButton}>+ Novo</button>
          </div>
          <div className={styles.resultList}>
            {selectedPaciente && (
              <div className={styles.resultItem}>
                • {selectedPaciente.nome} ({selectedPaciente.idade}
                {selectedPaciente.sexo}) CPF {selectedPaciente.cpf}
              </div>
            )}
          </div>
          <div className={styles.formRow}>
            <select className={styles.select}>
              <option>Profissional</option>
            </select>
            <select className={styles.select}>
              <option>Procedimento</option>
            </select>
            <select className={styles.select}>
              <option>Convênio</option>
            </select>
            <select className={styles.select}>
              <option>Motivo</option>
              <option>Urgência</option>
              <option>Retorno</option>
              <option>Primeira Consulta</option>
              <option>Acompanhamento</option>
              <option>Exame de rotina</option>
              <option>Encaminhamento</option>
            </select>
          </div>
          <textarea className={styles.textarea} placeholder="Observações" />
          <div className={styles.footer}>
            <button className={styles.primaryButton}>Registrar chegada</button>
            <button className={styles.secondaryButton} onClick={onClose}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {showPacienteModal && (
        <div
          className={styles.patientModalOverlay}
          onClick={() => setShowPacienteModal(false)}
        >
          <div
            className={styles.patientModalBox}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              placeholder="Buscar paciente"
              value={pacienteQuery}
              onChange={(e) => setPacienteQuery(e.target.value)}
              className={styles.patientModalInput}
            />
            <ul className={styles.patientList}>
              {pacientes
                .filter((p) =>
                  p.nome.toLowerCase().includes(pacienteQuery.toLowerCase())
                )
                .map((p) => (
                  <li
                    key={p.id}
                    className={styles.patientItem}
                    onClick={() => {
                      setSelectedPaciente(p);
                      setShowPacienteModal(false);
                    }}
                  >
                    {p.nome} {p.cpf ? `- ${p.cpf}` : ''}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default RegistrarChegadaModal;

import { useState } from 'react';
import Link from 'next/link';
import styles from '@/styles/medicos.module.css';
import { excluirMedico } from '@/functions/medicosFunctions';

export interface Medico {
  id: string;
  nome: string;
  especialidade: string;
  diasAtendimento: string;
  horaInicio: string;
  horaFim: string;
  valorConsulta?: string;
  telefone?: string;
  cpf?: string;
  email?: string;
  convenio?: string;
  foto?: string;
}

interface DoctorCardProps {
  medico: Medico;
  onDelete?: (id: string) => void;
}

const DoctorCard = ({ medico, onDelete }: DoctorCardProps) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleDelete = async () => {
    await excluirMedico(medico.id);
    if (onDelete) onDelete(medico.id);
    setShowDetails(false);
  };

  return (
    <div className={styles.medicoCardWrapper}>
      <div className={styles.medicoCard}>
        {medico.foto && (
          <img src={medico.foto} alt={medico.nome} className={styles.medicoFoto} />
        )}
        <div className={styles.medicoInfo}>
          <div className={styles.medicoNome}>{medico.nome}</div>
          <div className={styles.medicoEspecialidade}>{medico.especialidade}</div>
          <div className={styles.medicoDias}>{medico.diasAtendimento}</div>
          <div className={styles.medicoHorario}>
            {medico.horaInicio} - {medico.horaFim}
          </div>
          {medico.valorConsulta && (
            <div className={styles.medicoValor}>Valor: {medico.valorConsulta}</div>
          )}
        </div>
        <button
          className={styles.verDetalhes}
          onClick={() => setShowDetails(true)}
        >
          Ver detalhes
        </button>
      </div>
      {showDetails && (
        <div className={styles.detalhesOverlay}>
          <div className={styles.detalhesCard}>
            {medico.foto && (
              <img src={medico.foto} alt={medico.nome} className={styles.medicoFoto} />
            )}
            <div className={styles.medicoNome}>{medico.nome}</div>
            <div className={styles.medicoEspecialidade}>{medico.especialidade}</div>
            <div className={styles.medicoDias}>{medico.diasAtendimento}</div>
            <div className={styles.medicoHorario}>
              {medico.horaInicio} - {medico.horaFim}
            </div>
            {medico.telefone && (
              <div className={styles.medicoValor}>Telefone: {medico.telefone}</div>
            )}
            {medico.cpf && (
              <div className={styles.medicoValor}>CPF: {medico.cpf}</div>
            )}
            {medico.email && (
              <div className={styles.medicoValor}>Email: {medico.email}</div>
            )}
            {medico.convenio && (
              <div className={styles.medicoValor}>Convênio: {medico.convenio}</div>
            )}
            {medico.valorConsulta && (
              <div className={styles.medicoValor}>Valor: {medico.valorConsulta}</div>
            )}
            <div className={styles.detalhesButtons}>
              <button className={styles.buttonExcluir} onClick={handleDelete}>
                Excluir médico
              </button>
              <Link
                href={`/admin/jajaeucrio`}
                className={styles.buttonEditar}
                onClick={() => setShowDetails(false)}
              >
                Editar médico
              </Link>
            </div>
            <button
              className={styles.buttonFechar}
              onClick={() => setShowDetails(false)}
            >
              X
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorCard;
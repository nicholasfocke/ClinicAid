import React, { useState } from 'react';
import Link from 'next/link';
import styles from '@/styles/medicos.module.css';
import { excluirMedico, atualizarMedico } from '@/functions/medicosFunctions';

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
  fotoPath?: string;
}

interface DoctorCardProps {
  medico: Medico;
  onDelete?: (id: string) => void;
  onUpdate?: (medico: Medico) => void;
}

const DoctorCard = ({ medico, onDelete, onUpdate }: DoctorCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Medico>({ ...medico });

  const handleDelete = async () => {
    await excluirMedico(medico.id);
    if (onDelete) onDelete(medico.id);
    setShowDetails(false);
  };

  const handleSave = async () => {
    await atualizarMedico(medico.id, {
      nome: formData.nome,
      especialidade: formData.especialidade,
      diasAtendimento: formData.diasAtendimento,
      horaInicio: formData.horaInicio,
      horaFim: formData.horaFim,
      telefone: formData.telefone || '',
      email: formData.email || '',
      convenio: formData.convenio || '',
      valorConsulta: formData.valorConsulta || '',
      foto: formData.foto || '', // garantir que nunca seja undefined
      fotoPath: formData.fotoPath || '',
      cpf: medico.cpf || '',
    });
    setEditing(false);
    setShowDetails(false);
    if (onUpdate) onUpdate({ ...formData, id: medico.id });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className={styles.medicoCardWrapper}>
      <div className={styles.medicoCard}>
        {medico.foto ? (
          <img src={medico.foto} alt={medico.nome} className={styles.medicoFoto} />
        ) : (
          <svg className={styles.medicoFoto} width="80" height="80" viewBox="0 0 120 120" fill="none">
            <circle cx="60" cy="60" r="60" fill="#E5E7EB" />
            <circle cx="60" cy="54" r="28" fill="#D1D5DB" />
            <ellipse cx="60" cy="94" rx="36" ry="22" fill="#D1D5DB" />
          </svg>
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
          {confirmDelete ? (
            <div className={styles.detalhesCard}>
              <p>Confirmar exclusão?</p>
              <div className={styles.detalhesButtons}>
                <button className={styles.buttonExcluir} onClick={handleDelete}>
                  Confirmar
                </button>
                <button
                  className={styles.buttonEditar}
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : editing ? (
            <div className={styles.detalhesCard}>

              {/* FOTO - editar/remover/adicionar */}
              <div className={styles.fotoEdit}>
                {formData.foto ? (
                  <>
                    <img src={formData.foto} alt={formData.nome} className={styles.medicoFoto} />
                    <button
                      className={styles.buttonRemoverFoto}
                      onClick={() => setFormData((prev) => ({ ...prev, foto: '' }))}
                    >
                      Remover foto
                    </button>
                  </>
                ) : (
                  <>
                    <label className={styles.buttonEditar}>
                      Carregar foto
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            const preview = URL.createObjectURL(file);
                            setFormData((prev) => ({ ...prev, foto: preview }));
                            // Aqui você também poderia guardar o File se for subir pro Firebase Storage depois
                          }
                        }}
                      />
                    </label>
                  </>
                )}
              </div>

              {/* CAMPOS TEXTO */}
              <input
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className={styles.inputEditar}
                placeholder="Nome"
              />
              <input
                name="especialidade"
                value={formData.especialidade}
                onChange={handleChange}
                className={styles.inputEditar}
                placeholder="Especialidade"
              />
              <input
                name="diasAtendimento"
                value={formData.diasAtendimento}
                onChange={handleChange}
                className={styles.inputEditar}
                placeholder="Dias"
              />
              <input
                name="horaInicio"
                value={formData.horaInicio}
                onChange={handleChange}
                className={styles.inputEditar}
                placeholder="Hora início"
              />
              <input
                name="horaFim"
                value={formData.horaFim}
                onChange={handleChange}
                className={styles.inputEditar}
                placeholder="Hora fim"
              />
              <input
                name="telefone"
                value={formData.telefone || ''}
                onChange={handleChange}
                className={styles.inputEditar}
                placeholder="Telefone"
              />
              <input
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                className={styles.inputEditar}
                placeholder="Email"
              />
              <input
                name="convenio"
                value={formData.convenio || ''}
                onChange={handleChange}
                className={styles.inputEditar}
                placeholder="Convênio"
              />
              <input
                name="valorConsulta"
                value={formData.valorConsulta || ''}
                onChange={handleChange}
                className={styles.inputEditar}
                placeholder="Valor da consulta"
              />
              {medico.cpf && (
                <div className={styles.medicoValor}>CPF: {medico.cpf}</div>
              )}
              <div className={styles.detalhesButtons}>
                <button className={styles.buttonEditar} onClick={handleSave}>
                  Salvar
                </button>
                <button
                  className={styles.buttonCancelar}
                  onClick={() => {
                    setEditing(false);
                    setFormData({ ...medico });
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.detalhesCard}>
              {medico.foto ? (
                <img src={medico.foto} alt={medico.nome} className={styles.medicoFoto} />
              ) : (
                <svg className={styles.medicoFoto} width="80" height="80" viewBox="0 0 120 120" fill="none">
                  <circle cx="60" cy="60" r="60" fill="#E5E7EB" />
                  <circle cx="60" cy="54" r="28" fill="#D1D5DB" />
                  <ellipse cx="60" cy="94" rx="36" ry="22" fill="#D1D5DB" />
                </svg>
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
                <button className={styles.buttonExcluir} onClick={() => setConfirmDelete(true)}>
                  Excluir médico
                </button>
                <button
                  className={styles.buttonEditar}
                  onClick={() => setEditing(true)}
                >
                  Editar médico
                </button>
              </div>
              <button
                className={styles.buttonFechar}
                onClick={() => setShowDetails(false)}
              >
                X
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DoctorCard;

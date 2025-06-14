import React, { useState, useEffect } from 'react';
import styles from '@/styles/admin/medico/medicos.module.css';
import { excluirMedico, atualizarMedico } from '@/functions/medicosFunctions';
import { buscarConvenios } from '@/functions/conveniosFunctions';
import { buscarConsultas } from '@/functions/procedimentosFunctions';

export interface Medico {
  id: string;
  nome: string;
  especialidade: string;
  diasAtendimento: string[];
  intervaloConsultas?: number; // em minutos
  telefone?: string;
  cpf?: string;
  email?: string;
  convenio: string[];
  foto?: string;
  fotoPath?: string;
}

interface DoctorCardProps {
  medico: Medico;
  onDelete?: (id: string) => void;
  onUpdate?: (medico: Medico) => void;
}

interface ConsultaProc {
  id: string;
  nome: string;
}

const DoctorCard = ({ medico, onDelete, onUpdate }: DoctorCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Medico>({ ...medico });
  const [convenios, setConvenios] = useState<{ id: string; nome: string }[]>([]);
  const [consultas, setConsultas] = useState<ConsultaProc[]>([]);

  const diasSemana = [
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
    'Domingo',
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const list = await buscarConvenios();
        setConvenios(list);
        const consultasList = await buscarConsultas();
        setConsultas(consultasList);
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      }
    };
    fetchData();
  }, []);

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
      intervaloConsultas: formData.intervaloConsultas || 0, 
      telefone: formData.telefone || '',
      email: formData.email || '',
      convenio: formData.convenio
        ? Array.isArray(formData.convenio)
          ? formData.convenio
          : [formData.convenio]
        : [],
      foto: formData.foto || '', // garantir que nunca seja undefined
      fotoPath: formData.fotoPath || '',
      cpf: medico.cpf || '',
    });
    setEditing(false);
    setShowDetails(false);
    if (onUpdate) onUpdate({ ...formData, id: medico.id });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const newValue = name === 'intervaloConsultas' ? Number(value) : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const toggleDia = (dia: string) => {
    setFormData(prev => {
      const existe = prev.diasAtendimento.includes(dia);
      const dias = existe
        ? prev.diasAtendimento.filter(d => d !== dia)
        : [...prev.diasAtendimento, dia];
      return { ...prev, diasAtendimento: dias };
    });
  };

  const handleCheckConvenio = (value: string, checked: boolean) => {
    setFormData(prev => {
      const atual = new Set(prev.convenio);
      if (checked) atual.add(value);
      else atual.delete(value);
      return { ...prev, convenio: Array.from(atual) };
    });
  };

  const diasText = Array.isArray(medico.diasAtendimento)
  ? medico.diasAtendimento.join(', ')
  : typeof medico.diasAtendimento === 'string'
    ? medico.diasAtendimento
    : '';

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
          <div className={styles.medicoDias}>{diasText}</div>
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
              <select
                name="especialidade"
                value={formData.especialidade}
                onChange={handleChange}
                className={styles.inputEditar}
              >
                <option value="">Selecione a especialidade</option>
                {consultas.map((c) => (
                  <option key={c.id} value={c.nome}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <div className={styles.convenioHeader}>Dias de atendimento:</div>
              <div className={styles.diasBox}>
                {diasSemana.map((dia) => (
                  <label key={dia} className={styles.diaItem}>
                    <input
                      type="checkbox"
                      checked={formData.diasAtendimento.includes(dia)}
                      onChange={() => toggleDia(dia)}
                    />
                    {dia}
                  </label>
                ))}
              </div>
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
              <div className={styles.convenioHeader}>Intervalo entre consultas</div>
              <input
                type="number"
                name="intervaloConsultas"
                value={formData.intervaloConsultas}
                onChange={handleChange}
                className={styles.inputEditar}
                placeholder="Intervalo das consultas (min)"
              />
              <div className={styles.convenioHeader}>Convênios:</div>
              <div className={styles.conveniosBox}>
                {convenios.map((c) => (
                  <label key={c.id} className={styles.conveniosItem}>
                    <input
                      type="checkbox"
                      value={c.nome}
                      checked={formData.convenio.includes(c.nome)}
                      onChange={(e) =>
                        handleCheckConvenio(e.target.value, e.target.checked)
                      }
                    />
                    {c.nome}
                  </label>
                ))}
              </div>
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
              <div className={styles.medicoDias}>{diasText}</div>
              {medico.telefone && (
                <div className={styles.medicoValor}>Telefone: {medico.telefone}</div>
              )}
              {medico.cpf && (
                <div className={styles.medicoValor}>CPF: {medico.cpf}</div>
              )}
              {medico.email && (
                <div className={styles.medicoValor}>Email: {medico.email}</div>
              )}
              {medico.intervaloConsultas && (
                <div className={styles.medicoValor}>
                  Intervalo: {medico.intervaloConsultas} min
                </div>
              )}
              {medico.convenio && (
                <div className={styles.medicoValor}>Convênios: {' '} {Array.isArray(medico.convenio) ? medico.convenio.join(', ' ) 
                  : medico.convenio}</div>
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
import React, { useState, useEffect } from 'react';
import styles from '@/styles/admin/medico/medicos.module.css';
import { excluirMedico, atualizarMedico } from '@/functions/medicosFunctions';
import { excluirHorario, buscarHorariosPorMedico, atualizarHorario, criarHorario } from '@/functions/scheduleFunctions';
import { buscarConvenios } from '@/functions/conveniosFunctions';
import { buscarEspecialidadesSaude, ajustarNumeroUsuariosEspecialidade } from '@/functions/especialidadesFunctions';
import { buscarProcedimentos } from '@/functions/procedimentosFunctions';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { uploadImage } from '@/utils/uploadImage';

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
  procedimentos?: string[]; // novo campo opcional
}

interface DoctorCardProps {
  medico: Medico;
  onDelete?: (id: string) => void;
  onUpdate?: (medico: Medico) => void;
}

interface EspecialidadeItem {
  id: string;
  nome: string;
  quantidadeUsuarios?: number;
}

// Adicione ao topo do componente:
interface MedicoForm extends Medico {
  horaInicio?: string;
  horaFim?: string;
  almocoInicio?: string;
  almocoFim?: string;
}

const DoctorCard = ({ medico, onDelete, onUpdate }: DoctorCardProps) => {
  // Troque o tipo do formData para MedicoForm
  const [formData, setFormData] = useState<MedicoForm>({ ...medico });
  const [showDetails, setShowDetails] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [convenios, setConvenios] = useState<{ id: string; nome: string }[]>([]);
  const [especialidades, setEspecialidades] = useState<EspecialidadeItem[]>([]);
  const [horarios, setHorarios] = useState<{ [dia: string]: any }>({});
  const [procedimentos, setProcedimentos] = useState<{ id: string; nome: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(medico.foto || null);

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
        const especialidadesList = await buscarEspecialidadesSaude();
        setEspecialidades(especialidadesList);
        // Buscar todos os procedimentos cadastrados no sistema
        const procs = await buscarProcedimentos();
        setProcedimentos(procs);
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (showDetails) {
      buscarHorariosPorMedico(medico.id).then((horariosList) => {
        // Agrupa por dia
        const agrupado: { [dia: string]: any } = {};
        horariosList.forEach((h) => {
          agrupado[h.dia] = h;
        });
        setHorarios(agrupado);
      });
    }
  }, [showDetails, medico.id]);

  // Preenche formData com horários ao entrar em edição
  useEffect(() => {
    if (editing) {
      buscarHorariosPorMedico(medico.id).then((horariosList) => {
        if (horariosList.length > 0) {
          setFormData(prev => ({
            ...prev,
            horaInicio: horariosList[0].horaInicio || '',
            horaFim: horariosList[0].horaFim || '',
            almocoInicio: horariosList[0].almocoInicio || '',
            almocoFim: horariosList[0].almocoFim || '',
            intervaloConsultas: horariosList[0].intervaloConsultas || prev.intervaloConsultas,
            procedimentos: prev.procedimentos || [],
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            horaInicio: '',
            horaFim: '',
            almocoInicio: '',
            almocoFim: '',
            procedimentos: prev.procedimentos || [],
          }));
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, medico.id]);

  const handleDelete = async () => {
    try{
      await excluirMedico(medico.id);
      const horarios = await buscarHorariosPorMedico(medico.id);
      await Promise.all(horarios.map(h => excluirHorario(medico.id, h.id)));

      const especialidadeAtual = especialidades.find(c => c.nome === medico.especialidade);
      if (especialidadeAtual) {
        await ajustarNumeroUsuariosEspecialidade(especialidadeAtual.id, -1);
      }

      if(onDelete) onDelete(medico.id);
      setShowDetails(false);
    }
    catch (err){
      console.error('Erro ao excluir médico:', err);
    }
  };

   const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      let fotoUrl = formData.foto || '';
      let fotoPathFinal = formData.fotoPath || '';

      // Upload da nova foto se houver arquivo novo
      if (fotoFile) {
        const uniqueName = `${medico.cpf?.replace(/\D/g, '') || 'medico'}_${Date.now()}`;
        const { url, path } = await uploadImage(
          fotoFile,
          'medico_photos',
          uniqueName,
          formData.fotoPath
        );
        fotoUrl = url;
        fotoPathFinal = path;
      }

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
        foto: fotoUrl,
        fotoPath: fotoPathFinal,
        cpf: medico.cpf || '',
        procedimentos: formData.procedimentos || [],
      });

      const especialidadeAntiga = especialidades.find(c => c.nome === medico.especialidade);
      const especialidadeNova = especialidades.find(c => c.nome === formData.especialidade);

      if (especialidadeAntiga && especialidadeNova && especialidadeAntiga.id !== especialidadeNova.id) {
        await ajustarNumeroUsuariosEspecialidade(especialidadeAntiga.id, -1);
        await ajustarNumeroUsuariosEspecialidade(especialidadeNova.id, 1);
      }

      // Atualiza horários
      if (formData.diasAtendimento && Array.isArray(formData.diasAtendimento)) {
        const horariosExistentes = await buscarHorariosPorMedico(medico.id);
        for (const dia of formData.diasAtendimento) {
          const horarioExistente = horariosExistentes.find(h => h.dia === dia);
          const horarioData = {
            dia,
            horaInicio: formData.horaInicio || '',
            horaFim: formData.horaFim || '',
            almocoInicio: formData.almocoInicio || '',
            almocoFim: formData.almocoFim || '',
            intervaloConsultas: Number(formData.intervaloConsultas) || 15,
          };
          if (horarioExistente) {
            await atualizarHorario(medico.id, horarioExistente.id, horarioData);
          } else {
            await criarHorario(medico.id, horarioData);
          }
        }
        // Remove horários de dias que não estão mais selecionados
        for (const h of horariosExistentes) {
          if (!formData.diasAtendimento.includes(h.dia)) {
            await excluirHorario(medico.id, h.id);
          }
        }
      }

      setEditing(false);
      setShowDetails(false);
      if (onUpdate) onUpdate({ ...formData, id: medico.id, foto: fotoUrl, fotoPath: fotoPathFinal });
    } catch (err) {
      alert('Erro ao salvar alterações do profissional.');
    } finally {
      setSaving(false);
      setFotoFile(null);
    }
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

  // Preview e upload da foto ao editar
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
      setFormData(prev => ({ ...prev, foto: '', fotoPath: '' }));
    }
  };

  // Excluir foto do Storage (se já enviada)
  const handleFotoRemove = async () => {
    if (formData.fotoPath) {
      try {
        const storage = getStorage();
        const storageRef = ref(storage, formData.fotoPath);
        await deleteObject(storageRef);
      } catch (err) {
        // Se não existir, ignora
      }
    }
    setFotoFile(null);
    setFotoPreview(null);
    setFormData(prev => ({ ...prev, foto: '', fotoPath: '' }));
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
                {fotoPreview ? (
                  <>
                    <img src={fotoPreview} alt={formData.nome} className={styles.medicoFoto} />
                    <button
                      className={styles.buttonRemoverFoto}
                      onClick={handleFotoRemove}
                    >
                      Remover foto
                    </button>
                  </>
                ) : (
                  <>
                    <label className={styles.buttonEditar}>
                      Carregar foto
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={handleFotoChange}
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
                {especialidades.map((c) => (
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
              {/* Intervalo entre consultas removido */}
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
              <div className={styles.convenioHeader}>Procedimentos:</div>
              <div className={styles.conveniosBox}>
                {procedimentos.map((p) => (
                  <label key={p.id} className={styles.conveniosItem}>
                    <input
                      type="checkbox"
                      value={p.nome}
                      checked={formData.procedimentos?.includes(p.nome)}
                      onChange={e => {
                        const { value, checked } = e.target;
                        setFormData(prev => {
                          const atual = new Set(prev.procedimentos || []);
                          if (checked) atual.add(value);
                          else atual.delete(value);
                          return { ...prev, procedimentos: Array.from(atual) };
                        });
                      }}
                    />
                    {p.nome}
                  </label>
                ))}
              </div>
              {medico.cpf && (
                <div className={styles.medicoValor}>CPF: {medico.cpf}</div>
              )}
              <div className={styles.convenioHeader}>Horários de Atendimento:</div>
              <div className={styles.horariosBox}>
                <div className={styles.horarioItem}>
                  <div>Início:</div>
                  <input
                    type="time"
                    name="horaInicio"
                    value={formData.horaInicio}
                    onChange={handleChange}
                    className={styles.inputEditar}
                  />
                </div>
                <div className={styles.horarioItem}>
                  <div>Fim:</div>
                  <input
                    type="time"
                    name="horaFim"
                    value={formData.horaFim}
                    onChange={handleChange}
                    className={styles.inputEditar}
                  />
                </div>
                <div className={styles.horarioItem}>
                  <div>Almoço Início:</div>
                  <input
                    type="time"
                    name="almocoInicio"
                    value={formData.almocoInicio}
                    onChange={handleChange}
                    className={styles.inputEditar}
                  />
                </div>
                <div className={styles.horarioItem}>
                  <div>Almoço Fim:</div>
                  <input
                    type="time"
                    name="almocoFim"
                    value={formData.almocoFim}
                    onChange={handleChange}
                    className={styles.inputEditar}
                  />
                </div>
              </div>
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
              {medico.procedimentos && medico.procedimentos.length > 0 && (
                <div className={styles.medicoValor}>
                  Procedimentos: {medico.procedimentos.join(', ')}
                </div>
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
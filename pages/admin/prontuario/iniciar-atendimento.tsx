import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/prontuario/iniciarAtendimento.module.css';
import { buscarPacientePorId } from '@/functions/pacientesFunctions';

type QueixaItem = {
  id: string;
  queixaPrincipal: string;
  duracao: string;
};

type HmaData = {
  queixas: QueixaItem[];
  historiaDoencaAtual: string;
  isda: string;
};

type GenericSectionData = {
  texto: string;
};

type SectionData = {
  [key: string]: HmaData | GenericSectionData;
};

const formatElapsed = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const sectionTitles = [
  { title: 'História e Motivo do Atendimento', abbreviation: 'HMA' },
  { title: 'Tratamentos em andamento', abbreviation: 'TA' },
  { title: 'Antecedentes pessoais', abbreviation: 'AP' },
  { title: 'Exame físico', abbreviation: 'EF' },
  { title: 'Escalas médicas (Para o futuro )', abbreviation: 'EM' },
  { title: 'Tabela de acompanhamento', abbreviation: 'TAc' },
  { title: 'Diagnóstico', abbreviation: 'DG' },
  { title: 'Solicitação de exames', abbreviation: 'SE' },
  { title: 'Tratamento e conduta', abbreviation: 'TC' },
  { title: 'Encaminhamento', abbreviation: 'EC' },
  { title: 'Solicitação de procedimentos', abbreviation: 'SP' },
  { title: 'Atestado médico', abbreviation: 'AM' },
  { title: 'Lembretes', abbreviation: 'LB' },
];

const durationOptions = [
  'Até 24h',
  'Até 72h',
  'Menos de uma semana',
  '1 - 3 semanas',
  '1 - 3 meses',
  '4 - 6 meses',
  '7 - 12 meses',
  'Mais de 12 meses',
  'Crônica',
];

const createInitialSectionData = (): SectionData =>
  sectionTitles.reduce((acc, section) => {
    acc[section.title] =
      section.title === 'História e Motivo do Atendimento'
        ? {
            queixas: [
              {
                id: crypto.randomUUID(),
                queixaPrincipal: '',
                duracao: '',
              },
            ],
            historiaDoencaAtual: '',
            isda: '',
          }
        : { texto: '' };
    return acc;
  }, {} as SectionData);

const IniciarAtendimento = () => {
  const router = useRouter();
  const hmaTitle = 'História e Motivo do Atendimento';
  const { pacienteId } = router.query;
  const [paciente, setPaciente] = useState<any | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedSection, setSelectedSection] = useState(sectionTitles[0]);
  const [sectionData, setSectionData] = useState<SectionData>(createInitialSectionData);
  const hmaData = sectionData[hmaTitle] as HmaData;

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!pacienteId || Array.isArray(pacienteId)) return;
    (async () => {
      try {
        const doc = await buscarPacientePorId(pacienteId);
        setPaciente(doc);
      } catch (err) {
        console.error('Erro ao buscar paciente', err);
      }
    })();
  }, [pacienteId]);

  const patientDetails = useMemo(() => {
    if (!paciente) return 'Paciente não identificado';
    const sexo = paciente.sexo || 'Sexo não informado';
    const idade = paciente.idade ? `${paciente.idade} anos` : 'Idade não informada';
    const convenio = paciente.convenio || 'Convênio não informado';
    return `${sexo} · ${idade} · ${convenio}`;
  }, [paciente]);

  const handleHmaChange = (field: keyof HmaData, value: string) => {
    setSectionData(prev => ({
      ...prev,
      [hmaTitle]: {
        ...(prev[hmaTitle] as HmaData),
        [field]: value,
      },
    }));
  };

  const handleQueixaChange = (
    id: string,
    field: keyof QueixaItem,
    value: string,
  ) => {
    setSectionData(prev => {
      const current = prev[hmaTitle] as HmaData;
      return {
        ...prev,
        [hmaTitle]: {
          ...current,
          queixas: current.queixas.map(item =>
            item.id === id ? { ...item, [field]: value } : item,
          ),
        },
      };
    });
  };

  const handleAddQueixa = () => {
    setSectionData(prev => {
      const current = prev[hmaTitle] as HmaData;
      return {
        ...prev,
        [hmaTitle]: {
          ...current,
          queixas: [
            ...current.queixas,
            {
              id: crypto.randomUUID(),
              queixaPrincipal: '',
              duracao: '',
            },
          ],
        },
      };
    });
  };

  const handleRemoveQueixa = (id: string) => {
    setSectionData(prev => {
      const current = prev[hmaTitle] as HmaData;
      const filtered = current.queixas.filter(item => item.id !== id);

      return {
        ...prev,
        [hmaTitle]: {
          ...current,
          queixas: filtered.length ? filtered : [{ id: crypto.randomUUID(), queixaPrincipal: '', duracao: '' }],
        },
      };
    });
  };

  const handleGenericTextChange = (sectionTitle: string, value: string) => {
    setSectionData(prev => ({
      ...prev,
      [sectionTitle]: {
        ...(prev[sectionTitle] as GenericSectionData),
        texto: value,
      },
    }));
  };

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>
            Menu Principal &gt; Prontuário &gt;
            <span className={breadcrumbStyles.breadcrumbActive}> Iniciar atendimento</span>
          </span>
        </div>

        <header className={styles.headerCard}>
        {/* TÍTULO DO CARD */}
        <div className={styles.headerTop}>
            <p className={styles.headerLabel}>Atendimento em curso</p>
        </div>

        {/* FOTO + DADOS DO PACIENTE */}
        <div className={styles.headerInfo}>
            {paciente?.foto ? (
            <img src={paciente.foto} alt={paciente.nome} className={styles.patientPhoto} />
            ) : (
            <div className={styles.photoPlaceholder}>Sem foto</div>
            )}
            <div className={styles.headerText}>
            <h1 className={styles.headerTitle}>
                {paciente?.nome || 'Paciente não selecionado'}
            </h1>
            <p className={styles.headerSubtitle}>{patientDetails}</p>
            <p className={styles.headerMeta}>
                Última consulta: {paciente?.ultimaConsulta || 'Não informado'}
            </p>
            <p className={styles.headerMeta}>
                Profissional responsável: {paciente?.profissionalResponsavel || 'A definir'}
            </p>
            </div>
        </div>

        {/* TIMER + BOTÕES */}
        <div className={styles.timerRow}>
            <div className={styles.timerBlock}>
            <p className={styles.timerLabel}>Tempo de atendimento</p>
            <p className={styles.timerValue}>{formatElapsed(elapsedSeconds)}</p>
            </div>
            <div className={styles.quickActions}>
            <button className={styles.secondaryButton} onClick={() => router.back()}>
                Voltar
            </button>
            <button className={styles.primaryButton}>Salvar</button>
            <button className={styles.primaryButton}>Prescrever</button>
            <button className={styles.dangerButton}>Finalizar</button>
            </div>
        </div>
        </header>


        <div className={styles.layout}>
          <div className={styles.leftColumn}>
            <h2 className={styles.sectionsTitle}>Seções</h2>
            <div className={styles.sectionsList}>
              {sectionTitles.map(section => (
                <button
                  key={section.title}
                  className={`${styles.sectionItem} ${
                    selectedSection.title === section.title ? styles.sectionItemActive : ''
                  }`}
                  onClick={() => setSelectedSection(section)}
                  type="button"
                >
                  <span className={styles.sectionAbbreviation}>{section.abbreviation}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.mainColumn}>
            <div className={styles.sectionContent}>
              <p className={styles.sectionLabel}>Seção selecionada</p>
              <h2 className={styles.sectionContentTitle}>{selectedSection.title}</h2>
              <p className={styles.sectionContentDescription}>
                Conduza o atendimento preenchendo os dados desta etapa. Os campos serão
                exibidos aqui de forma centralizada para facilitar a digitação.
              </p>

              {selectedSection.title === 'História e Motivo do Atendimento' ? (
                <div className={styles.formSection}>
                  <div className={styles.fieldGroup}>
                    <div className={styles.queixaHeader}>
                      <label className={styles.fieldLabel}>
                        Queixa principal e duração
                      </label>
                      <button
                        className={styles.addQueixaButton}
                        onClick={handleAddQueixa}
                        type="button"
                      >
                        Adicionar
                      </button>
                    </div>
                    <div className={styles.queixaList}>
                      {(sectionData[selectedSection.title] as HmaData).queixas.map(queixa => (
                        <div className={styles.queixaCard} key={queixa.id}>
                          <button
                            type="button"
                            className={styles.removeQueixaButton}
                            aria-label="Remover queixa"
                            onClick={() => handleRemoveQueixa(queixa.id)}
                          >
                            ×
                          </button>
                          <div className={styles.inlineFieldsCustom}>
                            <textarea
                              className={`${styles.textInput} ${styles.queixaText}`}
                              placeholder="Descreva a queixa principal"
                              value={queixa.queixaPrincipal}
                              onChange={event =>
                                handleQueixaChange(
                                  queixa.id,
                                  'queixaPrincipal',
                                  event.target.value,
                                )
                              }
                            />
                            <select
                              className={`${styles.selectInput} ${styles.durationSelect}`}
                              value={queixa.duracao}
                              onChange={event =>
                                handleQueixaChange(queixa.id, 'duracao', event.target.value)
                              }
                            >
                              <option value="">Tempo</option>
                              {durationOptions.map(option => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>História da doença atual</label>
                    <textarea
                      className={styles.textArea}
                      placeholder="Descreva a evolução e os detalhes da doença"
                      value={hmaData.historiaDoencaAtual}
                      onChange={event =>
                        handleHmaChange('historiaDoencaAtual', event.target.value)
                      }
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>ISDA</label>
                    <textarea
                      className={styles.textArea}
                      placeholder="Insira o ISDA do paciente"
                      value={hmaData.isda}
                      onChange={event => handleHmaChange('isda', event.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.formSection}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Conteúdo da seção</label>
                    <textarea
                      className={styles.textArea}
                      placeholder="Digite as informações relevantes desta aba"
                      value={(sectionData[selectedSection.title] as GenericSectionData).texto}
                      onChange={event =>
                        handleGenericTextChange(selectedSection.title, event.target.value)
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.previewColumn}>
            <h2 className={styles.previewTitle}>Pré-visualização</h2>
            {selectedSection.title === 'História e Motivo do Atendimento' ? (
              <div className={styles.previewGroup}>
                {(sectionData[selectedSection.title] as HmaData).queixas.map(queixa => (
                  <div className={styles.previewItem} key={queixa.id}>
                    <p className={styles.previewLabel}>Queixa principal</p>
                    <p className={styles.previewText}>
                      {queixa.queixaPrincipal || 'Não preenchido'}
                    </p>
                    <p className={styles.previewLabel}>Duração</p>
                    <p className={styles.previewText}>
                      {queixa.duracao || 'Não selecionado'}
                    </p>
                  </div>
                ))}
                <div className={styles.previewItem}>
                  <p className={styles.previewLabel}>História da doença atual</p>
                  <p className={styles.previewText}>
                    {(sectionData[selectedSection.title] as HmaData).historiaDoencaAtual ||
                      'Não preenchido'}
                  </p>
                </div>
                <div className={styles.previewItem}>
                  <p className={styles.previewLabel}>ISDA</p>
                  <p className={styles.previewText}>
                    {(sectionData[selectedSection.title] as HmaData).isda || 'Não preenchido'}
                  </p>
                </div>
              </div>
            ) : (
              <div className={styles.previewGroup}>
                <p className={styles.previewLabel}>Conteúdo</p>
                <p className={styles.previewText}>
                  {(sectionData[selectedSection.title] as GenericSectionData).texto ||
                    'Nenhum conteúdo informado nesta aba ainda.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default IniciarAtendimento;
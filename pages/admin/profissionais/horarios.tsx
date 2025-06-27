import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import tableStyles from '@/styles/admin/horario/horarios.module.css';
import { buscarMedicos } from '@/functions/medicosFunctions';
import { criarHorario, buscarHorariosPorMedico, excluirHorario, atualizarHorario, ScheduleData, } from '@/functions/scheduleFunctions';

interface MedicoItem {
  id: string;
  nome: string;
}

interface ScheduleItem extends ScheduleData {
  id: string;
}

interface User {
    uid: string;
    email: string;
  }

const Horarios = () => {
  const [error, setError] = useState('');
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profissionais, setProfissionais] = useState<MedicoItem[]>([]);
  const [selectedMedico, setSelectedMedico] = useState('');
  const [dia, setDia] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [almocoInicio, setAlmocoInicio] = useState('');
  const [almocoFim, setAlmocoFim] = useState('');
  const [horarios, setHorarios] = useState<ScheduleItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<ScheduleData>({
    dia: '',
    horaInicio: '',
    horaFim: '',
    almocoInicio: '',
    almocoFim: '',
  });

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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      try {
        if (currentUser) {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email || '',
          });
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setError('Erro ao verificar autenticação.');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetch = async () => {
      const docs = await buscarMedicos();
      const list = docs.map((d: any) => ({ id: d.id, nome: d.nome }));
      setProfissionais(list);
    };
    fetch();
  }, []);

  useEffect(() => {
    const fetchHorarios = async () => {
      if (!selectedMedico) {
        setHorarios([]);
        return;
      }
      const list = await buscarHorariosPorMedico(selectedMedico);
      setHorarios(list as ScheduleItem[]);
    };
    fetchHorarios();
  }, [selectedMedico]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedico || !dia || !horaInicio || !horaFim) return;
    await criarHorario(selectedMedico, {
      dia,
      horaInicio,
      horaFim,
      almocoInicio,
      almocoFim,
    });
    const list = await buscarHorariosPorMedico(selectedMedico);
    setHorarios(list as ScheduleItem[]);
    setDia('');
    setHoraInicio('');
    setHoraFim('');
    setAlmocoInicio('');
    setAlmocoFim('');
  };

  return (
    <div className={tableStyles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Profissionais &gt; </span>
          <span className={breadcrumbStyles.breadcrumbActive}>Dias/Horários</span>
        </span>
      </div>
      <h1 className={tableStyles.titleHorarios}>Dias/Horários</h1>
      <div className={tableStyles.subtitleHorarios}>
        Gerencie os dias e horários dos profissionais
      </div>
      <form onSubmit={handleSubmit} className={tableStyles.formStyled}>
        <select
          value={selectedMedico}
          onChange={(e) => setSelectedMedico(e.target.value)}
          required
        >
          <option value="">Selecione o profissional</option>
          {profissionais.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dia}
          onChange={(e) => setDia(e.target.value)}
        />
        <select
          value={diasSemana.includes(dia) ? dia : ''}
          onChange={(e) => setDia(e.target.value)}
        >
        <option value="">Dia da semana</option>
        {diasSemana.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
        </select>
        <label className={tableStyles.almocoLabel}>Hora de Ínicio/Fim</label>
        <input
          type="time"
          value={horaInicio}
          onChange={(e) => setHoraInicio(e.target.value)}
          required
        />
        <input
          type="time"
          value={horaFim}
          onChange={(e) => setHoraFim(e.target.value)}
          required
        />
        <label className={tableStyles.almocoLabel}>Intervalo Almoço</label>
        <input
          type="time"
          value={almocoInicio}
          onChange={(e) => setAlmocoInicio(e.target.value)}
        />
        <input
          type="time"
          value={almocoFim}
          onChange={(e) => setAlmocoFim(e.target.value)}
        />
        <div className={tableStyles.buttonsBox}>
          <button type="submit" className={tableStyles.buttonPri}>
            Salvar
          </button>
        </div>
      </form>

      {horarios.length > 0 && (
        <div className={tableStyles.horariosTableWrapper}>
          <table className={tableStyles.horariosTable}>
            <thead>
              <tr>
                <th>DIA</th>
                <th>INÍCIO</th>
                <th>FIM</th>
                <th>ALMOÇO</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {horarios.map((h) => (
                editingId === h.id ? (
                  <tr key={h.id}>
                    <td>
                      <input
                        value={editData.dia}
                        onChange={(e) =>
                          setEditData({ ...editData, dia: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={editData.horaInicio}
                        onChange={(e) =>
                          setEditData({ ...editData, horaInicio: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={editData.horaFim}
                        onChange={(e) =>
                          setEditData({ ...editData, horaFim: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={editData.almocoInicio}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            almocoInicio: e.target.value,
                          })
                        }
                      />
                      <input
                        type="time"
                        value={editData.almocoFim}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            almocoFim: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td>
                      <button
                        className={tableStyles.buttonAcao}
                        onClick={async () => {
                          await atualizarHorario(selectedMedico, h.id, editData);
                          const list = await buscarHorariosPorMedico(selectedMedico);
                          setHorarios(list as ScheduleItem[]);
                          setEditingId(null);
                        }}
                      >
                        Salvar
                      </button>
                      <button
                        className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`}
                        onClick={() => setEditingId(null)}
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={h.id}>
                    <td>{h.dia}</td>
                    <td>{h.horaInicio}</td>
                    <td>{h.horaFim}</td>
                    <td>
                      {h.almocoInicio && h.almocoFim
                        ? `${h.almocoInicio} - ${h.almocoFim}`
                        : '-'}
                    </td>
                    <td>
                      <button
                        className={tableStyles.buttonAcao}
                        onClick={() => {
                          setEditingId(h.id);
                          setEditData({ ...h });
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className={`${tableStyles.buttonAcao} ${tableStyles.buttonExcluir}`}
                        onClick={async () => {
                          if (!confirm('Excluir horário?')) return;
                          await excluirHorario(selectedMedico, h.id);
                          setHorarios((prev) => prev.filter((x) => x.id !== h.id));
                        }}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Horarios;
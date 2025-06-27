import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import CreateAppointment from '@/components/modals/CreateAppointment';
import { auth, firestore } from '@/firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { criarAgendamento, buscarAgendamentosPorData } from '@/functions/agendamentosFunction';
import { buscarHorariosPorMedico, ScheduleData } from '@/functions/scheduleFunctions';

interface Profissional {
  id: string;
  nome: string;
  empresaId: string;
}

export default function IndexCliente() {
  const [user, setUser] = useState<{ uid: string; email: string | null } | null>(null);

  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [horariosProfissional, setHorariosProfissional] = useState<ScheduleData[]>([]);
  const [diasDisponiveis, setDiasDisponiveis] = useState<string[]>([]);

  const [appointmentData, setAppointmentData] = useState({
    date: '',
    time: '',
    nomePaciente: '',
    profissional: '',
    detalhes: '',
    convenio: '',
    procedimento: '',
  });

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [reservedTimes, setReservedTimes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (current) => {
      if (current) {
        setUser({ uid: current.uid, email: current.email });
      } else {
        setUser(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchProfissionais = async () => {
      const snap = await getDocs(collection(firestore, 'profissionais'));
      const list: Profissional[] = snap.docs.map((d) => ({
        id: d.id,
        nome: d.data().nome,
        empresaId: d.data().empresaId || '',
      }));
      setProfissionais(list);
    };
    fetchProfissionais();
  }, []);

  useEffect(() => {
    const loadSchedule = async () => {
      if (!appointmentData.profissional) {
        setHorariosProfissional([]);
        setDiasDisponiveis([]);
        return;
      }
      const prof = profissionais.find((p) => p.nome === appointmentData.profissional);
      if (!prof) return;
      try {
        const horarios = await buscarHorariosPorMedico(prof.id);
        setHorariosProfissional(horarios as ScheduleData[]);
        setDiasDisponiveis(horarios.map((h) => h.dia));
        if (appointmentData.date) {
          fetchAvailableTimes(appointmentData.date, appointmentData.profissional);
        }
      } catch {
        setHorariosProfissional([]);
        setDiasDisponiveis([]);
      }
    };
    loadSchedule();
  }, [appointmentData.profissional, profissionais]);

  const getDayName = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    const name = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    const map: Record<string, string> = {
      'segunda-feira': 'Segunda',
      'terça-feira': 'Terça',
      'quarta-feira': 'Quarta',
      'quinta-feira': 'Quinta',
      'sexta-feira': 'Sexta',
      'sábado': 'Sábado',
      'domingo': 'Domingo',
    };
    return map[name.toLowerCase()];
  };

  const generateTimes = (
    inicio: string,
    fim: string,
    almocoInicio?: string,
    almocoFim?: string,
    step = 30
  ) => {
    const times: string[] = [];
    const [sh, sm] = inicio.split(':').map(Number);
    const [eh, em] = fim.split(':').map(Number);
    const start = new Date();
    start.setHours(sh, sm, 0, 0);
    const end = new Date();
    end.setHours(eh, em, 0, 0);
    let breakStart: Date | null = null;
    let breakEnd: Date | null = null;
    if (almocoInicio && almocoFim) {
      breakStart = new Date();
      breakEnd = new Date();
      const [bsh, bsm] = almocoInicio.split(':').map(Number);
      const [beh, bem] = almocoFim.split(':').map(Number);
      breakStart.setHours(bsh, bsm, 0, 0);
      breakEnd.setHours(beh, bem, 0, 0);
    }
    for (let d = new Date(start); d <= end; d.setMinutes(d.getMinutes() + step)) {
      if (breakStart && breakEnd && d >= breakStart && d < breakEnd) {
        continue;
      }
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      times.push(`${hh}:${mm}`);
    }
    return times;
  };

  const getScheduleForDate = (dateStr: string) => {
    const dayName = getDayName(dateStr);
    return (
      horariosProfissional.find((h) => h.dia === dateStr) ||
      horariosProfissional.find((h) => h.dia === dayName)
    );
  };

  const fetchAvailableTimes = async (date: string, profissional: string) => {
    if (!date || !profissional) {
      setAvailableTimes([]);
      setReservedTimes([]);
      setAppointmentData((prev) => ({ ...prev, time: '' }));
      return;
    }
    try {
      const schedule = getScheduleForDate(date);
      if (!schedule) {
        setAvailableTimes([]);
        setReservedTimes([]);
        setAppointmentData((prev) => ({ ...prev, time: '' }));
        return;
      }
      const ags = await buscarAgendamentosPorData(date);
      const normalize = (t: string) => t.trim().slice(0, 5);
      const reserved = ags
        .filter((ag) => ag.profissional === profissional)
        .map((ag) => normalize(ag.hora));
      const generated = generateTimes(
        schedule.horaInicio,
        schedule.horaFim,
        schedule.almocoInicio,
        schedule.almocoFim
      );
      const normalizedGenerated = generated.map(normalize);
      const available = normalizedGenerated.filter((t) => !reserved.includes(t));
      setAvailableTimes(available);
      setReservedTimes(reserved);
      setAppointmentData((prev) => ({ ...prev, time: available[0] || '' }));
    } catch {
      setAvailableTimes([]);
      setReservedTimes([]);
      setAppointmentData((prev) => ({ ...prev, time: '' }));
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await criarAgendamento(
        {
          date: appointmentData.date,
          times: [appointmentData.time],
          nomesPacientes: [appointmentData.nomePaciente],
          profissional: appointmentData.profissional,
          detalhes: appointmentData.detalhes,
          convenio: appointmentData.convenio,
          procedimento: appointmentData.procedimento,
        },
        { uid: user.uid, email: user.email }
      );
      setAppointmentData({
        date: '',
        time: '',
        nomePaciente: '',
        profissional: '',
        detalhes: '',
        convenio: '',
        procedimento: '',
      });
      setAvailableTimes([]);
      setReservedTimes([]);
      setDiasDisponiveis([]);
      setHorariosProfissional([]);
    } catch (err) {
      console.error('Erro ao criar agendamento:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <CreateAppointment
        isOpen={true}
        onClose={() => {}}
        onSubmit={handleCreateAppointment}
        isSubmitting={isSubmitting}
        appointmentData={appointmentData}
        setAppointmentData={setAppointmentData}
        availableTimes={availableTimes}
        reservedTimes={reservedTimes}
        profissionais={profissionais}
        fetchAvailableTimes={fetchAvailableTimes}
        availableDays={diasDisponiveis}
        hideTime={true}
      />
    </ProtectedRoute>
  );
}


import { collection, query, where, getDocs, setDoc, doc, runTransaction, orderBy } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { format } from 'date-fns';

// precisa também criar novas funções para lidar com o novo banco de dados
// esse arquivo ainda precisa pedir o seguinte: buscarPorMedico, buscarPorPaciente, buscarPorStatus, 

export interface AppointmentData { //mudar a estrutura para incluir ao nosso novo banco de dados
  date: string;
  times: string[];
  nomesPacientes: string[];
  profissional: string;
  detalhes: string;
}

export interface UserLike {
  uid: string;
  email: string | null;
}

export interface BlockedTime {
  date: string;
  time: string;
  profissional: string;
}

export const statusAgendamento = {
    AGENDADO: 'agendado',
    CONFIRMADO: 'confirmado',
    CANCELADO: 'cancelado',
    CONCLUIDO: 'concluído',
    PENDENTE: 'pendente',
}

export const buscarAgendamentosDeHoje = async () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const consultaHoje = query(
    collection(firestore, 'agendamentos'),
    where('data', '==', today),
    orderBy('hora', 'asc')
  );
  const resultadoHoje = await getDocs(consultaHoje);

  if (!resultadoHoje.empty) {
    return resultadoHoje.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  const consultaFuturos = query(
    collection(firestore, 'agendamentos'),
    where('data', '>=', today),
    orderBy('data', 'asc'),
    orderBy('hora', 'asc')
  );
  const resultadoFuturos = await getDocs(consultaFuturos);
  if (!resultadoFuturos.empty) {
    return resultadoFuturos.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  return [];
};

export const buscarHorariosDisponiveis = async (
  date: Date | null,
  profissional: string,
  tipoUsuario: string | undefined,
  horariosBloqueados: BlockedTime[],
  horariosPadrao: string[],
  horariosAdmin: string[]
) => {
  if (!date || !profissional) return [] as string[];

  const formattedDate = format(date, 'yyyy-MM-dd');

  const consultaDiaBloqueadoFuncionario = query(
    collection(firestore, 'blockedDaysByEmployee'),
    where('date', '==', formattedDate),
    where('funcionaria', '==', profissional)
  );

  const resultadoFuncionarioBloqueado = await getDocs(consultaDiaBloqueadoFuncionario);
  if (!resultadoFuncionarioBloqueado.empty) {
    return [];
  }

  const consultaAgendamentosDia = query(
    collection(firestore, 'agendamentos'),
    where('data', '==', formattedDate),
    where('profissional', '==', profissional)
  );
  const documentosAgendamentos = await getDocs(consultaAgendamentosDia);
  const horariosReservados = documentosAgendamentos.docs.map(doc => doc.data().hora);

  const agora = new Date();
  const todosHorarios = tipoUsuario === 'admin' ? [...horariosPadrao, ...horariosAdmin] : horariosPadrao;

  return todosHorarios.filter(time => {
    if (
      horariosReservados.includes(time.trim()) ||
      horariosBloqueados.some(bt => bt.time === time.trim() && bt.profissional === profissional)
    ) {
      return false;
    }
    if (formattedDate === format(agora, 'yyyy-MM-dd')) {
      const [h, m] = time.split(':');
      const horarioAgendamento = new Date();
      horarioAgendamento.setHours(parseInt(h));
      horarioAgendamento.setMinutes(parseInt(m));
      return horarioAgendamento > agora;
    }
    return true;
  });
};

export const buscarDiasBloqueados = async () => {
  const q = query(collection(firestore, 'blockedDays'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data().date as string);
};

export const bloquearDiaParaFuncionario = async (date: Date, profissional: string) => {
  const formattedDate = format(date, 'yyyy-MM-dd');
  await setDoc(doc(firestore, 'blockedDaysByEmployee', `${formattedDate}_${profissional}`), {
    date: formattedDate,
    funcionaria: profissional,
  });
};

export const buscarHorariosBloqueados = async (date: Date): Promise<BlockedTime[]> => {
  const formattedDate = format(date, 'yyyy-MM-dd');

  const consultaBloqueioGeral = query(
    collection(firestore, 'blockedTimes'),
    where('date', '==', formattedDate)
  );
  const resultadoGeral = await getDocs(consultaBloqueioGeral);
  const bloqueiosGerais = resultadoGeral.docs.map(doc => doc.data() as BlockedTime);

  const consultaBloqueioFuncionario = query(
    collection(firestore, 'blockedDaysByEmployee'),
    where('date', '==', formattedDate)
  );
  const resultadoFuncionario = await getDocs(consultaBloqueioFuncionario);
  const bloqueiosPorFuncionario = resultadoFuncionario.docs.map(doc => doc.data() as BlockedTime);

  return [...bloqueiosGerais, ...bloqueiosPorFuncionario];
};

export const criarAgendamento = async (data: AppointmentData, user: UserLike) => {
  await runTransaction(firestore, async transaction => {
    for (let i = 0; i < data.nomesPacientes.length; i++) {
      const nome = data.nomesPacientes[i];
      const ref = doc(
        firestore,
        'agendamentos',
        `${data.date}_${data.profissional}_${data.times[i]}`
      );
      const existing = await transaction.get(ref);
      if (existing.exists()) {
        throw new Error(`O horário ${data.times[i]} já foi reservado.`);
      }
      transaction.set(ref, {
        nomePaciente: nome,
        data: data.date,
        hora: data.times[i],
        usuarioId: user.uid,
        usuarioEmail: user.email,
        status: statusAgendamento.CONFIRMADO,
        profissional: data.profissional,
        detalhes: data.detalhes,
      });
    }
  });
};

export const bloquearDia = async (date: Date) => {
  const formattedDate = format(date, 'yyyy-MM-dd');
  await setDoc(doc(firestore, 'blockedDays', formattedDate), { date: formattedDate });
};

export const bloquearHorario = async (date: Date, time: string, profissional: string) => {
  const formattedDate = format(date, 'yyyy-MM-dd');
  await setDoc(doc(firestore, 'blockedTimes', `${formattedDate}_${time}_${profissional}`), {
    date: formattedDate,
    time,
    profissional,
  });
};

export const enviarEmailDeConfirmacao = async (
  email: string,
  userId: string,
  data: AppointmentData
) => {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      userId,
      date: data.date,
      times: data.times,
      profissional: data.profissional,
      nomesPacientes: data.nomesPacientes,
      detalhes: data.detalhes,
      isEdit: false,
      isDelete: false,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error('Erro ao enviar email de confirmação: ' + errText);
  }
};

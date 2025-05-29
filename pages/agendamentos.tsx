import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/router';
import styles from "@/styles/agendamentos.module.css";
import { format, isAfter, isSameDay } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Modal from 'react-modal';

interface Agendamento {
  id: string;
  data: string;
  hora: string;
  profissional: string;
  nomePaciente: string;
  status: string;
  detalhes: string;
}

interface Profissional {
  id: string;
  nome: string;
  empresaId: string;
}

const Agendamentos = () => {
  interface User {
    uid: string;
    email: string;
  }

  const [user, setUser] = useState<User | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const [todayAppointments, setTodayAppointments] = useState<Agendamento[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Agendamento[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([
    { id: 'emilio', nome: 'Emilio', empresaId: 'default' }
  ]);

  // Novos estados para calendário/modal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      try {
        if (currentUser) {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email || '',
          });
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setError('Erro ao verificar autenticação.');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchProfissionais = async () => {
      if (!user) return;
      let empresaId = null;
      // Busca empresa do usuário (ajuste conforme sua estrutura)
      const empresaDoc = await getDocs(collection(firestore, 'empresas'));
      if (!empresaDoc.empty) {
        empresaId = empresaDoc.docs[0].id;
      }
      if (!empresaId) return;

      const profissionaisSnap = await getDocs(query(collection(firestore, 'profissionais'), where('empresaId', '==', empresaId)));
      const profs: Profissional[] = profissionaisSnap.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome,
        empresaId: doc.data().empresaId,
      }));

      // Garante que Emilio sempre aparece na lista
      const emilioExists = profs.some(p => p.nome === 'Emilio');
      if (!emilioExists) {
        profs.unshift({ id: 'emilio', nome: 'Emilio', empresaId });
      }
      setProfissionais(profs);
    };

    fetchProfissionais();
  }, [user]);

  useEffect(() => {
    const fetchAgendamentos = async () => {
      if (user) {
        const q = query(
          collection(firestore, 'agendamentos'),
          where('usuarioId', '==', user.uid),
          where('status', '==', 'agendado')
        );

        try {
          const querySnapshot = await getDocs(q);
          const fetchedAgendamentos: Agendamento[] = [];
          querySnapshot.forEach((doc) => {
            const agendamentoData = doc.data();
            fetchedAgendamentos.push({
              id: doc.id,
              data: agendamentoData.data,
              hora: agendamentoData.hora,
              profissional: agendamentoData.profissional,
              nomePaciente: agendamentoData.nomePaciente,
              status: agendamentoData.status,
              detalhes: agendamentoData.detalhes || '',
            });
          });

          fetchedAgendamentos.sort((a, b) => {
            const dateA = new Date(`${a.data}T${a.hora}`);
            const dateB = new Date(`${b.data}T${b.hora}`);
            return dateA.getTime() - dateB.getTime();
          });

          setAgendamentos(fetchedAgendamentos);

          const today = new Date();
          const todayList: Agendamento[] = [];
          const futureByDay: { [date: string]: Agendamento[] } = {};

          fetchedAgendamentos.forEach((ag) => {
            const agDate = new Date(`${ag.data}T${ag.hora}`);
            if (
              agDate.getDate() === today.getDate() &&
              agDate.getMonth() === today.getMonth() &&
              agDate.getFullYear() === today.getFullYear()
            ) {
              todayList.push(ag);
            } else if (isAfter(agDate, today)) {
              const dateKey = ag.data;
              if (!futureByDay[dateKey]) futureByDay[dateKey] = [];
              futureByDay[dateKey].push(ag);
            }
          });

          // Pega o próximo dia futuro mais próximo
          const futureDates = Object.keys(futureByDay).sort();
          let upcomingList: Agendamento[] = [];
          if (futureDates.length > 0) {
            upcomingList = futureByDay[futureDates[0]].sort((a, b) => {
              const dateA = new Date(`${a.data}T${a.hora}`);
              const dateB = new Date(`${b.data}T${b.hora}`);
              return dateA.getTime() - dateB.getTime();
            });
          }

          setTodayAppointments(todayList.slice(0, 4));
          setUpcomingAppointments(upcomingList.slice(0, 4));

          setLoading(false);
        } catch (error) {
          console.error('Erro ao buscar agendamentos:', error);
          setError('Erro ao buscar agendamentos.');
        }
      }
    };

    fetchAgendamentos();
  }, [user]);

  const handleRemove = async (id: string) => {
    const confirmDelete = window.confirm('Deseja excluir o agendamento?');
    if (!confirmDelete) return;

    try {
      // Busca o agendamento antes de remover
      const agendamentoDoc = await getDoc(doc(firestore, 'agendamentos', id));
      const agendamentoData = agendamentoDoc.exists() ? agendamentoDoc.data() : null;

      await deleteDoc(doc(firestore, 'agendamentos', id));
      setAgendamentos((prev) => prev.filter((agendamento) => agendamento.id !== id));
      setTodayAppointments((prev) => prev.filter((agendamento) => agendamento.id !== id));
      setUpcomingAppointments((prev) => prev.filter((agendamento) => agendamento.id !== id));

      // Envia e-mail de exclusão se dados disponíveis
      if (agendamentoData && user?.email) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            userId: user.uid,
            date: agendamentoData.data,
            times: [agendamentoData.hora],
            profissional: agendamentoData.profissional,
            nomesPacientes: [agendamentoData.nomePaciente],
            detalhes: agendamentoData.detalhes,
            isEdit: false,
            isDelete: true,
          }),
        });
      }
    } catch (error) {
      console.error('Erro ao remover agendamento: ', error);
      setError('Erro ao remover o agendamento.');
    }
  };

  // Funções para calendário/modal
  const getAgendamentosDoDia = (date: Date) =>
    agendamentos.filter((ag) => {
      const agDate = new Date(ag.data);
      agDate.setDate(agDate.getDate() + 1);
      return isSameDay(agDate, date);
    });

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  if (loading) {
    return <p>Carregando agendamentos...</p>;
  }

  if (error) {
    return <p className={styles.error}>{error}</p>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.titlecontaineragendamento}>Painel de Agendamentos</h1>

      {/* Calendário com marcação de datas com agendamento */}
      <div className={styles.calendarWrapper}>
        <Calendar
          className={styles.reactCalendar}
          onClickDay={handleDateClick}
          tileClassName={({ date, view }) =>
            view === 'month' &&
            agendamentos.some((ag) => {
              const agDate = new Date(ag.data);
              agDate.setDate(agDate.getDate() + 1);
              return isSameDay(agDate, date);
            })
              ? styles.markedDay
              : ''
          }
          locale="pt-BR"
        />
      </div>

      {/* Modal de agendamentos do dia */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Agendamentos do Dia"
        className={styles.modal}
        overlayClassName={styles.overlay}
      >
        <h2>Agendamentos do dia {selectedDate && format(selectedDate, 'dd/MM/yyyy')}</h2>
        <div>
          {selectedDate &&
            getAgendamentosDoDia(selectedDate).length > 0 ? (
              getAgendamentosDoDia(selectedDate).map((ag) => (
                <div key={ag.id} className={styles.cardGridItem}>
                  <div className={styles.timeBox}>{ag.hora}</div>
                  <div>
                    <div className={styles.cardName}>{ag.nomePaciente}</div>
                    <div className={styles.cardService}>{ag.profissional}</div>
                    <div className={styles.cardFuncionario}>{ag.detalhes}</div>
                  </div>
                  <button className={styles.removeButton} onClick={() => handleRemove(ag.id)}>
                    Remover
                  </button>
                </div>
              ))
            ) : (
              <p>Nenhum agendamento para este dia.</p>
            )}
        </div>
        <button className={styles.removeButton} onClick={closeModal} style={{marginTop: 16}}>Fechar</button>
      </Modal>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Agendamentos para Hoje</h2>
        <div className={styles.cardsGrid}>
          {todayAppointments.length === 0 ? (
            <p className={styles.noAppointments}>Nenhum agendamento para hoje.</p>
          ) : (
            todayAppointments.map((ag) => (
              <div key={ag.id} className={styles.cardGridItem}>
                <div className={styles.timeBox}>{ag.hora}</div>
                <div>
                  <div className={styles.cardName}>{ag.nomePaciente}</div>
                  <div className={styles.cardService}>{ag.profissional}</div>
                  <div className={styles.cardFuncionario}>{ag.detalhes}</div>
                </div>
                <button className={styles.removeButton} onClick={() => handleRemove(ag.id)}>
                  Remover
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Próximos Agendamentos</h2>
        <div className={styles.cardsGrid}>
          {upcomingAppointments.length === 0 ? (
            <p className={styles.noAppointments}>Nenhum agendamento futuro.</p>
          ) : (
            upcomingAppointments.map((ag) => {
              const agDate = new Date(ag.data);
              agDate.setDate(agDate.getDate() + 1);
              return (
                <div key={ag.id} className={styles.cardGridItem}>
                  <div className={styles.timeBox}>
                    {format(agDate, 'MMM')}<br />
                    {ag.hora}
                  </div>
                  <div>
                    <div className={styles.cardName}>{ag.nomePaciente}</div>
                    <div className={styles.cardService}>{ag.profissional}</div>
                    <div className={styles.cardFuncionario}>{ag.detalhes}</div>
                    <div className={styles.cardDate}>
                      {format(agDate, 'dd/MM/yyyy')}
                    </div>
                  </div>
                  <button className={styles.removeButton} onClick={() => handleRemove(ag.id)}>
                    Remover
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Agendamentos;
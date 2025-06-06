import React, { useEffect, useState } from 'react';
import styles from './Sidebar.module.css';
import { MessageSquare, CalendarDays, User2 } from 'lucide-react';
import Link from 'next/link';
import { firestore } from '../../firebase/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

const Sidebar = () => {
  const [medicos, setMedicos] = useState<any[]>([]);

  useEffect(() => {
    const fetchMedicos = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'profissionais'));
        const arr = snap.docs.map(docRef => {
          const data = docRef.data();
          return {
            nome: data.nome || '',
            especialidade: data.especialidade || '',
            foto: data.foto || '',
            agendamentos: data.agendamentos || '', // Se não houver, ficará vazio
          };
        });
        // Adiciona 4 profissionais fakes para visualização
        arr.unshift(
          {
            nome: 'Dr. Emílio',
            especialidade: 'Clínico Geral',
            foto: '',
            agendamentos: 12,
          },
          {
            nome: 'Dra. Patricia Stankowich',
            especialidade: 'Dermatologista',
            foto: '',
            agendamentos: 8,
          },
          {
            nome: 'Dr. Daniel Silva',
            especialidade: 'Cardiologista',
            foto: '',
            agendamentos: 15,
          },
          {
            nome: 'Dra. Ana Paula',
            especialidade: 'Pediatra',
            foto: '',
            agendamentos: 10,
          }
        );
        setMedicos(arr);
      } catch {
        setMedicos([
          {
            nome: 'Dr. Exemplo',
            especialidade: 'Clínico Geral',
            foto: '',
            agendamentos: 12,
          },
          {
            nome: 'Dra. Maria Souza',
            especialidade: 'Dermatologista',
            foto: '',
            agendamentos: 8,
          },
          {
            nome: 'Dr. João Silva',
            especialidade: 'Cardiologista',
            foto: '',
            agendamentos: 15,
          },
          {
            nome: 'Dra. Ana Paula',
            especialidade: 'Pediatra',
            foto: '',
            agendamentos: 10,
          }
        ]);
      }
    };
    fetchMedicos();
  }, []);

  return (
    <aside className={styles.sidebar}>
      {/* Seção de Médicos acima dos cards */}
      <div className={styles.medicosSection}>
        <div className={styles.medicosHeader}>
          <span className={styles.medicosTitle}>Médicos</span>
          <span className={styles.medicosVerTodos}>Ver todos</span>
        </div>
        <div>
          {medicos.length === 0 && (
            <div className={styles.medicosEmpty}>Nenhum médico encontrado.</div>
          )}
          {medicos.map((medico, idx) => (
            <div key={medico.nome + idx} className={styles.medicoCard}>
              {medico.foto ? (
                <img src={medico.foto} alt={medico.nome} className={styles.medicoFoto} />
              ) : (
                <div className={styles.medicoFotoFallback}>
                  <User2 size={24} />
                </div>
              )}
              <div className={styles.medicoInfo}>
                <div className={styles.medicoNome}>{medico.nome}</div>
                <div className={styles.medicoEspecialidade}>{medico.especialidade}</div>
              </div>
              <div className={styles.medicoAgendamentos}>
                {medico.agendamentos ? `${medico.agendamentos} agend.` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <MessageSquare className={styles.icon} />
        </div>
        <h3 className={styles.title}>Assistente IA</h3>
        <p className={styles.description}>
          Assistente com inteligência artificial, oferece sugestões de tratamento,
          realiza diagnóstico e pronto para realizar prontuários e está disponível para responder.
        </p>
        <Link href="/artificialinteligence" passHref legacyBehavior>
        <button className={styles.button}>Faça uma pergunta</button>
        </Link>
      </div>

      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <CalendarDays className={styles.icon} />
        </div>
        <h3 className={styles.title}>Agendamentos</h3>
        <p className={styles.description}>
          Acesse os agendamentos dos próximos dias ou datas futuras.
        </p>
        <Link href="/admin/agendamentos" passHref legacyBehavior>
          <button className={styles.button}>Acessar agenda</button>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;

import React, { useEffect, useState } from 'react';
import styles from './SidebarAdmin.module.css';
import { Home, Calendar, User, LogOut, Stethoscope, Bot, FilePlus, ChevronDown, ChevronRight,} from 'lucide-react';
import Link from 'next/link';
import { auth, firestore } from '../../firebase/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/router';
import { doc, getDoc } from 'firebase/firestore';

const SidebarAdmin = () => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cadastroOpen, setCadastroOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setIsAuthenticated(!!user);
      if (user) {
        // Busca o tipo do usuário no Firestore
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().tipo === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/auth/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const toggleCadastro = () => {
    setCadastroOpen((prev) => !prev);
  };

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <img src="/images/ClinicAid branco.png" alt="ClinicAid Logo" />
      </div>
      <nav className={styles.nav}>
        <Link href="/" className={styles.navItem}>
          <Home className={styles.icon} />
          <span>Dashboard</span>
        </Link>
         <button type="button" onClick={toggleCadastro} className={`${styles.navItem} ${styles.cadastroButton}`}>
          <FilePlus className={styles.icon} />
          <span>Cadastros</span>
          {cadastroOpen ? (
            <ChevronDown className={styles.chevronIcon} size={16} />
          ) : (
            <ChevronRight className={styles.chevronIcon} size={16} />
          )}
        </button>
        {cadastroOpen && (
          <div className={styles.subNav}>
            <Link href="/admin/cadastros/procedimentos" className={styles.subNavItem}>
              Procedimentos
            </Link>
            <Link href="/admin/cadastros/convenios" className={styles.subNavItem}>
              Convênios
            </Link>
            <Link href="/admin/cadastros/formas-pagamento" className={styles.subNavItem}>
              Formas de Pagamento
            </Link>
            <Link href="/admin/cadastros/remedios" className={styles.subNavItem}>
              Remédios / Receitas
            </Link>
            <Link href="/admin/cadastros/salas" className={styles.subNavItem}>
              Salas
            </Link>
          </div>
        )}
        <Link href="/admin/agendamentos" className={styles.navItem}>
          <Calendar className={styles.icon} />
          <span>Agendamentos</span>
        </Link>
        <Link href="/assistente-ia" className={styles.navItem}>
          <Bot className={styles.icon} color="#fff" />
          <span>Assistente IA</span>
        </Link>
        <Link href="/admin/profissionais" className={styles.navItem}>
          <Stethoscope className={styles.icon} color="#fff" />
          <span>Profissionais</span>
        </Link>
        <Link href="/admin/pacientes" className={styles.navItem}>
          <span className={styles.icon} style={{width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {/* SVG gratuito de grupo de pessoas, branco, estilo Heroicons Users */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="7" r="4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23 20v-2a4 4 0 0 0-3-3.87" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span>Pacientes</span>
        </Link>
        <Link href="/profile" className={styles.navItem}>
          <User className={styles.icon} />
          <span>Perfil</span>
        </Link>
        <button onClick={handleLogout} className={`${styles.navItem} ${styles.logoutButton}`}>
          <LogOut className={styles.icon} />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
};

export default SidebarAdmin;

import React, { useEffect, useState } from 'react';
import styles from './SidebarAdmin.module.css';
import { Home, Calendar, User, LogOut, Stethoscope, Bot, FilePlus, ChevronDown, ChevronRight, Pill, Users, DollarSign } from 'lucide-react';
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
  const [farmaciaOpen, setFarmaciaOpen] = useState(false);

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

  const toggleFarmacia = () => {
    setFarmaciaOpen((prev) => !prev);
  };

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <img src="/images/Logo clinicaid branca lado .png" alt="ClinicAid Logo" />
      </div>
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          height: '100%',
          paddingTop: 0,
        }}
      >
        <nav
          className={styles.nav}
          style={{
            flexGrow: 0,
            width: '100%',
            marginTop: 0,
            marginBottom: 0,
            alignItems: 'flex-start',
            gap: 0,
            paddingTop: 0,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%' }}>
            <Link href="/" className={styles.navItem} style={{ marginTop: 0 }}>
              <Home className={styles.icon} style={{ marginTop: 0 }} />
              <span style={{ marginTop: 0 }}>Dashboard</span>
            </Link>
            <button type="button" onClick={toggleCadastro} className={`${styles.navItem} ${styles.cadastroButton}`} style={{ marginTop: 0 }}>
              <FilePlus className={styles.icon} style={{ marginTop: 0 }} />
              <span style={{ marginTop: 0 }}>Cadastros</span>
              {cadastroOpen ? (
                <ChevronDown className={styles.chevronIcon} size={16} style={{ marginTop: 0 }} />
              ) : (
                <ChevronRight className={styles.chevronIcon} size={16} style={{ marginTop: 0 }} />
              )}
            </button>
            {cadastroOpen && (
              <div className={styles.subNav} style={{ marginTop: 0 }}>
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
                <Link href="/admin/cadastros/cargos" className={styles.subNavItem}>
                  Cargos
                </Link>
                <Link href="/admin/cadastros/salas" className={styles.subNavItem}>
                  Salas
                </Link>
              </div>
            )}
            <Link href="/admin/agendamentos" className={styles.navItem} style={{ marginTop: 0 }}>
              <Calendar className={styles.icon} style={{ marginTop: 0 }} />
              <span style={{ marginTop: 0 }}>Agendamentos</span>
            </Link>
            <Link href="/assistente-ia" className={styles.navItem} style={{ marginTop: 0 }}>
              <Bot className={styles.icon} color="#fff" style={{ marginTop: 0 }} />
              <span style={{ marginTop: 0 }}>Assistente IA</span>
            </Link>
            <Link href="/admin/profissionais" className={styles.navItem} style={{ marginTop: 0 }}>
              <Stethoscope className={styles.icon} color="#fff" style={{ marginTop: 0 }} />
              <span style={{ marginTop: 0 }}>Profissionais</span>
            </Link>
            <Link href="/admin/pacientes" className={styles.navItem} style={{ marginTop: 0 }}>
              <span className={styles.icon} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 0 }}>
                <Users className={styles.icon} style={{ marginTop: 0 }} />
              </span>
              <span style={{ marginTop: 0 }}>Pacientes</span>
            </Link>
            <button type="button" onClick={toggleFarmacia} className={`${styles.navItem} ${styles.cadastroButton}`} style={{ marginTop: 0 }}>
              <Pill className={styles.icon} style={{ marginTop: 0 }} />
              <span style={{ marginTop: 0 }}>Farmácia</span>
              {farmaciaOpen ? (
                <ChevronDown className={styles.chevronIcon} size={16} style={{ marginTop: 0 }} />
              ) : (
                <ChevronRight className={styles.chevronIcon} size={16} style={{ marginTop: 0 }} />
              )}
            </button>
            {farmaciaOpen && (
              <div className={styles.subNav} style={{ marginTop: 0 }}>
                <Link href="/admin/farmacia/medicamentos" className={styles.subNavItem}>
                  Medicamentos
                </Link>
                <Link href="/admin/farmacia/movimentacoes" className={styles.subNavItem}>
                  Movimentações
                </Link>
              </div>
            )}
            <Link href="/admin/financeiro" className={styles.navItem} style={{ marginTop: 0 }}>
              <DollarSign className={styles.icon} style={{ marginTop: 0 }} />
              <span style={{ marginTop: 0 }}>Financeiro</span>
            </Link>
            <Link href="/profile" className={styles.navItem} style={{ marginTop: 0 }}>
              <User className={styles.icon} style={{ marginTop: 0 }} />
              <span style={{ marginTop: 0 }}>Perfil</span>
            </Link>
          </div>
        </nav>
        <button
          onClick={handleLogout}
          className={`${styles.logoutButton}`}
          style={{
            marginTop: 8,
            marginBottom: 0,
            alignSelf: 'stretch',
            width: '100%',
            fontWeight: 700,
            fontSize: 18,
            zIndex: 2,
          }}
        >
          <LogOut className={styles.icon} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default SidebarAdmin;

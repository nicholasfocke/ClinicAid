import React, { useEffect, useState } from 'react';
import styles from './SidebarAdmin.module.css';
import { Home, Calendar, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import { auth } from '../firebase/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/router';

const SidebarAdmin = () => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (!isAuthenticated) {
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
        <Link href="/agendamentos" className={styles.navItem}>
          <Calendar className={styles.icon} />
          <span>Agendamentos</span>
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

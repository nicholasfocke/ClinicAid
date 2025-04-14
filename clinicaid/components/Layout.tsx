import { ReactNode, useState, useEffect, useRef } from 'react';
import { FaInstagram, FaBars, FaTimes, FaSignOutAlt } from 'react-icons/fa';
import { auth, firestore } from '../firebase/firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import styles from './Layout.module.css';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SidebarAdmin from './SidebarAdmin';

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  const [menuOpen, setMenuOpen] = useState(false); // Controla se o menu está aberto
  const [isAdmin, setIsAdmin] = useState(false); // Estado para verificar se o usuário é administrador
  const router = useRouter(); // Hook para redirecionamento
  const menuRef = useRef<HTMLDivElement>(null); // Referência para o menu

  // Função para alternar a abertura e fechamento do menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Função de logout
  const handleLogout = async () => {
    try {
      await signOut(auth); // Firebase signOut
      router.push('/login'); // Redireciona para a página de login após o logout
    } catch (error) {
      console.error('Erro ao fazer logout: ', error);
    }
  };

  const closeMenu = () => {
    setMenuOpen(false); // Função para fechar o menu
  };

  // Fechar o menu ao clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu(); // Fechar o menu se clicar fora dele
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fechar o menu ao navegar para outra página
  useEffect(() => {
    closeMenu();
  }, [router.pathname]);

  // Verificar se o usuário é administrador
  useEffect(() => {
    const checkUserRole = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().tipo === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      }
    };

    checkUserRole();
  }, [auth.currentUser]);

  const noHeaderRoutes = ['/login', '/register', '/esquecisenha'];

  return (
    <div className={styles.layout}>
      {/* Exibe o SidebarAdmin em todas as páginas, exceto nas rotas de login, registro ou esqueci senha */}
      {!noHeaderRoutes.includes(router.pathname) && <SidebarAdmin />}
      <main className="mainContent">{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.contactInfo}>
            <p>Alguma dúvida?</p>
            <button className={styles.contactButton}>
              <a href="https://api.whatsapp.com/send/?phone=5582996900232&text=Gostaria+de+fazer+um+agendamento+&type=phone_number&app_absent=0" target="_blank" rel="noopener noreferrer">
                Entre em contato
              </a>
            </button>
            <div className={styles.socialMedia}>
              <a href="https://www.instagram.com/frida.kids_?igsh=MXY4dHN5aHpkZjRuOA==" target="_blank" rel="noopener noreferrer">
                <FaInstagram size={24} color="white" />
              </a>
            </div>
          </div>
        </div>
        <p>© 2025 ClinicAid - Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default Layout;
import { ReactNode, useState, useEffect, useRef } from 'react';
import { FaWhatsapp, FaEnvelope } from "react-icons/fa";
import { FaInstagram, FaBars, FaTimes, FaSignOutAlt } from 'react-icons/fa';
import { auth, firestore } from '../firebase/firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import styles from './styles/Layout.module.css';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SidebarAdmin from './layout/SidebarAdmin';

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
      router.push('/auth/login'); // Redireciona para a página de login após o logout
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

  const authRoutes = ['/auth/login', '/auth/register', '/auth/esquecisenha'];

  return (
    <div className={styles.layout} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Exibe o SidebarAdmin em todas as páginas, exceto nas rotas de login, registro ou esqueci senha */}
      {!authRoutes.includes(router.pathname) && <SidebarAdmin />}
      <main className="mainContent" style={{ flex: 1 }}>{children}</main>

      {authRoutes.includes(router.pathname) && (
        <footer className={styles.footer}>
          <div className={styles.footerContent}>
          <p className={styles.impactPhrase}>
            A tecnologia que otimiza seu tempo e melhora seu atendimento.
          </p>
          <div className={styles.contactInfo}>
            <button className={styles.contactButton}>Entre em Contato</button>
            <div className={styles.contactButtons}>
              <a href="https://api.whatsapp.com/send/?phone=5582996900232&text=Gostaria+de+fazer+um+agendamento+&type=phone_number&app_absent=0" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <FaWhatsapp size={24} color="white" />
              </a>
              <a href="mailto:contato@clinicaid.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Email"
                  className={styles.iconLink}>
                <FaEnvelope size={24} color="white"/>
              </a>
              <a href="https://www.instagram.com/frida.kids_?igsh=MXY4dHN5aHpkZjRuOA==" target="_blank" rel="noopener noreferrer">
                <FaInstagram size={24} color="white" />
              </a>
            </div>
          </div>
          <nav className={styles.usefulLinks}>
            <a href="/sobre">Sobre</a>
            <a href="/termos">Termos de Uso</a>
            <a href="/privacidade">Política de Privacidade</a>
            <a href="/faq">FAQ</a>
          </nav>
        </div>
        <p>© 2025 ClinicAid - Todos os direitos reservados.</p>
        </footer>
      )}
    </div>
  );
};

export default Layout;
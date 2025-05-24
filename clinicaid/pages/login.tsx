import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebase/firebaseConfig';
import styles from "@/styles/login.module.css";

const Login = () => {
  const [formData, setFormData] = useState({ email: '', senha: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleShowPassword = () => setShowPassword((v) => !v);

  // Verifica se o usuário está bloqueado
  const checkBlockStatus = async (email: string) => {
    const docRef = doc(firestore, 'loginAttempts', email);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const now = new Date().getTime();
      if (data.blockedUntil && data.blockedUntil.seconds * 1000 > now) {
        const minutesLeft = Math.ceil((data.blockedUntil.seconds * 1000 - now) / 60000);
        throw new Error(`Número de tentativas excedido. Tente novamente em ${minutesLeft} minutos.`);
      }
    }
  };

  // Incrementa as tentativas de login
  const incrementLoginAttempts = async (email: string) => {
    const docRef = doc(firestore, 'loginAttempts', email);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      await setDoc(docRef, { count: 1, blockedUntil: null });
    } else {
      const data = docSnap.data();
      if (data.count >= 4) {
        await updateDoc(docRef, {
          count: 5,
          blockedUntil: new Date(Date.now() + 30 * 60000),
        });
        throw new Error('Você errou o login 5 vezes. Sua conta foi bloqueada por 30 minutos.');
      } else {
        await updateDoc(docRef, { count: data.count + 1 });
      }
    }
  };

  const resetLoginAttempts = async (email: string) => {
    const docRef = doc(firestore, 'loginAttempts', email);
    await setDoc(docRef, { count: 0, blockedUntil: null }, { merge: true });
  };

  // Função de envio do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await checkBlockStatus(formData.email);
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.senha);
      const user = userCredential.user;
      await setDoc(doc(firestore, 'users', user.uid), { email: user.email }, { merge: true });
      await resetLoginAttempts(formData.email);
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        try {
          await incrementLoginAttempts(formData.email);
          setError('Senha ou email incorreto.');
        } catch (blockError: any) {
          setError(blockError.message);
        }
      } else if (err.code === 'auth/invalid-email') {
        setError('Formato de email inválido.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas falhadas. Tente novamente mais tarde ou redefina sua senha.');
      } else {
        setError('Erro de login. Tente novamente.');
      }
    }
    setLoading(false);
  };

  const handleRegisterRedirect = () => router.push('/register');
  const handleForgotPasswordRedirect = () => router.push('/esquecisenha');

  return (
    <div className={styles.loginModernBg}>
      <div className={styles.loginModernCard}>
        <div className={styles.logoModernBox}>
          <Image
            src="/images/ClinicAid logo ajustado.png"
            alt="Logo clinicaid"
            width={220}
            height={60}
            priority
          />
        </div>
        <h1 className={styles.loginModernTitle}>Login</h1>
        <form onSubmit={handleSubmit} className={styles.loginModernForm} autoComplete="off">
          <div className={styles.inputGroup}>
            <input
              name="email"
              type="email"
              placeholder="E-mail"
              value={formData.email}
              onChange={handleChange}
              required
              className={styles.loginModernInput}
              autoComplete="username"
            />
          </div>
          <div className={styles.inputGroup}>
            <input
              name="senha"
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              value={formData.senha}
              onChange={handleChange}
              required
              className={styles.loginModernInput}
              autoComplete="current-password"
            />
            <span onClick={toggleShowPassword} className={styles.loginModernEye}>
              {showPassword ? (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="#0099ff" strokeWidth="2" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3" stroke="#0099ff" strokeWidth="2"/></svg>
              ) : (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="#0099ff" strokeWidth="2" d="M17.94 17.94A10.97 10.97 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-6.06M9.88 9.88A3 3 0 0 1 12 9c1.66 0 3 1.34 3 3 0 .41-.08.8-.22 1.16"/><path stroke="#0099ff" strokeWidth="2" d="m1 1 22 22"/></svg>
              )}
            </span>
          </div>
          {error && <p className={styles.loginModernError}>{error}</p>}
          <button type="submit" className={styles.loginModernButton} disabled={loading}>
            {loading ? 'Carregando...' : 'Entrar'}
          </button>
        </form>
        <div className={styles.loginModernLinks}>
          <button onClick={handleForgotPasswordRedirect} className={styles.loginModernLink}>
            Esqueci minha senha
          </button>
          <button onClick={handleRegisterRedirect} className={styles.loginModernLinkAlt}>
            Criar uma nova conta
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
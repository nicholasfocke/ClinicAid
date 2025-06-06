import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, firestore } from '../../firebase/firebaseConfig';
import styles from "@/styles/login.module.css";
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', senha: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const router = useRouter();
  
  //Configuração do reCAPTCHA
  const {executeRecaptcha: recaptchaRef} = useGoogleReCaptcha();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleShowPassword = () => setShowPassword((v) => !v);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const email = formData.email.trim();
    const senha = formData.senha;

    // Validação básica
    if (!email || !senha) {
      setError('Por favor, preencha todos os campos.');
      setLoading(false);
      return;
    }

    // Validação de email básica
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(formData.email)) { 
      setError('Formato de email inválido.');
      setLoading(false);
      return;
    }

    //Verificação do reCAPTCHA
    if (!recaptchaRef) {  
      setError('Não foi possível carregar reCAPTCHA. Tente novamente mais tarde.');
      setLoading(false);
      return;
    }

    let recaptchaToken: string;
    try{
      recaptchaToken = await recaptchaRef('login');
    }catch(err){
      setError('Erro ao verificar reCAPTCHA. Tente novamente.');
      setLoading(false);
      return;
    }

    //Verficação do token no backend para validar o reCAPTCHA
   try{
      const verifyRes = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: recaptchaToken }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        setError('Falha na verificação do reCAPTCHA. Atualize a página e tente novamente.');
        setLoading(false);
        return;
      }
    } catch (err) {
      setError('Erro ao verificar reCAPTCHA. Tente novamente.');
      setLoading(false);
      return;
    }

    //Validando email e senha antes de enviar o login form
    try {
      await checkBlockStatus(formData.email);

      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;

      await setDoc(doc(firestore, 'users', user.uid), { email: user.email }, { merge: true });

      await resetLoginAttempts(formData.email);
      router.push('/');
  } 
    catch (err: any) {
      if(err.code === 'auth/user-not-found') {
        setError('Email ou senha incorreto.');
      }
      else if (err.code === 'auth/wrong-password') {
        try {
          await incrementLoginAttempts(formData.email);
          setError('Email ou senha incorreto.');
        } 
        catch (blockError: any) {
          setError(blockError.message);
        }
      } 
      else if (err.code === 'auth/invalid-email') {
        setError('Formato de email inválido.');
      } 
      else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas de login. Tente novamente mais tarde ou redefina sua senha.');
      } 
      else {
        setError('Erro de login. Tente novamente.');
      }
    }

    setLoading(false);
  };

  const handleRegisterRedirect = () => router.push('/auth/register');
  const handleForgotPasswordRedirect = () => router.push('/auth/esquecisenha');

  return (
    <div className={styles.loginSplitBg}>
      <div className={styles.loginSplitCard}>
        {/* Lado esquerdo: Login */}
        <div className={styles.loginSplitLeft}>
          <form onSubmit={handleSubmit} className={styles.loginSplitForm + ' ' + styles.loginSplitFormAnimated} autoComplete="off">
            <h1 className={styles.loginSplitTitle}>Fazer login</h1>
            <div className={styles.loginSplitInputGroup}>
              <input
                name="email"
                type="email"
                placeholder="E-mail"
                value={formData.email}
                onChange={handleChange}
                required
                className={styles.loginSplitInput}
                autoComplete="username"
              />
            </div>
            <div className={styles.loginSplitInputGroup}>
              <input
                name="senha"
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={formData.senha}
                onChange={handleChange}
                required
                className={styles.loginSplitInput}
                autoComplete="current-password"
              />
              <span onClick={toggleShowPassword} className={styles.loginSplitEye}>
                {showPassword ? (
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="#bdbdbd" strokeWidth="2" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3" stroke="#bdbdbd" strokeWidth="2"/></svg>
                ) : (
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="#bdbdbd" strokeWidth="2" d="M17.94 17.94A10.97 10.97 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-6.06M9.88 9.88A3 3 0 0 1 12 9c1.66 0 3 1.34 3 3 0 .41-.08.8-.22 1.16"/><path stroke="#bdbdbd" strokeWidth="2" d="m1 1 22 22"/></svg>
                )}
              </span>
            </div>
            {error && <p className={styles.loginSplitError}>{error}</p>}
            <button type="submit" className={styles.loginSplitButton} disabled={loading}>
              {loading ? 'Carregando...' : 'Entrar'}
            </button>
            <button onClick={handleForgotPasswordRedirect} className={styles.loginModernLinkAlt}>
            Esqueci minha senha
          </button>
            <div className={styles.loginSplitDivider}>
              <span>ou</span>
            </div>
            <div className={styles.loginSplitSocialRow}>
              <button type="button" className={styles.loginSplitSocialBtn} tabIndex={-1}>
                <svg width="26" height="26" viewBox="0 0 48 48"><g><circle fill="#fff" cx="24" cy="24" r="24"/><path fill="#4285F4" d="M34.5 24.3c0-.7-.1-1.4-.2-2H24v3.8h6c-.2 1.2-1 2.7-2.6 3.6v3h4.2c2.5-2.3 3.9-5.7 3.9-9.4z"/><path fill="#34A853" d="M24 36c3.2 0 5.8-1.1 7.7-2.9l-4.2-3c-1.2.8-2.7 1.3-4.5 1.3-3.5 0-6.5-2.4-7.6-5.6h-4.3v3.1C13.4 33.7 18.3 36 24 36z"/><path fill="#FBBC05" d="M16.4 25.8c-.3-.8-.5-1.7-.5-2.8s.2-2 .5-2.8v-3.1h-4.3C11.4 19.3 11 21.6 11 24s.4 4.7 1.1 6.9l4.3-3.1z"/><path fill="#EA4335" d="M24 17.7c1.8 0 3.4.6 4.6 1.7l3.4-3.4C29.8 14.1 27.2 13 24 13c-5.7 0-10.6 3.3-12.6 8.1l4.3 3.1c1.1-3.2 4.1-5.5 7.6-5.5z"/></g></svg>
              </button>
            </div>
          </form>
        </div>
        {/* Lado direito: Painel de cadastro */}
        <div className={styles.loginSplitRight}>
          <div className={styles.loginSplitPanel}>
            <div className={styles.logoModernBox} style={{ marginBottom: 18 }}>
              <Image
                src="/images/ClinicAid logo ajustado.png"
                alt="Logo clinicaid"
                width={270}
                height={70}
                priority
              />
            </div>
            <h2 className={styles.loginSplitPanelTitle}>Não tem uma conta?</h2>
            <p className={styles.loginSplitPanelDesc}>
              Cadastre-se para acessar todos os recursos da plataforma.
            </p>
            <button className={styles.loginSplitPanelButton} onClick={handleRegisterRedirect}>
              Cadastre-se
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
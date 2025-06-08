import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/firebaseConfig'; 
import styles from "@/styles/auth/login.module.css";
import { useRouter } from 'next/router';
import Image from 'next/image';

const EsqueciSenha = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Um email de redefinição de senha foi enviado.');
    } catch (err: any) {
      if (err.code === 'auth/invalid-email') {
        setError('Endereço de email inválido.');
      } else if (err.code === 'auth/user-not-found') {
        setError('Usuário não encontrado.');
      } else {
        setError('Ocorreu um erro. Tente novamente mais tarde.');
      }
    }
    setLoading(false);
  };

  const handleLoginRedirect = () => {
    router.push('/auth/login');
  };

  return (
    <div className={styles.loginModernBg}>
      <div className={styles.loginModernCard}>
        <div className={styles.logoModernBox}>
          <Image
            src="/images/ClinicAid logo ajustado.png"
            alt="Logo clinicaid"
            width={270}
            height={70}
            priority
          />
        </div>
        <h2 className={styles.loginModernTitle}>Recuperar senha</h2>
        <form onSubmit={handleSubmit} className={styles.loginModernForm}>
          <div className={styles.inputGroup}>
            <input
              type="email"
              placeholder="Digite seu email"
              value={email}
              onChange={handleChange}
              required
              className={styles.loginModernInput}
            />
          </div>
          {error && <p className={styles.loginModernError}>{error}</p>}
          {message && <p className={styles.loginModernError} style={{ color: "#0099ff" }}>{message}</p>}
          <button type="submit" className={styles.loginModernButton} disabled={loading}>
            {loading ? "Enviando..." : "Enviar"}
          </button>
        </form>
        <div className={styles.loginModernLinks}>
          <button onClick={handleLoginRedirect} className={styles.loginModernLinkesquecisenha}>
            Voltar ao Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default EsqueciSenha;

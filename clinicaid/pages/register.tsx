import { useState } from 'react';
import { useRouter } from 'next/router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, firestore } from '../firebase/firebaseConfig';
import bcrypt from 'bcryptjs';
import styles from "@/styles/login.module.css";
import Image from 'next/image';

const formatTelefone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
};

const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
};

const Register = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    senha: '',
    confirmarSenha: '',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'telefone') newValue = formatTelefone(value);
    if (name === 'cpf') newValue = formatCPF(value);
    setFormData({ ...formData, [name]: newValue });
  };

  const toggleShowPassword = () => setShowPassword((v) => !v);
  const toggleShowConfirmPassword = () => setShowConfirmPassword((v) => !v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.senha.length < 8) {
      setError('A senha deve conter no mínimo 8 caracteres.');
      return;
    }
    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      // Verifica se o email já existe
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', formData.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setError('Esse email já está cadastrado.');
        setLoading(false);
        return;
      }
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.senha);
      const user = userCredential.user;
      // Criptografa a senha antes de salvar no banco
      const hashedPassword = await bcrypt.hash(formData.senha, 10);
      await setDoc(doc(firestore, 'users', user.uid), {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        cpf: formData.cpf,
        senha: hashedPassword,
        tipo: 'cliente',
      });
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Esse email já está cadastrado.');
      } else {
        setError('Erro ao cadastrar. Tente novamente.');
      }
    }
    setLoading(false);
  };

  const handleRedirectToLogin = () => router.push('/login');

  return (
    <div className={styles.loginModernBg}>
      <div className={styles.loginModernCard}>
        <div className={styles.logoModernBox}>
          <Image src="/images/ClinicAid logo ajustado.png" alt="Logo clinicaid" width={220} height={60} priority />
        </div>
        <h2 className={styles.loginModernTitle}>Cadastro</h2>
        <form onSubmit={handleSubmit} className={styles.loginModernForm} autoComplete="off">
          <div className={styles.inputGroup}>
            <input
              name="nome"
              type="text"
              placeholder="Nome completo"
              value={formData.nome}
              onChange={handleChange}
              required
              className={styles.loginModernInput}
              autoComplete="name"
            />
          </div>
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
              name="telefone"
              type="text"
              placeholder="Telefone"
              value={formData.telefone}
              onChange={handleChange}
              required
              className={styles.loginModernInput}
              autoComplete="tel"
              maxLength={15}
            />
          </div>
          <div className={styles.inputGroup}>
            <input
              name="cpf"
              type="text"
              placeholder="CPF"
              value={formData.cpf}
              onChange={handleChange}
              required
              className={styles.loginModernInput}
              autoComplete="off"
              maxLength={14}
            />
          </div>
          <div className={styles.inputGroup}>
            <input
              name="senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha (mínimo 8 caracteres)"
              value={formData.senha}
              onChange={handleChange}
              required
              className={styles.loginModernInput}
              autoComplete="new-password"
              minLength={8}
            />
            <span onClick={toggleShowPassword} className={styles.loginModernEye}>
              {showPassword ? (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="#0099ff" strokeWidth="2" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3" stroke="#0099ff" strokeWidth="2"/></svg>
              ) : (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="#0099ff" strokeWidth="2" d="M17.94 17.94A10.97 10.97 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-6.06M9.88 9.88A3 3 0 0 1 12 9c1.66 0 3 1.34 3 3 0 .41-.08.8-.22 1.16"/><path stroke="#0099ff" strokeWidth="2" d="m1 1 22 22"/></svg>
              )}
            </span>
          </div>
          <div className={styles.inputGroup}>
            <input
              name="confirmarSenha"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirmar Senha"
              value={formData.confirmarSenha}
              onChange={handleChange}
              required
              className={styles.loginModernInput}
              autoComplete="new-password"
              minLength={8}
            />
            <span onClick={toggleShowConfirmPassword} className={styles.loginModernEye}>
              {showConfirmPassword ? (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="#0099ff" strokeWidth="2" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3" stroke="#0099ff" strokeWidth="2"/></svg>
              ) : (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="#0099ff" strokeWidth="2" d="M17.94 17.94A10.97 10.97 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-6.06M9.88 9.88A3 3 0 0 1 12 9c1.66 0 3 1.34 3 3 0 .41-.08.8-.22 1.16"/><path stroke="#0099ff" strokeWidth="2" d="m1 1 22 22"/></svg>
              )}
            </span>
          </div>
          {error && <p className={styles.loginModernError}>{error}</p>}
          <button type="submit" className={styles.loginModernButton} disabled={loading}>
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>
        <div className={styles.loginModernLinks}>
          <button onClick={handleRedirectToLogin} className={styles.loginModernLinkAlt}>
            Já possui uma conta? Fazer Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;

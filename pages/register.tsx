import { useState } from 'react';
import { useRouter } from 'next/router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, firestore } from '../firebase/firebaseConfig';
import bcrypt from 'bcryptjs';
import styles from "@/styles/register.module.css";
import Image from 'next/image';

const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
};

// Máscara para telefone (formato: (99) 99999-9999)
const formatTelefone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
};

// Função para validar CPF
function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf[i - 1]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf[i - 1]) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[10])) return false;
  return true;
}

const Register = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '', // adicionado telefone
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
    if (name === 'cpf') newValue = formatCPF(value);
    if (name === 'telefone') newValue = formatTelefone(value);
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

    // Validação do telefone: deve conter exatamente 11 dígitos numéricos
    const telefoneNumeros = formData.telefone.replace(/\D/g, '');
    if (telefoneNumeros.length !== 11) {
      setError('O telefone deve conter exatamente 11 dígitos.');
      return;
    }

    // Validação do CPF: deve conter exatamente 11 dígitos numéricos e ser válido
    const cpfNumeros = formData.cpf.replace(/\D/g, '');
    if (cpfNumeros.length !== 11 || !isValidCPF(formData.cpf)) {
      setError('O CPF informado não é válido.');
      return;
    }

    setLoading(true);
    try {
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
      const hashedPassword = await bcrypt.hash(formData.senha, 10);
      await setDoc(doc(firestore, 'users', user.uid), {
        nome: formData.nome,
        email: formData.email,
        cpf: formData.cpf,
        telefone: formData.telefone, // salva telefone
        senha: hashedPassword,
        tipo: 'cliente',
        fotoPerfil: '',
        fotoPerfilPath: '',
      });
      router.push('/login');
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
    <div className={styles.loginSplitBg}>
      <div className={styles.loginSplitCard}>
        {/* Esquerda */}
        <div className={styles.loginSplitLeft}>
          <div className={styles.loginSplitPanel}>
            <h2 className={styles.loginSplitPanelTitle}>
              <div className={styles.logoModernBox} style={{ marginBottom: 18 }}>
              <Image
                src="/images/ClinicAid logo ajustado.png"
                alt="Logo clinicaid"
                width={270}
                height={70}
                priority
              />
            </div>
              Já tem uma conta?
            </h2>
            <p className={styles.loginSplitPanelDesc}>
              Faça o login para acessar sua conta e aproveitar todos os nossos serviços.
            </p>
            <button
              className={styles.loginSplitPanelButton}
              onClick={handleRedirectToLogin}
            >
              Faça login
            </button>
          </div>
        </div>
        {/* Direita */}
        <div className={styles.loginSplitRight}>
          <form
            onSubmit={handleSubmit}
            className={styles.loginSplitForm}
            autoComplete="off"
          >
            <h2 className={styles.loginSplitTitle}>
              Cadastro
            </h2>
            <input
              name="nome"
              type="text"
              placeholder="Nome"
              value={formData.nome}
              onChange={handleChange}
              required
              className={styles.loginSplitInput}
              autoComplete="name"
            />
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
            <input
              name="cpf"
              type="text"
              placeholder="CPF"
              value={formData.cpf}
              onChange={handleChange}
              required
              className={styles.loginSplitInput}
              autoComplete="off"
              maxLength={14}
            />
            <input
              name="telefone"
              type="tel"
              placeholder="Telefone"
              value={formData.telefone}
              onChange={handleChange}
              required
              className={styles.loginSplitInput}
              autoComplete="tel"
              maxLength={15}
            />
            <div className={styles.passwordContainer}>
              <input
                name="senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                value={formData.senha}
                onChange={handleChange}
                required
                className={styles.loginSplitInput}
                autoComplete="new-password"
                minLength={8}
              />
              <span onClick={toggleShowPassword} className={styles.loginSplitEye}>
                {showPassword ? (
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="#bdbdbd" strokeWidth="2" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3" stroke="#bdbdbd" strokeWidth="2"/></svg>
                ) : (
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="#bdbdbd" strokeWidth="2" d="M17.94 17.94A10.97 10.97 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-6.06M9.88 9.88A3 3 0 0 1 12 9c1.66 0 3 1.34 3 3 0 .41-.08.8-.22 1.16"/><path stroke="#bdbdbd" strokeWidth="2" d="m1 1 22 22"/></svg>
                )}
              </span>
            </div>
            <div className={styles.passwordContainer}>
              <input
                name="confirmarSenha"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirmação de Senha"
                value={formData.confirmarSenha}
                onChange={handleChange}
                required
                className={styles.loginSplitInput}
                autoComplete="new-password"
                minLength={8}
              />
              <span onClick={toggleShowConfirmPassword} className={styles.loginSplitEye}>
                {showConfirmPassword ? (
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="#bdbdbd" strokeWidth="2" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3" stroke="#bdbdbd" strokeWidth="2"/></svg>
                ) : (
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="#bdbdbd" strokeWidth="2" d="M17.94 17.94A10.97 10.97 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-6.06M9.88 9.88A3 3 0 0 1 12 9c1.66 0 3 1.34 3 3 0 .41-.08.8-.22 1.16"/><path stroke="#bdbdbd" strokeWidth="2" d="m1 1 22 22"/></svg>
                )}
              </span>
            </div>
            {error && <p className={styles.loginSplitError}>{error}</p>}
            <button
              type="submit"
              className={styles.loginSplitButton}
              disabled={loading}
            >
              {loading ? 'Cadastrando...' : 'Cadastrar'}
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
      </div>
      <style jsx global>{`
        @keyframes loginSplitCardIn {
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes loginSplitFormIn {
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default Register;
import { useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import modalStyles from '@/styles/admin/medico/modalNovoMedico.module.css';
import styles from '@/styles/admin/medico/novoMedico.module.css';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, firestore } from '@/firebase/firebaseConfig';
import { uploadImage } from '@/utils/uploadImage';
import { buscarCargosNaoSaude } from '@/functions/cargosFunctions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate?: () => void;
}

const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
};

function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /(\d)\1+$/.test(cpf)) return false;
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

const NovoFuncionarioModal = ({ isOpen, onClose, onCreate }: Props) => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cargo: '',
    senha: '',
    confirmarSenha: '',
    cpf: '',
    telefone: '',
    dataNascimento: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [cargos, setCargos] = useState<{ id: string; nome: string }[]>([]);

  // Resetar formulário ao fechar o modal usando useEffect
  // useEffect já está importado no topo do arquivo

  // Função para resetar o formulário
  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      cargo: '',
      senha: '',
      confirmarSenha: '',
      cpf: '',
      telefone: '',
      dataNascimento: '',
    });
    setError('');
    setFoto(null);
    setFotoFile(null);
    setLoading(false);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
    // eslint-disable-next-line
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const fetched = await buscarCargosNaoSaude();
        setCargos(fetched);
      } catch (err) {
        console.error('Erro ao buscar cargos:', err);
      }
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTelefone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'cpf') newValue = formatCPF(value);
    if (name === 'telefone') newValue = formatTelefone(value);
    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const toggleShowPassword = () => setShowPassword((v) => !v);
  const toggleShowConfirmPassword = () => setShowConfirmPassword((v) => !v);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFoto(URL.createObjectURL(e.target.files[0]));
      setFotoFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.nome || !formData.email || !formData.cargo || !formData.senha || !formData.confirmarSenha || !formData.cpf || !formData.dataNascimento || !formData.telefone) {
      setError('Preencha todos os campos.');
      return;
    }
    if (formData.senha.length < 8) {
      setError('A senha deve conter no mínimo 8 caracteres.');
      return;
    }
    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }
    const cpfNumeros = formData.cpf.replace(/\D/g, '');
    if (cpfNumeros.length !== 11 || !isValidCPF(formData.cpf)) {
      setError('O CPF informado não é válido.');
      return;
    }
    if (!formData.dataNascimento.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setError('Informe a data de nascimento corretamente.');
      return;
    }
    // Converte dataNascimento para DD/MM/AAAA
    let dataNascimentoSalvar = '';
    if (formData.dataNascimento.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = formData.dataNascimento.split('-');
      dataNascimentoSalvar = `${d}/${m}/${y}`;
    } else {
      dataNascimentoSalvar = formData.dataNascimento;
    }
    setLoading(true);
    try {
      // Verifica se já existe funcionário com o mesmo email
      const funcionariosRef = collection(firestore, 'funcionarios');
      const q = query(funcionariosRef, where('email', '==', formData.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setError('Esse email já está cadastrado como funcionário.');
        setLoading(false);
        return;
      }

      // Cria usuário de autenticação
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.senha);

      // Upload da foto se houver
      let fotoPerfil = '';
      let fotoPerfilPath = '';
      if (fotoFile) {
        try {
          const uniqueName = `${formData.cpf.replace(/\D/g, '')}_${Date.now()}`;
          const { url, path } = await uploadImage(
            fotoFile,
            'funcionario_photos',
            uniqueName
          );
          fotoPerfil = url;
          fotoPerfilPath = path;
        } catch (err) {
          setError('Erro ao fazer upload da foto.');
          setLoading(false);
          return;
        }
      }

      // Criptografa a senha antes de salvar
      const hashedPassword = await bcrypt.hash(formData.senha, 10);

      // Cria documento na coleção 'funcionarios'
      const novoFuncionario = {
        nome: formData.nome,
        email: formData.email,
        cargo: formData.cargo,
        senha: hashedPassword,
        cpf: formData.cpf,
        telefone: formData.telefone,
        dataNascimento: dataNascimentoSalvar,
        tipo: 'admin',
        fotoPerfil,
        fotoPerfilPath,
      };
      await setDoc(doc(firestore, 'funcionarios', userCredential.user.uid), novoFuncionario);
      if (onCreate) onCreate();
      onClose();
    } catch (err) {
      setError('Erro ao cadastrar funcionário.');
    }
    setLoading(false);
  };

  return (
    <div className={modalStyles.overlay}>
      <div className={modalStyles.modal}>
        <button className={modalStyles.closeButton} onClick={onClose}>X</button>
        <h2 className={styles.title}>Adicionar Funcionário</h2>
  <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fotoBox}>
            {foto ? (
              <img src={foto} alt="Foto do funcionário" className={styles.fotoPreview} />
            ) : (
              <svg className={styles.fotoPreview} width="120" height="120" viewBox="0 0 120 120" fill="none">
                <circle cx="60" cy="60" r="60" fill="#E5E7EB" />
                <circle cx="60" cy="54" r="28" fill="#D1D5DB" />
                <ellipse cx="60" cy="94" rx="36" ry="22" fill="#D1D5DB" />
              </svg>
            )}
            <label className={styles.fotoBtn}>
              Carregar foto
              <input type="file" accept="image/*" onChange={handleFotoChange} style={{ display: 'none' }} />
            </label>
          </div>
          <input
            name="nome"
            type="text"
            placeholder="Nome"
            value={formData.nome}
            onChange={handleChange}
            required
            className={styles.input}
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            className={styles.input}
          />
          <input
            name="telefone"
            type="tel"
            placeholder="Telefone"
            value={formData.telefone}
            onChange={handleChange}
            required
            className={styles.input}
            maxLength={15}
          />
          <input
            name="dataNascimento"
            type="date"
            placeholder="Data de nascimento"
            value={formData.dataNascimento}
            onChange={handleChange}
            required
            className={styles.input}
          />
          <input
            name="cpf"
            type="text"
            placeholder="CPF"
            value={formData.cpf}
            onChange={handleChange}
            required
            className={styles.input}
            maxLength={14}
          />
          <select
            name="cargo"
            value={formData.cargo}
            onChange={handleChange}
            required
            className={styles.input}
          >
            <option value="">Selecione o cargo</option>
            {cargos.map((cargo) => (
              <option key={cargo.id} value={cargo.nome}>
                {cargo.nome}
              </option>
            ))}
          </select>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <input
              name="senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              value={formData.senha}
              onChange={handleChange}
              required
              className={styles.input}
              minLength={8}
              style={{ paddingRight: 40 }}
            />
            <span
              onClick={toggleShowPassword}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
              tabIndex={0}
            >
              {showPassword ? (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="#bdbdbd" strokeWidth="2" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3" stroke="#bdbdbd" strokeWidth="2"/></svg>
              ) : (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="#bdbdbd" strokeWidth="2" d="M17.94 17.94A10.97 10.97 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-6.06M9.88 9.88A3 3 0 0 1 12 9c1.66 0 3 1.34 3 3 0 .41-.08.8-.22 1.16"/><path stroke="#bdbdbd" strokeWidth="2" d="m1 1 22 22"/></svg>
              )}
            </span>
          </div>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <input
              name="confirmarSenha"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirmação de Senha"
              value={formData.confirmarSenha}
              onChange={handleChange}
              required
              className={styles.input}
              minLength={8}
              style={{ paddingRight: 40 }}
            />
            <span
              onClick={toggleShowConfirmPassword}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
              tabIndex={0}
            >
              {showConfirmPassword ? (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="#bdbdbd" strokeWidth="2" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3" stroke="#bdbdbd" strokeWidth="2"/></svg>
              ) : (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="#bdbdbd" strokeWidth="2" d="M17.94 17.94A10.97 10.97 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-6.06M9.88 9.88A3 3 0 0 1 12 9c1.66 0 3 1.34 3 3 0 .41-.08.8-.22 1.16"/><path stroke="#bdbdbd" strokeWidth="2" d="m1 1 22 22"/></svg>
              )}
            </span>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.buttonSalvar} disabled={loading}>
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NovoFuncionarioModal;

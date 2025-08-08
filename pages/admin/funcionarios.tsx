import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import { buscarFuncionarios, Funcionario } from '@/functions/funcionariosFunctions';
import FuncionarioCard from '@/components/admin/FuncionarioCard';
import NovoFuncionarioModal from '@/components/modals/NovoFuncionarioModal';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/funcionarios/funcionarios.module.css';

const Funcionarios = () => {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cargo: '',
    senha: '',
    cpf: '',
    telefone: '',
    dataNascimento: '',
  });
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchFuncionarios = async () => {
    try {
      const dados = await buscarFuncionarios();
      setFuncionarios(dados);
    } catch (err) {
      console.error('Erro ao buscar funcionários:', err);
    }
  };

  useEffect(() => {
    fetchFuncionarios();
  }, []);

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  const formatTelefone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'cpf') newValue = formatCPF(value);
    if (name === 'telefone') newValue = formatTelefone(value);
    setFormData((prev) => ({ ...prev, [name]: newValue }));
  } 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Validações básicas
    if (formData.senha.length < 8) {
      setError('A senha deve conter no mínimo 8 caracteres.');
      return;
    }
    if (!formData.nome || !formData.email || !formData.cargo || !formData.senha || !formData.cpf || !formData.telefone || !formData.dataNascimento) {
      setError('Preencha todos os campos.');
      return;
    }
    // Validação do telefone
    const telefoneNumeros = formData.telefone.replace(/\D/g, '');
    if (telefoneNumeros.length !== 11) {
      setError('O telefone deve conter exatamente 11 dígitos.');
      return;
    }
    // Validação do CPF
    const cpfNumeros = formData.cpf.replace(/\D/g, '');
    if (cpfNumeros.length !== 11) {
      setError('O CPF informado não é válido.');
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
    try {
      // Verifica se já existe funcionário com o mesmo email
      const funcionariosRef = collection(firestore, 'funcionarios');
      const q = query(funcionariosRef, where('email', '==', formData.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setError('Esse email já está cadastrado como funcionário.');
        return;
      }
      // Cria documento na coleção 'funcionarios'
      const novoFuncionario = {
        nome: formData.nome,
        email: formData.email,
        cargo: formData.cargo,
        senha: formData.senha,
        cpf: formData.cpf,
        telefone: formData.telefone,
        dataNascimento: dataNascimentoSalvar,
        tipo: 'admin',
        fotoPerfil: '',
        fotoPerfilPath: '',
      };
      // Cria com id automático
      const docRef = doc(funcionariosRef);
      await setDoc(docRef, novoFuncionario);
      setFormData({ nome: '', email: '', cargo: '', senha: '', cpf: '', telefone: '', dataNascimento: '' });
      fetchFuncionarios();
    } catch (err) {
      console.error('Erro ao criar funcionário:', err);
      setError('Erro ao criar funcionário');
    }
  };

  return (
    <div className={styles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumbActive}>Funcionários</span>
        </span>
      </div>
      <h1 className={styles.title}>Funcionários</h1>
      <div className={styles.subtitle}>Lista de funcionários cadastrados</div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
        <button className={styles.button} style={{ minWidth: 180 }} onClick={() => setShowModal(true)}>+ Adicionar funcionário</button>
        <input
          type="text"
          placeholder="🔍 Pesquisar funcionário"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            padding: '10px 14px 10px 36px',
            border: '1.5px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '1rem',
            width: '260px',
            background: '#f7fafc',
            marginLeft: '12px',
            color: '#222',
            height: '44px',
            alignSelf: 'stretch',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {funcionarios
          .filter(f => {
            const term = searchTerm.trim().toLowerCase();
            if (!term) return true;
            return (
              (f.nome && f.nome.toLowerCase().includes(term)) ||
              (f.email && f.email.toLowerCase().includes(term))
            );
          })
          .map((funcionario) => (
            <FuncionarioCard
              key={funcionario.id}
              funcionario={funcionario}
              onDelete={() => fetchFuncionarios()}
              onUpdate={() => fetchFuncionarios()}
            />
          ))}
      </div>
      <NovoFuncionarioModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreate={fetchFuncionarios}
      />
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default Funcionarios;


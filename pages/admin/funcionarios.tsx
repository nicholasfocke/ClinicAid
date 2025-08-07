import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
import { buscarFuncionarios, criarFuncionario, Funcionario } from '@/functions/funcionariosFunctions';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/funcionarios/funcionarios.module.css';

const Funcionarios = () => {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [formData, setFormData] = useState({ nome: '', email: '', cargo: '', senha: '' });
  const [error, setError] = useState('');
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await criarFuncionario(formData);
      setFormData({ nome: '', email: '', cargo: '', senha: '' });
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
      <div className={styles.subtitle}>Cadastro de funcionários</div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          name="nome"
          placeholder="Nome"
          value={formData.nome}
          onChange={handleChange}
          className={styles.input}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className={styles.input}
          required
        />
        <input
          type="text"
          name="cargo"
          placeholder="Cargo"
          value={formData.cargo}
          onChange={handleChange}
          className={styles.input}
          required
        />
        <input
          type="password"
          name="senha"
          placeholder="Senha"
          value={formData.senha}
          onChange={handleChange}
          className={styles.input}
          required
        />
        <button type="submit" className={styles.button}>Cadastrar</button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
      <ul className={styles.list}>
        {funcionarios.map((f) => (
          <li key={f.id}>{f.nome} - {f.cargo}</li>
        ))}
      </ul>
    </div>
  );
};

export default Funcionarios;


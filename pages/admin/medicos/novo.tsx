import { useState } from 'react';
import { criarMedico, medicoExiste } from '@/functions/medicosFunctions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/medico/novoMedico.module.css';
import { useRouter } from 'next/router';
import Link from 'next/link';


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

const formatHora = (value: string) => {
  return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1:$2').slice(0, 5);
};

const formatValor = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d)(\d{2})$/, '$1,$2')
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
    .slice(0, 10);
}

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

interface MedicoForm {
  nome: string;
  especialidade: string;
  diasAtendimento: string;
  horaInicio: string;
  horaFim: string;
  telefone: string;
  cpf: string;
  email: string;
  convenio: string;
  valorConsulta: string;
  foto?: string;
  fotoPath?: string;
}

const NovoMedico = () => {
  const [formData, setFormData] = useState<MedicoForm>({
    nome: '',
    especialidade: '',
    diasAtendimento: '',
    horaInicio: '',
    horaFim: '',
    telefone: '',
    cpf: '',
    email: '',
    convenio: '',
    valorConsulta: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'cpf') newValue = formatCPF(value);
    if (name === 'telefone') newValue = formatTelefone(value);
    if (name === 'horaInicio' || name === 'horaFim') newValue = formatHora(value);
    if (name === 'valorConsulta') newValue = formatValor(value);
    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files && e.target.files[0]) {
      setFoto(URL.createObjectURL(e.target.files[0]));
      setFotoFile(e.target.files[0]);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const telefoneNumeros = formData.telefone.replace(/\D/g, '');
    if (telefoneNumeros.length !== 11) {
      setError('O telefone deve conter exatamente 11 dígitos.');
      setLoading(false);
      return;
    }

    const cpfNumeros = formData.cpf.replace(/\D/g, '');
    if (cpfNumeros.length !== 11 || !isValidCPF(formData.cpf)) {
      setError('O CPF informado não é válido.');
      setLoading(false);
      return;
    }

    const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!horaRegex.test(formData.horaInicio) || !horaRegex.test(formData.horaFim)) {
      setError('Horário inválido. Use o formato HH:MM.');
      setLoading(false);
      return;
    }

    if (formData.valorConsulta && !/^\d+,\d{2}$/.test(formData.valorConsulta)) {
      setError('Valor da consulta deve estar no formato 0,00.');
      setLoading(false);
      return;
    }

    if (formData.horaInicio >= formData.horaFim) {
      setError('Hora fim deve ser após a hora início.');
      setLoading(false);
      return;
    }

    try {
      const exists = await medicoExiste(cpfNumeros, formData.email);
      if (exists) {
        setError('Já existe um médico cadastrado com esse CPF ou e-mail.');
        setLoading(false);
        return;
      }

      let fotoUrl = '';
      let fotoPath = '';
      
      if(fotoFile) {
        const storage = getStorage();
        const uniqueName = `${formData.cpf.replace(/\D/g, '')}_${Date.now()}`;
        const storageRef = ref(storage, `medico_photos/${uniqueName}`);
        await uploadBytes(storageRef, fotoFile);
        fotoUrl = await getDownloadURL(storageRef);
        fotoPath = storageRef.fullPath;
      }

      await criarMedico({ ...formData, foto: fotoUrl, fotoPath });

      router.push('/admin/medicos');
    } catch (err) {
      console.error('Erro ao cadastrar médico:', err);
      setError('Erro ao cadastrar médico.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Profissionais &gt; <span className={breadcrumbStyles.breadcrumbActive}>Novo</span>
        </span>
      </div>
      <h1 className={styles.title}>Novo Profissional</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input name="nome" value={formData.nome} onChange={handleChange} placeholder="Nome" className={styles.input} required />
        <input name="especialidade" value={formData.especialidade} onChange={handleChange} placeholder="Especialidade" className={styles.input} required />
        <input name="diasAtendimento" value={formData.diasAtendimento} onChange={handleChange} placeholder="Dias de Atendimento" className={styles.input} required />
        <input name="horaInicio" value={formData.horaInicio} onChange={handleChange} placeholder="Hora início" className={styles.input} required />
        <input name="horaFim" value={formData.horaFim} onChange={handleChange} placeholder="Hora fim" className={styles.input} required />
        <input name="telefone" value={formData.telefone} onChange={handleChange} placeholder="Telefone" className={styles.input} />
        <input name="cpf" value={formData.cpf} onChange={handleChange} placeholder="CPF" className={styles.input} />
        <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className={styles.input} />
        <input name="convenio" value={formData.convenio} onChange={handleChange} placeholder="Convênio" className={styles.input} />
        <input name="valorConsulta" value={formData.valorConsulta} onChange={handleChange} placeholder="Valor da consulta" className={styles.input} />
        <div className={styles.fotoBox}>
          {foto ? (
            <img src={foto} alt="Foto do médico" className={styles.fotoPreview} />
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
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" className={styles.buttonSalvar} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
         <Link href="/admin/medicos" passHref>
          <button type="button" className={styles.buttonCancelar}>
            Cancelar
          </button>
        </Link>
      </form>
    </div>
  );
};

export default NovoMedico;
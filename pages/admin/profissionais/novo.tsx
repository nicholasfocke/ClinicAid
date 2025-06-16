import { useEffect, useState } from 'react';
import { auth } from '@/firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { criarMedico, medicoExiste } from '@/functions/medicosFunctions';
import { criarHorario } from '@/functions/scheduleFunctions';
import { buscarProcedimentos } from '@/functions/procedimentosFunctions';
import { buscarCargos, ajustarNumeroUsuariosCargo } from '@/functions/cargosFunctions';
import { buscarConvenios } from '@/functions/conveniosFunctions';
import { buscarCargosSaude } from '@/functions/cargosFunctions';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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
  diasAtendimento: string[];
  cargoId: string;
  horaInicio: string;
  horaFim: string;
  almocoInicio: string;
  almocoFim: string;
  intervaloConsultas: number;
  telefone: string;
  cpf: string;
  email: string;
  convenio: string[];
  foto?: string;
  fotoPath?: string;
  procedimentos: string[]; // novo campo
}

interface Convenio {
  id: string;
  nome: string;
}

interface Cargo {
  id: string;
  nome: string;
}

interface User {
  uid: string;
  email: string;
}

const NovoMedico = () => {
  const [formData, setFormData] = useState<MedicoForm>({
    nome: '',
    especialidade: '',
    diasAtendimento: [],
    cargoId: '',
    horaInicio: '',
    horaFim: '',
    almocoInicio: '',
    almocoFim: '',
    intervaloConsultas: 15, // Corrigido: valor inicial padrão válido
    telefone: '',
    cpf: '',
    email: '',
    convenio: [],
    procedimentos: [],
  });
  const [convenios, setConvenios] = useState<Convenio[]>([])
  const [cargos, setCargos] = useState<{ id: string; nome: string }[]>([]);
  const [procedimentos, setProcedimentos] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPath, setFotoPath] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null); 
  const router = useRouter();

  const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      try {
        if (currentUser) {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email || '',
          });
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setError('Erro ao verificar autenticação.');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const fetchedConvenios = await buscarConvenios();
        setConvenios(fetchedConvenios);
        const fetchedProcedimentos = await buscarProcedimentos();
        setProcedimentos(fetchedProcedimentos);
        const fetchedCargos = await buscarCargosSaude();
        setCargos(fetchedCargos as Cargo[]);
      } catch (error) {
        console.error('Erro ao buscar convênios ou cargos:', error);
      }
    })();
  }, []);

  const toggleDia = (dia: string) => {
    setFormData(prev => {
      const exist = prev.diasAtendimento.includes(dia);
      const dias = exist
        ? prev.diasAtendimento.filter(d => d !== dia)
        : [...prev.diasAtendimento, dia];
      return { ...prev, diasAtendimento: dias };
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let newValue: string | number = value;
    if (name === 'cpf') newValue = formatCPF(value);
    if (name === 'telefone') newValue = formatTelefone(value);
    if (name === 'intervaloConsultas') {
      // Garante que o valor seja sempre um número válido e >= 5
      const num = Number(value);
      newValue = isNaN(num) || num < 5 ? 5 : num;
    }
    setFormData((prev) => ({ ...prev, [name]: newValue as any }));
  };

  // Preview e upload da foto
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFoto(URL.createObjectURL(file));
      setFotoFile(file);
      setFotoPath(null); // Limpa path anterior ao trocar imagem
    }
  };

  // Excluir foto do Storage (se já enviada)
  const handleFotoRemove = async () => {
    if (fotoPath) {
      try {
        const storage = getStorage();
        const storageRef = ref(storage, fotoPath);
        await deleteObject(storageRef);
      } catch (err) {
        // Se não existir, ignora
      }
    }
    setFoto(null);
    setFotoFile(null);
    setFotoPath(null);
    setFormData(prev => ({ ...prev, foto: '', fotoPath: '' }));
  };

  const handleCheckConvenio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      const atual = new Set(prev.convenio);
      if (checked) atual.add(value);
      else atual.delete(value);
      return { ...prev, convenio: Array.from(atual) };
    });
  };

  // Novo: handle para procedimentos múltiplos
  const handleProcedimentosChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setFormData(prev => ({ ...prev, procedimentos: selected }));
  };

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

    if ((formData.almocoInicio && !formData.almocoFim) || (!formData.almocoInicio && formData.almocoFim)) {
      setError('Preencha início e fim do intervalo de almoço.');
      setLoading(false);
      return;
    }

    if ((formData.almocoInicio && !horaRegex.test(formData.almocoInicio)) || (formData.almocoFim && !horaRegex.test(formData.almocoFim))) {
      setError('Horário de almoço inválido.');
      setLoading(false);
      return;
    }

    if (formData.almocoInicio && formData.almocoFim && formData.almocoInicio >= formData.almocoFim) {
      setError('Fim do almoço deve ser após o início.');
      setLoading(false);
      return;
    }

    if (formData.horaInicio >= formData.horaFim) {
      setError('Hora fim deve ser após a hora início.');
      setLoading(false);
      return;
    }

    if (formData.diasAtendimento.length === 0) {
      setError('Selecione ao menos um dia de atendimento.');
      setLoading(false);
      return;
    }

    // Validação extra para intervalo de consultas
    if (
      formData.intervaloConsultas === undefined ||
      formData.intervaloConsultas === null ||
      isNaN(Number(formData.intervaloConsultas)) ||
      Number(formData.intervaloConsultas) < 5
    ) {
      setError('O intervalo entre consultas deve ser de pelo menos 5 minutos.');
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
      let fotoPathFinal = fotoPath || '';

      // Upload da foto se houver arquivo novo
      if (fotoFile) {
        const storage = getStorage();
        const uniqueName = `${formData.cpf.replace(/\D/g, '')}_${Date.now()}`;
        const storageRef = ref(storage, `medico_photos/${uniqueName}`);
        await uploadBytes(storageRef, fotoFile);
        fotoUrl = await getDownloadURL(storageRef);
        fotoPathFinal = storageRef.fullPath;
      }

      const medicoRef = await criarMedico({
        nome: formData.nome,
        especialidade: formData.especialidade,
        diasAtendimento: formData.diasAtendimento,
        cargoId: formData.cargoId,
        telefone: formData.telefone,
        cpf: formData.cpf,
        email: formData.email,
        convenio: formData.convenio,
        intervaloConsultas: Number(formData.intervaloConsultas),
        foto: fotoUrl,
        fotoPath: fotoPathFinal,
        procedimentos: formData.procedimentos,
      });

      const cargoObj = cargos.find(c => c.nome === formData.especialidade);
      if (cargoObj) {
        await ajustarNumeroUsuariosCargo(cargoObj.id, 1);
      }

      if (medicoRef && formData.diasAtendimento.length > 0) {
        // Garante que o campo 'dia' seja salvo como 'Segunda', 'Terça', etc.
        for (const dia of formData.diasAtendimento) {
          await criarHorario(medicoRef.id, {
            dia, // deve ser 'Segunda', 'Terça', etc.
            horaInicio: formData.horaInicio || '',
            horaFim: formData.horaFim || '',
            almocoInicio: formData.almocoInicio || '',
            almocoFim: formData.almocoFim || '',
            intervaloConsultas: Number(formData.intervaloConsultas)
          });
        }
      }

      router.push('/admin/profissionais');
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
        <select name="especialidade" value={formData.especialidade} onChange={handleChange} className={styles.input} required>
          <option value="">Selecione a especialidade</option>
          {cargos.map((c) => (
            <option key={c.id} value={c.nome}>
              {c.nome}
            </option>
          ))}
        </select>
        <select name="cargoId" value={formData.cargoId} onChange={handleChange} className={styles.input} required>
          <option value="">Selecione o cargo</option>
          {cargos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <div className={styles.convenioHeader}>Selecione os dias de atendimento:</div>
        <div className={styles.diasBox}>
          {diasSemana.map((dia) => (
            <label key={dia} className={styles.diaItem}>
              <input
                type="checkbox"
                checked={formData.diasAtendimento.includes(dia)}
                onChange={() => toggleDia(dia)}
              />
              {dia}
            </label>
          ))}
        </div>
        <div className={styles.convenioHeader}>Horário de Ínicio/Fim</div>
        <input
          type="time"
          name="horaInicio"
          value={formData.horaInicio}
          onChange={handleChange}
          placeholder="Hora início"
          className={styles.input}
          required
        />
        <input
          type="time"
          name="horaFim"
          value={formData.horaFim}
          onChange={handleChange}
          placeholder="Hora fim"
          className={styles.input}
          required
        />
        <div className={styles.convenioHeader}>Intervalo Almoço</div>
        <input
          type="time"
          name="almocoInicio"
          value={formData.almocoInicio}
          onChange={handleChange}
          placeholder="Intervalo almoço início"
          className={styles.input}
        />
        <input
          type="time"
          name="almocoFim"
          value={formData.almocoFim}
          onChange={handleChange}
          placeholder="Intervalo almoço fim"
          className={styles.input}
        />
        <div className={styles.convenioHeader}>Intervalo entre consultas</div>
        <input
          type="number"
          name="intervaloConsultas"
          value={formData.intervaloConsultas}
          onChange={handleChange}
          placeholder="Intervalo das consultas (min)"
          className={styles.input}
          min={5} // Corrigido: impede valores menores que 5 no input
          required // Corrigido: campo obrigatório
        />
        <input name="telefone" value={formData.telefone} onChange={handleChange} placeholder="Telefone" className={styles.input} />
        <input name="cpf" value={formData.cpf} onChange={handleChange} placeholder="CPF" className={styles.input} />
        <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className={styles.input} />
        <div className={styles.convenioHeader}>Selecione os convênios (Se houver):</div>
        <div className = {styles.conveniosBox}>
          {convenios.map((c) => (
            <label key={c.id} className={styles.conveniosItem}>
              <input
                type="checkbox"
                value={c.nome}
                checked={formData.convenio.includes(c.nome)}
                onChange={handleCheckConvenio}
              />
              {c.nome}
            </label>
          ))}
        </div>
        <div className={styles.convenioHeader}>Selecione os procedimentos realizados:</div>
        <div className={styles.conveniosBox}>
          {procedimentos.map((p) => (
            <label key={p.id} className={styles.conveniosItem}>
              <input
                type="checkbox"
                value={p.nome}
                checked={formData.procedimentos.includes(p.nome)}
                onChange={e => {
                  const { value, checked } = e.target;
                  setFormData(prev => {
                    const atual = new Set(prev.procedimentos);
                    if (checked) atual.add(value);
                    else atual.delete(value);
                    return { ...prev, procedimentos: Array.from(atual) };
                  });
                }}
              />
              {p.nome}
            </label>
          ))}
        </div>
        <div className={styles.fotoBox}>
          {foto ? (
            <>
              <img src={foto} alt="Foto do médico" className={styles.fotoPreview} />
              <button
                type="button"
                className={styles.fotoBtn}
                onClick={handleFotoRemove}
                style={{ marginTop: 8 }}
              >
                Remover foto
              </button>
            </>
          ) : (
            <>
              <svg className={styles.fotoPreview} width="120" height="120" viewBox="0 0 120 120" fill="none">
                <circle cx="60" cy="60" r="60" fill="#E5E7EB" />
                <circle cx="60" cy="54" r="28" fill="#D1D5DB" />
                <ellipse cx="60" cy="94" rx="36" ry="22" fill="#D1D5DB" />
              </svg>
              <label className={styles.fotoBtn}>
                Carregar foto
                <input type="file" accept="image/*" onChange={handleFotoChange} style={{ display: 'none' }} />
              </label>
            </>
          )}
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" className={styles.buttonSalvar} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
         <Link href="/admin/profissionais" passHref>
          <button type="button" className={styles.buttonCancelar}>
            Cancelar
          </button>
        </Link>
      </form>
    </div>
  );
};

export default NovoMedico;
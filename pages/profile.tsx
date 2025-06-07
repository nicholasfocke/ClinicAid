import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth, firestore } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import styles from '@/styles/profile.module.css';
import breadcrumbStyles from "@/styles/Breadcrumb.module.css";

const Profile = () => {
  const [userData, setUserData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    fotoPerfil: '', // URL da foto de perfil
    fotoPerfilPath: '', // Caminho da foto no Storage
  });
  const [originalData, setOriginalData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    fotoPerfil: '',
    fotoPerfilPath: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChanged, setIsChanged] = useState(false); // Estado para verificar se algo mudou
  const [error, setError] = useState('');
  const [foto, setFoto] = useState<string | null>(null); // Preview local
  const [fotoFile, setFotoFile] = useState<File | null>(null); // Arquivo para upload
  const router = useRouter();

  useEffect(() => {
    let ignore = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Obter dados do usuário do Firestore
        const userDoc = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(userDoc);
        if (docSnap.exists() && !ignore) {
          const data = docSnap.data();
          const initialData = {
            nome: data.nome || '',
            email: data.email || '',
            telefone: data.telefone || '',
            cpf: data.cpf || '',
            fotoPerfil: data.fotoPerfil || '',
            fotoPerfilPath: data.fotoPerfilPath || '',
          };
          setUserData(initialData);
          setOriginalData(initialData);
          setFotoFile(null);
          setFoto(data.fotoPerfil || null);
        }
        if (!ignore) setIsLoading(false);
      } else {
        if (!ignore) router.push('/auth/login');
      }
    });

    return () => {
      ignore = true;
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    // Só marca como alterado se algum campo mudou ou se uma nova foto foi selecionada/removida
    const hasChanges =
      userData.nome !== originalData.nome ||
      userData.email !== originalData.email ||
      userData.telefone !== originalData.telefone ||
      userData.cpf !== originalData.cpf ||
      fotoFile !== null ||
      (foto === null && originalData.fotoPerfil) || // Remoção da foto
      (fotoFile && foto); // Nova foto selecionada
    setIsChanged(!!hasChanges);
    // eslint-disable-next-line
  }, [userData, originalData, foto, fotoFile]);

  // Função para verificar se o email ou telefone já está cadastrado por OUTRO usuário
  const checkIfEmailOrPhoneExists = async () => {
    try {
      const q = query(
        collection(firestore, 'users'),
        where('email', '==', userData.email),
        where('telefone', '==', userData.telefone)
      );
      const querySnapshot = await getDocs(q);
      // Permite atualizar se o único documento encontrado for o próprio usuário logado
      if (!querySnapshot.empty) {
        const user = auth.currentUser;
        if (user) {
          let onlyOwnDoc = true;
          querySnapshot.forEach((docSnap) => {
            if (docSnap.id !== user.uid) {
              onlyOwnDoc = false;
            }
          });
          return !onlyOwnDoc; // retorna true se existe outro usuário, false se só ele mesmo
        }
      }
      return false;
    } catch (error) {
      console.error('Erro ao verificar email ou telefone existentes: ', error);
      return false;
    }
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

  // Função para atualizar dados no Firebase
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError('');

    // Validação do telefone: deve conter exatamente 11 dígitos numéricos
    const telefoneNumeros = userData.telefone.replace(/\D/g, '');
    if (telefoneNumeros.length !== 11) {
      setError('O número de celular deve conter exatamente 11 dígitos.');
      setIsUpdating(false);
      return;
    }

    // Validação do CPF: deve conter exatamente 11 dígitos numéricos e ser válido
    const cpfNumeros = userData.cpf.replace(/\D/g, '');
    if (cpfNumeros.length !== 11 || !isValidCPF(userData.cpf)) {
      setError('O CPF informado não é válido.');
      setIsUpdating(false);
      return;
    }

    try {
      const user = auth.currentUser;
      let fotoPerfilUrl = userData.fotoPerfil;
      let fotoPerfilPath = userData.fotoPerfilPath;

      if (user) {
        const storage = getStorage();
        // Upload da nova foto se houver
        if (fotoFile) {
          const nomeUnico = `${user.uid}_${Date.now()}_$`; // Garante nome único para evitar conflitos
          const storageRef = ref(storage, `profile_photos/${nomeUnico}`);
          await uploadBytes(storageRef, fotoFile);
          fotoPerfilUrl = await getDownloadURL(storageRef);
          fotoPerfilPath = storageRef.fullPath;
        }
        // Remover foto do storage se removida
        if (!foto && originalData.fotoPerfil && !fotoFile) {
          try {
            const pathToDelete = originalData.fotoPerfilPath || `profile_photos/${user.uid}`;
            const storageRef = ref(storage, pathToDelete);
            await deleteObject(storageRef);
          } catch (err) {
            // Se não existir, ignora
          }
          fotoPerfilUrl = '';
          fotoPerfilPath = '';
        }

        // Permite atualizar mesmo se email ou telefone já existirem, desde que seja o próprio usuário
        const emailOrPhoneExists = await checkIfEmailOrPhoneExists();
        if (emailOrPhoneExists) {
          setError('Email ou telefone já cadastrados por outro usuário.');
          setIsUpdating(false);
          return;
        }

        const userDoc = doc(firestore, 'users', user.uid);
        await updateDoc(userDoc, {
          nome: userData.nome,
          email: userData.email,
          telefone: userData.telefone,
          cpf: userData.cpf,
          fotoPerfil: fotoPerfilUrl,
          fotoPerfilPath: fotoPerfilPath,
        });
        alert('Dados atualizados com sucesso!');
        // Atualiza o estado original e limpa preview local
        setOriginalData({ ...userData, fotoPerfil: fotoPerfilUrl, fotoPerfilPath });
        setFotoFile(null);
        setIsChanged(false);
        setUserData((prev) => ({ ...prev, fotoPerfil: fotoPerfilUrl, fotoPerfilPath }));
        setFoto(fotoPerfilUrl || null);
      }
    } catch (error) {
      console.error('Erro ao atualizar dados: ', error);
      setError('Erro ao atualizar os dados. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFoto(URL.createObjectURL(e.target.files[0]));
      setFotoFile(e.target.files[0]);
      // Não altera userData.fotoPerfil aqui, só ao salvar
    }
  };

  const handleRemoverFoto = () => {
    setFoto(null);
    setFotoFile(null);
    // Não altera userData.fotoPerfil aqui, só ao salvar
    setIsChanged(true);
  };

  if (isLoading) {
    return <p>Carregando dados...</p>;
  }

  return (
    <div className={styles.profilePageContainer}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumbActive}>Perfil</span>
        </span>
      </div>
      <h1 className={styles.profileTitle}>Meu perfil</h1>
      <div className={styles.profileSubtitle}>
        Atualize suas informações pessoais e mantenha seus dados em dia
      </div>
      <div className={styles.profileFormWrapper}>
        <div className={styles.profilePhotoColumn}>
          <div className={styles.perfilFotoBox}>
            <div className={styles.perfilFotoWrapper}>
              {foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={foto} alt="Foto de perfil" className={styles.perfilFoto} />
              ) : userData.fotoPerfil ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userData.fotoPerfil} alt="Foto de perfil" className={styles.perfilFoto} />
              ) : (
                <svg className={styles.perfilFoto} width="120" height="120" viewBox="0 0 120 120" fill="none">
                  <circle cx="60" cy="60" r="60" fill="#E5E7EB"/>
                  <circle cx="60" cy="54" r="28" fill="#D1D5DB"/>
                  <ellipse cx="60" cy="94" rx="36" ry="22" fill="#D1D5DB"/>
                </svg>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              <label className={styles.perfilFotoBtn}>
                Carregar foto
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFotoChange} />
              </label>
              {(foto || userData.fotoPerfil) && (
                <button type="button" className={styles.perfilFotoBtn} style={{ background: "#e53e3e" }} onClick={handleRemoverFoto}>
                  Remover foto
                </button>
              )}
            </div>
          </div>
        </div>
        <form onSubmit={handleUpdate} className={styles.profileFormMain}>
          <div className={styles.profileGrid}>
            <div className={styles.profileField}>
              <label htmlFor="nome">Nome</label>
              <input
                type="text"
                id="nome"
                value={userData.nome}
                onChange={(e) => setUserData({ ...userData, nome: e.target.value })}
                required
              />
              <span className={styles.perfilHint}>Nome como aparece em seu documento.</span>
            </div>
            <div className={styles.profileField}>
              <label htmlFor="email">E-mail</label>
              <input
                type="email"
                id="email"
                value={userData.email}
                onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                required
              />
              <span className={styles.perfilHint}>e-mail para notificações e recuperação de senha.</span>
            </div>
            <div className={styles.profileField}>
              <label htmlFor="telefone">Telefone</label>
              <input
                type="text"
                id="telefone"
                value={userData.telefone}
                onChange={(e) => setUserData({ ...userData, telefone: e.target.value })}
                required
              />
              <span className={styles.perfilHint}>Telefone para notificações e contato.</span>
            </div>
            <div className={styles.profileField}>
              <label htmlFor="cpf">CPF</label>
              <input
                type="text"
                id="cpf"
                value={userData.cpf}
                onChange={(e) => setUserData({ ...userData, cpf: e.target.value })}
                required
              />
              <span className={styles.perfilHint}>O número do seu documento sem pontos ou traços.</span>
            </div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 32 }}>
            <button type="submit" className={styles.perfilBtn} disabled={!isChanged || isUpdating}>
              {isUpdating ? 'Atualizando...' : 'Atualizar Dados'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
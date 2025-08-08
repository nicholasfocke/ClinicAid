import React, { useState } from 'react';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import styles from '@/styles/admin/medico/medicos.module.css';

export interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
  email: string;
  telefone?: string;
  cpf?: string;
  dataNascimento?: string;
  fotoPerfil?: string;
  fotoPerfilPath?: string;
}

interface FuncionarioCardProps {
  funcionario: Funcionario;
  onDelete?: (id: string) => void;
  onUpdate?: (funcionario: Funcionario) => void;
}

import { useEffect } from 'react';
const FuncionarioCard = ({ funcionario, onDelete, onUpdate }: FuncionarioCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Funcionario>({ ...funcionario });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(formData.fotoPerfil || null);

    // Resetar o formulário de edição ao fechar o modal
    useEffect(() => {
      if (!editing && !showDetails) {
        setFormData({ ...funcionario });
        setFotoFile(null);
        setFotoPreview(funcionario.fotoPerfil || null);
      }
    }, [editing, showDetails, funcionario]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
      setFormData(prev => ({ ...prev, fotoPerfil: '', fotoPerfilPath: '' }));
    }
  };

  const handleFotoRemove = async () => {
    if (formData.fotoPerfilPath) {
      try {
        const storage = getStorage();
        const storageRef = ref(storage, formData.fotoPerfilPath);
        await deleteObject(storageRef);
      } catch (err) {}
    }
    setFotoFile(null);
    setFotoPreview(null);
    setFormData(prev => ({ ...prev, fotoPerfil: '', fotoPerfilPath: '' }));
  };

  const handleSave = async () => {
    try {
      let fotoPerfil = formData.fotoPerfil || '';
      let fotoPerfilPath = formData.fotoPerfilPath || '';
      // Upload da nova foto se houver arquivo novo
      if (fotoFile) {
        // Remove foto antiga se existir
        if (formData.fotoPerfilPath) {
          try {
            const storage = getStorage();
            const storageRef = ref(storage, formData.fotoPerfilPath);
            await deleteObject(storageRef);
          } catch (err) {}
        }
        const storage = getStorage();
        const uniqueName = `${formData.cpf?.replace(/\D/g, '') || 'funcionario'}_${Date.now()}`;
        const storageRef = ref(storage, `funcionario_photos/${uniqueName}`);
        await uploadBytes(storageRef, fotoFile);
        fotoPerfil = await getDownloadURL(storageRef);
        fotoPerfilPath = storageRef.fullPath;
      }
      const funcionarioRef = doc(firestore, 'funcionarios', funcionario.id);
      await updateDoc(funcionarioRef, {
        nome: formData.nome,
        cargo: formData.cargo,
        email: formData.email,
        telefone: formData.telefone,
        cpf: formData.cpf,
        dataNascimento: formData.dataNascimento,
        fotoPerfil,
        fotoPerfilPath,
      });
      if (onUpdate) onUpdate({ ...formData, fotoPerfil, fotoPerfilPath });
      setEditing(false);
      setShowDetails(false);
      setFotoFile(null);
    } catch (err) {
      alert('Erro ao salvar alterações.');
    }
  };

  const handleDelete = async () => {
    try {
      const funcionarioRef = doc(firestore, 'funcionarios', funcionario.id);
      await deleteDoc(funcionarioRef);
      if (onDelete) onDelete(funcionario.id);
      setShowDetails(false);
    } catch (err) {
      alert('Erro ao excluir funcionário.');
    }
  };

  return (
    <div className={styles.medicoCardWrapper}>
      <div className={styles.medicoCard}>
        {funcionario.fotoPerfil ? (
          <img src={funcionario.fotoPerfil} alt={funcionario.nome} className={styles.medicoFoto} />
        ) : (
          <svg className={styles.medicoFoto} width="80" height="80" viewBox="0 0 120 120" fill="none">
            <circle cx="60" cy="60" r="60" fill="#E5E7EB" />
            <circle cx="60" cy="54" r="28" fill="#D1D5DB" />
            <ellipse cx="60" cy="94" rx="36" ry="22" fill="#D1D5DB" />
          </svg>
        )}
        <div className={styles.medicoInfo}>
          <div className={styles.medicoNome}>{funcionario.nome}</div>
          <div className={styles.medicoEspecialidade}>{funcionario.cargo}</div>
          {funcionario.email && (
            <div className={styles.medicoValor}>{funcionario.email}</div>
          )}
          {funcionario.cpf && (
            <div className={styles.medicoValor}>{funcionario.cpf}</div>
          )}
        </div>
        <button className={styles.verDetalhes} onClick={() => setShowDetails(true)}>
          Ver detalhes
        </button>
      </div>
      {showDetails && (
        <div className={styles.detalhesOverlay}>
          {confirmDelete ? (
            <div className={styles.detalhesCard}>
              <p>Confirmar exclusão?</p>
              <div className={styles.detalhesButtons}>
                <button className={styles.buttonExcluir} onClick={handleDelete}>
                  Confirmar
                </button>
                <button className={styles.buttonEditar} onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : editing ? (
            <div className={styles.detalhesCard}>
              <div className={styles.fotoBox}>
                {fotoPreview ? (
                  <>
                    <img src={fotoPreview} alt={formData.nome} className={styles.medicoFoto} />
                    <button
                      className={styles.buttonRemoverFoto}
                      onClick={handleFotoRemove}
                    >
                      Remover foto
                    </button>
                  </>
                ) : (
                  <>
                    <label className={styles.buttonEditar}>
                      Carregar foto
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={handleFotoChange}
                      />
                    </label>
                  </>
                )}
              </div>
              <input
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className={styles.inputEditar}
                placeholder="Nome"
              />
              <input
                name="cargo"
                value={formData.cargo}
                onChange={handleChange}
                className={styles.inputEditar}
                placeholder="Cargo"
              />
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.inputEditar}
                placeholder="Email"
              />
              <input
                name="telefone"
                value={formData.telefone || ''}
                onChange={handleChange}
                className={styles.inputEditar}
                placeholder="Telefone"
              />
              <input
                name="cpf"
                value={formData.cpf || ''}
                onChange={handleChange}
                className={styles.inputEditar}
                placeholder="CPF"
              />
              <input
                name="dataNascimento"
                value={formData.dataNascimento || ''}
                onChange={handleChange}
                className={styles.inputEditar}
                placeholder="Data de nascimento"
              />
              <div className={styles.detalhesButtons}>
                <button className={styles.buttonEditar} onClick={handleSave}>
                  Salvar
                </button>
                <button className={styles.buttonCancelar} onClick={() => setEditing(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.detalhesCard}>
              {funcionario.fotoPerfil ? (
                <img src={funcionario.fotoPerfil} alt={funcionario.nome} className={styles.medicoFoto} />
              ) : (
                <svg className={styles.medicoFoto} width="80" height="80" viewBox="0 0 120 120" fill="none">
                  <circle cx="60" cy="60" r="60" fill="#E5E7EB" />
                  <circle cx="60" cy="54" r="28" fill="#D1D5DB" />
                  <ellipse cx="60" cy="94" rx="36" ry="22" fill="#D1D5DB" />
                </svg>
              )}
              <div className={styles.medicoNome}>{funcionario.nome}</div>
              <div className={styles.medicoEspecialidade}>{funcionario.cargo}</div>
              {funcionario.telefone && (
                <div className={styles.medicoValor}>Telefone: {funcionario.telefone}</div>
              )}
              {funcionario.cpf && (
                <div className={styles.medicoValor}>CPF: {funcionario.cpf}</div>
              )}
              {funcionario.email && (
                <div className={styles.medicoValor}>Email: {funcionario.email}</div>
              )}
              {funcionario.dataNascimento && (
                <div className={styles.medicoValor}>Nascimento: {funcionario.dataNascimento}</div>
              )}
              <div className={styles.detalhesButtons}>
                <button className={styles.buttonExcluir} onClick={() => setConfirmDelete(true)}>
                  Excluir funcionário
                </button>
                <button className={styles.buttonEditar} onClick={() => setEditing(true)}>
                  Editar funcionário
                </button>
              </div>
              <button className={styles.buttonFechar} onClick={() => setShowDetails(false)}>
                X
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FuncionarioCard;

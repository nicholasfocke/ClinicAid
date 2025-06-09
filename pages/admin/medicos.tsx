import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/medicos.module.css';

const Medicos = () => {
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const handleAddClick = () => setShowForm(true);
  const handleCancel = () => {
    setShowForm(false);
    router.push('/admin/medicos');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: salvar médico no banco
    setShowForm(false);
  };

  return (
    <div className={styles.container}>
      {!showForm ? (
        <div>
          <h1 className={styles.title}>Médicos</h1>
          <button className={styles.addButton} onClick={handleAddClick}>
            Adicionar Médico
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.formTitle}>Adicionar Médico</h2>
          <div className={styles.formGroup}>
            <label htmlFor="nome">Nome</label>
            <input id="nome" type="text" required />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="especialidade">Especialidade</label>
            <input id="especialidade" type="text" required />
          </div>
          <div className={styles.formButtons}>
            <button type="submit" className={styles.saveButton}>Salvar</button>
            <button type="button" onClick={handleCancel} className={styles.cancelButton}>Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Medicos;

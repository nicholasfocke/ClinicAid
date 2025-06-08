import { useEffect, useState } from 'react';
import { buscarMedicos } from '@/functions/medicosFunctions';
import DoctorCard, { Medico } from '@/components/admin/DoctorCard';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/medicos.module.css';
import Link from 'next/link';

const Medicos = () => {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMedicos = async () => {
      try {
        const docs = await buscarMedicos();
        setMedicos(docs as Medico[]);
      } catch (err) {
        console.error('Erro ao buscar médicos:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMedicos();
  }, []);

  if (loading) {
    return <p>Carregando profissionais...</p>;
  }

  return (
    <div className={styles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumbActive}>Profissionais</span>
        </span>
      </div>
      <h1 className={styles.titleMedicos}>Profissionais</h1>
      <div className={styles.subtitleMedicos}>Lista de profissionais cadastrados</div>
      <div className={styles.actionButtonsWrapper}>
        <Link href="/admin/medicos/novo" className={styles.buttonAdicionar}>+ Adicionar médico</Link>
      </div>
      <div className={styles.medicosList}>
        {medicos.map((med) => (
          <DoctorCard
            key={med.id}
            medico={med}
            onDelete={(id) =>
              setMedicos((prev) => prev.filter((m) => m.id !== id))
            }
            onUpdate={(m) =>
              setMedicos((prev) => prev.map((p) => (p.id === m.id ? m : p)))
            }
          />
        ))}
      </div>
    </div>
  );
};

export default Medicos;
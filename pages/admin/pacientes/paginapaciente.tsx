import ProtectedRoute from '@/components/layout/ProtectedRoute';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/admin/pacientes/paginapaciente.module.css';

export default function PaginaPaciente() {
  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={breadcrumbStyles.breadcrumbWrapper}>
          <span className={breadcrumbStyles.breadcrumb}>Menu Principal &gt; </span>
          <span className={breadcrumbStyles.breadcrumbActive}>Pagina do paciente</span>
        </div>
        <h1 className={styles.title}>Pagina do paciente</h1>
        <div className={styles.subtitlePacientes}>Gerencie informações sobre os pacientes.</div>
      </div>
    </ProtectedRoute>
  );
}
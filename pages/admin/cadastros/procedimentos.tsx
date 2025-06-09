import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import pageStyles from '@/styles/admin/medicos.module.css';

const Procedimentos = () => {
  return (
    <div className={pageStyles.container}>
      <div className={breadcrumbStyles.breadcrumbWrapper}>
        <span className={breadcrumbStyles.breadcrumb}>
          Menu Principal &gt; <span className={breadcrumbStyles.breadcrumb}>Cadastros &gt; </span>
          <span className={breadcrumbStyles.breadcrumbActive}>Procedimentos</span>
        </span>
      </div>
      <h1 className={pageStyles.titleMedicos}>Procedimentos</h1>
      <div className={pageStyles.subtitleMedicos}>
        Lista de procedimentos cadastrados
      </div>
    </div>
  );
};

export default Procedimentos;
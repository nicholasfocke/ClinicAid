import React from 'react';
import styles from './styles/StickyFooter.module.css';

type Props = {
  totalItems: number;
  itemsPerPage: number;
  setItemsPerPage: (n: number) => void;
  currentPage: number;
  setCurrentPage: (n: number) => void;
};

const StickyFooterPagination: React.FC<Props> = ({
  totalItems,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const changePage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleItemsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10);
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const start = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={styles.stickyFooter}>
      <div className={styles.leftControls}>
        <span>Mostrar</span>
        <select
          value={itemsPerPage}
          onChange={handleItemsChange}
          className={styles.select}
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span>Registros |</span>
        <span className={styles.legend}>
          {`Página ${currentPage} / ${totalPages} de ${totalPages}`}
        </span>
      </div>

      <div className={styles.pagination}>
        <button
          onClick={() => changePage(currentPage - 1)}
          disabled={currentPage === 1}
          className={styles.pageBtn}
        >
          ‹
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => changePage(page)}
            className={
              currentPage === page
                ? `${styles.pageBtn} ${styles.active}`
                : styles.pageBtn
            }
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => changePage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={styles.pageBtn}
        >
          ›
        </button>
      </div>
    </div>
  );
};

export default StickyFooterPagination;
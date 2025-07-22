import React from 'react';
import styles from './styles/tablePagination.module.css';

interface Props {
  totalItems: number;
  itemsPerPage: number;
  setItemsPerPage: (n: number) => void;
  currentPage: number;
  setCurrentPage: (n: number) => void;
  showTop?: boolean;
  showBottom?: boolean;
}

const TablePagination: React.FC<Props> = ({
  totalItems,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  showTop = true,
  showBottom = true,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const handleItemsChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  const changePage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <>
      {showTop && (
        <div className={styles.topControls}>
          <span>Mostrar</span>
          <select
            value={itemsPerPage}
            onChange={handleItemsChange}
            className={styles.itemsSelect}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>Registros</span>
        </div>
      )}

      {showBottom && (
        <div className={styles.bottomControls}>
          <div className={styles.legend}>
            {`Listando ${currentPage} / ${totalPages} de ${totalItems} registros`}
          </div>
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={styles.pageBtn}
                onClick={() => changePage(page)}
                disabled={currentPage === page}
              >
                {page}
              </button>
            ))}
            <button
              className={styles.pageBtn}
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage === totalPages}
             >
               &gt;
             </button>
           </div>
         </div>
       )}
     </>
   );
 };
export default TablePagination;

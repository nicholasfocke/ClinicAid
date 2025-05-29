import Link from 'next/link';
import Image from 'next/image';
import styles from '@/styles/404.module.css'; // Corrigido o caminho para o CSS

const Custom404 = () => {
  return (
    <div className={styles.container}>
      <Image
        src="/images/404 error nice.svg" // Certifique-se de que a imagem está na pasta public/images
        alt="404 - Página não encontrada"
        width={500}
        height={500}
        className={styles.image}
      />
      <h1 className={styles.titleError}>404 - Página não encontrada</h1>
      <p className={styles.paragrafoError}>Desculpe, a página que você está procurando não existe ou foi removida ou ocorreu um erro.</p>
      <Link href="/" legacyBehavior>
        <a className={styles.link}>Voltar para a página inicial</a>
      </Link>
    </div>
  );
};

export default Custom404;

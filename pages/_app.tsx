import { AuthProvider } from '@/context/AuthContext';
import '@/styles/globals.css';
import Layout from '@/components/Layout';
import Head from 'next/head';
import { Analytics } from '@vercel/analytics/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => setPageLoading(true);
    const handleComplete = () => setPageLoading(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <>
      <Head>
        {/* Corrige zoom inesperado no mobile e mantém responsividade */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <title>ClinicAid</title>
        <meta name="description" content="Sistema ClinicAid." />
      </Head>

      {pageLoading && (
        <div className="pageLoading">
        <div className="loadingContainer">
            <img
              src="/images/logo nova clinicaid azul fonte.png"
              alt="ClinicAid logo"
              className="loadingLogo"
            />
            <div className="loadingBar"></div>
          </div>
        </div>
      )}

      <GoogleReCaptchaProvider
        reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
        scriptProps={{
          async: true,
          defer: true,
          appendTo: 'head',
          nonce: undefined,
        }}
      >
        <AuthProvider>
          <Layout>
            <Component {...pageProps} />
            <Analytics />
          </Layout>
        </AuthProvider>
      </GoogleReCaptchaProvider>
    </>
  );
}

export default MyApp;

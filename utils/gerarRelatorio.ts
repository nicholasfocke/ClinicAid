interface RelatorioOptions {
  titulo: string;
  colunas: string[];
  dados: (string | number | boolean)[][];
  nomeArquivo?: string;
}

// Utilitário para converter imagem do public para base64
export const carregarImagemComoBase64 = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    let url = src;
    if (typeof window !== 'undefined' && src.startsWith('/')) {
      url = window.location.origin + src;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Erro ao obter contexto da imagem.');
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl);
    };
    img.onerror = reject;
    img.src = url;
  });
};

export const gerarRelatorioPDF = async ({
  titulo,
  colunas,
  dados,
  nomeArquivo = 'relatorio.pdf',
}: RelatorioOptions) => {
  // Só importe pdfmake no client-side (evita erro no build SSR do Next.js)
  if (typeof window === 'undefined') return;

  // Use require para evitar erro de build (Next.js)
  const pdfMake = require('pdfmake/build/pdfmake');
  const pdfFonts = require('pdfmake/build/vfs_fonts');
  pdfMake.vfs = pdfFonts.pdfMake.vfs;

  const logoBase64 = await carregarImagemComoBase64('/images/ClinicAidLogo.png');

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 40],
    content: [
      {
        columns: [
          {
            image: logoBase64,
            width: 80,
          },
          [
            { text: 'ClinicAid', style: 'clinicName' },
            { text: 'Telefone: (82) 90000-0000', style: 'clinicInfo' },
            { text: 'Email: suporteclinicaid@gmail.com', style: 'clinicInfo' },
          ],
        ],
        columnGap: 10,
        margin: [0, 0, 0, 20],
      },
      { text: titulo, style: 'reportTitle' },
      {
        columns: [
          { text: `Data: ${new Date().toLocaleDateString()}`, style: 'info' },
          { text: `Total: ${dados.length} procedimentos`, style: 'info', alignment: 'right' },
        ],
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: Array(colunas.length).fill('*'),
          body: [
            colunas.map(col => ({ text: col, bold: true, fillColor: '#f0f0f0' })),
            ...dados,
          ],
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex % 2 === 0 ? null : '#f9f9f9'),
        },
      },
      {
        text: '\nEste relatório foi gerado automaticamente pelo sistema ClinicAid.',
        style: 'footer',
      },
    ],
    styles: {
      clinicName: {
        fontSize: 16,
        bold: true,
        color: '#2563eb',
        marginBottom: 2,
      },
      clinicInfo: {
        fontSize: 9,
        color: '#555',
      },
      reportTitle: {
        fontSize: 16,
        bold: true,
        alignment: 'center',
        marginBottom: 10,
      },
      info: {
        fontSize: 10,
        color: '#666',
      },
      footer: {
        fontSize: 9,
        italics: true,
        alignment: 'center',
        marginTop: 30,
        color: '#888',
      },
    },
  };

  pdfMake.createPdf(docDefinition).download(nomeArquivo);
};
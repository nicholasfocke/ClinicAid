import pdfMake from 'pdfmake/build/pdfmake';
// Declaração global para showSaveFilePicker
declare global {
  interface Window {
    showSaveFilePicker?: (options?: any) => Promise<any>;
  }
}
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = (pdfFonts as any).vfs;

interface ExtratoMovimentacoesOptions {
  titulo: string;
  colunas: string[];
  dados: (string | number | boolean)[][];
  nomeArquivo?: string;
  periodo?: string;
  status?: string;
  filtroMes?: string;
  totalMovimentacoes?: string;
}

export const carregarImagemComoBase64 = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
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
    img.src = src;
  });
};

export const gerarExtratoMovimentacoes = async ({
  titulo,
  colunas,
  dados,
  nomeArquivo = 'extrato-movimentacoes.pdf',
  periodo = '',
  status = '',
  filtroMes = '',
  totalMovimentacoes = '',
}: ExtratoMovimentacoesOptions) => {
  const logoBase64 = await carregarImagemComoBase64('/images/logo nova clinicaid azul fonte.png');

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 40],
    content: [
      {
        stack: [
          {
            image: logoBase64,
            width: 160,
            alignment: 'left',
            margin: [0, 0, 0, 4],
          },
          { text: 'Telefone: (82) 90000-0000', style: 'clinicInfo', alignment: 'left', margin: [30, 0, 0, 0] },
          { text: 'Email: suporteclinicaid@gmail.com', style: 'clinicInfo', alignment: 'left', margin: [30, 0, 0, 0] },
        ],
        margin: [0, 0, 0, 20],
      },
      totalMovimentacoes && {
        text: `Total de movimentações\n${totalMovimentacoes}`,
        style: 'totalMovimentacoes',
        margin: [0, 0, 0, 16],
        alignment: 'left',
      },
      { text: titulo, style: 'reportTitle' },
      {
        columns: [
          { text: periodo ? `Período: ${periodo}` : `Data: ${new Date().toLocaleDateString()}`, style: 'info' },
          { text: filtroMes ? `Mês: ${filtroMes}` : '', style: 'info', alignment: 'center' },
          { text: status ? `Status: ${status}` : '', style: 'info', alignment: 'right' },
          { text: `Total: ${dados.length} movimentações`, style: 'info', alignment: 'right' },
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
        text: '\nEste extrato de movimentações foi gerado automaticamente pelo sistema ClinicAid.',
        style: 'footer',
      },
    ].filter(Boolean),
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
      totalMovimentacoes: {
        fontSize: 18,
        color: '#2563eb',
        bold: true,
        marginBottom: 8,
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

  // Permite ao usuário escolher o local e nome do arquivo
  if (window.showSaveFilePicker) {
    const options = {
      suggestedName: nomeArquivo,
      types: [
        {
          description: 'PDF Document',
          accept: { 'application/pdf': ['.pdf'] },
        },
      ],
    };
    try {
      const handle = await window.showSaveFilePicker(options);
      const writable = await handle.createWritable();
      pdfMake.createPdf(docDefinition).getBuffer(async (buffer: ArrayBuffer) => {
        await writable.write(new Uint8Array(buffer));
        await writable.close();
      });
    } catch (err: any) {
      if (err && err.name === 'AbortError') {
        // Usuário cancelou, não faz nada
        return;
      }
      console.error('Erro ao salvar arquivo:', err);
    }
  } else {
    // Fallback para navegadores sem suporte
    pdfMake.createPdf(docDefinition).download(nomeArquivo);
  }
};

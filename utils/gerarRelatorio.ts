import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// pdfMake vfs precisa ser configurado explicitamente no client
(pdfMake as any).vfs = (pdfFonts as any).vfs;

interface RelatorioOptions {
  titulo: string;
  colunas: string[];
  dados: (string | number | boolean)[][];
  nomeArquivo?: string;
}

export const gerarRelatorioPDF = ({ titulo, colunas, dados, nomeArquivo = 'relatorio.pdf' }: RelatorioOptions) => {
  const docDefinition = {
    content: [
      { text: titulo, style: 'header' },
      {
        table: {
          headerRows: 1,
          widths: Array(colunas.length).fill('*'),
          body: [
            colunas.map(col => ({ text: col, bold: true })),
            ...dados,
          ],
        },
      },
    ],
    styles: {
      header: { fontSize: 18, bold: true, marginBottom: 15 },
    },
  };

  pdfMake.createPdf(docDefinition).download(nomeArquivo);
};
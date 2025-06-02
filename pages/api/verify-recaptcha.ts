// pages/api/verify-recaptcha.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = { success?: boolean; error?: string; score?: number };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { token } = req.body as { token?: string };
  if (!token) {
    return res.status(400).json({ error: 'Token não fornecido' });
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({ error: 'Chave secreta do reCAPTCHA não configurada' });
  }

  const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${encodeURIComponent(
    secretKey
  )}&response=${encodeURIComponent(token)}`;

  try {
    const response = await fetch(verificationUrl, { method: 'POST' });
    const data = await response.json();

    //Verifica se deu certo
    if (!data.success) {
      return res.status(401).json({ error: 'Falha na verificação do reCAPTCHA' });
    }

    const score = typeof data.score === 'number' ? data.score : 0;

    // Verifica o score é valido (acima de 0.3)
    const MIN_SCORE = 0.3; // ajustar conforme necessidade (0.3 ⇾ menos restrito; 0.7 ⇾ mais restrito)
    if (typeof data.score === 'number' && data.score < MIN_SCORE) {
      return res
        .status(401)
        .json({ error: `Score de reCAPTCHA muito baixo (${data.score.toFixed(2)})` });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erro ao verificar reCAPTCHA:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

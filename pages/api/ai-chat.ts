import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Mensagem inválida' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // ou outro modelo disponível na sua conta
      messages: [{ role: 'user', content: message }],
      // Você pode adicionar outras opções como max_tokens, temperature, etc.
    });

    const reply = completion.choices[0]?.message?.content ?? '';
    res.status(200).json({ reply });
  } catch (error) {
    console.error('Erro ao consultar OpenAI:', error);
    res.status(500).json({ error: 'Erro ao gerar resposta' });
  }
}
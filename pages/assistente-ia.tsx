import { useState } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import SidebarAdmin from '@/components/layout/SidebarAdmin';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/ia/assistente.module.css';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

export default function AssistenteIA() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: 'user', text: input } as Message;
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text })
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <SidebarAdmin />
        <div className={styles.mainContent}>
          <div>
            <div className={breadcrumbStyles.breadcrumbWrapper}>
              <span className={breadcrumbStyles.breadcrumb}>
                Menu Principal &gt;{' '}
                <span className={breadcrumbStyles.breadcrumbActive}>Assistente IA</span>
              </span>
            </div>
            <h1 className={styles.titleAssistente}>
              Assistente IA
            </h1>
            <p className={styles.subtitleAssistente}>
              Converse com a inteligência artificial para tirar dúvidas, pedir sugestões, gerar laudos e diagnósticos ou obter ajuda sobre o sistema.
            </p>
            <div className={styles.chatBox}>
              <div className={styles.chatTitle}>ClinicAid AI</div>
              <div className={styles.messages}>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={msg.sender === 'user' ? styles.userMessage : styles.botMessage}
                  >
                    {msg.text}
                  </div>
                ))}
                {loading && (
                  <div className={styles.botMessage}>Carregando resposta...</div>
                )}
              </div>
              <div className={styles.inputContainer}>
                <input
                  type="text"
                  className={styles.input}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua pergunta"
                />
                <button className={styles.sendButton} onClick={sendMessage} disabled={loading}>
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
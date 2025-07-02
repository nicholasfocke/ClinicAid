import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import SidebarAdmin from '@/components/layout/SidebarAdmin';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/ia/assistente.module.css';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

(pdfMake as any).vfs = (pdfFonts as any).vfs;


interface Message {
  sender: 'user' | 'bot';
  text: string;
}

interface Chat {
  id: string;
  title: string;
  folderId: string;
  messages: Message[];
}

interface Folder {
  id: string;
  name: string;
}

export default function AssistenteIA() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const generateId = () => Math.random().toString(36).slice(2);

  useEffect(() => {
    const stored = localStorage.getItem('iaChats');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as {
          folders: Folder[];
          chats: Chat[];
          activeChatId: string | null;
        };
        setFolders(parsed.folders || []);
        setChats(parsed.chats || []);
        setActiveChatId(parsed.activeChatId || null);
        if (parsed.activeChatId) {
          const chat = parsed.chats.find(c => c.id === parsed.activeChatId);
          if (chat) setMessages(chat.messages);
        }
      } catch {
        // ignore parse errors
      }
    } else {
      const folderId = generateId();
      const chatId = generateId();
      const folder = { id: folderId, name: 'Geral' } as Folder;
      const chat = { id: chatId, title: 'Novo Chat', folderId, messages: [] } as Chat;
      setFolders([folder]);
      setChats([chat]);
      setActiveChatId(chatId);
    }
  }, []);

  useEffect(() => {
    const data = JSON.stringify({ folders, chats, activeChatId });
    localStorage.setItem('iaChats', data);
  }, [folders, chats, activeChatId]);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    const chat = chats.find(c => c.id === activeChatId);
    setMessages(chat ? chat.messages : []);
  }, [activeChatId, chats]);

  const createFolder = () => {
    const name = prompt('Nome da pasta');
    if (!name) return;
    const folder = { id: generateId(), name } as Folder;
    setFolders(prev => [...prev, folder]);
  };

  const createChat = (folderId: string) => {
    const title = prompt('Título do chat') || 'Novo Chat';
    const chat = { id: generateId(), title, folderId, messages: [] } as Chat;
    setChats(prev => [...prev, chat]);
    setActiveChatId(chat.id);
  };

  const deleteChat = (id: string) => {
    if (!confirm('Deseja excluir este chat?')) return;
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) setActiveChatId(null);
  };

  const exportChat = (chat: Chat) => {
    const body = chat.messages.map(m => [
      { text: m.sender === 'user' ? 'Você' : 'IA', bold: true },
      m.text,
    ]);
    const doc = {
      content: [
        { text: chat.title, style: 'header' },
        { table: { widths: ['auto', '*'], body } },
      ],
      styles: { header: { fontSize: 16, bold: true, marginBottom: 10 } },
    };
    pdfMake.createPdf(doc).download(`${chat.title}.pdf`);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeChatId) return;
    const userMsg = { sender: 'user', text: input } as Message;
    setMessages(prev => {
          const msgs: Message[] = [...prev, userMsg];
          setChats(chats =>
            chats.map(c => (c.id === activeChatId ? { ...c, messages: msgs } : c))
          );
          return msgs;
        });
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
        setMessages(prev => {
                  const msgs: Message[] = [...prev, { sender: 'bot' as const, text: data.reply }];
                  setChats(chats =>
                    chats.map(c => (c.id === activeChatId ? { ...c, messages: msgs } : c))
                  );
                  return msgs;
                });
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
              Converse com a nossa IA para tirar dúvidas, pedir sugestões, gerar laudos e diagnósticos ou obter ajuda sobre o sistema.
            </p>
             <div className={styles.chatLayout}>
              <aside className={styles.sidebar}>
                <button className={styles.newFolderButton} onClick={createFolder}>
                  + Nova pasta
                </button>
                {folders.map(folder => (
                  <div key={folder.id} className={styles.folder}>
                    <div className={styles.folderHeader}>
                      {folder.name}
                      <button className={styles.newChatButton} onClick={() => createChat(folder.id)}>
                        + Novo chat
                      </button>
                    </div>
                    <ul className={styles.chatList}>
                      {chats.filter(c => c.folderId === folder.id).map(chat => (
                        <li
                          key={chat.id}
                          className={`${styles.chatItem} ${chat.id === activeChatId ? styles.activeChat : ''}`}
                        >
                          <span onClick={() => setActiveChatId(chat.id)}>{chat.title}</span>
                          <div className={styles.chatActions}>
                            <button onClick={() => exportChat(chat)} title="Baixar PDF">⬇️</button>
                            <button onClick={() => deleteChat(chat.id)} title="Excluir">🗑️</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                 </aside>
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
      </div>
    </ProtectedRoute>
  );
}
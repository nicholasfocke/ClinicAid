import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import SidebarAdmin from '@/components/layout/SidebarAdmin';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/ia/assistente.module.css';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import {
  IAChat,
  IAFolder,
  IAChatMessage,
  buscarPastas,
  criarPasta,
  buscarChats,
  criarChat as criarChatDB,
  excluirChat as excluirChatDB,
  atualizarChat,
  excluirPasta as excluirPastaDB,
} from '@/functions/iaFunctions';
import { useAuth } from '@/context/AuthContext';

(pdfMake as any).vfs = (pdfFonts as any).vfs;


type Message = IAChatMessage;
type Chat = IAChat;
type Folder = IAFolder;

export default function AssistenteIA() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const pastas = await buscarPastas(user.uid);
      if (pastas.length === 0) {
        const pasta = await criarPasta('Geral', user.uid);
        const chatInicial = await criarChatDB(pasta.id, 'Novo Chat');
        setFolders([pasta]);
        setChats([chatInicial]);
        setActiveChatId(chatInicial.id);
        return;
      }
      setFolders(pastas);
      const allChats: Chat[] = [];
      for (const p of pastas) {
        const ch = await buscarChats(p.id);
        allChats.push(...ch);
      }
      setChats(allChats);
      if (allChats.length > 0) setActiveChatId(allChats[0].id);
    })();
  }, [user]);


  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    const chat = chats.find(c => c.id === activeChatId);
    setMessages(chat ? chat.messages : []);
  }, [activeChatId, chats]);

  const createFolder = async () => {
    if (!user) return;
    const name = prompt('Nome da pasta');
    if (!name) return;
    const folder = await criarPasta(name, user.uid);
    setFolders(prev => [...prev, folder]);
  };

  const createChat = async (folderId: string) => {
    const title = prompt('Título do chat') || 'Novo Chat';
    const chat = await criarChatDB(folderId, title);
    setChats(prev => [...prev, chat]);
    setActiveChatId(chat.id);
  };

  const deleteChat = async (id: string, folderId: string) => {
    if (!confirm('Deseja excluir este chat?')) return;
    await excluirChatDB(folderId, id);
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

  const exportFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    const data = {
      folder: folder?.name || 'pasta',
      chats: chats.filter(c => c.folderId === folderId),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${folder?.name || 'pasta'}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm('Excluir pasta e todos os chats?')) return;
    const related = chats.filter(c => c.folderId === folderId);
    for (const ch of related) {
      await excluirChatDB(folderId, ch.id);
    }
    await excluirPastaDB(folderId);
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setChats(prev => prev.filter(c => c.folderId !== folderId));
    if (related.some(c => c.id === activeChatId)) setActiveChatId(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeChatId) return;
    const userMsg: Message = { sender: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => {
      const msgs: Message[] = [...prev, userMsg];
      setChats(chats =>
        chats.map(c => (c.id === activeChatId ? { ...c, messages: msgs } : c))
      );
      const ch = chats.find(c => c.id === activeChatId);
      if (ch) atualizarChat(ch.folderId, ch.id, { messages: msgs });
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
          const msgs: Message[] = [...prev, { sender: 'bot', text: data.reply, timestamp: Date.now() }];
          setChats(chats =>
            chats.map(c => (c.id === activeChatId ? { ...c, messages: msgs } : c))
          );
          const ch = chats.find(c => c.id === activeChatId);
          if (ch) atualizarChat(ch.folderId, ch.id, { messages: msgs });
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
                      <span>{folder.name}</span>
                      <div className={styles.folderActions}>
                        <button onClick={() => exportFolder(folder.id)} title="Baixar pasta">⬇️</button>
                        <button onClick={() => deleteFolder(folder.id)} title="Excluir pasta">🗑️</button>
                        <button className={styles.newChatButton} onClick={() => createChat(folder.id)}>
                          + Novo chat
                        </button>
                      </div>
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
                            <button onClick={() => deleteChat(chat.id, chat.folderId)} title="Excluir">🗑️</button>
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
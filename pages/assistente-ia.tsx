import { useEffect, useState, useRef } from 'react';
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
  atualizarPasta,
  buscarChatsSoltos,
  criarChatSolto,
  excluirChatSolto,
  atualizarChatSolto,
  moverChat,
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
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null); // NOVO
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Controle do menu de opções da pasta
  const [openFolderMenuId, setOpenFolderMenuId] = useState<string | null>(null);
  const folderMenuRef = useRef<HTMLDivElement | null>(null);

  // Controle de pastas expandidas/recolhidas
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['root']);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const pastas = await buscarPastas(user.uid);
      const soltos = await buscarChatsSoltos(user.uid);
      if (pastas.length === 0 && soltos.length === 0) {
        setFolders([]);
        setChats([]);
        setActiveFolderId(null);
        setActiveChatId(null);
        return;
      }
      setFolders(pastas);
      const allChats: Chat[] = [];
      for (const p of pastas) {
        const ch = await buscarChats(p.id);
        allChats.push(...ch);
      }
      allChats.push(...soltos);
      setChats(allChats);
      if (pastas.length > 0) {
        setActiveFolderId(pastas[0].id);
        const chatsDaPasta = allChats.filter(c => c.folderId === pastas[0].id);
        if (chatsDaPasta.length > 0) setActiveChatId(chatsDaPasta[0].id);
        else setActiveChatId(null);
      } else {
        setActiveFolderId(null);
        if (soltos.length > 0) setActiveChatId(soltos[0].id); else setActiveChatId(null);
      }
    })();
  }, [user]);

  // Atualiza chats ao trocar de pasta
  useEffect(() => {
    setChats(prevChats => {
      const chatsDaPasta = prevChats.filter(c => c.folderId === activeFolderId);
      if (chatsDaPasta.length > 0 && (!activeChatId || !chatsDaPasta.some(c => c.id === activeChatId))) {
        setActiveChatId(chatsDaPasta[0].id);
      } else if (chatsDaPasta.length === 0) {
        setActiveChatId(null);
      }
      return prevChats;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolderId]);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    const chat = chats.find(c => c.id === activeChatId);
    setMessages(chat ? chat.messages : []);
  }, [activeChatId, chats]);

  // Criação automática de pasta/chat ao enviar mensagem se não existir
  const sendMessage = async () => {
    if (!input.trim()) return;

    let folderId = activeFolderId;
    let chatId = activeChatId;

    // Cria pasta se não existir nenhuma
    if (!folders.length) {
      const pasta = await criarPasta('Geral', user!.uid);
      setFolders([pasta]);
      folderId = pasta.id;
      setActiveFolderId(pasta.id);
    }

    // Cria chat se não existir nenhum na pasta ativa
    let chatAtual: Chat | undefined = undefined;
    if (folderId) {
      const chatsDaPasta = chats.filter(c => c.folderId === folderId);
      if (!chatsDaPasta.length) {
        const novoChat = await criarChatDB(folderId, 'Novo Chat');
        setChats(prev => [...prev, novoChat]);
        chatId = novoChat.id;
        setActiveChatId(novoChat.id);
        chatAtual = novoChat;
      } else if (!chatId || !chatsDaPasta.some(c => c.id === chatId)) {
        chatId = chatsDaPasta[0].id;
        setActiveChatId(chatId);
        chatAtual = chatsDaPasta[0];
      } else {
        chatAtual = chats.find(c => c.id === chatId);
      }
    } else {
      const chatsSoltos = chats.filter(c => c.folderId === null);
      if (!chatsSoltos.length) {
        const novoChat = await criarChatSolto(user!.uid, 'Novo Chat');
        setChats(prev => [...prev, novoChat]);
        chatId = novoChat.id;
        setActiveChatId(novoChat.id);
        chatAtual = novoChat;
      } else if (!chatId || !chatsSoltos.some(c => c.id === chatId)) {
        chatId = chatsSoltos[0].id;
        setActiveChatId(chatId);
        chatAtual = chatsSoltos[0];
      } else {
        chatAtual = chats.find(c => c.id === chatId);
      }
    }

    // Atualiza estados locais se necessário
    if (!activeFolderId && folderId) setActiveFolderId(folderId);
    if (!activeChatId && chatId) setActiveChatId(chatId);

    // Só envia mensagem se já tem chat
    if (!chatId) return;

    const userMsg: Message = { sender: 'user', text: input, timestamp: Date.now() };
    setChats(prevChats =>
      prevChats.map(c =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, userMsg] }
          : c
      )
    );
    setMessages(prev => [...prev, userMsg]);
    if (chatAtual) {
      if (chatAtual.folderId) {
        atualizarChat(chatAtual.folderId, chatId, { messages: [...(chatAtual.messages || []), userMsg] });
      } else {
        atualizarChatSolto(chatId, { messages: [...(chatAtual.messages || []), userMsg] });
      }
    }
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
        setChats(prevChats =>
          prevChats.map(c =>
            c.id === chatId
              ? { ...c, messages: [...c.messages, userMsg, { sender: 'bot', text: data.reply, timestamp: Date.now() }] }
              : c
          )
        );
        setMessages(prev => [...prev, { sender: 'bot', text: data.reply, timestamp: Date.now() }]);
        if (chatAtual) atualizarChat(chatAtual.folderId, chatId, { messages: [...(chatAtual.messages || []), userMsg, { sender: 'bot', text: data.reply, timestamp: Date.now() }] });
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

  // Renomear pasta
  const renameFolder = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    const newName = prompt('Novo nome da pasta:', folder.name);
    if (!newName || newName.trim() === folder.name) return;
    await atualizarPasta(folderId, { name: newName.trim() });
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName.trim() } : f));
  };

  // Renomear chat
  const renameChat = async (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    const newTitle = prompt('Novo título do chat:', chat.title);
    if (!newTitle || newTitle.trim() === chat.title) return;
    if (chat.folderId) {
      await atualizarChat(chat.folderId, chatId, { title: newTitle.trim() });
    } else {
      await atualizarChatSolto(chatId, { title: newTitle.trim() });
    }
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: newTitle.trim() } : c));
  };

  const moveChatPrompt = async (chat: Chat) => {
    const destino = prompt('ID da pasta destino (vazio para fora de pastas)');
    if (destino === null) return;
    const targetId = destino.trim() === '' ? null : destino.trim();
    await moverChat(chat.id, chat.folderId, targetId, user!.uid);
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, folderId: targetId } : c));
    if (activeChatId === chat.id) {
      setActiveFolderId(targetId);
    }
  };

  const removeFromFolder = async (chat: Chat) => {
    if (!chat.folderId) return;
    await moverChat(chat.id, chat.folderId, null, user!.uid);
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, folderId: null } : c));
    if (activeChatId === chat.id) setActiveFolderId(null);
  };

  // Exportar pasta como PDF
  const exportFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    const chatsDaPasta = chats.filter(c => c.folderId === folderId);
    const docDefinition = {
      content: [
        { text: `Pasta: ${folder.name}`, style: 'header' },
        ...chatsDaPasta.flatMap(chat => [
          { text: `\nChat: ${chat.title}`, style: 'subheader' },
          ...chat.messages.map(msg => ({
            text: `${msg.sender === 'user' ? 'Usuário' : 'IA'}: ${msg.text}`,
            margin: [0, 2, 0, 2]
          }))
        ])
      ],
      styles: {
        header: { fontSize: 18, bold: true },
        subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 4] }
      }
    };
    pdfMake.createPdf(docDefinition).download(`pasta-${folder.name}.pdf`);
  };

  // Exportar chat como PDF
  const exportChat = (chat: Chat) => {
    const folder = folders.find(f => f.id === chat.folderId);
    const docDefinition = {
      content: [
        { text: `Chat: ${chat.title}`, style: 'header' },
        ...(folder ? [{ text: `Pasta: ${folder.name}`, style: 'subheader' }] : []),
        ...chat.messages.map(msg => ({
          text: `${msg.sender === 'user' ? 'Usuário' : 'IA'}: ${msg.text}`,
          margin: [0, 2, 0, 2]
        }))
      ],
      styles: {
        header: { fontSize: 18, bold: true },
        subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 4] }
      }
    };
    pdfMake.createPdf(docDefinition).download(`chat-${chat.title}.pdf`);
  };

  // Excluir pasta
  const deleteFolder = async (folderId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta pasta e todos os chats dentro dela?')) return;
    await excluirPastaDB(folderId);
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setChats(prev => prev.filter(c => c.folderId !== folderId));
    setExpandedFolders(prev => prev.filter(id => id !== folderId));
    if (activeFolderId === folderId) {
      // Seleciona outra pasta se possível
      const remaining = folders.filter(f => f.id !== folderId);
      if (remaining.length > 0) {
        setActiveFolderId(remaining[0].id);
      } else {
        setActiveFolderId(null);
        setActiveChatId(null);
      }
    }
  };

  // Excluir chat
  const deleteChat = async (chatId: string, folderId: string | null) => {
    if (!window.confirm('Tem certeza que deseja excluir este chat?')) return;
    if (folderId) {
      await excluirChatDB(folderId, chatId);
    } else {
      await excluirChatSolto(chatId);
    }
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (activeChatId === chatId) {
      // Seleciona outro chat da pasta, se houver
      const chatsDaPasta = chats.filter(c => c.folderId === folderId && c.id !== chatId);
      if (chatsDaPasta.length > 0) {
        setActiveChatId(chatsDaPasta[0].id);
      } else {
        setActiveChatId(null);
      }
    }
  };

  // SVGs para ícones
  const FolderIcon = (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" style={{marginRight: 8, verticalAlign: 'middle'}}>
      <path fill="#2563eb" d="M2 6.75A2.75 2.75 0 0 1 4.75 4h3.19a2.75 2.75 0 0 1 1.94.8l1.62 1.62c.14.14.33.22.53.22h5.97A2.75 2.75 0 0 1 21.25 9.5v7.75A2.75 2.75 0 0 1 18.5 20H5.5A2.75 2.75 0 0 1 2.75 17.25V6.75Z"/>
    </svg>
  );
  const PlusIcon = (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" style={{marginRight: 6, verticalAlign: 'middle'}}>
      <path fill="#2563eb" d="M12 5v14m7-7H5" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
  const ChatIcon = (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style={{marginRight: 6, verticalAlign: 'middle'}}>
      <path fill="#2563eb" d="M4 19.5V6.75A2.75 2.75 0 0 1 6.75 4h10.5A2.75 2.75 0 0 1 20 6.75v7.5A2.75 2.75 0 0 1 17.25 17H7l-3 2.5Z"/>
    </svg>
  );

  // Função para expandir/recolher pasta ao clicar
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
    setActiveFolderId(folderId);
  };

  // Função para criar nova pasta manualmente
  const createFolder = async () => {
    if (!user) return;
    const name = prompt('Nome da pasta');
    if (!name) return;
    const folder = await criarPasta(name, user.uid);
    setFolders(prev => [...prev, folder]);
    setActiveFolderId(folder.id);
  };

  // Função para criar novo chat na pasta ativa
  const createChat = async () => {
    if (!activeFolderId) return;
    const title = prompt('Título do novo chat', 'Novo Chat');
    if (!title) return;
    const novoChat = await criarChatDB(activeFolderId, title);
    setChats(prev => [...prev, novoChat]);
    setActiveChatId(novoChat.id);
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
                <div className={styles.sidebarHeader}>
                  <button
                    className={styles.newFolderButton}
                    onClick={createFolder}
                  >
                    {PlusIcon}
                    Nova pasta
                  </button>
                </div>
                <div className={styles.sidebarFolders}>
                  {folders.map(folder => (
                    <div
                      key={folder.id}
                      className={styles.folder}
                    >
                      <div
                        className={`${styles.folderHeader} ${activeFolderId === folder.id ? styles.folderHeaderActive : ''}`}
                        onClick={() => toggleFolder(folder.id)}
                        style={{ position: 'relative' }}
                      >
                        {FolderIcon}
                        <span className={styles.folderName}>{folder.name}</span>
                        <button
                          className={styles.folderMenuButton}
                          onClick={e => {
                            e.stopPropagation();
                            setOpenFolderMenuId(openFolderMenuId === folder.id ? null : folder.id);
                          }}
                          aria-label="Mais opções"
                        >
                          &#8230;
                        </button>
                        {openFolderMenuId === folder.id && (
                          <div
                            ref={folderMenuRef}
                            className={styles.folderMenuDropdown}                       
                          >
                            <button
                              className={styles.folderMenuItem}
                              onClick={e => { e.stopPropagation(); setOpenFolderMenuId(null); renameFolder(folder.id); }}
                            >✏️ Renomear</button>
                            <button
                              className={styles.folderMenuItem}
                              onClick={e => { e.stopPropagation(); setOpenFolderMenuId(null); exportFolder(folder.id); }}
                            >⬇️ Baixar</button>
                            <button
                              className={styles.folderMenuItem}
                              onClick={e => { e.stopPropagation(); setOpenFolderMenuId(null); deleteFolder(folder.id); }}
                            >🗑️ Excluir</button>
                            <button
                              className={styles.folderMenuItem}
                              onClick={e => { e.stopPropagation(); setOpenFolderMenuId(null); createChat(); }}
                              disabled={activeFolderId !== folder.id}
                            >{PlusIcon} Novo chat</button>
                          </div>
                        )}
                      </div>
                      {/* Lista de chats da pasta, só mostra se expandida */}
                      {expandedFolders.includes(folder.id) && (
                        <ul className={styles.chatList}>
                          {chats
                            .filter(c => c.folderId === folder.id)
                            .map(chat => (
                              <li
                                key={chat.id}
                                className={`${styles.chatItem} ${chat.id === activeChatId && activeFolderId === folder.id ? styles.activeChat : ''}`}
                              >
                                <span
                                  className={styles.chatItemTitle}
                                  onClick={() => {
                                    setActiveFolderId(folder.id);
                                    setActiveChatId(chat.id);
                                  }}
                                >
                                  {ChatIcon}
                                  <span className={styles.chatItemText}>{chat.title}</span>
                                </span>
                                <div className={styles.chatActions}>
                                  <button onClick={e => { e.stopPropagation(); renameChat(chat.id); }} title="Renomear chat">✏️</button>
                                  <button onClick={e => { e.stopPropagation(); exportChat(chat); }} title="Baixar PDF">⬇️</button>
                                  <button onClick={e => { e.stopPropagation(); removeFromFolder(chat); }} title="Remover da pasta">➖</button>
                                  <button onClick={e => { e.stopPropagation(); moveChatPrompt(chat); }} title="Mover">📁</button>
                                  <button onClick={e => { e.stopPropagation(); deleteChat(chat.id, chat.folderId); }} title="Excluir">🗑️</button>
                                </div>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  ))}
                  {/* Chats fora de pasta */}
                  <div className={styles.folder}>
                    <div
                      className={`${styles.folderHeader} ${activeFolderId === null ? styles.folderHeaderActive : ''}`}
                      onClick={() => {
                        setActiveFolderId(null);
                        setExpandedFolders(prev => prev.includes('root') ? prev : [...prev, 'root']);
                      }}
                    >
                      {FolderIcon}
                      <span className={styles.folderName}>Chats</span>
                    </div>
                    {expandedFolders.includes('root') && (
                      <ul className={styles.chatList}>
                        {chats
                          .filter(c => c.folderId === null)
                          .map(chat => (
                            <li
                              key={chat.id}
                              className={`${styles.chatItem} ${chat.id === activeChatId && activeFolderId === null ? styles.activeChat : ''}`}
                            >
                              <span
                                className={styles.chatItemTitle}
                                onClick={() => {
                                  setActiveFolderId(null);
                                  setActiveChatId(chat.id);
                                }}
                              >
                                {ChatIcon}
                                <span className={styles.chatItemText}>{chat.title}</span>
                              </span>
                              <div className={styles.chatActions}>
                                <button onClick={e => { e.stopPropagation(); renameChat(chat.id); }} title="Renomear chat">✏️</button>
                                <button onClick={e => { e.stopPropagation(); exportChat(chat); }} title="Baixar PDF">⬇️</button>
                                <button onClick={e => { e.stopPropagation(); moveChatPrompt(chat); }} title="Mover">📁</button>
                                <button onClick={e => { e.stopPropagation(); deleteChat(chat.id, chat.folderId); }} title="Excluir">🗑️</button>
                              </div>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </div>
              </aside>
              <div className={styles.chatBox}>
                <div className={styles.chatTitle}>
                  {activeFolderId ? (folders.find(f => f.id === activeFolderId)?.name || 'ClinicAid AI') : 'No que você está pensando hoje?'}
                </div>
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
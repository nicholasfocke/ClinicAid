import { useEffect, useState, useRef } from 'react';
import { Send, Mic, Stethoscope } from 'lucide-react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import SidebarAdmin from '@/components/layout/SidebarAdmin';
import breadcrumbStyles from '@/styles/Breadcrumb.module.css';
import styles from '@/styles/ia/assistente.module.css';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/router';
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

const downloadPdf = (docDefinition: any, filename: string) => {
  if (!filename.toLowerCase().endsWith('.pdf')) {
    filename += '.pdf';
  }
  pdfMake.createPdf(docDefinition).download(filename);
};


type Message = IAChatMessage;
type Chat = IAChat;
type Folder = IAFolder;

export default function AssistenteIA() {
  const { user } = useAuth();
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null); // NOVO
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dictationLoading, setDictationLoading] = useState(false);
  const [dictationWave, setDictationWave] = useState(false);


  const dictationActive = dictationWave || dictationLoading;

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Controle do menu de opções da pasta
  const [openFolderMenuId, setOpenFolderMenuId] = useState<string | null>(null);
  const folderMenuRef = useRef<HTMLDivElement | null>(null);

  // Controle de pastas expandidas/recolhidas
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['root']);

  // Novo: controle do menu de opções do chat
  const [openChatMenuId, setOpenChatMenuId] = useState<string | null>(null);
  const chatMenuRef = useRef<HTMLDivElement | null>(null);

  // Reconhecimento de voz para modo ditar
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);

  // Função para pós-processar o texto ditado
  function processDictationText(raw: string): string {
    let text = raw.trim();

    // Corrige espaços duplicados
    text = text.replace(/\s+/g, ' ');

    // Corrige palavras comuns (exemplo simples, pode expandir)
    const correcoes: Record<string, string> = {
      'por que': 'por que',
      'porque': 'porque',
      'pq': 'por que',
      'ta': 'tá',
      'voce': 'você',
      'vc': 'você',
      'q': 'que',
      'nao': 'não',
      'sim': 'sim',
      'qual e': 'qual é',
      'oque': 'o que',
      'oque ': 'o que ',
      ' ok ': ' ok ',
      ' tudo bem ': ' tudo bem ',
    };
    Object.entries(correcoes).forEach(([errada, certa]) => {
      text = text.replace(new RegExp(`\\b${errada}\\b`, 'gi'), certa);
    });

    // Capitaliza início de frase
    text = text.charAt(0).toUpperCase() + text.slice(1);

    // Pontuação automática básica: adiciona vírgulas e pontos finais em frases longas
    // Adiciona vírgula após "por exemplo", "ou seja", "então", "assim", "além disso", etc.
    text = text.replace(/\b(por exemplo|ou seja|então|assim|além disso|logo|portanto|contudo|todavia|porém|mas|ou|e)\b/gi, (m) => `${m},`);

    // Adiciona ponto final se não terminar com pontuação
    if (!/[.!?]$/.test(text)) {
      text += '.';
    }

    // Adiciona interrogação se for pergunta (palavras interrogativas no início)
    const interrogativas = [
      'o que', 'como', 'quando', 'onde', 'por que', 'porquê', 'por quê', 'quem', 'qual', 'quais', 'quanto', 'quantos', 'pode', 'poderia', 'seria', 'existe', 'há', 'tem', 'posso', 'devo', 'preciso'
    ];
    const regexPergunta = new RegExp(`^(${interrogativas.join('|')})\\b`, 'i');
    if (regexPergunta.test(text)) {
      text = text.replace(/[\.!]+$/, ''); // removes ponto final se houver
      text = text.trim() + '?';
    }

    // Corrige pontuação duplicada
    text = text.replace(/\?{2,}/g, '?').replace(/\.{2,}/g, '.');

    // Espaço após vírgula
    text = text.replace(/,([^\s])/g, ', $1');

    // Remove vírgula antes de ponto de interrogação
    text = text.replace(/, \?/g, '?');

    return text;
  }

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) return;
      let tipo: string | null = null;
      const funcDoc = await getDoc(doc(firestore, 'funcionarios', user.uid));
      if (funcDoc.exists()) {
        tipo = funcDoc.data().tipo;
      } else {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          tipo = userDoc.data().tipo;
        }
      }
      if (tipo !== 'admin') {
        router.replace('/');
      }
    };
    checkAccess();
  }, [user, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

  const recognition: SpeechRecognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onstart = () => {
    setDictationWave(true);
    setDictationLoading(false);
  };

  const sessionTranscriptRef = { current: '' };

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let transcript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      transcript += result[0].transcript + ' ';
    }

    sessionTranscriptRef.current = transcript;
  };

  recognition.onend = () => {
    const processed = processDictationText(sessionTranscriptRef.current);

    setInput(prev => {
      const prevTrimmed = prev.trim();
      const space = prevTrimmed.length > 0 ? ' ' : '';
      return `${prevTrimmed}${space}${processed}`.trim();
    });

    sessionTranscriptRef.current = '';

    setDictationWave(false);
    setDictationLoading(true);
    setTimeout(() => setDictationLoading(false), 1200);
    setListening(false);
  };

  recognitionRef.current = recognition;
}, []);


  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

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
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
    let folderId = activeFolderId;
    let chatId = activeChatId;

    let chatAtual: Chat | undefined = undefined;

    // Não cria pasta automaticamente!
    if (folderId) {
      // Cria chat se não existir nenhum na pasta ativa
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
      // Chat solto (sem pasta)
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
        if (chatAtual && chatAtual.folderId) {
          atualizarChat(chatAtual.folderId, chatId, { messages: [...(chatAtual.messages || []), userMsg, { sender: 'bot', text: data.reply, timestamp: Date.now() }] });
        } else if (chatAtual) {
          atualizarChatSolto(chatId, { messages: [...(chatAtual.messages || []), userMsg, { sender: 'bot', text: data.reply, timestamp: Date.now() }] });
        }
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
     if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
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

  const handleDropOnFolder = async (e: React.DragEvent<HTMLDivElement>, folderId: string) => {
    e.preventDefault();
    const chatId = e.dataTransfer.getData('chatId');
    const chat = chats.find(c => c.id === chatId);
    if (!chat || chat.folderId === folderId) return;
    await moverChat(chat.id, chat.folderId, folderId, user!.uid);
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, folderId } : c));
    if (activeChatId === chat.id) setActiveFolderId(folderId);
  };

  const handleDropOnRoot = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const chatId = e.dataTransfer.getData('chatId');
    const chat = chats.find(c => c.id === chatId);
    if (!chat || chat.folderId === null) return;
    await moverChat(chat.id, chat.folderId, null, user!.uid);
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, folderId: null } : c));
    if (activeChatId === chat.id) setActiveFolderId(null);
  };

  const toggleRoot = () => {
    setExpandedFolders(prev =>
      prev.includes('root')
        ? prev.filter(id => id !== 'root')
        : [...prev, 'root']
    );
    setActiveFolderId(null);
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
     downloadPdf(docDefinition, `pasta-${folder.name}`);
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
     downloadPdf(docDefinition, `chat-${chat.title}`);
  };

  // Excluir pasta
  const deleteFolder = async (folderId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta pasta e todos os chats dentro dela?')) return;
    // Busca todos os chats da pasta e exclui do banco
    const chatsDaPasta = chats.filter(c => c.folderId === folderId);
    for (const chat of chatsDaPasta) {
      await excluirChatDB(folderId, chat.id);
    }
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

  // Ícones SVG modernos em azul
  const IconRename = (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" style={{color: "#2563eb"}}>
      <path d="M16.13 3.87a3 3 0 0 1 4.24 4.24l-1.06 1.06-4.24-4.24 1.06-1.06Zm-2.12 2.12-9 9V19h4.01l9-9-4.01-4.01Z" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const IconDownload = (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" style={{color: "#2563eb"}}>
      <path d="M12 3v14m0 0l-5-5m5 5l5-5M5 21h14" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const IconDelete = (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" style={{color: "#2563eb"}}>
      <path d="M6 7h12M10 11v4m4-4v4M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const IconRemoveFromFolder = (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" style={{color: "#2563eb"}}>
      <path d="M19 5L5 19M5 5h14v14" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Ícone Plus branco para ambos os botões
  const PlusIconWhite = (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" style={{marginRight: 6, verticalAlign: 'middle'}}>
      <path fill="#fff" d="M12 5v14m7-7H5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
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

  // Função para criar novo chat solto (fora de pasta)
  const createChatSolto = async () => {
    if (!user) return;
    const title = prompt('Título do novo chat', 'Novo Chat');
    if (!title) return;
    const novoChat = await criarChatSolto(user.uid, title);
    setChats(prev => [...prev, novoChat]);
    setActiveFolderId(null);
    setActiveChatId(novoChat.id);
  };

  // Fecha o menu de opções da pasta ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        folderMenuRef.current &&
        !folderMenuRef.current.contains(event.target as Node)
      ) {
        setOpenFolderMenuId(null);
      }
    }
    if (openFolderMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openFolderMenuId]);

  // Fecha o menu do chat ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        chatMenuRef.current &&
        !chatMenuRef.current.contains(event.target as Node)
      ) {
        setOpenChatMenuId(null);
      }
    }
    if (openChatMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openChatMenuId]);

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
                    onClick={createChatSolto}
                  >
                    {PlusIconWhite}
                    Novo chat
                  </button>
                  <button
                    className={styles.newFolderButton}
                    onClick={createFolder}
                  >
                    {PlusIconWhite}
                    Nova pasta
                  </button>
                </div>
                <div className={styles.sidebarFolders}>
                  {/* Removido bloco de pasta "Chats" */}
                  {folders.map(folder => (
                    <div
                      key={folder.id}
                      className={styles.folder}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => handleDropOnFolder(e, folder.id)}
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
                            >{IconRename}Renomear</button>
                            <button
                              className={styles.folderMenuItem}
                              onClick={e => { e.stopPropagation(); setOpenFolderMenuId(null); exportFolder(folder.id); }}
                            >{IconDownload}Baixar</button>
                            <button
                              className={styles.folderMenuItem}
                              onClick={e => { e.stopPropagation(); setOpenFolderMenuId(null); deleteFolder(folder.id); }}
                            >{IconDelete}Excluir</button>
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
                                style={{ position: 'relative' }}
                                draggable
                                onDragStart={e => {
                                  e.dataTransfer.setData('chatId', chat.id);
                                }}
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
                                <button
                                  className={styles.folderMenuButton}
                                  style={{marginLeft: 4}}
                                  onClick={e => {
                                    e.stopPropagation();
                                    setOpenChatMenuId(openChatMenuId === chat.id ? null : chat.id);
                                  }}
                                  aria-label="Mais opções do chat"
                                >
                                  &#8230;
                                </button>
                                {openChatMenuId === chat.id && (
                                  <div
                                    ref={chatMenuRef}
                                    className={styles.folderMenuDropdown}
                                    style={{left: 60, top: '100%'}}
                                  >
                                    <button
                                      className={styles.folderMenuItem}
                                      onClick={e => { e.stopPropagation(); setOpenChatMenuId(null); renameChat(chat.id); }}
                                    >{IconRename}Renomear</button>
                                    <button
                                      className={styles.folderMenuItem}
                                      onClick={e => { e.stopPropagation(); setOpenChatMenuId(null); exportChat(chat); }}
                                    >{IconDownload}Baixar</button>
                                    <button
                                      className={styles.folderMenuItem}
                                      onClick={e => { e.stopPropagation(); setOpenChatMenuId(null); removeFromFolder(chat); }}
                                    >{IconRemoveFromFolder}Remover da pasta</button>
                                    <button
                                      className={styles.folderMenuItem}
                                      onClick={e => { e.stopPropagation(); setOpenChatMenuId(null); deleteChat(chat.id, chat.folderId); }}
                                    >{IconDelete}Excluir</button>
                                  </div>
                                )}
                                {/* ...existing chat actions (podem ser removidos se desejar só no menu) ... */}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  ))}
                  {/* Exibe chats soltos diretamente no sidebar */}
                  <ul className={styles.chatList}>
                    {chats
                      .filter(c => c.folderId === null)
                      .map(chat => (
                        <li
                          key={chat.id}
                          className={`${styles.chatItem} ${chat.id === activeChatId && activeFolderId === null ? styles.activeChat : ''}`}
                          style={{ position: 'relative' }}
                          draggable
                          onDragStart={e => {
                            e.dataTransfer.setData('chatId', chat.id);
                          }}
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
                          <div className={styles.outsideChatActions}>
                            <button
                              className={styles.folderMenuButton}
                              style={{ marginLeft: 4 }}
                              onClick={e => {
                                e.stopPropagation();
                                setOpenChatMenuId(openChatMenuId === chat.id ? null : chat.id);
                              }}
                              aria-label="Mais opções do chat"
                            >
                              &#8230;
                            </button>
                            {openChatMenuId === chat.id && (
                              <div
                                ref={chatMenuRef}
                                className={styles.folderMenuDropdown}
                                style={{ left: 60, top: '100%' }}
                              >
                                <button
                                  className={styles.folderMenuItem}
                                  onClick={e => { e.stopPropagation(); setOpenChatMenuId(null); renameChat(chat.id); }}
                                >{IconRename}Renomear</button>
                                <button
                                  className={styles.folderMenuItem}
                                  onClick={e => { e.stopPropagation(); setOpenChatMenuId(null); exportChat(chat); }}
                                >{IconDownload}Baixar</button>
                                <button
                                  className={styles.folderMenuItem}
                                  onClick={e => { e.stopPropagation(); setOpenChatMenuId(null); deleteChat(chat.id, chat.folderId); }}
                                >{IconDelete}Excluir</button>
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              </aside>
              <div className={styles.chatBox}>
                <div className={styles.chatTitle}>
                  {activeFolderId
                    ? (folders.find(f => f.id === activeFolderId)?.name || 'ClinicAid IA')
                    : 'No que você está pensando hoje?'}
                </div>
                <div className={styles.messages}>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={msg.sender === 'user' ? styles.userMessage : styles.botMessage}
                    >
                      {msg.text}
                      <span className={styles.messageTime}>{new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                  {loading && (
                    <div className={styles.botMessage}>Carregando resposta...</div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className={styles.inputContainer}>
                  {dictationWave && (
                    <div className={styles.dictationWaveContainer}>
                      <DictationWave />
                    </div>
                  )}
                  <textarea
                    className={`${styles.input} ${dictationActive ? styles.inputHidden : ''}`}
                    value={input}
                    onChange={e => {
                      setInput(e.target.value);
                      // Ajusta altura ao digitar
                      const el = e.currentTarget;
                      el.style.height = 'auto';
                      const max = 180;
                      if (el.scrollHeight > max) {
                        el.style.height = max + 'px';
                        el.style.overflowY = 'auto';
                      } else {
                        el.style.height = el.scrollHeight + 'px';
                        el.style.overflowY = 'hidden';
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite sua pergunta"
                    ref={inputRef as any}
                    rows={1}
                    style={{ resize: 'none', overflowY: 'auto', maxHeight: '180px' }}
                    onInput={e => {
                      // Ajusta altura ao receber texto (inclusive ditação)
                      const el = e.currentTarget;
                      el.style.height = 'auto';
                      const max = 180;
                      if (el.scrollHeight > max) {
                        el.style.height = max + 'px';
                        el.style.overflowY = 'auto';
                      } else {
                        el.style.height = el.scrollHeight + 'px';
                        el.style.overflowY = 'hidden';
                      }
                    }}
                    disabled={dictationActive || loading}
                  />
                  <button
                    className={`${styles.modeButton} ${listening ? styles.modeButtonActive : ''}`}
                    title="Modo ditar"
                    disabled={loading}
                    onClick={toggleListening}
                  >
                    <Mic size={18} />
                  </button>
                  <button
                    className={styles.modeButton}
                    title="Modo de escuta profissional"
                    disabled={loading || dictationActive}
                  >
                    <Stethoscope size={18} />
                  </button>
                  <button className={styles.sendButton} onClick={sendMessage} disabled={loading || dictationActive}>
                    <Send size={18} style={{ marginRight: 4 }} />
                    Enviar
                  </button>
                  {dictationLoading && (
                    <span className={styles.inputLoadingSpinner}>
                      <span className={styles.loadingSpinner} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );

  // Componente de onda de áudio animada
  function DictationWave() {
    return (
      <div className={styles.waveBar}>
        {[...Array(20)].map((_, i) => (
          <div key={i} className={styles.waveBarItem} style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
    );
  }
}
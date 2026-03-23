import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
const Player = ReactPlayer as any;
import { Message, AIMode } from '../types';
import { Send, Image as ImageIcon, Mic, Video, Languages, Calculator, FileText, Search, Copy, Share2, Volume2, Paperclip, Camera, Youtube, Globe, Plus, X, Ghost } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateChatResponse, generateChatResponseStream, generateImage, generateVideo, searchWeb, searchMaps, searchYouTube, analyzeImage, generateSpeech, analyzeMedia } from '../services/geminiService';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import LiveAudio from './LiveAudio';
import { notify } from '../services/notificationService';

interface ChatboardProps {
  chatId: string | null;
  isGuest?: boolean;
  isSimpleMode?: boolean;
}

export default function Chatboard({ chatId, isGuest, isSimpleMode }: ChatboardProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [mode, setMode] = useState<AIMode>('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isIncognito, setIsIncognito] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      notify("Error", "Speech recognition is not supported in this browser.", "error");
      return;
    }

    try {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        recognitionRef.current.start();
        setIsListening(true);
        notify("Voice Input", "Listening... Speak now.", "info");
      }
    } catch (error) {
      console.error("Speech recognition error:", error);
      setIsListening(false);
    }
  };

  useEffect(() => {
    if (!mediaFile) {
      setMediaPreview(null);
      return;
    }
    if (mediaFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setMediaPreview(reader.result as string);
      reader.readAsDataURL(mediaFile);
    } else {
      setMediaPreview(null);
    }
  }, [mediaFile]);

  useEffect(() => {
    if (isGuest || isIncognito) {
      setMessages([]);
      return;
    }
    if (!chatId || !auth.currentUser) return;

    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push(doc.data() as Message);
      });
      setMessages(msgs);
      scrollToBottom();
    }, (error) => {
      console.error("Error fetching messages:", error);
    });

    return () => unsubscribe();
  }, [chatId, isGuest]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSend = async () => {
    if ((!input.trim() && !videoUrl.trim() && !mediaFile)) return;
    if (!isGuest && (!chatId || !auth.currentUser)) return;

    const userMsgId = uuidv4();
    
    let attachment = undefined;
    if (mediaFile) {
      attachment = {
        name: mediaFile.name,
        type: mediaFile.type,
        size: mediaFile.size,
        url: mediaPreview || undefined
      };
    }

    const finalContent = mode === 'video' && videoUrl.trim() 
      ? videoUrl.trim() + (input.trim() ? `\n\nPrompt: ${input.trim()}` : '')
      : input;

    const userMsg: Message = {
      id: userMsgId,
      chatId: chatId || 'guest-chat',
      userId: auth.currentUser?.uid || 'guest',
      role: 'user',
      content: finalContent || (mediaFile ? `[Attached File: ${mediaFile.name}]` : ''),
      createdAt: new Date().toISOString(),
      attachment
    };

    setInput('');
    setVideoUrl('');
    setMediaFile(null);
    setIsLoading(true);
    
    if (isGuest || isIncognito) {
      setMessages(prev => [...prev, userMsg]);
    }

    const saveMessage = async (msgId: string, msg: Message) => {
      if (isGuest || isIncognito || !chatId) return;
      
      // Firestore 1MB limit check (approx 1,000,000 bytes)
      const size = new Blob([JSON.stringify(msg)]).size;
      if (size > 1000000) {
        console.warn("Message too large for Firestore, truncating content.");
        const placeholder = "\n\n[Content too large to sync to cloud history]";
        // Truncate to ~900KB to be safe
        const safeLimit = 900000; 
        msg.content = msg.content.substring(0, safeLimit) + placeholder;
        if (msg.attachment && msg.attachment.url) {
          delete msg.attachment.url; // Remove large base64 from cloud
        }
      }
      
      try {
        await setDoc(doc(db, `chats/${chatId}/messages/${msgId}`), msg);
      } catch (error) {
        console.error("Error saving message to Firestore:", error);
      }
    };

    try {
      if (!isGuest && chatId) {
        await saveMessage(userMsgId, userMsg);
      }

      let aiResponseContent = '';
      let generatedVideoUrl = '';

      if (mode === 'image') {
        const imgBase64 = await generateImage(userMsg.content);
        aiResponseContent = imgBase64 ? `![Generated Image](${imgBase64})` : 'Failed to generate image.';
      } else if (mode === 'video') {
        const isYouTube = userMsg.content.includes('youtube.com/') || userMsg.content.includes('youtu.be/');
        
        if (isYouTube && !attachment) {
          // If it's a YouTube URL and no file is attached, treat it as video analysis
          const analysis = await generateChatResponse(`Analyze this YouTube video: ${userMsg.content}`, 'research');
          aiResponseContent = `Analyzing video: ${userMsg.content}\n\n${analysis}`;
        } else if (!attachment && (userMsg.content.toLowerCase().includes('find') || userMsg.content.toLowerCase().includes('search'))) {
          // If the user wants to find a video
          aiResponseContent = await searchYouTube(userMsg.content);
        } else {
          // Otherwise, proceed with video generation
          let base64 = undefined;
          if (attachment && attachment.url) {
            base64 = attachment.url;
          }
          const vUrl = await generateVideo(userMsg.content, base64);
          if (vUrl) {
            generatedVideoUrl = vUrl;
            aiResponseContent = `Video generated successfully! You can view it below.`;
          } else {
            aiResponseContent = 'Failed to generate video.';
          }
        }
      } else if (attachment && attachment.url && attachment.type.startsWith('image/')) {
        // Prioritize image analysis if an image is attached
        aiResponseContent = await analyzeImage(userMsg.content, attachment.url);
      } else if (mode === 'research' || mode === 'chat' || mode === 'math') {
        const aiMsgId = uuidv4();
        const aiMsg: Message = {
          id: aiMsgId,
          chatId: chatId || 'guest-chat',
          userId: auth.currentUser?.uid || 'guest',
          role: 'model',
          content: '',
          createdAt: new Date().toISOString()
        };

        if (isGuest || isIncognito) {
          setMessages(prev => [...prev, aiMsg]);
        } else if (chatId) {
          await saveMessage(aiMsgId, aiMsg);
        }

        let fullText = '';
        await generateChatResponseStream(userMsg.content, mode, async (chunk) => {
          fullText += chunk;
          if (isGuest || isIncognito) {
            setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: fullText } : m));
          } else if (chatId) {
            // For streaming updates, we also need to check size
            const updatedMsg = { ...aiMsg, content: fullText };
            const size = new Blob([JSON.stringify(updatedMsg)]).size;
            if (size < 1000000) {
              await updateDoc(doc(db, `chats/${chatId}/messages/${aiMsgId}`), { content: fullText });
            } else {
              // If it gets too large during stream, stop updating Firestore but keep local state
              console.warn("Streamed message exceeded Firestore limit, stopping cloud sync.");
            }
          }
        });
        aiResponseContent = fullText;
        if (autoSpeak && aiResponseContent) {
          handleSpeech(aiResponseContent);
        }
      } else if (attachment && attachment.url) {
        const base64 = attachment.url;
        if (attachment.type.startsWith('image/')) {
          aiResponseContent = await analyzeImage(userMsg.content, base64);
        } else {
          aiResponseContent = await analyzeMedia(userMsg.content, base64, attachment.type);
        }
      } else {
        aiResponseContent = await generateChatResponse(userMsg.content, mode);
      }

      if (mode !== 'research' && mode !== 'chat' && mode !== 'math') {
        const aiMsgId = uuidv4();
        const aiMsg: Message = {
          id: aiMsgId,
          chatId: chatId || 'guest-chat',
          userId: auth.currentUser?.uid || 'guest',
          role: 'model',
          content: aiResponseContent,
          createdAt: new Date().toISOString(),
          videoUrl: generatedVideoUrl || undefined
        };

        if (isGuest || isIncognito) {
          setMessages(prev => [...prev, aiMsg]);
        } else if (chatId) {
          await saveMessage(aiMsgId, aiMsg);
        }
        if (autoSpeak && aiResponseContent) {
          handleSpeech(aiResponseContent);
        }
      }
      setMediaFile(null);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeech = async (text: string) => {
    const audioUrl = await generateSpeech(text);
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const handleSaveToDocs = async (content: string) => {
    if (isGuest) {
      notify("Guest Mode", "Please sign in to save documents.", "warning");
      return;
    }
    if (!auth.currentUser) return;
    const docId = uuidv4();
    try {
      await setDoc(doc(db, `documents/${docId}`), {
        id: docId,
        userId: auth.currentUser.uid,
        title: 'Saved from AI Chat',
        type: 'word',
        content: content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      notify("Success", "Saved to Productivity Workspace!", "success");
    } catch (error) {
      console.error("Error saving document:", error);
      notify("Error", "Failed to save document.", "error");
    }
  };

  const modes: { id: AIMode; icon: React.ReactNode; label: string }[] = [
    { id: 'chat', icon: <Send size={16} />, label: 'Chat' },
    { id: 'image', icon: <ImageIcon size={16} />, label: 'Image' },
    { id: 'voice', icon: <Mic size={16} />, label: 'Voice' },
    { id: 'video', icon: <Video size={16} />, label: 'Video / YouTube' },
    { id: 'translate', icon: <Languages size={16} />, label: 'Translate' },
    { id: 'math', icon: <Calculator size={16} />, label: 'Math' },
    { id: 'document', icon: <FileText size={16} />, label: 'Document' },
    { id: 'research', icon: <Search size={16} />, label: 'Research' },
  ];

  if (!chatId) {
    return (
      <div className={`flex flex-col items-center justify-center h-full p-8 text-center transition-colors duration-500 ${isSimpleMode ? 'bg-white text-gray-900' : 'bg-[#050505] text-gray-500'}`}>
        <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center font-black text-white text-5xl mb-8 shadow-2xl ${isSimpleMode ? 'bg-blue-600 shadow-blue-600/20' : 'bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)]'}`}>
          {isSimpleMode ? 'P' : 'DB'}
        </div>
        <h1 className={`text-4xl md:text-6xl font-black tracking-tighter mb-4 ${isSimpleMode ? 'text-gray-900' : 'text-white'}`}>
          {isSimpleMode ? 'SIMPLE' : 'DB GPT'} <span className="text-blue-400">{isSimpleMode ? 'GPT CHAT' : 'PREMIUM AI'}</span>
        </h1>
        <p className={`max-w-md mx-auto font-medium leading-relaxed mb-8 ${isSimpleMode ? 'text-gray-500' : 'text-gray-500'}`}>
          {isSimpleMode ? 'Start a simple conversation with our AI assistant.' : 'Select a chat from the sidebar or start a new conversation to experience the power of next-gen AI.'}
        </p>
        <div className="flex gap-4">
          <div className={`px-6 py-3 border rounded-2xl text-sm font-bold uppercase tracking-widest ${isSimpleMode ? 'bg-gray-50 border-gray-100 text-gray-600' : 'bg-white/5 border-white/10 text-white'}`}>
            Search
          </div>
          <div className={`px-6 py-3 border rounded-2xl text-sm font-bold uppercase tracking-widest ${isSimpleMode ? 'bg-gray-50 border-gray-100 text-gray-600' : 'bg-white/5 border-white/10 text-white'}`}>
            Analyze
          </div>
          <div className={`px-6 py-3 border rounded-2xl text-sm font-bold uppercase tracking-widest ${isSimpleMode ? 'bg-gray-50 border-gray-100 text-gray-600' : 'bg-white/5 border-white/10 text-white'}`}>
            Create
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full transition-colors duration-500 ${isSimpleMode ? 'bg-white text-gray-900' : (isIncognito ? 'bg-[#0f0f12]' : 'bg-[#121212]')} text-white relative`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {isIncognito && !isSimpleMode && (
          <div className="sticky top-0 z-10 flex justify-center py-2">
            <div className="bg-purple-500/10 border border-purple-500/20 backdrop-blur-md px-4 py-1 rounded-full flex items-center gap-2 text-[10px] font-bold text-purple-400 uppercase tracking-widest shadow-lg">
              <Ghost size={12} />
              Incognito Mode Active
            </div>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center font-black text-white text-5xl mb-8 shadow-2xl ${isSimpleMode ? 'bg-blue-600 shadow-blue-600/20' : 'bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)]'}`}>
              {isSimpleMode ? 'P' : 'DB'}
            </div>
            <h1 className={`text-4xl md:text-6xl font-black tracking-tighter mb-4 ${isSimpleMode ? 'text-gray-900' : 'text-white'}`}>
              {isSimpleMode ? 'SIMPLE' : 'DB GPT'} <span className="text-blue-400">{isSimpleMode ? 'GPT CHAT' : 'PREMIUM AI'}</span>
            </h1>
            <p className={`max-w-md mx-auto font-medium leading-relaxed ${isSimpleMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {isSimpleMode ? 'How can I help you today?' : 'PEEP THE WORLD. Start a conversation with your advanced AI companion.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              <div className={`max-w-[80%] rounded-2xl p-4 shadow-lg ${
                msg.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : (isSimpleMode ? 'bg-gray-50 text-gray-900 border border-gray-100' : 'bg-[#1e1e1e] text-white')
              }`}>
                <div className={`prose max-w-none ${msg.role === 'user' ? 'prose-invert' : (isSimpleMode ? 'prose-slate' : 'prose-invert')}`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {msg.attachment && (
                  <div className={`mt-3 p-2 rounded-xl border flex items-center gap-3 ${isSimpleMode ? 'bg-white border-gray-200' : 'bg-black/20 border-white/10'}`}>
                    {msg.attachment.type.startsWith('image/') && msg.attachment.url ? (
                      <img src={msg.attachment.url} alt="Attachment" className="w-12 h-12 object-cover rounded-lg" />
                    ) : (
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isSimpleMode ? 'bg-gray-100' : 'bg-white/10'}`}>
                        <Paperclip size={20} className={isSimpleMode ? 'text-gray-500' : 'text-white'} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${isSimpleMode ? 'text-gray-900' : 'text-white'}`}>{msg.attachment.name}</div>
                      <div className="text-[10px] opacity-60 uppercase">{(msg.attachment.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                )}
                {msg.videoUrl && (
                  <div className={`mt-4 rounded-xl overflow-hidden aspect-video border relative group ${isSimpleMode ? 'border-gray-200 bg-gray-100' : 'border-gray-700 bg-black'}`}>
                    <div className="absolute top-3 left-3 z-10 bg-emerald-600/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2 text-[10px] font-bold text-white uppercase tracking-widest shadow-lg border border-white/20">
                      <Video size={12} />
                      AI Generated Video
                    </div>
                    <Player
                      url={msg.videoUrl}
                      width="100%"
                      height="100%"
                      controls={true}
                      playing={false}
                    />
                  </div>
                )}
                {getYouTubeId(msg.content) && (
                  <div className={`mt-4 rounded-xl overflow-hidden aspect-video border relative group ${isSimpleMode ? 'border-gray-200 bg-gray-100' : 'border-gray-700 bg-black'}`}>
                    {msg.role === 'model' && (
                      <div className="absolute top-3 left-3 z-10 bg-blue-600/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2 text-[10px] font-bold text-white uppercase tracking-widest shadow-lg border border-white/20">
                        <Youtube size={12} />
                        AI Analyzed Content
                      </div>
                    )}
                    <Player
                      url={`https://www.youtube.com/watch?v=${getYouTubeId(msg.content)}`}
                      width="100%"
                      height="100%"
                      controls={true}
                      light={`https://img.youtube.com/vi/${getYouTubeId(msg.content)}/maxresdefault.jpg`}
                      playIcon={
                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                          <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent ml-1" />
                        </div>
                      }
                    />
                  </div>
                )}
                {msg.role === 'model' && (
                  <div className={`flex gap-2 mt-3 pt-3 border-t ${isSimpleMode ? 'border-gray-200' : 'border-gray-700/50'}`}>
                    <button onClick={() => navigator.clipboard.writeText(msg.content)} className="p-1 hover:text-blue-400 transition-colors" title="Copy">
                      <Copy size={14} />
                    </button>
                    <button onClick={() => handleSpeech(msg.content)} className="p-1 hover:text-blue-400 transition-colors" title="Listen">
                      <Volume2 size={14} />
                    </button>
                    <button onClick={() => handleSaveToDocs(msg.content)} className="p-1 hover:text-blue-400 transition-colors" title="Save to Productivity">
                      <FileText size={14} />
                    </button>
                    <button className="p-1 hover:text-blue-400 transition-colors" title="Share">
                      <Share2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {mode === 'voice' && (
          <div className="flex justify-center my-8">
            <LiveAudio />
          </div>
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className={`rounded-2xl p-4 animate-pulse ${isSimpleMode ? 'bg-gray-100 text-gray-500' : 'bg-[#1e1e1e] text-white'}`}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={`p-4 border-t transition-colors ${isSimpleMode ? 'bg-white border-gray-100' : 'bg-[#1a1a1a] border-gray-800'}`}>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
            {modes.filter(m => !isSimpleMode || ['chat', 'voice', 'translate'].includes(m.id)).map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  mode === m.id 
                  ? 'bg-blue-600 text-white' 
                  : (isSimpleMode ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]')
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isSimpleMode && (
              <button 
                onClick={() => setIsIncognito(!isIncognito)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  isIncognito ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' : 'bg-gray-800 text-gray-500 border border-transparent'
                }`}
                title="Incognito Mode (Messages won't be saved)"
              >
                <Ghost size={14} />
                {isIncognito ? 'Incognito ON' : 'Incognito OFF'}
              </button>
            )}
            <button 
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                autoSpeak ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : (isSimpleMode ? 'bg-gray-100 text-gray-500' : 'bg-gray-800 text-gray-500 border border-transparent')
              }`}
            >
              <Volume2 size={14} />
              {autoSpeak ? 'Auto-Speak ON' : 'Auto-Speak OFF'}
            </button>
          </div>
        </div>

        <div className={`relative flex items-end gap-2 rounded-2xl p-2 transition-colors ${isSimpleMode ? 'bg-gray-50 border border-gray-100' : 'bg-[#2a2a2a]'}`}>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 transition-colors ${isSimpleMode ? 'text-gray-400 hover:text-blue-600' : 'text-gray-400 hover:text-white'}`}
            title="Upload Media"
          >
            <Plus size={20} />
          </button>
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            accept="image/*,video/*,audio/*"
            onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
          />
          {!isSimpleMode && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Attach Image"
            >
              <Camera size={20} />
            </button>
          )}
          <button 
            onClick={toggleListening}
            className={`p-2 transition-colors ${isListening ? 'text-red-500 animate-pulse' : (isSimpleMode ? 'text-gray-400 hover:text-blue-600' : 'text-gray-400 hover:text-white')}`}
            title={isListening ? "Stop Listening" : "Voice Input"}
          >
            <Mic size={20} />
          </button>
          {mode === 'video' && !isSimpleMode && (
            <button 
              onClick={() => setInput('https://www.youtube.com/watch?v=')}
              className="p-2 text-red-500 hover:text-red-400 transition-colors"
              title="Add YouTube URL"
            >
              <Youtube size={20} />
            </button>
          )}
          <div className="flex-1 flex flex-col">
            {mode === 'video' && !isSimpleMode && (
              <div className="mb-2 p-2 bg-red-500/5 border border-red-500/20 rounded-xl">
                <label className="text-[10px] uppercase tracking-widest text-red-500 font-bold mb-1.5 flex items-center gap-2">
                  <Youtube size={12} /> YouTube Video URL
                </label>
                <input 
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Paste YouTube link here (e.g. https://youtube.com/watch?v=...)"
                  className="w-full bg-[#111] border border-gray-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-red-500/50 transition-all text-white"
                />
              </div>
            )}
            {mediaFile && (
              <div className={`flex items-center gap-2 mb-2 p-2 rounded-xl border ${isSimpleMode ? 'bg-white border-gray-200' : 'bg-[#1a1a1a] border-gray-800'}`}>
                {mediaPreview ? (
                  <img src={mediaPreview} alt="Preview" className="w-10 h-10 object-cover rounded-lg" />
                ) : (
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSimpleMode ? 'bg-gray-100' : 'bg-gray-800'}`}>
                    <Paperclip size={16} className="text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-medium truncate ${isSimpleMode ? 'text-blue-600' : 'text-blue-400'}`}>
                    {mediaFile.name}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase">
                    {(mediaFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button 
                  onClick={() => setMediaFile(null)}
                  className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isListening ? "Listening..." : (isSimpleMode ? "Type a message to GPT..." : (mode === 'video' ? "Describe a video to generate or add context to the URL above..." : `Ask DB GPT in ${mode} mode...`))}
              className={`w-full bg-transparent resize-none outline-none max-h-32 py-2 transition-opacity ${isListening ? 'opacity-50' : 'opacity-100'} ${isSimpleMode ? 'text-gray-900' : 'text-white'}`}
              rows={1}
              disabled={isListening && !input}
            />
          </div>
          <button 
            onClick={handleSend}
            disabled={!input.trim() && !videoUrl.trim() && !mediaFile}
            className={`p-2 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isSimpleMode ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

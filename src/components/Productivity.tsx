import React, { useState, useEffect, useRef } from 'react';
import { FileText, Table, Presentation, Image as ImageIcon, Zap, Plus, Download, Save, Share2, Type, Layout, Grid, Wand2, Sparkles, Trash2, Loader2, Bold, Italic, Underline } from 'lucide-react';
import { generateChatResponse } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { notify } from '../services/notificationService';
import { db, auth } from '../firebase';
import { doc, setDoc, collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';

interface ProductivityProps {
  isGuest?: boolean;
  isSimpleMode?: boolean;
}

type ModuleType = 'word' | 'excel' | 'ppt' | 'photoshop' | 'automation';

export default function Productivity({ isGuest, isSimpleMode }: ProductivityProps) {
  const [activeModule, setActiveModule] = useState<ModuleType>('word');
  const [content, setContent] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState('Untitled Document');
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'documents'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('updatedAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const files: any[] = [];
      snapshot.forEach((doc) => {
        files.push({ id: doc.id, ...doc.data() });
      });
      setRecentFiles(files);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (isGuest) {
      notify("Guest Mode", "Please sign in to save documents.", "warning");
      return;
    }
    if (!auth.currentUser) return;
    if (!content.trim()) {
      notify("Empty Document", "Cannot save an empty document.", "warning");
      return;
    }

    try {
      const docId = uuidv4();
      await setDoc(doc(db, 'documents', docId), {
        id: docId,
        userId: auth.currentUser.uid,
        title: title,
        type: activeModule,
        content: content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      notify("Success", "Document saved successfully!", "success");
    } catch (error) {
      console.error("Error saving document:", error);
      notify("Error", "Failed to save document.", "error");
    }
  };

  const loadFile = (file: any) => {
    setActiveModule(file.type);
    setTitle(file.title);
    setContent(file.content);
    notify("File Loaded", `"${file.title}" is now open.`, "info");
  };

  const handleAiAssist = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const response = await generateChatResponse(`Help me with this ${activeModule} document titled "${title}". Task: ${aiPrompt}`, 'document');
      setContent(prev => prev + '\n\n' + response);
      setAiPrompt('');
      notify("AI Assist", "Content generated and added to document.", "success");
    } catch (error) {
      notify("Error", "Failed to generate AI content.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Check for .DBGPT trigger
    if (newContent.endsWith('.DBGPT')) {
      setContent(newContent.slice(0, -6)); // Remove the trigger
      notify("AI Triggered", "Type your prompt in the AI Assistant box.", "info");
      // Focus the AI prompt input
      const aiInput = document.getElementById('ai-assist-input');
      if (aiInput) aiInput.focus();
    }
  };

  const applyFormatting = (type: 'bold' | 'italic' | 'underline') => {
    if (!editorRef.current || activeModule !== 'word') return;
    
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let formattedText = '';
    switch (type) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `<u>${selectedText}</u>`;
        break;
    }
    
    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);
    
    // Refocus and set selection
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        const newCursorPos = start + formattedText.length;
        editorRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const modules = [
    { id: 'word', icon: <FileText size={20} />, label: 'Document', color: 'text-blue-400' },
    { id: 'excel', icon: <Table size={20} />, label: 'Spreadsheet', color: 'text-emerald-400' },
    { id: 'ppt', icon: <Presentation size={20} />, label: 'Presentation', color: 'text-orange-400' },
    { id: 'photoshop', icon: <ImageIcon size={20} />, label: 'Image Editor', color: 'text-purple-400' },
    { id: 'automation', icon: <Zap size={20} />, label: 'Automation', color: 'text-yellow-400' },
  ];

  return (
    <div className="flex h-full bg-[#0a0a0a] text-white overflow-hidden">
      {/* Module Sidebar */}
      <div className="w-64 bg-[#111] border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="text-blue-500" size={24} />
            PREMIUM STUDIO
          </h2>
        </div>
        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest">Modules</div>
          {modules.map(m => (
            <button
              key={m.id}
              onClick={() => {
                setActiveModule(m.id as ModuleType);
                setTitle(`New ${m.label}`);
                setContent('');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeModule === m.id ? 'bg-[#1a1a1a] text-white shadow-lg' : 'hover:bg-[#1a1a1a] text-gray-500'
              }`}
            >
              <span className={activeModule === m.id ? m.color : ''}>{m.icon}</span>
              <span className="font-medium">{m.label}</span>
            </button>
          ))}
          
          <div className="mt-8 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest">Recent Files</div>
          <div className="px-2 space-y-1">
            {recentFiles.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-600 italic">No recent files</div>
            ) : (
              recentFiles.map(file => (
                <button
                  key={file.id}
                  onClick={() => loadFile(file)}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-[#1a1a1a] transition-colors group"
                >
                  <div className="text-sm font-medium text-gray-300 truncate group-hover:text-white">{file.title}</div>
                  <div className="text-[10px] text-gray-600 uppercase tracking-tighter">{file.type}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col h-full bg-[#0a0a0a]">
        {/* Toolbar */}
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#111]">
          <div className="flex items-center gap-4">
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent border-none text-lg font-bold focus:outline-none focus:ring-0 text-gray-300 w-64"
            />
            <div className="h-6 w-px bg-gray-800 mx-2" />
            <div className="flex gap-2">
              {activeModule === 'word' && (
                <>
                  <button 
                    onClick={() => applyFormatting('bold')}
                    className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
                    title="Bold"
                  >
                    <Bold size={18} />
                  </button>
                  <button 
                    onClick={() => applyFormatting('italic')}
                    className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
                    title="Italic"
                  >
                    <Italic size={18} />
                  </button>
                  <button 
                    onClick={() => applyFormatting('underline')}
                    className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
                    title="Underline"
                  >
                    <Underline size={18} />
                  </button>
                  <div className="h-6 w-px bg-gray-800 mx-1" />
                </>
              )}
              <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"><Type size={18} /></button>
              <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"><Layout size={18} /></button>
              <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"><Grid size={18} /></button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 rounded-xl text-sm font-medium transition-colors text-gray-400">
              <Share2 size={16} /> Share
            </button>
            <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 rounded-xl text-sm font-medium transition-colors text-gray-400">
              <Download size={16} /> Export
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
            >
              <Save size={16} /> Save
            </button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 relative p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto h-full bg-[#111] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col">
              {activeModule === 'word' && (
                <textarea
                  ref={editorRef}
                  value={content}
                  onChange={handleContentChange}
                  placeholder="Start typing... Use .AI to trigger Premium Assistant."
                  className="flex-1 bg-transparent p-12 text-lg leading-relaxed resize-none focus:outline-none font-serif"
                />
              )}
              {activeModule === 'excel' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="bg-[#1a1a1a] p-2 border-b border-gray-800 flex gap-2">
                    <div className="bg-[#0a0a0a] px-3 py-1 rounded text-xs font-mono text-emerald-400">fx</div>
                    <input className="flex-1 bg-transparent text-sm focus:outline-none" placeholder="Enter formula or value..." />
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="w-10 bg-[#1a1a1a] border border-gray-800"></th>
                          {['A','B','C','D','E','F','G'].map(c => (
                            <th key={c} className="bg-[#1a1a1a] border border-gray-800 p-2 text-xs font-bold text-gray-500">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 20 }).map((_, r) => (
                          <tr key={r}>
                            <td className="bg-[#1a1a1a] border border-gray-800 p-2 text-center text-[10px] font-bold text-gray-600">{r + 1}</td>
                            {Array.from({ length: 7 }).map((_, c) => (
                              <td key={c} className="border border-gray-800 p-2 min-w-[100px] h-10 hover:bg-emerald-500/5 transition-colors">
                                {r === 0 && c === 0 ? content : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {activeModule === 'ppt' && (
                <div className="flex-1 flex flex-col p-12 items-center justify-center text-center">
                  <div className="w-full max-w-2xl aspect-video bg-[#0a0a0a] border-2 border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center p-12">
                    <h1 className="text-4xl font-black mb-4 text-gray-300">{title}</h1>
                    <p className="text-gray-500 text-xl">{content || 'Click to add subtitle'}</p>
                  </div>
                  <div className="mt-8 flex gap-4">
                    <button className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm transition-colors">Add Slide</button>
                    <button className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm transition-colors">Change Layout</button>
                  </div>
                </div>
              )}
              {(activeModule === 'photoshop' || activeModule === 'automation') && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4">
                  <Wand2 size={64} className="opacity-20 animate-pulse" />
                  <p className="text-xl font-medium">{activeModule.charAt(0).toUpperCase() + activeModule.slice(1)} Module Loading...</p>
                  <p className="text-sm">This module is being enhanced with advanced AI capabilities.</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Assistant Panel */}
          <div className="w-80 border-l border-gray-800 bg-[#111] flex flex-col">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <Zap size={18} className="text-yellow-400" />
                AI Assistant
              </h3>
              <button onClick={() => setContent('')} className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-red-400 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="bg-[#0a0a0a] rounded-2xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-widest">Suggestions</p>
                <div className="space-y-2">
                  <button onClick={() => setAiPrompt("Summarize this document")} className="w-full text-left text-xs p-2 hover:bg-gray-800 rounded-lg transition-colors text-blue-400">Summarize content</button>
                  <button onClick={() => setAiPrompt("Fix grammar and spelling")} className="w-full text-left text-xs p-2 hover:bg-gray-800 rounded-lg transition-colors text-blue-400">Fix grammar</button>
                  <button onClick={() => setAiPrompt("Change tone to professional")} className="w-full text-left text-xs p-2 hover:bg-gray-800 rounded-lg transition-colors text-blue-400">Make professional</button>
                </div>
              </div>
              
              {isGenerating && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-800">
              <div className="relative">
                <textarea
                  id="ai-assist-input"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ask AI to help..."
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-2xl p-4 pr-12 text-sm focus:outline-none focus:border-blue-500 resize-none h-24"
                />
                <button 
                  onClick={handleAiAssist}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="absolute right-3 bottom-3 p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Send = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

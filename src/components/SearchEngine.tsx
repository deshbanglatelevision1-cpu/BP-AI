import React, { useState, useEffect, useRef } from 'react';
import { Search, Globe, Image as ImageIcon, Video, MessageSquare, MapPin, Volume2, Download, Share2, Clock, Zap, Loader2, Mic, Plus, FileText, Trash2, X, History, ChevronDown, ChevronUp } from 'lucide-react';
import { generateChatResponse, generateImage } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, addDoc, query as firestoreQuery, orderBy, limit, onSnapshot, where, serverTimestamp, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { notify } from '../services/notificationService';

interface SearchResult {
  type: 'text' | 'image' | 'map' | 'video' | 'web';
  content: any;
  title?: string;
}

interface SearchEngineProps {
  onOpenTool: (tool: string, url?: string) => void;
  isSimpleMode?: boolean;
}

export default function SearchEngine({ onOpenTool, isSimpleMode }: SearchEngineProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    text: false,
    image: false,
    map: false,
    web: false
  });
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'ai' | 'images' | 'maps' | 'videos' | 'history'>('all');
  const [recentSearches, setRecentSearches] = useState<{id: string, query: string, timestamp: any, results?: any}[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const searchInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = firestoreQuery(
      collection(db, 'search_history'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const searches: any[] = [];
      snapshot.forEach((doc) => {
        searches.push({ id: doc.id, ...doc.data() });
      });
      setRecentSearches(searches);
    });

    return () => unsubscribe();
  }, []);

  const handleSearch = async (e?: React.FormEvent, searchOverride?: string) => {
    if (e) e.preventDefault();
    const finalQuery = searchOverride || query;
    if (!finalQuery.trim()) return;

    setIsSearching(true);
    setLoadingStates({
      text: true,
      image: finalQuery.toLowerCase().includes('image') || finalQuery.toLowerCase().includes('generate'),
      map: finalQuery.toLowerCase().includes('near') || finalQuery.toLowerCase().includes('in ') || finalQuery.toLowerCase().includes('where'),
      web: true
    });
    setProgress(0);
    setResults([]);
    setActiveTab('all');
    
    // Save to history (initial entry)
    let historyDocId: string | null = null;
    if (auth.currentUser) {
      const docRef = await addDoc(collection(db, 'search_history'), {
        userId: auth.currentUser.uid,
        query: finalQuery,
        timestamp: serverTimestamp()
      });
      historyDocId = docRef.id;
    }

    // Simulate progress
    let currentProgress = 0;
    const estimatedTime = 3.5; // seconds
    setEta(estimatedTime);

    searchInterval.current = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress >= 100) {
        currentProgress = 100;
        if (searchInterval.current) clearInterval(searchInterval.current);
      }
      setProgress(Math.floor(currentProgress));
      setEta(prev => Math.max(0, +(prev - 0.1).toFixed(1)));
    }, 100);

    try {
      // Fetch Text Result
      const fetchText = async (): Promise<SearchResult | null> => {
        try {
          const aiText = await generateChatResponse(finalQuery, 'search');
          const res: SearchResult = { type: 'text', content: aiText };
          setResults(prev => [...prev, res]);
          return res;
        } catch (e) {
          return null;
        } finally {
          setLoadingStates(prev => ({ ...prev, text: false }));
        }
      };

      // Fetch Image Result
      const fetchImage = async (): Promise<SearchResult | null> => {
        if (finalQuery.toLowerCase().includes('image') || finalQuery.toLowerCase().includes('generate')) {
          try {
            const aiImage = await generateImage(finalQuery);
            if (aiImage) {
              const res: SearchResult = { type: 'image', content: aiImage, title: 'AI Generated Image' };
              setResults(prev => [...prev, res]);
              return res;
            }
            return null;
          } catch (e) {
            return null;
          } finally {
            setLoadingStates(prev => ({ ...prev, image: false }));
          }
        } else {
          setLoadingStates(prev => ({ ...prev, image: false }));
          return null;
        }
      };

      // Fetch Map Result
      const fetchMap = async (): Promise<SearchResult | null> => {
        if (finalQuery.toLowerCase().includes('near') || finalQuery.toLowerCase().includes('in ') || finalQuery.toLowerCase().includes('where')) {
          try {
            // Mock delay for map
            await new Promise(resolve => setTimeout(resolve, 1500));
            const res: SearchResult = { 
              type: 'map', 
              content: { lat: 23.8103, lng: 90.4125, address: finalQuery }, 
              title: 'Location Insights' 
            };
            setResults(prev => [...prev, res]);
            return res;
          } catch (e) {
            return null;
          } finally {
            setLoadingStates(prev => ({ ...prev, map: false }));
          }
        } else {
          setLoadingStates(prev => ({ ...prev, map: false }));
          return null;
        }
      };

      // Fetch Web Result
      const fetchWeb = async (): Promise<SearchResult | null> => {
        try {
          // Mock delay for web
          await new Promise(resolve => setTimeout(resolve, 1000));
          const res: SearchResult = {
            type: 'web',
            content: [
              { title: `${finalQuery} - Wikipedia`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(finalQuery)}`, snippet: `Comprehensive overview of ${finalQuery} from the free encyclopedia.` },
              { title: `Latest news on ${finalQuery}`, url: `https://news.google.com/search?q=${encodeURIComponent(finalQuery)}`, snippet: `Stay updated with the most recent developments regarding ${finalQuery}.` }
            ]
          };
          setResults(prev => [...prev, res]);
          return res;
        } catch (e) {
          return null;
        } finally {
          setLoadingStates(prev => ({ ...prev, web: false }));
        }
      };

      const [textRes, imageRes, mapRes, webRes] = await Promise.all([fetchText(), fetchImage(), fetchMap(), fetchWeb()]);

      // Update history with results
      if (historyDocId) {
        const finalResults: SearchResult[] = [];
        if (textRes) finalResults.push(textRes);
        if (imageRes) finalResults.push(imageRes);
        if (mapRes) finalResults.push(mapRes);
        if (webRes) finalResults.push(webRes);

        const updateData = { results: finalResults };
        const size = new Blob([JSON.stringify(updateData)]).size;
        
        if (size > 1000000) {
          console.warn("Search results too large for Firestore, removing large assets.");
          const sanitizedResults = finalResults.map(res => {
            if (res.type === 'image' && res.content.length > 500000) {
              return { ...res, content: '', note: '[Image too large to save to history]' };
            }
            return res;
          });
          await updateDoc(doc(db, 'search_history', historyDocId), {
            results: sanitizedResults
          });
        } else {
          await updateDoc(doc(db, 'search_history', historyDocId), updateData);
        }
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setProgress(100);
      setEta(0);
      setTimeout(() => setIsSearching(false), 500);
    }
  };

  const deleteSearch = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'search_history', id));
    } catch (error) {
      console.error("Error deleting search:", error);
    }
  };

  const clearAllHistory = async () => {
    if (!auth.currentUser) return;
    if (!window.confirm("Are you sure you want to clear your entire search history?")) return;
    
    try {
      const q = firestoreQuery(
        collection(db, 'search_history'),
        where('userId', '==', auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'search_history', d.id)));
      await Promise.all(deletePromises);
      notify("History Cleared", "Your search history has been deleted.", "info");
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  const loadSearchFromHistory = (s: any) => {
    setQuery(s.query);
    setActiveTab('all');
    if (s.results) {
      setResults(s.results);
      // Scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById('search-results');
        if (resultsElement) resultsElement.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      handleSearch(undefined, s.query);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      notify("File Attached", `${file.name} ready for search context.`, "info");
    }
  };

  return (
    <div className={`flex flex-col h-full transition-colors duration-500 ${isSimpleMode ? 'bg-white text-gray-900' : 'bg-[#0a0a0a] text-white'} overflow-hidden`}>
      {/* Hero / Search Section */}
      <div className={`transition-all duration-700 ease-in-out flex flex-col items-center justify-center px-4 ${results.length > 0 ? 'py-8' : 'h-full'}`}>
        {!results.length && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center font-bold text-5xl mx-auto mb-6 shadow-2xl transition-all ${isSimpleMode ? 'bg-blue-600 shadow-blue-600/20' : 'bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)]'}`}>
              {isSimpleMode ? 'P' : 'DB'}
            </div>
            <h1 className={`text-5xl md:text-8xl font-black tracking-tighter mb-2 transition-colors ${isSimpleMode ? 'text-gray-900' : 'text-white'}`}>
              {isSimpleMode ? 'GPT SEARCH' : 'DB GPT'}
            </h1>
            {!isSimpleMode && (
              <div className="h-10 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 flex items-center justify-center px-8 mb-8 shadow-[0_0_20px_rgba(202,138,4,0.3)]">
                <span className="text-black font-black tracking-[0.5em] text-sm">PREMIUM</span>
              </div>
            )}
            <div className="space-y-1">
              <p className={`text-lg font-medium font-serif italic transition-colors ${isSimpleMode ? 'text-gray-600' : 'text-white/90'}`}>
                {isSimpleMode ? 'Simple, Fast, and Secure Search' : 'বাংলাদেশি মানে অলওয়েজ প্রিমিয়াম'}
              </p>
              {!isSimpleMode && <p className="text-[10px] tracking-[0.3em] text-blue-400 font-bold uppercase">Bangladeshi Means Always Premium</p>}
            </div>
          </motion.div>
        )}

        <div className="w-full max-w-3xl relative">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 flex items-center gap-1 md:gap-2">
              <Search className={`transition-colors ${isSimpleMode ? 'text-gray-400 group-focus-within:text-blue-600' : 'text-gray-500 group-focus-within:text-blue-500'}`} size={20} />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className={`p-1 rounded-lg transition-colors ${isSimpleMode ? 'hover:bg-gray-100 text-gray-400 hover:text-blue-600' : 'hover:bg-gray-800 text-gray-500 hover:text-blue-400'}`}
                title="Attach media or storage file"
              >
                <Plus size={18} />
              </button>
              <button 
                type="button" 
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className={`p-1 rounded-lg transition-colors ${isHistoryOpen ? 'bg-blue-600/20 text-blue-400' : (isSimpleMode ? 'text-gray-400 hover:text-blue-600 hover:bg-gray-100' : 'text-gray-500 hover:text-blue-400 hover:bg-gray-800')}`}
                title="Search History"
              >
                <History size={18} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileSelect}
              />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isSimpleMode ? "Ask GPT anything..." : "Ask DB GPT anything..."}
              className={`w-full border-2 rounded-full py-4 md:py-5 px-6 md:px-8 pl-16 md:pl-24 text-lg md:text-xl focus:outline-none transition-all shadow-2xl ${isSimpleMode ? 'bg-white border-gray-200 focus:border-blue-500/50 text-gray-900 group-hover:border-gray-300' : 'bg-[#1a1a1a] border-gray-800 focus:border-blue-500/50 text-white group-hover:border-gray-700'}`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
              {attachedFile && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${isSimpleMode ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-blue-600/20 text-blue-400 border-blue-500/30'}`}>
                  <span className="truncate max-w-[100px]">{attachedFile.name}</span>
                  <button onClick={() => setAttachedFile(null)} className="hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              )}
              <button type="button" className={`p-2 rounded-full transition-colors ${isSimpleMode ? 'hover:bg-gray-100 text-gray-400' : 'hover:bg-gray-800 text-gray-400'}`}>
                <Mic size={24} />
              </button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 p-3 rounded-full transition-all shadow-lg active:scale-95 text-white">
                <Zap size={20} />
              </button>
            </div>
          </form>

          {/* Persistent Collapsible History Section */}
          <AnimatePresence>
            {isHistoryOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`mt-6 border rounded-[2rem] overflow-hidden shadow-2xl ${isSimpleMode ? 'bg-white border-gray-200' : 'bg-[#111] border-gray-800'}`}
              >
                <div className={`p-6 border-b flex justify-between items-center ${isSimpleMode ? 'bg-gray-50 border-gray-100' : 'bg-[#1a1a1a] border-gray-800'}`}>
                  <h3 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${isSimpleMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    <History size={16} className="text-blue-500" />
                    Search History
                  </h3>
                  <div className="flex items-center gap-4">
                    {recentSearches.length > 0 && (
                      <button 
                        onClick={clearAllHistory}
                        className="text-[10px] uppercase tracking-widest font-bold text-red-500 hover:text-red-400 transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                    <button onClick={() => setIsHistoryOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-4">
                  {recentSearches.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {recentSearches.map((s) => (
                        <div 
                          key={s.id}
                          className={`flex items-center justify-between gap-3 border px-4 py-3 rounded-2xl transition-all group cursor-pointer ${isSimpleMode ? 'bg-white border-gray-100 hover:border-blue-400 hover:bg-blue-50' : 'bg-[#1a1a1a] border-gray-800 hover:border-blue-500/50 hover:bg-[#222]'}`}
                          onClick={() => {
                            loadSearchFromHistory(s);
                            setIsHistoryOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Clock size={14} className="text-gray-600 flex-shrink-0" />
                            <span className={`text-sm truncate font-medium ${isSimpleMode ? 'text-gray-700' : 'text-gray-300'}`}>{s.query}</span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSearch(s.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-600">
                      <History size={48} className="mx-auto mb-4 opacity-10" />
                      <p>No search history found.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Pills (only when history is closed and no results) */}
          {!results.length && !isHistoryOpen && recentSearches.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex flex-wrap gap-2 justify-center"
            >
              {recentSearches.slice(0, 5).map((s) => (
                <div 
                  key={s.id}
                  className={`flex items-center gap-2 border px-4 py-2 rounded-full text-sm transition-all group ${isSimpleMode ? 'bg-white border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600' : 'bg-[#1a1a1a] border-gray-800 text-gray-400 hover:border-gray-600'}`}
                >
                  <button 
                    onClick={() => loadSearchFromHistory(s)}
                    className="flex items-center gap-2"
                  >
                    <Clock size={14} />
                    {s.query}
                  </button>
                  <button 
                    onClick={() => deleteSearch(s.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}

          {/* Real-time Feedback */}
          <AnimatePresence>
            {isSearching && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 px-4"
              >
                <div className="flex justify-between text-xs font-mono text-gray-500 mb-2">
                  <span>QUERY PROCESSING: {progress}%</span>
                  <span>ESTIMATED: {eta}s</span>
                </div>
                <div className={`h-1 w-full rounded-full overflow-hidden ${isSimpleMode ? 'bg-gray-100' : 'bg-gray-800'}`}>
                  <motion.div 
                    className={`h-full transition-colors duration-500 ${progress < 40 ? 'bg-blue-500' : progress < 80 ? 'bg-purple-500' : 'bg-emerald-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!results.length && (
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl px-4 w-full animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <button onClick={() => onOpenTool('chat')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors border ${isSimpleMode ? 'bg-white border-gray-100 hover:bg-blue-50 hover:border-blue-200' : 'bg-[#1a1a1a] border-gray-800 hover:bg-[#252525]'}`}>
              <MessageSquare className="text-blue-400" size={28} />
              <span className={`text-sm font-medium ${isSimpleMode ? 'text-gray-700' : 'text-white'}`}>GPT Chat</span>
            </button>
            <button onClick={() => onOpenTool('image')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors border ${isSimpleMode ? 'bg-white border-gray-100 hover:bg-green-50 hover:border-green-200' : 'bg-[#1a1a1a] border-gray-800 hover:bg-[#252525]'}`}>
              <ImageIcon className="text-green-400" size={28} />
              <span className={`text-sm font-medium ${isSimpleMode ? 'text-gray-700' : 'text-white'}`}>Image Gen</span>
            </button>
            <button onClick={() => onOpenTool('productivity')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors border ${isSimpleMode ? 'bg-white border-gray-100 hover:bg-orange-50 hover:border-orange-200' : 'bg-[#1a1a1a] border-gray-800 hover:bg-[#252525]'}`}>
              <FileTextIcon className="text-orange-400" size={28} />
              <span className={`text-sm font-medium ${isSimpleMode ? 'text-gray-700' : 'text-white'}`}>Documents</span>
            </button>
            {!isSimpleMode && (
              <button onClick={() => onOpenTool('automation')} className="flex flex-col items-center gap-2 p-4 bg-[#1a1a1a] rounded-2xl hover:bg-[#252525] transition-colors border border-gray-800">
                <Zap className="text-yellow-400" size={28} />
                <span className="text-sm font-medium">Automation</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div id="search-results" className={`flex-1 overflow-y-auto px-4 pb-12 transition-colors ${isSimpleMode ? 'bg-gray-50' : 'bg-[#0a0a0a]'}`}>
          <div className="max-w-5xl mx-auto">
            {/* Tabs */}
            <div className={`flex gap-6 border-b mb-8 sticky top-0 z-10 py-2 transition-colors ${isSimpleMode ? 'bg-gray-50 border-gray-200' : 'bg-[#0a0a0a] border-gray-800'}`}>
              {(['all', 'ai', 'images', 'maps', 'videos', 'history'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2 text-sm font-medium capitalize transition-colors relative ${activeTab === tab ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {tab}
                  {activeTab === tab && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {activeTab === 'history' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className={`text-xl font-bold flex items-center gap-2 ${isSimpleMode ? 'text-gray-900' : 'text-white'}`}>
                        <History size={24} className="text-blue-500" />
                        Search History
                      </h3>
                      {recentSearches.length > 0 && (
                        <button 
                          onClick={clearAllHistory}
                          className="text-xs font-bold text-red-500 hover:text-red-400 transition-colors"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {recentSearches.map((s) => (
                        <div 
                          key={s.id}
                          className={`flex items-center justify-between gap-4 border p-4 rounded-2xl transition-all group cursor-pointer ${isSimpleMode ? 'bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50' : 'bg-[#111] border-gray-800 hover:border-blue-500/50'}`}
                          onClick={() => loadSearchFromHistory(s)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSimpleMode ? 'bg-gray-100 text-gray-500' : 'bg-gray-800 text-gray-400'}`}>
                              <Clock size={18} />
                            </div>
                            <div>
                              <div className={`font-medium ${isSimpleMode ? 'text-gray-900' : 'text-white'}`}>{s.query}</div>
                              <div className="text-xs text-gray-500">
                                {s.timestamp?.toDate ? s.timestamp.toDate().toLocaleString() : 'Recent'}
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSearch(s.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab !== 'history' && loadingStates.text && (
                  <div className={`border rounded-3xl p-8 animate-pulse ${isSimpleMode ? 'bg-white border-gray-200' : 'bg-[#111] border-gray-800'}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-4 h-4 bg-blue-500/20 rounded-full" />
                      <div className="h-3 w-24 bg-gray-800 rounded" />
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-800 rounded w-full" />
                      <div className="h-4 bg-gray-800 rounded w-5/6" />
                      <div className="h-4 bg-gray-800 rounded w-4/5" />
                    </div>
                  </div>
                )}

                {activeTab !== 'history' && results.map((res, idx) => {
                  if (res.type === 'text' && (activeTab === 'all' || activeTab === 'ai')) {
                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={idx} 
                        className={`border rounded-3xl p-8 shadow-xl ${isSimpleMode ? 'bg-white border-gray-200' : 'bg-[#111] border-gray-800'}`}
                      >
                        <div className="flex items-center gap-2 mb-4 text-blue-400">
                          <Zap size={18} />
                          <span className="text-xs font-bold uppercase tracking-widest">GPT Intelligence</span>
                        </div>
                        <div className={`prose max-w-none ${isSimpleMode ? 'prose-slate' : 'prose-invert'}`}>
                          <ReactMarkdown>{res.content}</ReactMarkdown>
                        </div>
                        <div className={`mt-6 pt-6 border-t flex gap-4 ${isSimpleMode ? 'border-gray-100' : 'border-gray-800'}`}>
                          <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                            <Volume2 size={14} /> Listen
                          </button>
                          <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                            <Download size={14} /> Export
                          </button>
                          <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                            <Share2 size={14} /> Share
                          </button>
                        </div>
                      </motion.div>
                    );
                  }
                  if (res.type === 'web' && (activeTab === 'all')) {
                    return (
                      <div key={idx} className="space-y-6">
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                          <Globe size={14} /> Web Resources
                        </h3>
                        {res.content.map((link: any, lIdx: number) => (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: lIdx * 0.1 }}
                            key={lIdx} 
                            className="group cursor-pointer"
                            onClick={() => onOpenTool('browser', link.url)}
                          >
                            <div className="text-xs text-gray-500 mb-1 truncate">{link.url}</div>
                            <h4 className="text-xl text-blue-500 group-hover:underline mb-2 font-medium">{link.title}</h4>
                            <p className={`text-sm leading-relaxed ${isSimpleMode ? 'text-gray-600' : 'text-gray-400'}`}>{link.snippet}</p>
                          </motion.div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })}

                {loadingStates.web && (
                  <div className="space-y-6">
                    <div className="h-3 w-32 bg-gray-800 rounded animate-pulse" />
                    {[1, 2].map(i => (
                      <div key={i} className="space-y-2 animate-pulse">
                        <div className="h-3 w-48 bg-gray-800 rounded" />
                        <div className="h-5 w-64 bg-blue-500/20 rounded" />
                        <div className="h-4 w-full bg-gray-800 rounded" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar Content */}
              <div className="space-y-6">
                {loadingStates.image && (
                  <div className={`border rounded-3xl overflow-hidden animate-pulse ${isSimpleMode ? 'bg-white border-gray-200' : 'bg-[#111] border-gray-800'}`}>
                    <div className="h-10 bg-gray-800 w-full" />
                    <div className="aspect-square bg-gray-900" />
                    <div className="p-4 flex gap-2">
                      <div className="h-8 bg-gray-800 rounded-xl flex-1" />
                      <div className="h-8 bg-gray-800 rounded-xl flex-1" />
                    </div>
                  </div>
                )}

                {loadingStates.map && (
                  <div className={`border rounded-3xl overflow-hidden animate-pulse ${isSimpleMode ? 'bg-white border-gray-200' : 'bg-[#111] border-gray-800'}`}>
                    <div className="h-10 bg-gray-800 w-full" />
                    <div className="aspect-video bg-gray-900" />
                    <div className="p-4">
                      <div className="h-8 bg-orange-600/20 rounded-xl w-full" />
                    </div>
                  </div>
                )}

                {activeTab !== 'history' && results.map((res, idx) => {
                  if (res.type === 'image' && (activeTab === 'all' || activeTab === 'images')) {
                    return (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={idx} 
                        className={`border rounded-3xl overflow-hidden shadow-xl ${isSimpleMode ? 'bg-white border-gray-200' : 'bg-[#111] border-gray-800'}`}
                      >
                        <div className={`p-4 border-b flex justify-between items-center ${isSimpleMode ? 'border-gray-100' : 'border-gray-800'}`}>
                          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                            <ImageIcon size={14} /> AI Visual
                          </span>
                        </div>
                        {res.content && res.content !== "" && (
                          <img src={res.content} alt={res.title} className="w-full aspect-square object-cover" referrerPolicy="no-referrer" />
                        )}
                        <div className="p-4 flex gap-2">
                          <button className={`flex-1 py-2 rounded-xl text-xs transition-colors ${isSimpleMode ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}>Download</button>
                          <button className={`flex-1 py-2 rounded-xl text-xs transition-colors ${isSimpleMode ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}>Edit</button>
                        </div>
                      </motion.div>
                    );
                  }
                  if (res.type === 'map' && (activeTab === 'all' || activeTab === 'maps')) {
                    return (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={idx} 
                        className={`border rounded-3xl overflow-hidden shadow-xl ${isSimpleMode ? 'bg-white border-gray-200' : 'bg-[#111] border-gray-800'}`}
                      >
                        <div className={`p-4 border-b flex justify-between items-center ${isSimpleMode ? 'border-gray-100' : 'border-gray-800'}`}>
                          <span className="text-xs font-bold uppercase tracking-widest text-orange-400 flex items-center gap-2">
                            <MapPin size={14} /> Maps
                          </span>
                        </div>
                        <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
                          <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/map/800/600')] bg-cover opacity-50 grayscale" />
                          <div className="relative z-10 flex flex-col items-center">
                            <MapPin className="text-orange-500 animate-bounce" size={32} />
                            <span className="text-xs mt-2 font-mono text-white">{res.content.address}</span>
                          </div>
                        </div>
                        <div className="p-4">
                          <button className="w-full bg-orange-600 hover:bg-orange-700 py-2 rounded-xl text-xs font-bold transition-colors text-white">Open Full Map</button>
                        </div>
                      </motion.div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const FileTextIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

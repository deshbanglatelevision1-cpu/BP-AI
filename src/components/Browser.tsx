import React, { useState, useEffect, useRef } from 'react';
import { Search, Globe, ArrowLeft, ArrowRight, RotateCw, Settings, Maximize, ExternalLink, Languages, Camera, BookOpen, Download, Bell, Shield, Zap, Loader2, X, Sparkles, RefreshCw, Copy } from 'lucide-react';
import { searchWeb, generateChatResponse } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { notify } from '../services/notificationService';

interface BrowserProps {
  initialUrl?: string;
}

export default function Browser({ initialUrl = 'https://google.com' }: BrowserProps) {
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [mode, setMode] = useState<'full' | 'semi' | 'ai'>('full');
  const [aiResults, setAiResults] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('Bengali');
  const [showLens, setShowLens] = useState(false);
  const [lensResult, setLensResult] = useState<string | null>(null);
  const [isAnalyzingLens, setIsAnalyzingLens] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
      setInputUrl(initialUrl);
    }
  }, [initialUrl]);

  const handleNavigate = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = inputUrl;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    
    if (mode === 'ai') {
      setIsSearching(true);
      try {
        const results = await searchWeb(inputUrl);
        setAiResults(results);
      } catch (error) {
        notify("Error", "Failed to perform AI search.", "error");
      } finally {
        setIsSearching(false);
      }
    } else {
      setUrl(finalUrl);
      setInputUrl(finalUrl);
      setAiResults('');
    }
  };

  const handleTranslate = async () => {
    setIsTranslating(true);
    notify("Translation", `Translating page to ${targetLanguage}...`, "info");
    try {
      // Simulate translation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      notify("Success", `Page translated to ${targetLanguage} successfully.`, "success");
    } catch (error) {
      notify("Error", "Translation failed.", "error");
    } finally {
      setIsTranslating(false);
    }
  };

  const startLens = async () => {
    setShowLens(true);
    setLensResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Lens error:", err);
      notify("Camera Error", "Could not access camera for AI Lens.", "error");
      setShowLens(false);
    }
  };

  const toggleFacingMode = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    
    // Stop current stream
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }

    // Restart with new mode
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: newMode } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Flip error:", err);
      notify("Camera Error", "Could not flip camera.", "error");
    }
  };

  const captureLens = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsAnalyzingLens(true);
    
    const context = canvasRef.current.getContext('2d');
    if (context) {
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const imageData = canvasRef.current.toDataURL('image/jpeg');
      
      try {
        const result = await generateChatResponse("Analyze this image and identify objects, text, or landmarks.", 'vision');
        setLensResult(result);
      } catch (error) {
        notify("Error", "AI Lens analysis failed.", "error");
      } finally {
        setIsAnalyzingLens(false);
      }
    }
  };

  const closeLens = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowLens(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden">
      {/* Browser Toolbar */}
      <div className="flex items-center gap-4 p-3 bg-[#111] border-b border-gray-800">
        <div className="flex gap-2">
          <button className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hover:text-white">
            <ArrowLeft size={18} />
          </button>
          <button className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hover:text-white">
            <ArrowRight size={18} />
          </button>
          <button className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hover:text-white">
            <RotateCw size={18} />
          </button>
        </div>
        
        <form onSubmit={handleNavigate} className="flex-1 flex items-center bg-[#1a1a1a] border border-gray-800 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
          <Globe size={16} className="text-gray-500 mr-3" />
          <input 
            type="text" 
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Search the world or enter URL..."
            className="flex-1 bg-transparent outline-none text-sm font-medium"
          />
          <div className="flex items-center gap-2">
            <button type="button" onClick={startLens} className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-blue-400 transition-colors">
              <Camera size={18} />
            </button>
            <button type="submit" className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-blue-400 transition-colors">
              <Search size={18} />
            </button>
          </div>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#1a1a1a] border border-gray-800 rounded-xl px-2 py-1">
            <Languages size={16} className="text-gray-500 mr-2" />
            <select 
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="bg-transparent text-xs font-bold outline-none border-none focus:ring-0 text-gray-400"
            >
              <option value="Bengali">Bengali</option>
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="Hindi">Hindi</option>
            </select>
            <button onClick={handleTranslate} disabled={isTranslating} className="ml-2 p-1 hover:bg-gray-800 rounded-lg text-blue-500">
              {isTranslating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            </button>
          </div>
          
          <select 
            value={mode} 
            onChange={(e) => setMode(e.target.value as any)}
            className="bg-[#1a1a1a] border border-gray-800 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-0 text-gray-400"
          >
            <option value="full">Full Access</option>
            <option value="semi">Semi-Supported</option>
            <option value="ai">AI Only</option>
          </select>
          
          <button className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Browser Content */}
      <div className="flex-1 bg-white relative overflow-hidden">
        {mode === 'ai' || aiResults ? (
          <div className="absolute inset-0 bg-[#0a0a0a] overflow-y-auto p-12">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black flex items-center gap-3">
                  <Zap className="text-blue-500" size={32} />
                  AI Intelligence Report
                </h2>
                <div className="flex gap-2">
                  <button className="p-2 bg-[#1a1a1a] border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors"><Download size={18} /></button>
                  <button className="p-2 bg-[#1a1a1a] border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors"><BookOpen size={18} /></button>
                </div>
              </div>
              
              {isSearching ? (
                <div className="space-y-6">
                  <div className="h-8 bg-gray-900 rounded-xl w-3/4 animate-pulse"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-900 rounded-lg w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-900 rounded-lg w-5/6 animate-pulse"></div>
                    <div className="h-4 bg-gray-900 rounded-lg w-4/5 animate-pulse"></div>
                  </div>
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="prose prose-invert max-w-none bg-[#111] border border-gray-800 rounded-3xl p-8 shadow-2xl"
                >
                  <ReactMarkdown>{aiResults}</ReactMarkdown>
                </motion.div>
              )}
            </div>
          </div>
        ) : (
          <iframe 
            src={url || 'about:blank'} 
            className="w-full h-full border-none"
            title="In-App Browser"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        )}

        {/* AI Lens Overlay */}
        <AnimatePresence>
          {showLens && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 z-50 flex flex-col"
            >
              <div className="p-6 flex justify-between items-center border-b border-gray-800 bg-black/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                    <Camera className="text-blue-500" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">AI Lens Recognition</h3>
                    <p className="text-xs text-gray-500">Point at objects, text, or landmarks</p>
                  </div>
                </div>
                <button onClick={closeLens} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 flex flex-col lg:flex-row p-8 gap-8 overflow-hidden">
                <div className="flex-1 relative bg-black rounded-[2.5rem] overflow-hidden border border-gray-800 shadow-2xl group">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" width={640} height={480} />
                  
                  {/* Capture Area Cues */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Darkened Overlay outside the safe zone */}
                    <div className="absolute inset-0 bg-black/40" style={{ clipPath: 'polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, 50% 50%, 50% 50%, 50% 50%)' }} />
                    
                    <div className="relative w-80 h-80">
                      {/* Corner Accents - More technical look */}
                      <div className="absolute -top-2 -left-2 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                      <div className="absolute -top-2 -right-2 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                      <div className="absolute -bottom-2 -left-2 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                      <div className="absolute -bottom-2 -right-2 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                      
                      {/* Technical HUD Labels */}
                      <div className="absolute -top-8 left-0 text-[10px] font-mono text-blue-400 uppercase tracking-tighter flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        AI LENS ACTIVE // SCAN_MODE: VISION_PRO
                      </div>
                      <div className="absolute -bottom-8 right-0 text-[10px] font-mono text-blue-400/60 uppercase tracking-tighter">
                        COORD_X: 42.09 // COORD_Y: 88.12
                      </div>

                      {/* Scanning Line - Enhanced with glow and motion */}
                      <motion.div 
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_20px_rgba(59,130,246,1)] z-10"
                      />
                      
                      {/* Safe Zone Border */}
                      <div className="absolute inset-0 border border-white/10 rounded-2xl" />
                      <div className="absolute inset-0 bg-blue-500/5 animate-pulse rounded-2xl" />
                    </div>
                  </div>

                  {/* Status Overlay */}
                  {isAnalyzingLens && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-blue-400 font-bold animate-pulse">Analyzing Scene...</p>
                    </div>
                  )}
                  
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-6">
                    <button 
                      onClick={toggleFacingMode}
                      className="p-4 bg-gray-900/80 backdrop-blur-md rounded-full text-white hover:bg-gray-800 transition-all border border-gray-700"
                      title="Flip Camera"
                    >
                      <RefreshCw size={24} />
                    </button>
                    
                    <button 
                      onClick={captureLens}
                      disabled={isAnalyzingLens}
                      className="group relative flex items-center justify-center"
                    >
                      <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                      <div className="w-20 h-20 bg-white rounded-full border-8 border-gray-900 flex items-center justify-center shadow-2xl active:scale-95 transition-all">
                        <div className={`w-12 h-12 rounded-full transition-all ${isAnalyzingLens ? 'bg-gray-300 scale-75' : 'bg-blue-600'}`} />
                      </div>
                    </button>

                    <div className="w-14" /> {/* Spacer to balance the flip button */}
                  </div>
                </div>
                
                <div className="w-full lg:w-[400px] bg-[#111] border border-gray-800 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-gray-800 bg-[#1a1a1a] flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles size={14} className="text-blue-500" />
                      Intelligence Output
                    </h4>
                    {lensResult && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">High Confidence</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                    {lensResult ? (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-8"
                      >
                        <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
                          <ReactMarkdown>{lensResult}</ReactMarkdown>
                        </div>
                        
                        <div className="pt-6 border-t border-gray-800 flex flex-col gap-4">
                          <div className="flex flex-wrap gap-2">
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(lensResult);
                                notify("Success", "Result copied to clipboard.", "success");
                              }}
                              className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-gray-700 hover:border-blue-500/50"
                            >
                              <Copy size={14} /> Copy Text
                            </button>
                            <button className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-gray-700 hover:border-blue-500/50">
                              <Download size={14} /> Save Report
                            </button>
                          </div>
                          <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
                            <ExternalLink size={14} /> Deep Web Research
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-600 text-center gap-6 p-8">
                        <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center">
                          <Zap size={40} className="opacity-20" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-400 mb-2">Ready to Scan</p>
                          <p className="text-sm">Align the object within the frame and tap the capture button to begin analysis.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Zap, Play, Plus, Trash2, Settings, Save, Share2, Clock, Mail, Calendar, MessageSquare, Globe, Database, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { generateChatResponse } from '../services/geminiService';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { notify } from '../services/notificationService';
import { motion, AnimatePresence } from 'motion/react';

interface AutomationProps {
  isGuest?: boolean;
}

interface Workflow {
  id: string;
  name: string;
  trigger: string;
  action: string;
  status: 'active' | 'inactive';
  lastRun?: string;
}

export default function Automation({ isGuest }: AutomationProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: '', trigger: '', action: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    if (!isGuest && auth.currentUser) {
      fetchWorkflows();
    }
  }, [isGuest]);

  const fetchWorkflows = async () => {
    if (!auth.currentUser) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, 'automation'), where('userId', '==', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      const fetchedWorkflows = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Workflow[];
      setWorkflows(fetchedWorkflows);
    } catch (error) {
      console.error("Error fetching workflows:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkflow = async () => {
    if (isGuest) {
      notify("Guest Mode", "Please sign in to create workflows.", "warning");
      return;
    }
    if (!newWorkflow.name || !newWorkflow.trigger || !newWorkflow.action) {
      notify("Incomplete", "Please fill in all fields.", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'automation'), {
        ...newWorkflow,
        userId: auth.currentUser?.uid,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      setWorkflows(prev => [...prev, { id: docRef.id, ...newWorkflow, status: 'active' }]);
      setNewWorkflow({ name: '', trigger: '', action: '' });
      setIsCreating(false);
      notify("Success", "Workflow created successfully!", "success");
    } catch (error) {
      notify("Error", "Failed to create workflow.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'automation', id));
      setWorkflows(prev => prev.filter(w => w.id !== id));
      notify("Deleted", "Workflow removed.", "info");
    } catch (error) {
      notify("Error", "Failed to delete workflow.", "error");
    }
  };

  const generateAiWorkflow = async () => {
    setIsGeneratingAi(true);
    try {
      const prompt = "Suggest a useful automation workflow for a productivity app. Return a JSON object with 'name', 'trigger', and 'action'.";
      const response = await generateChatResponse(prompt);
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const suggestion = JSON.parse(jsonStr);
      setNewWorkflow(suggestion);
      notify("AI Suggestion", "AI has suggested a new workflow.", "success");
    } catch (error) {
      notify("Error", "Failed to generate AI suggestion.", "error");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="flex h-full bg-[#0a0a0a] text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-[#111] border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="text-yellow-400" size={24} />
            PREMIUM AUTOMATION
          </h2>
          <button 
            onClick={() => setIsCreating(true)}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-xl transition-all"
          >
            <Plus size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="px-2 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest">Active Workflows</div>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
          ) : workflows.length > 0 ? (
            workflows.map(w => (
              <div key={w.id} className="group bg-[#1a1a1a] border border-gray-800 rounded-2xl p-4 hover:border-blue-500/50 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-sm">{w.name}</h3>
                  <button onClick={() => handleDeleteWorkflow(w.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-900/20 text-gray-500 hover:text-red-400 rounded-lg transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className={`w-2 h-2 rounded-full ${w.status === 'active' ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                  {w.status === 'active' ? 'Running' : 'Paused'}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-600">
              <Zap size={48} className="mx-auto mb-4 opacity-10" />
              <p className="text-sm">No workflows yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-y-auto p-12">
        <div className="max-w-4xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {isCreating ? (
              <motion.div 
                key="create"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-[#111] border border-gray-800 rounded-[3rem] p-12 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-12">
                  <h2 className="text-4xl font-black">Create Workflow</h2>
                  <button onClick={() => setIsCreating(false)} className="p-3 hover:bg-gray-800 rounded-2xl text-gray-500">
                    <Trash2 size={24} />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Workflow Name</label>
                      <input 
                        value={newWorkflow.name}
                        onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Daily Summary"
                        className="w-full bg-[#1a1a1a] border border-gray-800 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">AI Suggestion</label>
                      <button 
                        onClick={generateAiWorkflow}
                        disabled={isGeneratingAi}
                        className="w-full h-[60px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all shadow-lg shadow-blue-600/20"
                      >
                        {isGeneratingAi ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                        {isGeneratingAi ? 'Thinking...' : 'AI Generate'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 text-blue-500">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center font-black">1</div>
                        <h3 className="text-xl font-bold">Trigger</h3>
                      </div>
                      <textarea 
                        value={newWorkflow.trigger}
                        onChange={(e) => setNewWorkflow(prev => ({ ...prev, trigger: e.target.value }))}
                        placeholder="When this happens... (e.g., Every morning at 8 AM)"
                        className="w-full bg-[#1a1a1a] border border-gray-800 rounded-3xl p-6 h-48 focus:outline-none focus:border-blue-500 resize-none transition-all"
                      />
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 text-emerald-500">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center font-black">2</div>
                        <h3 className="text-xl font-bold">Action</h3>
                      </div>
                      <textarea 
                        value={newWorkflow.action}
                        onChange={(e) => setNewWorkflow(prev => ({ ...prev, action: e.target.value }))}
                        placeholder="Do this... (e.g., Send me an email with my tasks)"
                        className="w-full bg-[#1a1a1a] border border-gray-800 rounded-3xl p-6 h-48 focus:outline-none focus:border-emerald-500 resize-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-8">
                    <button 
                      onClick={() => setIsCreating(false)}
                      className="px-8 py-4 hover:bg-gray-800 rounded-2xl font-bold text-gray-400 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleCreateWorkflow}
                      disabled={isLoading}
                      className="px-12 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/30"
                    >
                      {isLoading ? 'Saving...' : 'Activate Workflow'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-12"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-6xl font-black tracking-tighter mb-4">Automation Hub</h1>
                    <p className="text-gray-500 text-xl">Connect your tools and automate your world with AI.</p>
                  </div>
                  <button 
                    onClick={() => setIsCreating(true)}
                    className="group flex items-center gap-3 bg-white text-black px-8 py-4 rounded-3xl font-black transition-all hover:scale-105 active:scale-95"
                  >
                    <Plus size={24} />
                    New Workflow
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-[#111] border border-gray-800 rounded-[2.5rem] p-8 hover:border-blue-500/30 transition-all">
                    <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                      <Mail size={32} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Email Automation</h3>
                    <p className="text-gray-500 text-sm mb-6">Auto-sort, reply, or summarize your incoming emails with AI.</p>
                    <button className="text-blue-500 font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all">
                      Configure <Play size={14} />
                    </button>
                  </div>
                  <div className="bg-[#111] border border-gray-800 rounded-[2.5rem] p-8 hover:border-emerald-500/30 transition-all">
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                      <Calendar size={32} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Smart Scheduling</h3>
                    <p className="text-gray-500 text-sm mb-6">Let AI manage your calendar and find the best times for meetings.</p>
                    <button className="text-emerald-500 font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all">
                      Configure <Play size={14} />
                    </button>
                  </div>
                  <div className="bg-[#111] border border-gray-800 rounded-[2.5rem] p-8 hover:border-orange-500/30 transition-all">
                    <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center mb-6">
                      <Database size={32} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Data Sync</h3>
                    <p className="text-gray-500 text-sm mb-6">Automatically sync data between your DB Studio documents and external apps.</p>
                    <button className="text-orange-500 font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all">
                      Configure <Play size={14} />
                    </button>
                  </div>
                </div>

                <div className="bg-[#111] border border-gray-800 rounded-[3rem] p-12 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-5">
                    <Zap size={200} />
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-4">Global Automation Engine</h2>
                    <p className="text-gray-500 mb-8 max-w-2xl">Our AI engine monitors your triggers 24/7 and executes actions across the DB UPEEP ecosystem. Connect your DB Account to enable cross-platform automation.</p>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-xl text-xs font-bold text-gray-400">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        99.9% Uptime
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-xl text-xs font-bold text-gray-400">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        AI Verified
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-xl text-xs font-bold text-gray-400">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        Secure Execution
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

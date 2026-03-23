import React, { useState, useEffect } from 'react';
import { auth, signInWithGoogle, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Sidebar from './components/Sidebar';
import Chatboard from './components/Chatboard';
import Browser from './components/Browser';
import Productivity from './components/Productivity';
import Architecture from './components/Architecture';
import SearchEngine from './components/SearchEngine';
import Tools from './components/Tools';
import Automation from './components/Automation';
import Settings from './components/Settings';
import GlobalToast from './components/GlobalToast';
import BootAnimation from './components/BootAnimation';
import SetupWizard from './components/SetupWizard';
import StatusBar from './components/StatusBar';
import { AppTab } from './types';
import { Globe, User, Menu, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentTab, setCurrentTab] = useState<AppTab>('search');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [browserUrl, setBrowserUrl] = useState<string>('https://google.com');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isSimpleMode, setIsSimpleMode] = useState(() => {
    return localStorage.getItem('premium_os_simple_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('premium_os_simple_mode', isSimpleMode.toString());
  }, [isSimpleMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        setIsGuest(false);
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              createdAt: new Date().toISOString()
            });
            // First time setup
            const hasCompletedSetup = localStorage.getItem('db_setup_complete');
            if (!hasCompletedSetup) {
              setIsSettingUp(true);
            }
          }
        } catch (error) {
          console.error("Error creating user profile:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  if (isBooting) {
    return <BootAnimation onComplete={() => setIsBooting(false)} />;
  }

  if (isSettingUp) {
    return (
      <SetupWizard 
        onComplete={() => {
          setIsSettingUp(false);
          localStorage.setItem('db_setup_complete', 'true');
        }} 
      />
    );
  }

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505] text-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-[0_0_20px_rgba(37,99,235,0.3)]">
            DB
          </div>
          <p className="text-gray-400 tracking-widest uppercase text-xs font-bold">Initializing System...</p>
        </div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white relative overflow-hidden">
        {/* Magical Blue Aura */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 blur-[150px] rounded-full" />
        </div>

        <div className="max-w-md w-full p-10 bg-white/5 backdrop-blur-[400px] rounded-[40px] border border-white/10 shadow-2xl flex flex-col items-center text-center relative z-10">
          <div className="w-24 h-24 bg-blue-600 rounded-[32px] flex items-center justify-center font-bold text-4xl mb-8 shadow-lg shadow-blue-600/20">
            DB
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">BANGLADESH</h1>
          <p className="text-blue-400 font-bold tracking-[0.4em] mb-12 text-xs uppercase">Premium OS</p>
          
          <div className="space-y-4 w-full">
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 px-6 rounded-2xl hover:bg-gray-100 transition-all active:scale-95"
            >
              <Globe size={20} />
              Continue with Google
            </button>
            <button
              onClick={() => setIsGuest(true)}
              className="w-full flex items-center justify-center gap-3 bg-white/5 text-white font-bold py-4 px-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-95"
            >
              <User size={20} />
              Guest Mode
            </button>
          </div>
          
          <p className="mt-12 text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed">
            By continuing, you agree to the <br />
            <span className="text-blue-400">Premium Terms of Service</span>
          </p>
        </div>
      </div>
    );
  }

  const handleOpenTool = (tool: string, url?: string) => {
    if (tool === 'browser' && url) {
      setBrowserUrl(url);
      setCurrentTab('browser');
    } else if (tool === 'chat' || tool === 'image') {
      setCurrentTab('chat');
    } else if (tool === 'productivity') {
      setCurrentTab('productivity');
    } else if (tool === 'automation') {
      setCurrentTab('automation');
    } else {
      setCurrentTab(tool as AppTab);
    }
  };

  const handleLogout = async () => {
    if (isGuest) {
      setIsGuest(false);
    } else {
      await auth.signOut();
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans relative transition-colors duration-500 ${isSimpleMode ? 'bg-white' : 'bg-[#050505]'}`}>
      {/* Status Bar */}
      <StatusBar isSimpleMode={isSimpleMode} />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-transform duration-500 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar 
          currentChatId={currentChatId} 
          onSelectChat={(id) => {
            setCurrentChatId(id);
            setIsSidebarOpen(false);
          }} 
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setIsSidebarOpen(false);
          }}
          currentTab={currentTab}
          isGuest={isGuest}
          onLogout={handleLogout}
          onClose={() => setIsSidebarOpen(false)}
          isSimpleMode={isSimpleMode}
        />
      </div>
      
      <main className="flex-1 relative flex flex-col min-w-0 pt-8">
        {/* Mobile Header */}
        <div className={`lg:hidden flex items-center justify-between p-4 backdrop-blur-md border-b z-30 transition-colors ${isSimpleMode ? 'bg-white/80 border-gray-100' : 'bg-black/40 border-white/5'}`}>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className={`p-2 rounded-xl transition-colors ${isSimpleMode ? 'text-gray-500 hover:text-blue-600 hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Menu size={24} />
          </button>
          <div className="flex flex-col items-center">
            <span className={`font-black tracking-tighter text-lg ${isSimpleMode ? 'text-gray-900' : 'text-white'}`}>{isSimpleMode ? 'SIMPLE' : 'BANGLADESH'}</span>
            <span className={`text-[8px] font-bold tracking-[0.3em] uppercase -mt-1 ${isSimpleMode ? 'text-blue-600' : 'text-blue-400'}`}>{isSimpleMode ? 'SIMPLE OS' : 'Premium OS'}</span>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-hidden relative">
          {currentTab === 'search' && <SearchEngine onOpenTool={handleOpenTool} isSimpleMode={isSimpleMode} />}
          {currentTab === 'chat' && <Chatboard chatId={currentChatId} isGuest={isGuest} isSimpleMode={isSimpleMode} />}
          {currentTab === 'browser' && <Browser initialUrl={browserUrl} />}
          {currentTab === 'productivity' && <Productivity isGuest={isGuest} isSimpleMode={isSimpleMode} />}
          {currentTab === 'architecture' && <Architecture />}
          {currentTab === 'tools' && <Tools isGuest={isGuest} />}
          {currentTab === 'automation' && <Automation isGuest={isGuest} />}
          {currentTab === 'settings' && <Settings isGuest={isGuest} isSimpleMode={isSimpleMode} setIsSimpleMode={setIsSimpleMode} />}
        </div>
      </main>
      <GlobalToast />
    </div>
  );
}


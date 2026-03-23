import React, { useEffect, useState } from 'react';
import { Chat } from '../types';
import { db, auth, logOut } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, where } from 'firebase/firestore';
import { MessageSquarePlus, Settings, LogOut, Search, History, LayoutDashboard, Globe, FileText, Network, Wrench, Zap, Clock, Cloud, Sun, CloudRain, Thermometer, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface SidebarProps {
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onSelectTab: (tab: 'search' | 'chat' | 'browser' | 'productivity' | 'architecture' | 'tools' | 'settings' | 'automation') => void;
  currentTab: 'search' | 'chat' | 'browser' | 'productivity' | 'architecture' | 'tools' | 'settings' | 'automation';
  isGuest?: boolean;
  onLogout: () => void;
  onClose?: () => void;
  isSimpleMode?: boolean;
}

export default function Sidebar({ currentChatId, onSelectChat, onSelectTab, currentTab, isGuest, onLogout, onClose, isSimpleMode }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; condition: string; location: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const data = await res.json();
          if (data.current_weather) {
            setWeather({
              temp: Math.round(data.current_weather.temperature),
              condition: getWeatherCondition(data.current_weather.weathercode),
              location: 'Current Location'
            });
          }
        }, () => {
          // Fallback if geolocation fails
          setWeather({ temp: 22, condition: 'Sunny', location: 'San Francisco' });
        });
      } catch (error) {
        console.error("Weather fetch failed:", error);
      }
    };

    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 600000); // Update every 10 mins
    return () => clearInterval(weatherTimer);
  }, []);

  const getWeatherCondition = (code: number) => {
    if (code === 0) return 'Clear';
    if (code <= 3) return 'Partly Cloudy';
    if (code <= 48) return 'Foggy';
    if (code <= 67) return 'Rainy';
    if (code <= 77) return 'Snowy';
    if (code <= 82) return 'Showers';
    return 'Stormy';
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'Clear': return <Sun size={14} className="text-yellow-500" />;
      case 'Rainy':
      case 'Showers': return <CloudRain size={14} className="text-blue-400" />;
      default: return <Cloud size={14} className="text-gray-400" />;
    }
  };

  useEffect(() => {
    if (!auth.currentUser || isGuest) return;

    const q = query(
      collection(db, 'chats'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChats: Chat[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Chat;
        fetchedChats.push(data);
      });
      // Sort client-side to avoid requiring a composite index
      fetchedChats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setChats(fetchedChats);
    }, (error) => {
      console.error("Error fetching chats:", error);
    });

    return () => unsubscribe();
  }, [isGuest]);

  const handleNewChat = async () => {
    if (isGuest) {
      alert("Please sign in to save chats.");
      return;
    }
    if (!auth.currentUser) return;
    const newChatId = uuidv4();
    const newChat: Chat = {
      id: newChatId,
      userId: auth.currentUser.uid,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'chats', newChatId), newChat);
      onSelectChat(newChatId);
      onSelectTab('chat');
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  };

  const filteredChats = chats.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className={`w-64 flex flex-col h-full border-r transition-all duration-500 ${isSimpleMode ? 'bg-white text-gray-800 border-gray-200' : 'bg-[#050505] text-gray-400 border-white/5'}`}>
      <div className={`p-6 flex items-center justify-between border-b ${isSimpleMode ? 'border-gray-100' : 'border-white/5'}`}>
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onSelectTab('search')}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white shadow-lg transition-transform group-hover:scale-110 ${isSimpleMode ? 'bg-blue-600 shadow-blue-600/20' : 'bg-red-600 shadow-red-600/20'}`}>
            {isSimpleMode ? 'P' : 'DB'}
          </div>
          <div className="flex flex-col">
            <span className={`font-black text-sm tracking-tighter leading-none ${isSimpleMode ? 'text-gray-900' : 'text-white'}`}>
              {isSimpleMode ? 'GPT SIMPLE' : 'DB GPT'}
            </span>
            <span className={`text-[10px] font-bold tracking-[0.2em] uppercase mt-0.5 ${isSimpleMode ? 'text-blue-600' : 'text-blue-400'}`}>
              {isSimpleMode ? 'GPT OS' : 'GPT PREMIUM OS'}
            </span>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="p-4 space-y-1.5 flex-1 overflow-y-auto scrollbar-hide">
        <div className={`px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] ${isSimpleMode ? 'text-gray-400' : 'text-gray-600'}`}>Core Systems</div>
        <SidebarItem 
          icon={<Search size={18} />} 
          label="Search" 
          isActive={currentTab === 'search'} 
          onClick={() => onSelectTab('search')}
          isSimpleMode={isSimpleMode}
        />
        <SidebarItem 
          icon={<MessageSquarePlus size={18} />} 
          label="GPT AI Chat" 
          isActive={currentTab === 'chat'} 
          onClick={() => onSelectTab('chat')}
          isSimpleMode={isSimpleMode}
        />
        {!isSimpleMode && (
          <SidebarItem 
            icon={<Globe size={18} />} 
            label="Web Browser" 
            isActive={currentTab === 'browser'} 
            onClick={() => onSelectTab('browser')}
            isSimpleMode={isSimpleMode}
          />
        )}
        
        <div className={`px-3 pt-6 pb-2 text-[10px] font-black uppercase tracking-[0.2em] ${isSimpleMode ? 'text-gray-400' : 'text-gray-600'}`}>Tools</div>
        <SidebarItem 
          icon={<FileText size={18} />} 
          label="Documents" 
          isActive={currentTab === 'productivity'} 
          onClick={() => onSelectTab('productivity')}
          isSimpleMode={isSimpleMode}
        />
        {!isSimpleMode && (
          <>
            <SidebarItem 
              icon={<Zap size={18} />} 
              label="Automation" 
              isActive={currentTab === 'automation'} 
              onClick={() => onSelectTab('automation')}
              isSimpleMode={isSimpleMode}
            />
            <SidebarItem 
              icon={<Wrench size={18} />} 
              label="Tools & Apps" 
              isActive={currentTab === 'tools'} 
              onClick={() => onSelectTab('tools')}
              isSimpleMode={isSimpleMode}
            />
            <SidebarItem 
              icon={<Network size={18} />} 
              label="Architecture" 
              isActive={currentTab === 'architecture'} 
              onClick={() => onSelectTab('architecture')}
              isSimpleMode={isSimpleMode}
            />
          </>
        )}

        <div className={`px-3 pt-6 pb-2 text-[10px] font-black uppercase tracking-[0.2em] ${isSimpleMode ? 'text-gray-400' : 'text-gray-600'}`}>Recent</div>
        <div className="space-y-1">
          {filteredChats.slice(0, 5).map(chat => (
            <button
              key={chat.id}
              onClick={() => {
                onSelectChat(chat.id);
                onSelectTab('chat');
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs truncate transition-all ${
                currentChatId === chat.id && currentTab === 'chat' 
                ? (isSimpleMode ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100' : 'bg-blue-600/10 text-blue-400 font-bold border border-blue-500/20')
                : (isSimpleMode ? 'hover:bg-gray-50 text-gray-500 hover:text-gray-900' : 'hover:bg-white/5 text-gray-500 hover:text-gray-300')
              }`}
            >
              {chat.title}
            </button>
          ))}
        </div>
      </div>

      <div className={`p-4 border-t space-y-4 backdrop-blur-md ${isSimpleMode ? 'bg-gray-50 border-gray-100' : 'bg-black/40 border-white/5'}`}>
        <button 
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-bold ${
            currentTab === 'settings' 
            ? (isSimpleMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/10 text-white border border-white/10')
            : (isSimpleMode ? 'hover:bg-gray-200 text-gray-600 hover:text-gray-900' : 'hover:bg-white/5 text-gray-400 hover:text-white')
          }`}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
        
        <div className="flex items-center gap-3 px-4 py-2">
          {auth.currentUser?.photoURL && auth.currentUser.photoURL !== "" ? (
            <img src={auth.currentUser.photoURL} alt="Profile" className={`w-10 h-10 rounded-2xl shadow-lg border ${isSimpleMode ? 'border-gray-200' : 'border-white/10'}`} referrerPolicy="no-referrer" />
          ) : (
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black text-white shadow-lg ${isSimpleMode ? 'bg-blue-600 shadow-blue-600/20' : 'bg-blue-600 shadow-blue-600/20'}`}>
              {isGuest ? 'G' : (auth.currentUser?.displayName ? auth.currentUser.displayName.charAt(0).toUpperCase() : 'U')}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <div className={`text-xs font-black truncate leading-tight ${isSimpleMode ? 'text-gray-900' : 'text-white'}`}>{isGuest ? 'Guest User' : auth.currentUser?.displayName || 'User'}</div>
            <div className="text-[10px] text-gray-500 truncate font-bold uppercase tracking-tighter">{isGuest ? 'Not signed in' : auth.currentUser?.email || ''}</div>
          </div>
          <button 
            onClick={onLogout}
            className={`p-2 transition-colors rounded-xl ${isSimpleMode ? 'hover:bg-red-50 text-gray-400 hover:text-red-600' : 'hover:bg-red-500/10 text-gray-600 hover:text-red-400'}`}
            title={isGuest ? 'Exit Guest Mode' : 'Log Out'}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, isActive, onClick, isSimpleMode }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, isSimpleMode?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-bold ${
        isActive 
        ? (isSimpleMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20')
        : (isSimpleMode ? 'hover:bg-gray-100 text-gray-500 hover:text-gray-900' : 'hover:bg-white/5 text-gray-400 hover:text-white')
      }`}
    >
      <span className={isActive ? 'text-white' : (isSimpleMode ? 'text-gray-400' : 'text-gray-500')}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

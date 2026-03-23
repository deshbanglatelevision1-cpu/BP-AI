import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function BootAnimation({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const letters = "BANGLADESH".split("");

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 3000); // Fly-in letters
    const timer2 = setTimeout(() => setStep(2), 5000); // Golden bar & Slogan
    const timer3 = setTimeout(() => onComplete(), 8000); // Transition to next screen
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[#050505] flex flex-col items-center justify-center z-[9999] overflow-hidden">
      {/* Magical Blue Aura */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,5,5,0.8)_100%)]" />
        
        {/* Sparkling Stars */}
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 5
            }}
            className="absolute w-0.5 h-0.5 bg-blue-400 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* BANGLADESH Letters */}
        <div className="flex gap-1 mb-4">
          {letters.map((letter, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 5, z: 500, rotateY: 90 }}
              animate={{ opacity: 1, scale: 1, z: 0, rotateY: 0 }}
              transition={{
                duration: 1.5,
                delay: i * 0.1,
                type: "spring",
                stiffness: 50
              }}
              className="w-12 h-16 bg-transparent border border-white/5 flex items-center justify-center text-4xl font-black text-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)]"
              style={{ perspective: "1000px" }}
            >
              {letter}
            </motion.div>
          ))}
        </div>

        {/* Golden Premium Bar */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "100%", opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-10 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(202,138,4,0.4)]"
            >
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-black font-black tracking-[0.5em] text-sm"
              >
                PREMIUM
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bilingual Slogan */}
        <AnimatePresence>
          {step >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="mt-8 text-center space-y-2"
            >
              <p className="text-xl font-medium text-white/90 font-serif italic">
                বাংলাদেশি মানে অলওয়েজ প্রিমিয়াম
              </p>
              <p className="text-sm tracking-[0.2em] text-blue-400 font-bold uppercase">
                Bangladeshi Means Always Premium
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

import React from 'react';
import { Database, Zap, Video, Image as ImageIcon, Mic, FileText, Globe, MessageSquare, ArrowRight } from 'lucide-react';

export default function Architecture() {
  return (
    <div className="flex flex-col h-full bg-[#121212] text-white overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-2">DB UPEEP Architecture</h1>
        <p className="text-gray-400 mb-12">Complete AI Integration of Google-Like Functions</p>

        <div className="relative">
          {/* Main Container */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            
            {/* Left Column: Inputs & Interfaces */}
            <div className="space-y-6">
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">
                  <MessageSquare size={20} />
                  User Interfaces
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> AI Chatboard (Text, Voice, Media)</li>
                  <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> In-App Browser (AI Search)</li>
                  <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Productivity Suite (Docs, PPT)</li>
                </ul>
              </div>
            </div>

            {/* Middle Column: Core AI Engine */}
            <div className="space-y-6">
              <div className="bg-gradient-to-b from-blue-900/40 to-[#1a1a1a] border border-blue-800/50 rounded-2xl p-6 shadow-2xl relative">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                  <Zap size={20} className="text-yellow-400" />
                  Core AI Engine
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-[#2a2a2a] p-3 rounded-xl flex items-center gap-3 border border-gray-700">
                    <Video className="text-purple-400" size={24} />
                    <div>
                      <div className="font-bold text-sm">AI Video Generation</div>
                      <div className="text-xs text-gray-400">Veo / Fast Response Video</div>
                    </div>
                  </div>

                  <div className="bg-[#2a2a2a] p-3 rounded-xl flex items-center gap-3 border border-gray-700">
                    <ImageIcon className="text-green-400" size={24} />
                    <div>
                      <div className="font-bold text-sm">Nano Banana / Image Intel</div>
                      <div className="text-xs text-gray-400">Animation & Object Detection</div>
                    </div>
                  </div>

                  <div className="bg-[#2a2a2a] p-3 rounded-xl flex items-center gap-3 border border-gray-700">
                    <Mic className="text-red-400" size={24} />
                    <div>
                      <div className="font-bold text-sm">Audio & Transcription</div>
                      <div className="text-xs text-gray-400">Live Voice & TTS</div>
                    </div>
                  </div>

                  <div className="bg-[#2a2a2a] p-3 rounded-xl flex items-center gap-3 border border-gray-700">
                    <Globe className="text-blue-400" size={24} />
                    <div>
                      <div className="font-bold text-sm">Search Grounding</div>
                      <div className="text-xs text-gray-400">Real-time Web & Maps</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Storage & Outputs */}
            <div className="space-y-6">
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-400">
                  <Database size={20} />
                  Database & Storage
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Firestore (Chats, Docs, Users)</li>
                  <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Cloud Storage (Media)</li>
                </ul>
              </div>

              <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-orange-400">
                  <FileText size={20} />
                  Cross-Module Integration
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  AI-generated outputs (video, audio, image, text) can be saved directly to DB UPEEP documents, spreadsheets, or presentations.
                </p>
              </div>
            </div>
          </div>

          {/* Connection Lines (Hidden on mobile, visible on md+) */}
          <div className="hidden md:block absolute top-1/2 left-[30%] right-[30%] h-0.5 bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-emerald-500/50 -z-0 -translate-y-1/2"></div>
        </div>

        <div className="mt-12 bg-[#1a1a1a] border border-gray-800 rounded-2xl p-8">
          <h3 className="text-xl font-bold mb-4">User Flow Example</h3>
          <div className="flex flex-col md:flex-row items-center gap-4 text-sm">
            <div className="bg-[#2a2a2a] p-4 rounded-xl flex-1 text-center border border-gray-700">
              <span className="text-blue-400 font-bold block mb-1">1. Query</span>
              "Generate animated clip from last meeting video."
            </div>
            <ArrowRight className="text-gray-600 hidden md:block" />
            <div className="bg-[#2a2a2a] p-4 rounded-xl flex-1 text-center border border-gray-700">
              <span className="text-purple-400 font-bold block mb-1">2. AI Processing</span>
              Analyzes frames, extracts audio, applies Nano Banana animation.
            </div>
            <ArrowRight className="text-gray-600 hidden md:block" />
            <div className="bg-[#2a2a2a] p-4 rounded-xl flex-1 text-center border border-gray-700">
              <span className="text-emerald-400 font-bold block mb-1">3. Output & Save</span>
              Instant preview provided. User clicks "Save to Productivity".
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

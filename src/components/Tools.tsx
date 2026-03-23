import React, { useState, useEffect } from 'react';
import { Calculator, Clock, Calendar, BarChart, Image as ImageIcon, Video, Zap, Bell, Send, Cloud, Sun, Droplets, Wind, DollarSign, TrendingUp, PieChart as PieChartIcon, Volume2, Loader2 } from 'lucide-react';
import { generateChatResponse, generateImage, generateSpeech } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

interface ToolsProps {
  isGuest?: boolean;
}

export default function Tools({ isGuest }: ToolsProps) {
  const [activeTool, setActiveTool] = useState('calculator');

  // Calculator State
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcExpression, setCalcExpression] = useState('');
  const [aiCalcPrompt, setAiCalcPrompt] = useState('');
  const [aiCalcResult, setAiCalcResult] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  // Graph State
  const [graphPrompt, setGraphPrompt] = useState('');
  const [isGeneratingGraph, setIsGeneratingGraph] = useState(false);
  const [graphData, setGraphData] = useState<any>(null);
  const [graphType, setGraphType] = useState<'bar' | 'line' | 'pie'>('bar');

  // Calendar State
  const [calendarPrompt, setCalendarPrompt] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<{date: number, title: string}[]>([{date: 18, title: 'Meeting'}]);

  // Media State
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Weather State
  const [weatherCity, setWeatherCity] = useState('Dhaka');
  const [weatherData, setWeatherData] = useState<any>({
    temp: 28,
    condition: 'Sunny',
    humidity: 65,
    wind: 12,
    forecast: [
      { day: 'Mon', temp: 29, icon: <Sun size={16} /> },
      { day: 'Tue', temp: 27, icon: <Cloud size={16} /> },
      { day: 'Wed', temp: 30, icon: <Sun size={16} /> },
    ]
  });

  // Finance State
  const [financePrompt, setFinancePrompt] = useState('');
  const [isAnalyzingFinance, setIsAnalyzingFinance] = useState(false);
  const [financeReport, setFinanceReport] = useState('');

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    try {
      const imageUrl = await generateImage(imagePrompt);
      setGeneratedImage(imageUrl);
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleAiSchedule = async () => {
    if (!calendarPrompt.trim()) return;
    setIsScheduling(true);
    try {
      const prompt = `Extract the date (1-31) and title from this scheduling request: "${calendarPrompt}". Return ONLY a JSON object like {"date": 25, "title": "Dentist"}. If no date is found, use 18.`;
      const response = await generateChatResponse(prompt);
      
      try {
        const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);
        if (data.date && data.title) {
          setCalendarEvents(prev => [...prev, { date: parseInt(data.date), title: data.title }]);
          setCalendarPrompt('');
        }
      } catch (e) {
        console.error("Failed to parse AI schedule response", e);
      }
    } catch (error) {
      console.error("Error scheduling:", error);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleAiFinance = async () => {
    if (!financePrompt.trim()) return;
    setIsAnalyzingFinance(true);
    try {
      const response = await generateChatResponse(`Analyze this financial query and provide a detailed report with suggestions: ${financePrompt}`, 'research');
      setFinanceReport(response);
    } catch (error) {
      console.error("Finance analysis error:", error);
    } finally {
      setIsAnalyzingFinance(false);
    }
  };

  const handleCalcInput = (btn: string) => {
    if (btn === 'C') {
      setCalcDisplay('0');
      setCalcExpression('');
    } else if (btn === '=') {
      try {
        const evalStr = calcExpression.replace(/×/g, '*').replace(/÷/g, '/');
        // eslint-disable-next-line no-eval
        const result = eval(evalStr);
        setCalcDisplay(String(result));
        setCalcExpression(String(result));
      } catch (e) {
        setCalcDisplay('Error');
        setCalcExpression('');
      }
    } else {
      const newExpr = calcExpression + btn;
      setCalcExpression(newExpr);
      setCalcDisplay(newExpr);
    }
  };

  const handleAiCalculate = async () => {
    if (!aiCalcPrompt.trim()) return;
    setIsCalculating(true);
    try {
      const response = await generateChatResponse(`Solve this math problem and explain the steps: ${aiCalcPrompt}`, 'research');
      setAiCalcResult(response);
    } catch (e) {
      console.error("AI Calculate error", e);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleGenerateGraph = async () => {
    if (!graphPrompt.trim()) return;
    setIsGeneratingGraph(true);
    try {
      const prompt = `Generate a JSON array of data points for a ${graphType} chart based on this prompt: "${graphPrompt}". Each object should have 'name' and 'value'. Return ONLY the JSON array.`;
      const response = await generateChatResponse(prompt);
      try {
        const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);
        setGraphData(data);
      } catch (e) {
        console.error("Failed to parse graph data", e);
      }
    } catch (e) {
      console.error("Graph generation error", e);
    } finally {
      setIsGeneratingGraph(false);
    }
  };

  const tools = [
    { id: 'calculator', icon: <Calculator size={20} />, label: 'Calculator' },
    { id: 'clock', icon: <Clock size={20} />, label: 'Clock' },
    { id: 'calendar', icon: <Calendar size={20} />, label: 'Calendar' },
    { id: 'weather', icon: <Cloud size={20} />, label: 'Weather' },
    { id: 'graphs', icon: <BarChart size={20} />, label: 'Graphs' },
    { id: 'finance', icon: <DollarSign size={20} />, label: 'Finance' },
    { id: 'media', icon: <ImageIcon size={20} />, label: 'Media' },
    { id: 'realtime', icon: <Zap size={20} className="text-yellow-400" />, label: 'Real-time AI' },
  ];

  // Real-time AI State
  const [rtPrompt, setRtPrompt] = useState('');
  const [rtImage, setRtImage] = useState<string | null>(null);
  const [rtAudio, setRtAudio] = useState<string | null>(null);
  const [isRtLoading, setIsRtLoading] = useState(false);
  const [isRtAudioLoading, setIsRtAudioLoading] = useState(false);

  const handleRtGenerate = async () => {
    if (!rtPrompt.trim()) return;
    setIsRtLoading(true);
    try {
      const imageUrl = await generateImage(rtPrompt, "1K", "1:1");
      setRtImage(imageUrl);
    } catch (error) {
      console.error("Real-time image error", error);
    } finally {
      setIsRtLoading(false);
    }
  };

  const handleRtAudio = async () => {
    if (!rtPrompt.trim()) return;
    setIsRtAudioLoading(true);
    try {
      const audioUrl = await generateSpeech(rtPrompt);
      setRtAudio(audioUrl);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (error) {
      console.error("Real-time audio error", error);
    } finally {
      setIsRtAudioLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-[#121212] text-white">
      {/* Sidebar */}
      <div className="w-64 bg-[#1a1a1a] border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="text-blue-500" size={24} />
            AI Tools
          </h2>
        </div>
        <div className="flex-1 p-2 space-y-1">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTool === tool.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-[#2a2a2a] text-gray-400'
              }`}
            >
              {tool.icon}
              <span className="font-medium">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto">
          {activeTool === 'calculator' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#1a1a1a] rounded-3xl p-6 border border-gray-800 shadow-xl">
                <div className="bg-[#0a0a0a] p-4 rounded-2xl mb-4 text-right">
                  <div className="text-gray-500 text-sm h-6">{calcExpression}</div>
                  <div className="text-3xl font-bold font-mono overflow-hidden">{calcDisplay}</div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', 'DEL', '='].map(btn => (
                    <button
                      key={btn}
                      onClick={() => handleCalcInput(btn)}
                      className={`p-4 rounded-xl font-bold transition-colors ${
                        btn === '=' ? 'bg-blue-600 hover:bg-blue-700 col-span-1' : 
                        ['+', '-', '×', '÷'].includes(btn) ? 'bg-[#2a2a2a] text-blue-400 hover:bg-[#333]' :
                        btn === 'C' ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30' :
                        'bg-[#252525] hover:bg-[#333]'
                      }`}
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-[#1a1a1a] rounded-3xl p-6 border border-gray-800 shadow-xl flex flex-col">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Zap size={20} className="text-yellow-400"/> AI Math Solver</h3>
                <textarea
                  value={aiCalcPrompt}
                  onChange={(e) => setAiCalcPrompt(e.target.value)}
                  placeholder="Type a complex math problem..."
                  className="flex-1 bg-[#2a2a2a] border border-gray-700 rounded-2xl p-4 mb-4 focus:outline-none focus:border-blue-500 resize-none"
                />
                <button 
                  onClick={handleAiCalculate}
                  disabled={isCalculating}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-3 rounded-xl font-bold transition-all"
                >
                  {isCalculating ? 'Solving...' : 'Solve with AI'}
                </button>
                {aiCalcResult && (
                  <div className="mt-4 p-4 bg-[#0a0a0a] rounded-2xl border border-gray-800 max-h-48 overflow-y-auto text-sm">
                    <ReactMarkdown>{aiCalcResult}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTool === 'clock' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { city: 'Dhaka', offset: 6 },
                  { city: 'Chittagong', offset: 6 },
                  { city: 'Sylhet', offset: 6 },
                  { city: 'London', offset: 0 },
                  { city: 'New York', offset: -5 },
                  { city: 'Tokyo', offset: 9 },
                ].map(item => (
                  <div key={item.city} className="bg-[#1a1a1a] rounded-3xl p-6 border border-gray-800 shadow-xl text-center">
                    <div className="text-gray-400 text-sm mb-2">{item.city}</div>
                    <div className="text-3xl font-bold font-mono">
                      {new Date(new Date().getTime() + (item.offset * 3600000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-[#1a1a1a] rounded-3xl p-8 border border-gray-800 shadow-xl flex flex-col items-center">
                <div className="text-8xl font-black font-mono tracking-tighter mb-4 bg-gradient-to-b from-white to-gray-600 bg-clip-text text-transparent">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="text-blue-500 font-medium">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
            </div>
          )}

          {activeTool === 'calendar' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 bg-[#1a1a1a] rounded-3xl p-6 border border-gray-800 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">March 2026</h3>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-[#2a2a2a] rounded-lg">←</button>
                    <button className="p-2 hover:bg-[#2a2a2a] rounded-lg">→</button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-center text-xs font-bold text-gray-500 uppercase">{d}</div>
                  ))}
                  {Array.from({ length: 31 }).map((_, i) => {
                    const day = i + 1;
                    const hasEvent = calendarEvents.find(e => e.date === day);
                    return (
                      <div 
                        key={i} 
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-colors ${
                          day === 18 ? 'bg-blue-600 text-white' : 'hover:bg-[#2a2a2a] text-gray-400'
                        }`}
                      >
                        <span className="text-sm font-bold">{day}</span>
                        {hasEvent && <div className="absolute bottom-1 w-1 h-1 bg-emerald-400 rounded-full" />}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-[#1a1a1a] rounded-3xl p-6 border border-gray-800 shadow-xl flex flex-col">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Zap size={20} className="text-emerald-400"/> AI Scheduler</h3>
                <textarea
                  value={calendarPrompt}
                  onChange={(e) => setCalendarPrompt(e.target.value)}
                  placeholder="e.g., Schedule a meeting on the 25th..."
                  className="flex-1 bg-[#2a2a2a] border border-gray-700 rounded-2xl p-4 mb-4 focus:outline-none focus:border-emerald-500 resize-none"
                />
                <button 
                  onClick={handleAiSchedule}
                  disabled={isScheduling}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 py-3 rounded-xl font-bold transition-all"
                >
                  {isScheduling ? 'Scheduling...' : 'Auto-Schedule'}
                </button>
                <div className="mt-6 space-y-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Upcoming</h4>
                  {calendarEvents.map((event, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-[#2a2a2a] rounded-xl">
                      <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-lg flex flex-col items-center justify-center">
                        <span className="text-xs font-bold">{event.date}</span>
                      </div>
                      <div className="text-sm font-medium">{event.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTool === 'weather' && (
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-20">
                  <Sun size={200} />
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-12">
                    <div>
                      <h2 className="text-5xl font-black mb-2">{weatherCity}</h2>
                      <p className="text-blue-100 text-lg">Bangladesh • {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-8xl font-black">{weatherData.temp}°</div>
                      <div className="text-xl font-medium text-blue-100">{weatherData.condition}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-8">
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 flex items-center gap-4">
                      <Droplets className="text-blue-200" />
                      <div>
                        <div className="text-xs text-blue-200 uppercase font-bold">Humidity</div>
                        <div className="text-xl font-bold">{weatherData.humidity}%</div>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 flex items-center gap-4">
                      <Wind className="text-blue-200" />
                      <div>
                        <div className="text-xs text-blue-200 uppercase font-bold">Wind</div>
                        <div className="text-xl font-bold">{weatherData.wind} km/h</div>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 flex items-center gap-4">
                      <Sun className="text-blue-200" />
                      <div>
                        <div className="text-xs text-blue-200 uppercase font-bold">UV Index</div>
                        <div className="text-xl font-bold">Low</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {weatherData.forecast.map((f: any, i: number) => (
                  <div key={i} className="bg-[#1a1a1a] rounded-3xl p-6 border border-gray-800 shadow-xl flex flex-col items-center">
                    <div className="text-gray-400 font-medium mb-4">{f.day}</div>
                    <div className="text-blue-400 mb-4">{f.icon}</div>
                    <div className="text-2xl font-bold">{f.temp}°</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTool === 'graphs' && (
            <div className="space-y-8">
              <div className="bg-[#1a1a1a] rounded-3xl p-8 border border-gray-800 shadow-xl">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold">AI Graph Generator</h3>
                  <div className="flex bg-[#0a0a0a] p-1 rounded-xl">
                    {(['bar', 'line', 'pie'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setGraphType(type)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                          graphType === type ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 mb-8">
                  <input
                    type="text"
                    value={graphPrompt}
                    onChange={(e) => setGraphPrompt(e.target.value)}
                    placeholder="Describe the data you want to visualize..."
                    className="flex-1 bg-[#2a2a2a] border border-gray-700 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleGenerateGraph}
                    disabled={isGeneratingGraph || !graphPrompt.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2 rounded-xl font-bold transition-all"
                  >
                    {isGeneratingGraph ? 'Generating...' : 'Generate'}
                  </button>
                </div>
                <div className="h-[400px] w-full bg-[#0a0a0a] rounded-2xl p-4 border border-gray-800">
                  {graphData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      {graphType === 'bar' ? (
                        <RechartsBarChart data={graphData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="name" stroke="#666" />
                          <YAxis stroke="#666" />
                          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </RechartsBarChart>
                      ) : graphType === 'line' ? (
                        <LineChart data={graphData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="name" stroke="#666" />
                          <YAxis stroke="#666" />
                          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6' }} />
                        </LineChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={graphData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {graphData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                          <Legend />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                      <BarChart size={48} className="opacity-20" />
                      <p>Enter a prompt above to generate a visualization</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTool === 'finance' && (
            <div className="space-y-8">
              <div className="bg-[#1a1a1a] rounded-3xl p-8 border border-gray-800 shadow-xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <TrendingUp className="text-emerald-400" size={24} />
                  AI Finance Analyst
                </h3>
                <div className="space-y-4">
                  <textarea
                    value={financePrompt}
                    onChange={(e) => setFinancePrompt(e.target.value)}
                    placeholder="e.g., Analyze my monthly budget of $3000 with $1200 rent, $500 food, $300 transport..."
                    className="w-full bg-[#2a2a2a] border border-gray-700 rounded-2xl p-4 h-32 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                  <button
                    onClick={handleAiFinance}
                    disabled={isAnalyzingFinance || !financePrompt.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 py-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20"
                  >
                    {isAnalyzingFinance ? 'Analyzing Market & Data...' : 'Generate Financial Report'}
                  </button>
                </div>
                {financeReport && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-6 bg-[#0a0a0a] rounded-2xl border border-gray-800 prose prose-invert max-w-none"
                  >
                    <ReactMarkdown>{financeReport}</ReactMarkdown>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {activeTool === 'media' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-[#1a1a1a] rounded-3xl p-6 border border-gray-800 shadow-xl">
                <h3 className="font-bold mb-4 flex items-center gap-2"><ImageIcon size={20} className="text-green-400"/> AI Image Generator</h3>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Describe an image to generate..."
                    className="flex-1 bg-[#2a2a2a] border border-gray-700 rounded-xl px-4 py-2 focus:outline-none focus:border-green-500 transition-colors"
                  />
                  <button 
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !imagePrompt.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-6 py-2 rounded-xl transition-colors flex items-center justify-center font-medium"
                  >
                    {isGeneratingImage ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : 'Generate'}
                  </button>
                </div>
                {generatedImage && generatedImage !== "" && (
                  <div className="mt-6 rounded-xl overflow-hidden border border-gray-700">
                    <img src={generatedImage} alt="Generated" className="w-full h-auto" />
                  </div>
                )}
              </div>
              <div className="bg-[#1a1a1a] rounded-3xl p-6 border border-gray-800 shadow-xl opacity-50">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Video size={20} className="text-purple-400"/> Video Studio (Coming Soon)</h3>
                <p className="text-sm text-gray-400">Generate videos with Veo, animate with Nano Banana.</p>
              </div>
            </div>
          )}
          {activeTool === 'realtime' && (
            <div className="space-y-8">
              <div className="bg-[#1a1a1a] rounded-[3rem] p-12 border border-gray-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5">
                  <Zap size={200} />
                </div>
                <div className="relative z-10">
                  <h2 className="text-4xl font-black mb-4 flex items-center gap-4">
                    <Zap className="text-yellow-400" size={40} />
                    Real-time AI Experience
                  </h2>
                  <p className="text-gray-400 text-lg mb-12 max-w-2xl">
                    Generate high-quality images and natural speech in real-time. Experience the power of Gemini 3.1 and Nano Banana.
                  </p>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div className="relative">
                        <textarea
                          value={rtPrompt}
                          onChange={(e) => setRtPrompt(e.target.value)}
                          placeholder="Describe what you want to see and hear..."
                          className="w-full bg-[#0a0a0a] border border-gray-800 rounded-3xl p-6 h-48 focus:outline-none focus:border-blue-500 transition-all text-lg resize-none"
                        />
                        <div className="absolute bottom-4 right-4 flex gap-2">
                          <button 
                            onClick={handleRtAudio}
                            disabled={isRtAudioLoading || !rtPrompt.trim()}
                            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-2xl text-blue-400 transition-all disabled:opacity-50"
                            title="Generate Speech"
                          >
                            {isRtAudioLoading ? <Loader2 className="animate-spin" size={24} /> : <Volume2 size={24} />}
                          </button>
                          <button 
                            onClick={handleRtGenerate}
                            disabled={isRtLoading || !rtPrompt.trim()}
                            className="p-3 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white transition-all disabled:opacity-50"
                            title="Generate Image"
                          >
                            {isRtLoading ? <Loader2 className="animate-spin" size={24} /> : <ImageIcon size={24} />}
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl p-6">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">AI Suggestions</h4>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "A futuristic city in Bangladesh with flying cars",
                            "A serene sunset over the Sundarbans",
                            "A robot teaching a child how to code",
                            "A vibrant digital art of a Bengal tiger"
                          ].map(suggestion => (
                            <button 
                              key={suggestion}
                              onClick={() => setRtPrompt(suggestion)}
                              className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-xl text-sm text-gray-400 transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative aspect-square bg-[#0a0a0a] rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl group">
                      {rtImage && rtImage !== "" ? (
                        <motion.img 
                          initial={{ opacity: 0, scale: 1.1 }}
                          animate={{ opacity: 1, scale: 1 }}
                          src={rtImage} 
                          alt="AI Generated" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-700 gap-6 p-12 text-center">
                          <div className="w-24 h-24 bg-gray-800/50 rounded-full flex items-center justify-center">
                            <ImageIcon size={48} className="opacity-20" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-gray-500 mb-2">Visual Canvas</p>
                            <p className="text-sm">Your AI-generated masterpiece will appear here. Describe your vision to begin.</p>
                          </div>
                        </div>
                      )}
                      
                      {isRtLoading && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                          <p className="text-blue-400 font-bold animate-pulse">Generating Vision...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

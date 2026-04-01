import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { 
  Send, 
  Bot, 
  Search, 
  Image as ImageIcon, 
  Sparkles, 
  Loader2, 
  Upload, 
  BrainCircuit, 
  MessageSquare, 
  ChevronRight, 
  ChevronDown,
  Settings,
  Plus, 
  History, 
  Trash2, 
  Mic, 
  Camera, 
  User, 
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

// Mock/Initial for AI (API logic assumed working from previous)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const AIAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'search' | 'analyze'>('chat');
  const [selectedModel, setSelectedModel] = useState('gemini-flash-latest');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const MODELS = [
    { id: 'gemini-flash-latest', name: 'Flash', fullName: 'Gemini Flash (Padrão)', description: 'Equilíbrio entre velocidade e inteligência', icon: <Zap size={16} /> },
    { id: 'gemini-3.1-flash-lite-preview', name: 'Lite', fullName: 'Gemini Flash Lite', description: 'Mais rápido, menor latência', icon: <Cpu size={16} /> },
    { id: 'gemini-3.1-pro-preview', name: 'Pro', fullName: 'Gemini Pro', description: 'Mais inteligente, maior raciocínio', icon: <BrainCircuit size={16} /> },
    { id: 'gemini-3-flash-preview', name: 'G3 Flash', fullName: 'Gemini 3 Flash', description: 'Modelo de última geração', icon: <Sparkles size={16} /> },
  ];
  
  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string, isError?: boolean}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState('');
  const [isSearchError, setIsSearchError] = useState(false);
  const [searchLinks, setSearchLinks] = useState<{title: string, url: string}[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // Analyze State
  const [analyzeImage, setAnalyzeImage] = useState<string | null>(null);
  const [analyzePrompt, setAnalyzePrompt] = useState('Analise esta imagem odontológica e descreva os achados.');
  const [analyzeResult, setAnalyzeResult] = useState('');
  const [isAnalyzeError, setIsAnalyzeError] = useState(false);
  const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);

  useEffect(() => {
    if (!process.env.GEMINI_API_KEY) {
      setIsApiKeyMissing(true);
    }
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const formatAIError = (error: any) => {
    console.error('AI Error:', error);
    let message = error instanceof Error ? error.message : String(error);
    if (message.includes('429') || message.includes('quota')) {
      setCooldown(60);
      return "O limite de uso foi atingido. Aguarde cerca de 1 minuto ou tente o modelo 'Lite'.";
    }
    return "Ocorreu um erro ao processar. Verifique sua conexão.";
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || cooldown > 0) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      const isGemini3 = selectedModel.includes('gemini-3');
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: userMessage,
        config: {
          systemInstruction: 'Você é um assistente especializado em odontologia. Ajude dentistas com diagnósticos, planos de tratamento, legislação e dúvidas gerais.',
          ...(isGemini3 ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {})
        }
      });
      
      setChatMessages(prev => [...prev, { role: 'model', text: response.text || 'Não consegui gerar uma resposta.' }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'model', text: formatAIError(error), isError: true }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || cooldown > 0) return;

    setIsSearchLoading(true);
    setSearchResult('');
    setIsSearchError(false);

    try {
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: searchQuery,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      setSearchResult(response.text || 'Nenhum resultado encontrado.');
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const links = chunks
          .filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({ title: chunk.web.title, url: chunk.web.uri }));
        setSearchLinks(links);
      }
    } catch (error) {
      setSearchResult(formatAIError(error));
      setIsSearchError(true);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setAnalyzeImage(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8 shrink-0">
        <div>
          <h1 className="text-5xl font-black text-text-primary tracking-tight uppercase flex items-center gap-4">
            IA <span className="text-indigo-500">Assistente</span>
          </h1>
          <p className="text-text-secondary mt-2 font-medium uppercase tracking-widest text-xs">INTELIGÊNCIA ARTIFICIAL ODONTOLÓGICA CLINIC-READY</p>
        </div>
        
        {/* Model Selector Premium */}
        <div className="relative">
          <button
            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
            className="flex items-center gap-3 bg-surface border border-zinc-200/50 dark:border-zinc-800 rounded-2xl px-5 py-3 hover:border-indigo-500/30 transition-all shadow-sm"
          >
             <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
               {currentModel.icon}
             </div>
             <div className="text-left leading-none">
               <p className="text-[10px] font-black uppercase text-text-secondary mb-1">Modelo Ativo</p>
               <p className="text-sm font-black text-text-primary uppercase tracking-tight">{currentModel.name}</p>
             </div>
             <ChevronDown size={16} className={`text-text-secondary transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isModelMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-3 w-72 bg-surface rounded-[32px] border border-zinc-200/50 dark:border-zinc-800 shadow-2xl z-50 overflow-hidden p-3"
              >
                <div className="space-y-1">
                  {MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedModel(m.id); setIsModelMenuOpen(false); }}
                      className={`w-full text-left p-4 rounded-2xl transition-all flex items-start gap-3 ${selectedModel === m.id ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedModel === m.id ? 'text-indigo-600' : 'text-text-secondary'}`}>
                        {m.icon}
                      </div>
                      <div>
                        <p className="text-xs font-black text-text-primary uppercase">{m.name}</p>
                        <p className="text-[10px] text-text-secondary mt-1 leading-tight">{m.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tabs Premium */}
      <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-[24px] border border-zinc-200/30 dark:border-zinc-800/50 self-start shrink-0">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-white dark:bg-surface text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <MessageSquare size={14} /> Conversar
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'search' ? 'bg-white dark:bg-surface text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <Search size={14} /> Pesquisar Web
        </button>
        <button
          onClick={() => setActiveTab('analyze')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'analyze' ? 'bg-white dark:bg-surface text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <Camera size={14} /> Analisar Imagem
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-surface rounded-[40px] border border-zinc-200/50 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-bl-[120px] pointer-events-none" />
        
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-indigo-500/20">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                   <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-300 mb-6">
                      <Sparkles size={40} />
                   </div>
                   <h3 className="text-xl font-black uppercase tracking-tighter">O que vamos analisar hoje?</h3>
                   <p className="text-xs font-medium uppercase tracking-widest mt-2 max-w-xs">Diagnósticos rápidos, planos de tratamento ou dúvidas técnicas.</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] md:max-w-[70%] p-6 rounded-[32px] shadow-sm flex items-start gap-4 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-lg' : 'bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-text-primary rounded-tl-lg'}`}>
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center shadow-inner ${msg.role === 'user' ? 'bg-white/10' : 'bg-indigo-100/50 dark:bg-indigo-500/20 text-indigo-600'}`}>
                       {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-[32px] border border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                     <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                     <span className="text-xs font-black uppercase tracking-widest text-text-secondary blink">Pensando...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-8 bg-zinc-50/50 dark:bg-zinc-900/10 border-t border-zinc-100 dark:border-zinc-800">
               <form onSubmit={handleChatSubmit} className="relative max-w-4xl mx-auto group">
                 <div className="absolute inset-0 bg-indigo-500/10 blur-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-700" />
                 <input
                   type="text"
                   value={chatInput}
                   onChange={e => setChatInput(e.target.value)}
                   placeholder={cooldown > 0 ? `AGUARDE ${cooldown}S...` : "DESCREVA O CASO OU FAÇA UMA PERGUNTA..."}
                   disabled={cooldown > 0}
                   className="w-full bg-white dark:bg-surface border border-zinc-200 dark:border-zinc-800 rounded-3xl pl-8 pr-32 py-5 text-sm font-medium focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-lg shadow-indigo-500/5 relative placeholder:text-zinc-400 font-black uppercase tracking-widest"
                 />
                 <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button type="button" className="p-2 text-zinc-300 hover:text-indigo-500 transition-colors">
                       <Mic size={20} />
                    </button>
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isChatLoading || cooldown > 0}
                      className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
                    >
                      {isChatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={20} />}
                    </button>
                 </div>
               </form>
               {cooldown > 0 && <p className="text-center mt-4 text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">Serviço em resfriamento técnico. Tente novamente em alguns segundos.</p>}
            </div>
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="flex flex-col h-full p-8 space-y-8">
             <div className="max-w-3xl mx-auto w-full">
                <h2 className="text-3xl font-black text-text-primary tracking-tighter uppercase mb-2">Busca Inteligente</h2>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-widest mb-8">ACESSO AO CONHECIMENTO GLOBAL EM TEMPO REAL via GOOGLE SEARCH</p>
                
                <form onSubmit={handleSearchSubmit} className="relative group">
                   <div className="absolute inset-0 bg-cyan-500/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-all" />
                   <input
                     type="text"
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     placeholder="PESQUISAR ARTIGOS, LEGISLAÇÃO OU PREÇOS DE MATERIAIS..."
                     className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl px-8 py-5 text-sm font-black uppercase tracking-widest focus:ring-4 focus:ring-cyan-500/5 outline-none transition-all shadow-sm relative"
                   />
                   <button type="submit" disabled={isSearchLoading} className="absolute right-4 top-1/2 -translate-y-1/2 bg-cyan-600 text-white p-2.5 rounded-2xl hover:bg-cyan-700 transition-all">
                      {isSearchLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search size={20} />}
                   </button>
                </form>
             </div>

             <div className="flex-1 overflow-y-auto space-y-8 max-w-4xl mx-auto w-full pb-10">
                {isSearchLoading && (
                  <div className="py-20 text-center space-y-4">
                     <div className="w-16 h-16 bg-cyan-50 dark:bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto text-cyan-600">
                        <Loader2 className="w-8 h-8 animate-spin" />
                     </div>
                     <p className="text-xs font-black uppercase tracking-widest text-text-secondary">Consultando fontes confiáveis na web...</p>
                  </div>
                )}
                {searchResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[32px] p-8 shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-6">
                       <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-600">
                          <ShieldCheck size={18} />
                       </div>
                       <h3 className="text-lg font-black uppercase tracking-tight">Resultado Verificado</h3>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-text-secondary mb-8">
                       <Markdown>{searchResult}</Markdown>
                    </div>
                    
                    {searchLinks.length > 0 && (
                      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-4">Fontes Consultadas:</h4>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {searchLinks.map((link, idx) => (
                              <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 border border-transparent hover:border-cyan-100 transition-all text-left"
                              >
                                <span className="text-[10px] font-bold text-text-primary uppercase truncate max-w-[200px]">{link.title}</span>
                                <ExternalLink size={12} className="text-text-secondary" />
                              </a>
                            ))}
                         </div>
                      </div>
                    )}
                  </motion.div>
                )}
             </div>
          </div>
        )}

        {/* Analyze Tab */}
        {activeTab === 'analyze' && (
          <div className="h-full flex flex-col p-8 overflow-y-auto">
             <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 pb-10">
                <div className="lg:col-span-5 space-y-6">
                   <h2 className="text-3xl font-black text-text-primary tracking-tighter uppercase">Análise Visual</h2>
                   <p className="text-xs font-medium text-text-secondary uppercase tracking-widest">IA ESPECIALIZADA EM RECONHECIMENTO DE PADRÕES ODONTOLÓGICOS</p>
                   
                   <div 
                     className={`aspect-square rounded-[40px] border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden relative group bg-zinc-50 dark:bg-zinc-900/50 ${analyzeImage ? 'border-transparent' : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50'}`}
                   >
                      {analyzeImage ? (
                        <>
                          <img src={analyzeImage} alt="Para analisar" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all gap-4">
                             <button onClick={() => setAnalyzeImage(null)} className="p-4 bg-red-500 text-white rounded-2xl hover:scale-110 transition-transform">
                                <Trash2 size={24} />
                             </button>
                             <label className="p-4 bg-white text-text-primary rounded-2xl hover:scale-110 transition-transform cursor-pointer">
                                <Plus size={24} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                             </label>
                          </div>
                        </>
                      ) : (
                        <label className="cursor-pointer text-center p-8 space-y-4">
                           <div className="w-20 h-20 bg-white dark:bg-surface rounded-3xl shadow-xl flex items-center justify-center text-indigo-500 mx-auto group-hover:scale-110 transition-transform">
                              <Upload size={32} />
                           </div>
                           <p className="text-xs font-black uppercase text-indigo-600 tracking-widest">Enviar Radiografia ou Foto</p>
                           <p className="text-[10px] text-text-secondary uppercase font-medium">PNG, JPG ATÉ 10MB</p>
                           <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                      )}
                   </div>
                   
                   <button
                     disabled={!analyzeImage || isAnalyzeLoading}
                     className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-3"
                   >
                     {isAnalyzeLoading ? <Loader2 size={18} className="animate-spin" /> : <BrainCircuit size={18} />}
                     {isAnalyzeLoading ? 'Analizando...' : 'Processar Achados'}
                   </button>
                </div>
                
                <div className="lg:col-span-7">
                    <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-[40px] border border-zinc-100 dark:border-zinc-800 p-8 h-full flex flex-col">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-6 flex items-center gap-2">
                          <History size={14} /> Relatório de Análise
                       </h4>
                       <div className="flex-1 overflow-y-auto space-y-6">
                          {!analyzeResult && !isAnalyzeLoading && (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 px-10">
                               <ImageIcon size={48} className="mb-4 text-zinc-400" />
                               <p className="text-xs font-black uppercase tracking-widest leading-loose">Aguardando imagem para emissão de relatório avançado.</p>
                            </div>
                          )}
                          {isAnalyzeLoading && (
                            <div className="space-y-4 animate-pulse">
                               <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full w-3/4" />
                               <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full w-full" />
                               <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full w-5/6" />
                               <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full w-4/6" />
                            </div>
                          )}
                          {analyzeResult && (
                             <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-text-secondary leading-relaxed">
                                <Markdown>{analyzeResult}</Markdown>
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
  );
};

export default AIAssistant;

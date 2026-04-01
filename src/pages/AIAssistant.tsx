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
  X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const AIAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'search' | 'analyze'>('chat');
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const MODELS = [
    { id: 'gemini-2.0-flash', name: 'Flash 2.0', fullName: 'Gemini 2.0 Flash', description: 'Velocidade ultra-rápida e inteligência aprimorada' },
    { id: 'gemini-2.0-flash-lite-preview-02-05', name: 'Lite 2.0', fullName: 'Gemini 2.0 Flash Lite', description: 'Otimizado para solicitações rápidas e básicas' },
    { id: 'gemini-1.5-pro', name: 'Pro 1.5', fullName: 'Gemini 1.5 Pro', description: 'Raciocínio complexo e análise profunda' },
    { id: 'gemini-1.5-flash', name: 'Flash 1.5', fullName: 'Gemini 1.5 Flash', description: 'Equilíbrio entre velocidade e inteligência' },
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
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
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
    
    try {
      // Try to parse if it's a JSON string from the API
      const errorObj = JSON.parse(message);
      const code = errorObj.code || errorObj.error?.code;
      
      if (code === 429) {
        setCooldown(60);
        return "Limite de uso atingido. O plano gratuito do Gemini possui limites de requisições por minuto. Tente aguardar um momento ou trocar para um modelo mais leve (como o Lite) no topo da tela.";
      }
      if (code === 503 || code === 500) {
        return "O serviço está temporariamente indisponível devido à alta demanda. Por favor, tente novamente em alguns instantes.";
      }
      if (errorObj.message || errorObj.error?.message) {
        message = errorObj.message || errorObj.error?.message;
      }
    } catch (e) {
      // Not a JSON string, continue with original message
    }

    if (message.includes('quota') || message.includes('429')) {
      return "Limite de uso atingido. Por favor, aguarde um momento e tente novamente.";
    }
    if (message.includes('503') || message.includes('unavailable')) {
      return "O serviço está temporariamente sobrecarregado. Tente novamente em instantes.";
    }

    return "Desculpe, ocorreu um erro ao processar sua solicitação. Verifique sua conexão ou tente novamente mais tarde.";
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      if (!genAI) throw new Error('Chave de API do Gemini não configurada.');
      
      const response = await genAI.models.generateContent({
        model: selectedModel,
        contents: [
          {
            role: 'user',
            parts: [{ text: `INSTRUÇÃO DE SISTEMA: Você é um assistente especializado em odontologia. Ajude dentistas com diagnósticos, planos de tratamento, legislação e dúvidas gerais.\n\nUSUÁRIO: ${userMessage}` }]
          }
        ]
      });
      
      const text = response.text;
      setChatMessages(prev => [...prev, { role: 'model', text: text || 'Desculpe, não consegui gerar uma resposta.' }]);
    } catch (error) {
      const errorMessage = formatAIError(error);
      setChatMessages(prev => [...prev, { role: 'model', text: errorMessage, isError: true }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleRetry = async () => {
    const lastUserMessage = [...chatMessages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      setChatInput(lastUserMessage.text);
      // Remove the last error message
      setChatMessages(prev => prev.slice(0, -1));
      // Trigger submit
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleChatSubmit(fakeEvent);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchLoading(true);
    setSearchResult('');
    setIsSearchError(false);

    try {
      if (!genAI) throw new Error('Chave de API do Gemini não configurada.');
      
      const response = await (genAI.models as any).generateContent({ 
        model: selectedModel,
        contents: [{ role: 'user', parts: [{ text: searchQuery }] }],
        tools: [{ googleSearchRetrieval: {} }]
      });
      
      const text = response.text;
      setSearchResult(text || 'Nenhum resultado encontrado.');
      
      // Grounding metadata
      const grounding = (response as any).candidates?.[0]?.groundingMetadata;
      if (grounding?.groundingChunks) {
        const links = grounding.groundingChunks
          .filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({
            title: chunk.web.title,
            url: chunk.web.uri
          }));
        
        // Remove duplicates
        const uniqueLinks = Array.from(new Set(links.map(l => l.url)))
          .map(url => links.find(l => l.url === url)!);
          
        setSearchLinks(uniqueLinks);
      } else {
        setSearchLinks([]);
      }
    } catch (error) {
      const errorMessage = formatAIError(error);
      setSearchResult(errorMessage);
      setIsSearchError(true);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleSearchRetry = () => {
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSearchSubmit(fakeEvent);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAnalyzeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeSubmit = async () => {
    if (!analyzeImage) return;

    setIsAnalyzeLoading(true);
    setAnalyzeResult('');
    setIsAnalyzeError(false);

    try {
      if (!genAI) throw new Error('Chave de API do Gemini não configurada.');
      
      const base64Data = analyzeImage.split(',')[1];
      const mimeType = analyzeImage.match(/data:(.*?);/)?.[1] || 'image/jpeg';

      const response = await genAI.models.generateContent({
        model: selectedModel,
        contents: [
          {
            role: 'user',
            parts: [
              { text: analyzePrompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType
                }
              }
            ]
          }
        ]
      });
      
      const text = response.text;
      setAnalyzeResult(text || 'Não foi possível analisar a imagem.');
    } catch (error) {
      const errorMessage = formatAIError(error);
      setAnalyzeResult(errorMessage);
      setIsAnalyzeError(true);
    } finally {
      setIsAnalyzeLoading(false);
    }
  };

  const handleAnalyzeRetry = () => {
    handleAnalyzeSubmit();
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-0 max-w-5xl mx-auto w-full">
      <div className="flex flex-col gap-4 shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg dark:shadow-none shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight leading-tight">IA Assistente</h1>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest hidden sm:block">Google Gemini Intelligence</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {cooldown > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[10px] font-black tabular-nums">{cooldown}s</span>
              </motion.div>
            )}

            <div className="relative">
              <button 
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-500 transition-all shadow-sm active:scale-95"
              >
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start leading-none pr-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary mb-0.5">Modelo</span>
                <span className="text-xs font-bold text-text-primary">{currentModel.name}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-text-secondary transition-transform duration-200 ${isModelMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isModelMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsModelMenuOpen(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden"
                  >
                    <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                      <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Configurações do Modelo</p>
                    </div>
                    <div className="space-y-1">
                      {MODELS.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            setSelectedModel(model.id);
                            setIsModelMenuOpen(false);
                          }}
                          className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 ${
                            selectedModel === model.id 
                              ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20' 
                              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border border-transparent'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            selectedModel === model.id 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-zinc-100 dark:bg-zinc-800 text-text-secondary'
                          }`}>
                            <BrainCircuit className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold ${selectedModel === model.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-text-primary'}`}>
                              {model.fullName}
                            </p>
                            <p className="text-[10px] text-text-secondary line-clamp-2 leading-relaxed mt-0.5">{model.description}</p>
                          </div>
                          {selectedModel === model.id && (
                            <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[9px] text-text-secondary leading-relaxed">
                        Modelos Pro e G3 possuem maior capacidade de raciocínio, enquanto Flash e Lite priorizam velocidade.
                      </p>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
        
      <div className="grid grid-cols-3 bg-zinc-100 dark:bg-zinc-800/50 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 no-scrollbar shrink-0 w-full">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all w-full ${
              activeTab === 'chat' 
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all w-full ${
              activeTab === 'search' 
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Pesquisa</span>
          </button>
          <button
            onClick={() => setActiveTab('analyze')}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all w-full ${
              activeTab === 'analyze' 
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Análise</span>
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-[32px] shadow-sm border border-zinc-200 dark:border-zinc-800 flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {isApiKeyMissing && (
          <div className="absolute inset-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400 mx-auto">
                <X className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-text-primary tracking-tight">API Key não configurada</h3>
              <p className="text-text-secondary max-w-sm text-sm">
                Para utilizar o assistente de IA, você precisa configurar a variável de ambiente <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono text-xs">VITE_GEMINI_API_KEY</code> no seu ambiente de hospedagem (Vercel) ou arquivo .env local.
              </p>
              <div className="pt-4">
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors"
                >
                  Obter API Key gratuita
                </a>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-12">
                  <div className="w-20 h-20 rounded-[32px] bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-8">
                    <Bot className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-text-primary mb-4 tracking-tight">Como posso ajudar hoje?</h3>
                  <p className="text-text-secondary mb-12 text-sm">Sou seu assistente especializado em odontologia. Posso ajudar com diagnósticos, planos de tratamento, legislação e dúvidas gerais.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {[
                      "Como tratar cárie profunda?",
                      "Protocolo de cirurgia siso",
                      "Legislação CRO 2024",
                      "Dicas de marketing clínico"
                    ].map(suggestion => (
                      <button 
                        key={suggestion}
                        onClick={() => {
                          setChatInput(suggestion);
                        }}
                        className="p-4 text-xs font-bold text-left bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500 transition-colors text-text-secondary hover:text-indigo-600 group"
                      >
                        <span className="block mb-2 opacity-50 group-hover:opacity-100 transition-opacity"><MessageSquare className="w-4 h-4" /></span>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto w-full space-y-8">
                  {chatMessages.map((msg, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        msg.role === 'user' 
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-text-secondary' 
                          : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                      </div>
                      <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block max-w-full text-sm leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-text-primary px-5 py-3 rounded-2xl rounded-tr-none font-medium' 
                            : 'text-text-primary prose dark:prose-invert prose-sm max-w-none'
                        }`}>
                          {msg.role === 'user' ? (
                            msg.text
                          ) : (
                            <div className="space-y-4">
                              <div className="markdown-body">
                                <Markdown>{msg.text}</Markdown>
                              </div>
                              {msg.isError && (
                                <button 
                                  onClick={handleRetry}
                                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                                >
                                  <Loader2 className="w-3 h-3" />
                                  Tentar novamente
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isChatLoading && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-4"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-2 h-10">
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-indigo-500 rounded-full" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-indigo-500 rounded-full" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-indigo-500 rounded-full" />
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
            
            <div className="p-4 sm:p-6 bg-surface border-t border-zinc-200 dark:border-zinc-800 shrink-0">
              <div className="max-w-3xl mx-auto relative">
                <form onSubmit={handleChatSubmit} className="relative flex items-end gap-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all shadow-sm">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSubmit(e);
                      }
                    }}
                    placeholder={cooldown > 0 ? `Aguarde ${cooldown}s para nova mensagem...` : "Envie uma mensagem para a IA..."}
                    className="w-full bg-transparent border-none resize-none max-h-32 min-h-[44px] py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-0 placeholder:text-zinc-400"
                    rows={1}
                    disabled={isChatLoading || cooldown > 0}
                  />
                  <button 
                    type="submit" 
                    disabled={isChatLoading || !chatInput.trim() || cooldown > 0}
                    className="w-11 h-11 shrink-0 flex items-center justify-center bg-indigo-600 text-white rounded-2xl disabled:opacity-50 hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
                <p className="text-center text-[10px] text-text-secondary mt-3 font-medium">
                  A IA pode cometer erros. Considere verificar informações importantes.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="h-full flex flex-col p-6 sm:p-10 overflow-y-auto">
            <div className="max-w-3xl mx-auto w-full space-y-8">
              <div className="text-center space-y-4 mb-8">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
                  <Search className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-text-primary tracking-tight">Pesquisa Inteligente</h2>
                <p className="text-sm text-text-secondary">Busque informações atualizadas na web com o poder do Gemini.</p>
              </div>

              <form onSubmit={handleSearchSubmit} className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="O que você deseja pesquisar?"
                  className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-full pl-16 pr-6 py-5 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm text-lg font-medium"
                  disabled={isSearchLoading || cooldown > 0}
                />
              </form>

              <div className="min-h-[300px]">
                {isSearchLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <p className="text-text-secondary font-bold uppercase tracking-widest text-xs">Buscando informações...</p>
                  </div>
                ) : searchResult ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-50 dark:bg-zinc-900/30 rounded-[32px] p-8 border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="markdown-body prose dark:prose-invert max-w-none text-sm">
                      <Markdown>{searchResult}</Markdown>
                    </div>

                    {isSearchError && (
                      <button 
                        onClick={handleSearchRetry}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                      >
                        <Loader2 className="w-3 h-3" />
                        Tentar novamente
                      </button>
                    )}

                    {searchLinks.length > 0 && (
                      <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                        <h4 className="text-xs font-black text-text-secondary uppercase tracking-[0.2em] mb-4">Referências e Fontes</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {searchLinks.map((link, idx) => (
                            <a 
                              key={idx}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 transition-all group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                <Search className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-text-primary truncate group-hover:text-indigo-600 transition-colors">{link.title}</p>
                                <p className="text-[10px] text-text-secondary truncate">{link.url}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-indigo-500 transition-colors" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analyze' && (
          <div className="h-full flex flex-col lg:flex-row p-6 sm:p-8 gap-8 overflow-y-auto">
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
              <div className="group relative aspect-square border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-[32px] flex flex-col items-center justify-center text-center bg-zinc-50 dark:bg-zinc-900/30 hover:border-indigo-500 transition-all overflow-hidden">
                {analyzeImage ? (
                  <>
                    <img src={analyzeImage} alt="Upload" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <p className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
                        <Camera className="w-4 h-4" /> Trocar Imagem
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="p-8 space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400 group-hover:text-indigo-500 transition-colors">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-text-primary uppercase tracking-widest mb-2">Upload de Imagem</p>
                      <p className="text-xs text-text-secondary font-medium">Radiografias, fotos intraorais ou exames</p>
                    </div>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-xs font-black text-text-secondary uppercase tracking-[0.2em] ml-2">Instruções de Análise</label>
                <textarea
                  value={analyzePrompt}
                  onChange={(e) => setAnalyzePrompt(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-[24px] p-5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-32 font-medium shadow-sm"
                  placeholder="O que você deseja analisar nesta imagem?"
                />
              </div>

              <button
                onClick={handleAnalyzeSubmit}
                disabled={!analyzeImage || isAnalyzeLoading || cooldown > 0}
                className="w-full bg-indigo-600 text-white py-4 rounded-[20px] font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all shadow-lg dark:shadow-none active:scale-95"
              >
                {isAnalyzeLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                Analisar Agora
              </button>
            </div>

            <div className="flex-1 bg-zinc-50 dark:bg-zinc-900/30 rounded-[32px] border border-zinc-200 dark:border-zinc-800 p-6 sm:p-10 overflow-y-auto">
              {isAnalyzeLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <Sparkles className="w-5 h-5 text-indigo-400 absolute -top-2 -right-2 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-text-primary mb-2 tracking-tight">Analisando Imagem</h4>
                    <p className="text-sm text-text-secondary">Processando pixels e identificando padrões clínicos...</p>
                  </div>
                </div>
              ) : analyzeResult ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="markdown-body prose dark:prose-invert max-w-none text-sm">
                    <Markdown>{analyzeResult}</Markdown>
                  </div>
                  {isAnalyzeError && (
                    <button 
                      onClick={handleAnalyzeRetry}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                    >
                      <Loader2 className="w-3 h-3" />
                      Tentar novamente
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-50">
                  <div className="w-24 h-24 rounded-[32px] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                  <p className="text-text-secondary font-medium max-w-xs text-sm">O resultado da análise detalhada aparecerá aqui após o processamento da imagem.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAssistant;

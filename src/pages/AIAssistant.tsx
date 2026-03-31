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

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const AIAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'search' | 'analyze'>('chat');
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // Analyze State
  const [analyzeImage, setAnalyzeImage] = useState<string | null>(null);
  const [analyzePrompt, setAnalyzePrompt] = useState('Analise esta imagem odontológica e descreva os achados.');
  const [analyzeResult, setAnalyzeResult] = useState('');
  const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMessage,
        config: {
          systemInstruction: 'Você é um assistente especializado em odontologia. Ajude dentistas com diagnósticos, planos de tratamento, legislação e dúvidas gerais.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });
      
      setChatMessages(prev => [...prev, { role: 'model', text: response.text || 'Desculpe, não consegui gerar uma resposta.' }]);
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro ao processar sua solicitação.';
      setChatMessages(prev => [...prev, { role: 'model', text: `Erro: ${errorMessage}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchLoading(true);
    setSearchResult('');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: searchQuery,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      setSearchResult(response.text || 'Nenhum resultado encontrado.');
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro ao realizar a pesquisa.';
      setSearchResult(`Erro: ${errorMessage}`);
    } finally {
      setIsSearchLoading(false);
    }
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

    try {
      const base64Data = analyzeImage.split(',')[1];
      const mimeType = analyzeImage.match(/data:(.*?);/)?.[1] || 'image/jpeg';

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: analyzePrompt }
          ]
        }
      });
      setAnalyzeResult(response.text || 'Não foi possível analisar a imagem.');
    } catch (error) {
      console.error(error);
      setAnalyzeResult('Ocorreu um erro ao analisar a imagem.');
    } finally {
      setIsAnalyzeLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-0 max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight">IA Assistente</h1>
            <p className="text-xs text-text-secondary font-bold uppercase tracking-widest">Google Gemini</p>
          </div>
        </div>
        
        <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'search', label: 'Pesquisa', icon: Search },
            { id: 'analyze', label: 'Análise', icon: ImageIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-[32px] shadow-sm border border-zinc-200 dark:border-zinc-800 flex-1 flex flex-col min-h-0 overflow-hidden relative">
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
                            <div className="markdown-body">
                              <Markdown>{msg.text}</Markdown>
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
                    placeholder="Envie uma mensagem para a IA..."
                    className="w-full bg-transparent border-none resize-none max-h-32 min-h-[44px] py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-0 placeholder:text-zinc-400"
                    rows={1}
                    disabled={isChatLoading}
                  />
                  <button 
                    type="submit" 
                    disabled={isChatLoading || !chatInput.trim()}
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
                  disabled={isSearchLoading}
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
                    <img src={analyzeImage} alt="Upload" className="absolute inset-0 w-full h-full object-cover" />
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
                disabled={!analyzeImage || isAnalyzeLoading}
                className="w-full bg-indigo-600 text-white py-4 rounded-[20px] font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
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
                  className="markdown-body prose dark:prose-invert max-w-none text-sm"
                >
                  <Markdown>{analyzeResult}</Markdown>
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

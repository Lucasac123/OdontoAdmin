import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { Send, Bot, Search, Image as ImageIcon, Sparkles, Loader2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const AIAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'search' | 'analyze' | 'generate'>('chat');
  
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

  // Generate State
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [generateAspectRatio, setGenerateAspectRatio] = useState('1:1');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerateLoading, setIsGenerateLoading] = useState(false);

  const setLogoPreset = () => {
    setGeneratePrompt('Professional minimalist logo for a dental clinic named "OdontoAdmin", featuring a stylized tooth icon, modern typography, clean lines, medical blue and white color palette, vector style, high quality, professional branding.');
    setGenerateAspectRatio('1:1');
  };

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

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatePrompt.trim()) return;

    setIsGenerateLoading(true);
    setGeneratedImage(null);

    try {
      // Note: gemini-3-pro-image-preview requires user API key selection in a real app,
      // but we use the provided GEMINI_API_KEY here.
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: generatePrompt }] },
        config: {
          imageConfig: {
            aspectRatio: generateAspectRatio,
            imageSize: "1K"
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar imagem. Verifique se o prompt é válido.');
    } finally {
      setIsGenerateLoading(false);
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">IA Assistente</h1>
          <p className="text-sm text-text-secondary">Potencializado pelo Google Gemini</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex-1 flex flex-col overflow-hidden">
        <div className="flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 shrink-0 hide-scrollbar">
          {[
            { id: 'chat', label: 'Chatbot Clínico', icon: Bot },
            { id: 'search', label: 'Pesquisa Web', icon: Search },
            { id: 'analyze', label: 'Análise de Imagem', icon: ImageIcon },
            { id: 'generate', label: 'Gerar Ilustração', icon: Sparkles },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.id 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="aiActiveTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" 
                />
              )}
            </motion.button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50 dark:bg-zinc-950/50">
          {activeTab === 'chat' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-text-secondary space-y-4">
                    <Bot className="w-12 h-12 opacity-50" />
                    <p>Olá! Sou seu assistente odontológico. Como posso ajudar hoje?</p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-surface border border-zinc-200 dark:border-zinc-700 text-text-primary rounded-bl-none'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-surface border border-zinc-200 dark:border-zinc-700 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                      <span className="text-text-secondary text-sm">Pensando...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleChatSubmit} className="shrink-0 relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Digite sua dúvida clínica..."
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl pl-4 pr-12 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  disabled={isChatLoading}
                />
                <button 
                  type="submit" 
                  disabled={isChatLoading || !chatInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg disabled:opacity-50 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="h-full flex flex-col space-y-6">
              <form onSubmit={handleSearchSubmit} className="shrink-0 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquise na web (ex: Legislação CRO atualizada, novos materiais...)"
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl pl-12 pr-4 py-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-lg"
                  disabled={isSearchLoading}
                />
              </form>
              
              <div className="flex-1 bg-surface rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 overflow-y-auto">
                {isSearchLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-text-secondary space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <p>Pesquisando na web...</p>
                  </div>
                ) : searchResult ? (
                  <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-text-primary">
                    {searchResult}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-text-secondary space-y-4">
                    <Search className="w-12 h-12 opacity-50" />
                    <p>Resultados da pesquisa aparecerão aqui.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analyze' && (
            <div className="h-full flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3 flex flex-col gap-4">
                <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-4 flex flex-col items-center justify-center text-center bg-surface relative overflow-hidden min-h-[200px]">
                  {analyzeImage ? (
                    <img src={analyzeImage} alt="Upload" className="absolute inset-0 w-full h-full object-contain" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-zinc-400 mb-2" />
                      <p className="text-sm text-text-secondary">Faça upload de uma radiografia ou foto intraoral</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <textarea
                  value={analyzePrompt}
                  onChange={(e) => setAnalyzePrompt(e.target.value)}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-32"
                  placeholder="O que você deseja analisar nesta imagem?"
                />
                <button
                  onClick={handleAnalyzeSubmit}
                  disabled={!analyzeImage || isAnalyzeLoading}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {isAnalyzeLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  Analisar Imagem
                </button>
              </div>
              <div className="w-full md:w-2/3 bg-surface rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 overflow-y-auto">
                {isAnalyzeLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-text-secondary space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <p>Analisando imagem...</p>
                  </div>
                ) : analyzeResult ? (
                  <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-text-primary">
                    {analyzeResult}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-text-secondary space-y-4">
                    <ImageIcon className="w-12 h-12 opacity-50" />
                    <p>O resultado da análise aparecerá aqui.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="h-full flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-text-secondary">Prompt da Imagem</label>
                  <button 
                    onClick={setLogoPreset}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Preset Logo
                  </button>
                </div>
                <form onSubmit={handleGenerateSubmit} className="space-y-4">
                  <div>
                    <textarea
                      value={generatePrompt}
                      onChange={(e) => setGeneratePrompt(e.target.value)}
                      className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-32"
                      placeholder="Ex: Ilustração 3D de um implante dentário..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Proporção (Aspect Ratio)</label>
                    <select
                      value={generateAspectRatio}
                      onChange={(e) => setGenerateAspectRatio(e.target.value)}
                      className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="1:1">1:1 (Quadrado)</option>
                      <option value="3:4">3:4 (Retrato)</option>
                      <option value="4:3">4:3 (Paisagem)</option>
                      <option value="9:16">9:16 (Stories)</option>
                      <option value="16:9">16:9 (Widescreen)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={!generatePrompt.trim() || isGenerateLoading}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {isGenerateLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    Gerar Imagem
                  </button>
                </form>
              </div>
              <div className="w-full md:w-2/3 bg-surface rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 flex items-center justify-center overflow-hidden">
                {isGenerateLoading ? (
                  <div className="flex flex-col items-center justify-center text-text-secondary space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <p>Gerando ilustração...</p>
                  </div>
                ) : generatedImage ? (
                  <img src={generatedImage} alt="Generated" className="max-w-full max-h-full object-contain rounded-lg shadow-md" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-text-secondary space-y-4">
                    <ImageIcon className="w-12 h-12 opacity-50" />
                    <p>A imagem gerada aparecerá aqui.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

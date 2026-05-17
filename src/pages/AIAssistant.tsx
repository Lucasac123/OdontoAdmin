import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';
import daikon from 'daikon';
import { FileText, Save, FileBox, Cuboid, Stethoscope, Layers } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { useStorage } from '../context/StorageContext';
import { getDataService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { webLlmService } from '../services/webLlm';
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
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { AIHistoryModal } from '../components/AIHistoryModal';

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const PRESETS = [
  {
    id: 'geral',
    name: 'Clínica Geral',
    prompt: `Você é um assistente odontológico de clínica geral altamente capacitado. Avalie a imagem ou questionamento de forma holística e multidisciplinar.
Inclua, quando pertinente, considerações de:
- **Dentística/Estética**: qualidade dos materiais restauradores, estética do sorriso, harmonia dos dentes
- **Periodontia**: nível ósseo, inflamação gengival, presença de cálculo, recessões
- **Endodontia**: sinais de lesões periapicais, cáries profundas, alterações pulpares
- **Prótese**: necessidade restauradora, guias oclusais, espaço protético
- **Cirurgia**: dentes com necessidade de extração, pericoronarites
- **Implantodontia**: áreas protéticas edêntulas e viabilidade de implante
- **Harmonização Orofacial (HOF)**: sempre que houver contexto facial ou de tecidos moles, aponte discretamente proporções, simetrias faciais e possíveis condutas de HOF (preenchedores, toxina botulínica, bioremodelamento)
Seja sistemático e didático nas suas considerações.`
  },
  {
    id: 'panoramica',
    name: 'Radiologia: Panorâmica',
    prompt: `Você é radiologista odontológico experiente analisando uma radiografia panorâmica. Faça uma leitura metodológica por regiões:
1. **Côndilo e ATM**: morfologia condilar, espaço articular, sinais degenerativos
2. **Ramo e corpo mandibular**: trabeculado ósseo, corticais, lesões radiolúcidas ou radiopacas
3. **Dentes e periodonto**: presença/ausência dos elementos FDI, lesões de cárie, tártaro, nível ósseo alveolar, lesões periapicais
4. **Maxila e processos alveolares**: densidade óssea, lesões, reabsorções
5. **Seios maxilares**: opacificações, retenção de líquido, comunicações buco-sinusais
6. **Dentes inclusos e semi-inclusos**: posicionamento, relação com estruturas adjacentes
7. **Possíveis lesões odontogênicas e não-odontogênicas**: cistos, tumores, granulomas
8. **Considerações adicionais de especialidades**:
   - Endodontia: tratamentos realizados, prognóstico
   - Implantodontia: volume ósseo disponível para futuras reabilitações
   - Prótese: suporte ósseo para reabilitações
   - HOF: se existirem padrões de crescimento facial discrepantes (padrão vertical, Classe II/III esquelética), mencione implicações estéticas faciais
Seja descritivo, objetivo e use linguagem técnica apropriada.`
  },
  {
    id: 'periapical',
    name: 'Radiologia: Periapical',
    prompt: `Você é radiologista especializado em análise periapical. Avalie com máximo detalhe:
- **Coroa**: presença de cárie, restaurações, adaptação marginal, sobremordidas
- **Raízes**: morfologia, número, curvatura, reabsorções internas/externas
- **Ápices radiculares**: presença de lesão periapical (granuloma, cisto, abscesso), densidade da lâmina dura
- **Espaço do ligamento periodontal**: espessura, homogeneidade
- **Cristas alveolares**: nível ósseo, forma das cristas, sequelas de doença periodontal
- **Câmara pulpar e canais**: calcificações, polpa visivelmente comprometida
**Considerações multidisciplinares obrigatórias**:
- Indique se há necessidade de tratamento endodôntico, retratamento ou cirurgia paraendodôntica
- Avalie se o dente tem suporte periodontal suficiente (Periodontia)
- Opine sobre o prognóstico restaurador (Dentística/Prótese)
- Se for área edêntula adjacente, comente sobre volume ósseo para implante (Implantodontia)`
  },
  {
    id: 'intraoral',
    name: 'Foto Intraoral',
    prompt: `Você é um especialista em diagnóstico visual e documentação clínica odontológica analisando uma fotografia intraoral de alta resolução.
Realize uma avaliação completa e multidisciplinar:

**1. Tecidos Duros (Dentes)**
- Presença de cáries (ativas, inativas, por debaixo de restaurações)
- Fratura dentária (esmalte, dentina, radicular)
- Qualidade e adaptação das restaurações existentes
- Erupções, dentes malposicionados, apinhamentos, diastemas
- Desgastes por erosão (química), abrasão (mecânica) ou atrição (bruxismo)

**2. Tecidos Moles e Periodontia**
- Coloração gengival, textura, contorno e volume
- Sinais de gengivite (sangramento, edema), periodontite (recessão, bolsas)
- Cálculo supra ou subgengival visível
- Lesões em mucosa (aftas, leucoplasias, eritroplasias, fibromas, papilomas)
- Frenilho e sua influência sobre a gengiva

**3. Oclusão (visível)**
- Overjet e overbite aparentes; mordida aberta, cruzada
- Curva de Spee
- Relação de caninos e molares (Classe de Angle)

**4. Considerações de Especialidades**
- **Endodontia**: dentes com alteração de cor (necrose pulpar), lesões fisturizadas
- **Prótese/Implantodontia**: espaços protéticos edêntulos, condição de pilares
- **Ortodontia**: mal oclusões, necessidade de alinhamento, impacção
- **Harmonização Orofacial (HOF)**: mencione, sempre que relevante, o impacto da estética dental no sorriso composto, linha do sorriso, display gengival e como a harmonização dental pode complementar procedimentos estéticos faciais (gengivoplastia, fechamento de diastemas, facetas)`
  },
  {
    id: 'extraoral',
    name: 'Foto Extraoral',
    prompt: `Você é especialista em análise facial, fotografia clínica e harmonização orofacial (HOF) integrando perspectivas odontológicas. Realize uma avaliação extraoral detalhada:

**1. Análise de Proporções e Simetria Facial**
- Proporções áureas: terço superior, médio e inferior da face
- Simetria: desvios de mento, nariz, arcos superciliares, assimetrias mandibulares
- Linha bipupilar e biplano de Frankfurt
- Plano de Camper e oclusão

**2. Tecidos Moles Faciais**
- Volume e projeção dos terços faciais
- Qualidade da pele, ptose de coxins gordurosos (região malar, pré-jowl, jowl)
- Sulcos e marcações: nasogeniano, marionete, glabela, periorbitais
- Lábios: volume, proporção, eversão, philtrum, arco de cupido, comissuras
- Mento: projeção, dimple, mentolabial

**3. Indicações de HOF (quando identificar oportunidades clínicas)**
Sugira, quando existir fundamento clínico:
- **Toxina botulínica**: frontalis, corrugador, prócero, orbicular, masseter (bruxismo/hipertrofia), LLSAN (sorriso gengival), mentoniano (mento em casca de laranja), pescoço (bandas platismais)
- **Preenchedores (ácido hialurônico)**: malar/zigomático, sulco nasogeniano, lábios (volume, contorno, eversão), marionete, pré-jowl, mento, papada
- **Bioestimuladores**: perda de volume global, qualidade de pele
- **Sempre indique o plano de injeção** (superficial, subdérmico, supraperióstico, camadas profundas) para cada região sugerida e alertas de segurança anatômica

**4. Interface Odontologia–HOF**
- Impacto do suporte dentário no volume labial e contorno facial (reabsorção óssea, edentulismo)
- Linha do sorriso, display gengival e sua relação com lábios e terço facial inferior
- Classe esquelética e seus reflexos estéticos faciais
- Bruxismo: hipertrofia de masseter e tratamento com toxina botulínica
- Possíveis indicações de rinoplastia de harmonização ou bichectomia`
  },
  {
    id: 'odontograma',
    name: 'Mapeamento (Odontograma)',
    prompt: `Atue como clínico experiente realizando mapeamento sistematizado. Use a **Notação FDI (ISO 3950)** para todos os dentes.
Liste em formato estruturado por quadrante (1/2/3/4):

**Por elemento dental, informe:**
- Condição: hígido, cariado (grau), restaurado (material), ausente, fraturado, com coroa/prótese, com tratamento endodôntico, implante
- Observações periapicais / periodontais relevantes
- Sinais de desgaste, mobilidade, hipersensibilidade visível

**Ao final, gere:**
- Lista de prioridades de tratamento (urgência imediata → eletivo)
- Necessidades multidisciplinares:
  - Endodontia (pulpotomia, TENC, retratamento)
  - Periodontia (raspagem, cirurgia, manutenção)
  - Cirurgia (extração, curetagem, curatagem)
  - Prótese/Implantodontia (prótese fixa, removível, overdenture, implante)
  - Ortodontia (alinhamento, fechamento de espaços)
  - HOF (suporte dentário para estética facial, linha do sorriso)`
  },
  {
    id: 'tomografia',
    name: 'Tomografia (DICOM)',
    prompt: `Você é radiologista especializado em Tomografia Computadorizada de Feixe Cônico (CBCT). Faça análise de fatia tomográfica com máximo rigor técnico:

**Avalie por estrutura:**
- **Corticais ósseas**: integridade, expansão, rompimento, perfurações
- **Trabeculado**: padrão trabecular, radiolucências, esclerose
- **Dentes e raízes**: morfologia 3D, tratamentos endodônticos, calcificações pulpares
- **Seios maxilares**: espessamento de mucosa, opacificação, sinusite, pólipo, comunicação buco-sinusal
- **Mandíbula e canal alveolar inferior**: relação das raízes com o nervo alveolar inferior
- **ATM**: morfologia condilar, lesões degenerativas, perda de espaço articular
- **Maxilar: cortical palatina e zigomática**

**Lesões especiais – classificar como:**
- Odontogênicas: cisto dentígero, radicular, ceratocístico, ameloblastoma, odontoma
- Não-odontogênicas: cisto nasopalatino, ossificante fibroma, displasia cemento-óssea, metástase

**Considerações multidisciplinares:**
- Implantodontia: largura/altura óssea, posição nervo/seio, densidade (HU)
- Cirurgia bucomaxilofacial: necessidade de acesso cirúrgico complexo
- HOF: deformidades esqueléticas com reflexo estético facial (Classe II/III, assimetrias)`
  },
  {
    id: 'doc',
    name: 'Análise de Documento/Livro',
    prompt: `Atue como pesquisador-consultor científico em odontologia. Você receberá um documento PDF (livro, artigo, protocolo, laudo) e deverá:
1. **Identificar o tema central** do documento
2. **Extrair as principais condutas clínicas**, protocolos e recomendações
3. **Responder o questionamento do dentista** baseando-se exclusivamente no conteúdo fornecido, com citação da seção/página quando possível
4. **Relacionar o conteúdo** com outras especialidades odontológicas e HOF quando pertinente
5. **Fornecer referências bibliográficas internas** presentes no documento

Seja objetivo, técnico e sirva como base bibliográfica sólida para a tomada de decisão clínica.`
  }
];

// Helper to render STL Object
const STLModel = ({ geometry }: { geometry: THREE.BufferGeometry }) => {
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.2} />
    </mesh>
  );
};

export const AIAssistant: React.FC = () => {
  const { user } = useAuth();
  const { storageLocation } = useStorage();
  const [activeTab, setActiveTab] = useState<'chat' | 'search' | 'analyze'>('chat');
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('odontoadmin_ai_model') || 'gemini-3-flash-preview';
  });
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isHybridMode, setIsHybridMode] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) return false;
    return localStorage.getItem('odontoadmin_ai_hybrid') === 'true';
  });
  const [localModelStatus, setLocalModelStatus] = useState<'idle' | 'downloading' | 'ready' | 'not_installed'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadText, setDownloadText] = useState('');
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveLink, setDriveLink] = useState('https://drive.google.com/drive/folders/1lH29GkJ8SEX8MSE93KqektbeOAdyGRJK');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [actionPermission, setActionPermission] = useState<'ask' | 'direct'>(() => {
    return (localStorage.getItem('odontoadmin_ai_permission') as 'ask' | 'direct') || 'ask';
  });

  useEffect(() => {
    localStorage.setItem('odontoadmin_ai_model', selectedModel);
    localStorage.setItem('odontoadmin_ai_hybrid', isHybridMode.toString());
    localStorage.setItem('odontoadmin_ai_permission', actionPermission);
  }, [selectedModel, isHybridMode, actionPermission]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640 && isHybridMode) {
        setIsHybridMode(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isHybridMode]);

  const MODELS = [
    { id: 'gemini-3-flash-preview', name: 'G3 Flash', fullName: 'Gemini 3 Flash', description: 'O mais novo e rápido: excelente para quase todas as tarefas' },
    { id: 'gemini-3.1-pro-preview', name: 'G3.1 Pro', fullName: 'Gemini 3.1 Pro', description: 'Inteligência superior: o modelo mais avançado para análises críticas' },
    { id: 'gemini-2.0-flash', name: '2.0 Flash', fullName: 'Gemini 2.0 Flash', description: 'Estável e eficiente para uso diário' },
  ];
  
  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string, isError?: boolean}[]>([]);
  const [isChatLoaded, setIsChatLoaded] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load chat history
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;
      try {
        const service = getDataService(storageLocation);
        const history = await service.getData('chats', user.uid);
        if (history && history.messages) {
          setChatMessages(history.messages);
        }
      } catch (err) {
        console.error("Erro ao carregar chat", err);
      } finally {
        setIsChatLoaded(true);
      }
    };
    loadHistory();
  }, [user, storageLocation]);

  // Save chat history
  useEffect(() => {
    const saveHistory = async () => {
      if (!user || !isChatLoaded) return;
      const service = getDataService(storageLocation);
      await service.saveData('chats', user.uid, { messages: chatMessages });
    };
    saveHistory();
  }, [chatMessages, user, storageLocation, isChatLoaded]);

  const confirmClearChat = async () => {
    setShowClearConfirm(false);
    setChatMessages([]);
    if (user) {
      try {
        const service = getDataService(storageLocation);
        await service.saveData('chats', user.uid, { messages: [] });
      } catch (error) {
        console.error('Error clearing chat history:', error);
      }
    }
  };

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState('');
  const [isSearchError, setIsSearchError] = useState(false);
  const [searchLinks, setSearchLinks] = useState<{title: string, url: string}[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // Analyze State
  const [analyzeImage, setAnalyzeImage] = useState<string | null>(null);
  const [analyzePrompt, setAnalyzePrompt] = useState('Analise esta imagem odontológica e descreva os achados.');
  
  const [fileType, setFileType] = useState<'image' | 'dcm' | 'stl' | 'pdf' | 'audio' | null>(null);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [stlGeometry, setStlGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [selectedPreset, setSelectedPreset] = useState('geral');
  const dcmCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const threeCanvasRef = React.useRef<HTMLCanvasElement>(null);
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

  const [suggestions, setSuggestions] = useState([
    "Como tratar cárie profunda?",
    "Protocolo de cirurgia siso",
    "Legislação CRO 2024",
    "Dicas de marketing clínico"
  ]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const formatAIError = (error: any) => {
    console.error('AI Error:', error);
    
    let message = error instanceof Error ? error.message : String(error);
    
    try {
      // Try to parse if it's a JSON string from the API
      const errorObj = JSON.parse(message);
      const code = errorObj.code || errorObj.error?.code;
      
      if (code === 429) {
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
      return "Limite de uso atingido. O plano gratuito do Gemini possui limites de requisições por minuto. Tente aguardar um momento ou trocar para um modelo mais leve (como o 1.5 Flash) no topo da tela.";
    }
    if (message.includes('503') || message.includes('unavailable')) {
      return "O serviço está temporariamente sobrecarregado. Tente novamente em instantes.";
    }

    // MANDATORY DIAGNOSTIC: Expose technical error until 100% resolved
    return `Erro Técnico: ${message}. Verifique sua conexão ou se sua API Key foi configurada corretamente no servidor/ambiente.`;
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      // Simple routing logic for Hybrid Mode
      const requiresWebSearch = /pesquise|busque|notícias|atual|hoje|agora|internet|google/i.test(userMessage);
      
      if (isHybridMode && !requiresWebSearch && localModelStatus === 'ready') {
        if (!webLlmService.isReady()) {
          throw new Error('Modelo local não está pronto.');
        }
        
        const systemInstruction = `Você é o Gemma-2-2B-it, um modelo de IA rodando localmente no dispositivo do usuário. Você é um assistente especializado em odontologia. Responda à pergunta do usuário de forma direta e útil.`;
        
        const text = await webLlmService.generateResponse(userMessage, systemInstruction);

        setChatMessages(prev => [...prev, { 
          role: 'model', 
          text: `*(Respondido localmente via Gemma-2-2B-it)*\n\n${text}` 
        }]);
        setIsChatLoading(false);
        return;
      }

      // Fallback to Cloud Gemini (or if web search is required)
      if (!genAI) throw new Error('Chave de API do Gemini não configurada.');
      
      let systemInstruction = `INSTRUÇÃO DE SISTEMA: Você é um assistente especializado em odontologia. Ajude dentistas com diagnósticos, planos de tratamento, legislação e dúvidas gerais. Você também é capaz de ler fotos de fichas de papel e radiografias para criar ou atualizar fichas digitais de pacientes.`;
      
      if (actionPermission === 'ask') {
        systemInstruction += `\n\n[PERMISSÃO DE AÇÃO]: Você deve SEMPRE perguntar e pedir confirmação ao usuário antes de criar ou alterar dados de pacientes no sistema. Mostre os dados que extraiu e pergunte se pode prosseguir.`;
      } else {
        systemInstruction += `\n\n[PERMISSÃO DE AÇÃO]: Você tem permissão para AGIR DIRETO. Crie ou atualize as fichas de pacientes automaticamente com os dados extraídos das imagens, sem precisar pedir confirmação prévia. Apenas informe ao usuário o que foi feito.`;
      }

      if (isDriveConnected) {
        systemInstruction += `\n\nO usuário conectou uma base de conhecimento do Google Drive (${driveLink}). Caso necessário, você pode consultar ou referenciar os livros de odontologia presentes nesta pasta para embasar suas respostas.`;
      }
      
      const response = await genAI.models.generateContent({
        model: selectedModel,
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nUSUÁRIO: ${userMessage}` }]
          }
        ],
        config: {
          tools: [{ googleSearch: {} } as any]
        }
      });
      
      const text = response.text;
      
      let finalResponse = text || 'Desculpe, não consegui gerar uma resposta.';
      if (isHybridMode && requiresWebSearch) {
        finalResponse = `*(Pesquisa na web necessária - Respondido via Gemini Cloud)*\n\n${finalResponse}`;
      }

      setChatMessages(prev => [...prev, { role: 'model', text: finalResponse }]);
    } catch (error) {
      const errorMessage = formatAIError(error);
      setChatMessages(prev => [...prev, { role: 'model', text: errorMessage, isError: true }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const downloadAndInitGemma = async () => {
    setLocalModelStatus('downloading');
    setDownloadProgress(0);
    setDownloadText('Iniciando...');
    
    try {
      const hwCheck = await webLlmService.checkHardwareCompatibility();
      if (!hwCheck.compatible) {
        alert(`Hardware incompatível: ${hwCheck.reason}`);
        setLocalModelStatus('not_installed');
        return;
      }

      webLlmService.setInitProgressCallback((report) => {
        // report.progress is between 0 and 1
        setDownloadProgress(Math.round(report.progress * 100));
        setDownloadText(report.text || 'Baixando modelo...');
      });

      await webLlmService.initializeEngine();
      setLocalModelStatus('ready');
    } catch (error) {
      console.error("Erro ao inicializar Gemma local:", error);
      alert("Erro ao baixar ou inicializar o modelo local.");
      setLocalModelStatus('not_installed');
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
      
      const response = await genAI.models.generateContent({ 
        model: selectedModel,
        contents: searchQuery,
        config: {
          tools: [{ googleSearch: {} } as any]
        }
      });
      
      // Use the .text property directly
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

      if (user) {
        try {
          const service = getDataService(storageLocation);
          const history = await service.getData('ai_searches', user.uid) || { searches: [] };
          const newSearch = { query: searchQuery, result: text, date: new Date().toISOString() };
          const newSearches = [newSearch, ...history.searches].slice(0, 50);
          await service.saveData('ai_searches', user.uid, { searches: newSearches });
        } catch (err) {
          console.error("Erro ao salvar histórico de pesquisa", err);
        }
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
    if (!file) return;

    setAnalyzeResult('');
    setAnalyzeImage(null);
    setPdfData(null);
    setStlGeometry(null);

    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.stl')) {
      setFileType('stl');
      const reader = new FileReader();
      reader.onload = function (event) {
        const result = event.target?.result as ArrayBuffer;
        const loader = new STLLoader();
        const geometry = loader.parse(result);
        geometry.computeVertexNormals();
        geometry.center();
        setStlGeometry(geometry);
      };
      reader.readAsArrayBuffer(file);
    } 
    else if (fileName.endsWith('.dcm')) {
      setFileType('dcm');
      const reader = new FileReader();
      reader.onload = function(event) {
        try {
          const result = event.target?.result as ArrayBuffer;
          const data = new DataView(result);
          // @ts-ignore
          const image = daikon.Series.parseImage(data);
          if (image) {
             const cols = image.getCols();
             const rows = image.getRows();
             
             const canvas = document.createElement('canvas');
             canvas.width = cols;
             canvas.height = rows;
             const ctx = canvas.getContext('2d');
             
             const imageData = ctx!.createImageData(cols, rows);
             const pixels = image.getInterpretedData();
             
             let min = Infinity;
             let max = -Infinity;
             for(let i=0; i<pixels.length; i++) {
                 if (pixels[i] < min) min = pixels[i];
                 if (pixels[i] > max) max = pixels[i];
             }
             for (let i = 0; i < pixels.length; i++) {
               const val = ((pixels[i] - window.Math.min(min, 0)) / (max - window.Math.min(min, 0))) * 255;
               const index = i * 4;
               imageData.data[index] = val;
               imageData.data[index + 1] = val;
               imageData.data[index + 2] = val;
               imageData.data[index + 3] = 255;
             }
             ctx!.putImageData(imageData, 0, 0);
             setAnalyzeImage(canvas.toDataURL('image/jpeg'));
          }
        } catch (err) {
            console.error("Daikon falhou, fallback", err);
            setAnalyzeResult("Erro ao ler o arquivo DICOM.");
            setIsAnalyzeError(true);
        }
      };
      reader.readAsArrayBuffer(file);
    } 
    else if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
      setFileType('pdf');
      setPdfName(file.name);
      setSelectedPreset('doc');
      const reader = new FileReader();
      reader.onload = () => {
         const result = reader.result as string;
         setPdfData(result.split(',')[1]); 
      };
      reader.readAsDataURL(file);
    } 
    else if (file.type.startsWith('audio/')) {
      setFileType('audio');
      const reader = new FileReader();
      reader.onloadend = () => {
        setAnalyzeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    else {
      setFileType('image');
      const reader = new FileReader();
      reader.onloadend = () => {
        setAnalyzeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeSubmit = async () => {
    if (!analyzeImage && !pdfData && !stlGeometry) return;

    setIsAnalyzeLoading(true);
    setAnalyzeResult('');
    setIsAnalyzeError(false);

    try {
      
      let finalBase64 = analyzeImage ? analyzeImage.split(',')[1] : null;
      let finalMime = analyzeImage ? (analyzeImage.match(/data:(.*?);/)?.[1] || 'image/jpeg') : null;

      if (fileType === 'stl' && threeCanvasRef.current) {
         try {
           const dataUrl = threeCanvasRef.current.toDataURL('image/jpeg');
           finalBase64 = dataUrl.split(',')[1];
           finalMime = 'image/jpeg';
         } catch(e) { }
      }

      if (!finalBase64 && !pdfData) throw new Error("Nenhum arquivo processado.");

      const presetPrompt = PRESETS.find(p => p.id === selectedPreset)?.prompt || PRESETS[0].prompt;
      let fullText = `INSTRUÇÃO DE COMPORTAMENTO: ${presetPrompt}\n\nVocê também é capaz de ler fotos de fichas de papel e radiografias para criar ou atualizar fichas digitais de pacientes.`;
      
      if (actionPermission === 'ask') {
        fullText += `\n\n[PERMISSÃO DE AÇÃO]: Você deve SEMPRE perguntar e pedir confirmação ao usuário antes de criar ou alterar dados de pacientes no sistema. Mostre os dados que extraiu e pergunte se pode prosseguir.`;
      } else {
        fullText += `\n\n[PERMISSÃO DE AÇÃO]: Você tem permissão para AGIR DIRETO. Crie ou atualize as fichas de pacientes automaticamente com os dados extraídos das imagens, sem precisar pedir confirmação prévia. Apenas informe ao usuário o que foi feito.`;
      }

      fullText += `\n\nUSUÁRIO: ${analyzePrompt}`;
      
      if (isDriveConnected) {
        fullText += `\n\n[SISTEMA]: O usuário conectou uma base de conhecimento do Google Drive (${driveLink}). Caso necessário para a análise, você pode consultar ou referenciar os livros de odontologia presentes nesta pasta para embasar seu diagnóstico ou recomendações.`;
      }
      
      const parts: any[] = [{ text: fullText }];
      
      if (fileType === 'pdf' && pdfData) {
         parts.push({
           inlineData: {
             data: pdfData,
             mimeType: 'application/pdf'
           }
         });
      } else if (fileType === 'audio' && finalBase64) {
         parts.push({
           inlineData: {
             data: finalBase64,
             mimeType: finalMime || 'audio/mp3'
           }
         });
      } else if (finalBase64) {
         parts.push({
           inlineData: {
             data: finalBase64,
             mimeType: finalMime
           }
         });
      }

      const response = await genAI.models.generateContent({
        model: selectedModel,
        contents: [
          {
            role: 'user',
            parts
          }
        ]
      });
      
      // Use the .text property directly
      const text = response.text;
      setAnalyzeResult(text || 'Não foi possível analisar a imagem.');

      if (user) {
        try {
          const service = getDataService(storageLocation);
          const history = await service.getData('ai_analyses', user.uid) || { analyses: [] };
          
          // Limit base64 to avoid huge storage. If it's a PDF, we don't save the data.
          let thumbnail = null;
          if (analyzeImage && analyzeImage.length < 500000) { // Only save if < 500kb approx
            thumbnail = analyzeImage;
          }
          
          const newAnalysis = { 
            prompt: analyzePrompt, 
            result: text, 
            type: fileType, 
            thumbnail,
            preset: PRESETS.find(p => p.id === selectedPreset)?.name || 'Geral',
            date: new Date().toISOString() 
          };
          const newAnalyses = [newAnalysis, ...history.analyses].slice(0, 20); // Keep last 20
          await service.saveData('ai_analyses', user.uid, { analyses: newAnalyses });
        } catch (err) {
          console.error("Erro ao salvar histórico de análise", err);
        }
      }

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
    <div className="flex flex-col gap-4 h-full min-h-0 w-full">
      <div className="flex flex-col gap-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md dark:shadow-none shrink-0"
              style={{ 
                background: `linear-gradient(to bottom right, var(--accent), var(--accent-dark))`,
                boxShadow: `0 4px 14px 0 rgba(var(--accent-rgb), 0.39)`
              }}
            >
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight truncate">IA Assistente</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">Google Gemini Intelligence</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end w-full sm:w-auto">
            {activeTab === 'chat' && chatMessages.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-all shadow-sm active:scale-95"
                title="Apagar Histórico e Iniciar Novo Chat"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">Limpar</span>
              </button>
            )}

            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm active:scale-95"
              title="Ver Histórico Completo da IA"
            >
              <History className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">Histórico</span>
            </button>

            <div className="relative flex-1 sm:flex-none w-full sm:w-auto min-w-[200px]">
              <button 
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                className="w-full flex items-center justify-between gap-3 h-10 px-3 pl-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all shadow-sm active:scale-95"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <BrainCircuit className="w-3 h-3" />
                  </div>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">Modelo Atual</span>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{isHybridMode ? 'Híbrido (Gemma + Gemini)' : currentModel.name}</span>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isModelMenuOpen ? 'rotate-180' : ''}`} />
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
                    className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-[500px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 p-4 overflow-hidden"
                  >
                    <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-3 flex justify-between items-center">
                      <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Configurações de IA</p>
                    </div>

                    {/* Hybrid Mode Toggle */}
                    <div className="hidden sm:block mb-4 p-4 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/10 dark:to-zinc-900 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <Cuboid className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-text-primary">Modo Híbrido (Local + Nuvem)</h4>
                            <p className="text-[10px] text-text-secondary font-medium">Gemma-2-2B-it (Local) + Gemini (Web Search)</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsHybridMode(!isHybridMode)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isHybridMode ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isHybridMode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      
                      {isHybridMode && (
                        <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-500/20 space-y-3">
                          {localModelStatus === 'idle' && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-text-secondary">Gemma-2-2B-it não instalado</span>
                              <button onClick={downloadAndInitGemma} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                Baixar Modelo (~1.8 GB)
                              </button>
                            </div>
                          )}
                          {localModelStatus === 'downloading' && (
                            <div className="space-y-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-indigo-600 dark:text-indigo-400 font-black tracking-tight flex items-center gap-2">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Baixando Gemma 2...
                                </span>
                                <span className="text-indigo-600 font-black">{downloadProgress}%</span>
                              </div>
                              <div className="w-full bg-indigo-50 dark:bg-indigo-900/30 rounded-full h-2 overflow-hidden shadow-inner">
                                <motion.div 
                                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full" 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${downloadProgress}%` }}
                                  transition={{ type: "tween", ease: "linear", duration: 0.5 }}
                                />
                              </div>
                              <p className="text-[9px] text-text-secondary truncate font-mono bg-zinc-50 dark:bg-zinc-800/50 p-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                {downloadText}
                              </p>
                            </div>
                          )}
                          {localModelStatus === 'ready' && (
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                              <Sparkles className="w-4 h-4" />
                              Gemma-2-2B-it Pronto para uso offline!
                            </div>
                          )}
                          
                          <div className="flex flex-col pt-2 border-t border-indigo-100 dark:border-indigo-500/20">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-text-secondary" />
                                <span className="text-xs text-text-secondary">Base de Conhecimento (Drive)</span>
                              </div>
                              <button 
                                onClick={() => setIsDriveConnected(!isDriveConnected)}
                                className={`text-xs font-bold ${isDriveConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400 hover:underline'}`}
                              >
                                {isDriveConnected ? 'Conectado' : 'Conectar Pasta'}
                              </button>
                            </div>
                            {isDriveConnected && (
                              <div className="mt-2">
                                <input
                                  type="text"
                                  value={driveLink}
                                  onChange={(e) => setDriveLink(e.target.value)}
                                  placeholder="Cole o link da pasta do Google Drive aqui"
                                  className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-indigo-100 dark:border-indigo-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="w-4 h-4 text-text-secondary" />
                              <span className="text-xs text-text-secondary font-bold">Automação de Fichas</span>
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="actionPermission" 
                                  value="ask"
                                  checked={actionPermission === 'ask'}
                                  onChange={() => setActionPermission('ask')}
                                  className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-xs text-text-secondary">Perguntar antes de agir</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="actionPermission" 
                                  value="direct"
                                  checked={actionPermission === 'direct'}
                                  onChange={() => setActionPermission('direct')}
                                  className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-xs text-text-secondary">Agir automaticamente</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 opacity-100 transition-opacity">
                      <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-3 mb-2">Modelos de Nuvem (Fallback)</p>
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

          {showHistoryModal && (
            <AIHistoryModal 
              isOpen={showHistoryModal} 
              onClose={() => setShowHistoryModal(false)} 
            />
          )}
        </div>
      </div>
        
      <div className="flex bg-zinc-100/80 dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 shrink-0 w-full backdrop-blur-sm relative">
          <button
            onClick={() => setActiveTab('chat')}
            className={`relative flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all z-10 ${
              activeTab === 'chat' 
                ? 'text-indigo-700 dark:text-indigo-400' 
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {activeTab === 'chat' && (
              <motion.div layoutId="assistant-tab" className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200/50 dark:border-zinc-700/50" />
            )}
            <MessageSquare className="w-4 h-4 shrink-0 relative z-20" />
            <span className="hidden sm:inline relative z-20">Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`relative flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all z-10 ${
              activeTab === 'search' 
                ? 'text-indigo-700 dark:text-indigo-400' 
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {activeTab === 'search' && (
              <motion.div layoutId="assistant-tab" className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200/50 dark:border-zinc-700/50" />
            )}
            <Search className="w-4 h-4 shrink-0 relative z-20" />
            <span className="hidden sm:inline relative z-20">Pesquisa</span>
          </button>
          <button
            onClick={() => setActiveTab('analyze')}
            className={`relative flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all z-10 ${
              activeTab === 'analyze' 
                ? 'text-indigo-700 dark:text-indigo-400' 
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {activeTab === 'analyze' && (
              <motion.div layoutId="assistant-tab" className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200/50 dark:border-zinc-700/50" />
            )}
            <ImageIcon className="w-4 h-4 shrink-0 relative z-20" />
            <span className="hidden sm:inline relative z-20">Análise</span>
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
                    Para utilizar o assistente de IA, você precisa configurar a variável de ambiente <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono text-xs">GEMINI_API_KEY</code> no seu ambiente de hospedagem ou arquivo .env local.
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
                    {suggestions.map((suggestion, index) => (
                      <div key={`suggest-${index}`} className="relative group">
                        {editingIndex === index ? (
                          <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => {
                              const newSuggestions = [...suggestions];
                              newSuggestions[index] = editValue;
                              setSuggestions(newSuggestions);
                              setEditingIndex(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newSuggestions = [...suggestions];
                                newSuggestions[index] = editValue;
                                setSuggestions(newSuggestions);
                                setEditingIndex(null);
                              }
                            }}
                            className="w-full p-4 text-xs font-bold bg-white dark:bg-zinc-900 border border-indigo-500 rounded-2xl focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <button 
                            onClick={() => setChatInput(suggestion)}
                            className="w-full p-4 text-xs font-bold text-left bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500 transition-colors text-text-secondary hover:text-indigo-600 group"
                          >
                            <span className="block mb-2 opacity-50 group-hover:opacity-100 transition-opacity"><MessageSquare className="w-4 h-4" /></span>
                            {suggestion}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingIndex(index);
                            setEditValue(suggestion);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-white dark:bg-zinc-800 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary hover:text-indigo-600"
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto w-full space-y-8">
                  {chatMessages.map((msg, idx) => (
                    <motion.div 
                      key={`chat-${idx}`} 
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
                      key="chat-loading"
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
            
            <div className="p-3 sm:p-6 bg-surface border-t border-zinc-200 dark:border-zinc-800 shrink-0">
              <div className="max-w-3xl mx-auto relative">
                <form onSubmit={handleChatSubmit} className="relative flex items-end gap-1.5 sm:gap-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-1.5 sm:p-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all shadow-sm">
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
                    className="w-full bg-transparent border-none resize-none max-h-32 min-h-[44px] py-3 px-2 sm:px-4 text-sm text-text-primary focus:outline-none focus:ring-0 placeholder:text-zinc-400"
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
                <Search className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="O que você deseja pesquisar?"
                  className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-full pl-12 sm:pl-16 pr-6 py-4 sm:py-5 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm text-base sm:text-lg font-medium"
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

                    {isSearchError && (
                      <button 
                        onClick={handleSearchRetry}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                      >
                        <Loader2 className="w-3 h-3" />
                        Tentar novamente
                      </button>
                    )}

                    <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                      <h4 className="text-xs font-black text-text-secondary uppercase tracking-[0.2em] mb-4">Referências e Fontes</h4>
                      {searchLinks.length > 0 ? (
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
                      ) : (
                        <p className="text-xs text-text-secondary italic">Nenhuma fonte encontrada para esta pesquisa.</p>
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analyze' && (
          <div className="h-full flex flex-col lg:flex-row p-4 sm:p-8 gap-8 overflow-y-auto">
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
              <div className="w-full">
                <label className="text-xs font-black text-text-secondary uppercase tracking-[0.2em] ml-2 block mb-3">Especialidade / Foco da IA</label>
                <div className="relative">
                  <select
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="w-full appearance-none bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3 pl-10 sm:pl-12 pr-10 text-xs sm:text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {PRESETS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <Stethoscope className="w-5 h-5 text-indigo-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="group relative aspect-square border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-[32px] flex flex-col items-center justify-center text-center bg-zinc-50 dark:bg-zinc-900/30 hover:border-indigo-500 transition-all overflow-hidden">
                {fileType === 'stl' && stlGeometry ? (
                  <>
                    <Canvas ref={threeCanvasRef} gl={{ preserveDrawingBuffer: true }} camera={{ position: [0, 0, 100], fov: 50 }}>
                      <color attach="background" args={['#18181b']} />
                      <ambientLight intensity={0.5} />
                      <directionalLight position={[10, 10, 10]} intensity={1} />
                      <Stage environment="city" intensity={0.5}>
                        <STLModel geometry={stlGeometry} />
                      </Stage>
                      <OrbitControls makeDefault />
                    </Canvas>
                    <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md rounded-xl p-2 z-10 flex items-center justify-center pointer-events-none">
                       <p className="text-[10px] text-white font-bold tracking-widest uppercase">Rotacione para focar → Capturar Análise</p>
                    </div>
                  </>
                ) : fileType === 'pdf' && pdfData ? (
                  <div className="flex flex-col items-center justify-center p-8 space-y-4 h-full w-full bg-indigo-50 dark:bg-indigo-500/10">
                    <div className="w-20 h-20 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                       <FileText className="w-10 h-10" />
                    </div>
                    <p className="text-sm font-bold text-text-primary px-4 line-clamp-2">{pdfName}</p>
                    <span className="text-[10px] font-black uppercase text-indigo-500 bg-white dark:bg-zinc-900 px-3 py-1 rounded-full">PDF Carregado</span>
                  </div>
                ) : fileType === 'audio' && analyzeImage ? (
                  <div className="flex flex-col items-center justify-center p-8 space-y-4 h-full w-full bg-indigo-50 dark:bg-indigo-500/10">
                    <div className="w-20 h-20 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                       <Mic className="w-10 h-10" />
                    </div>
                    <audio controls src={analyzeImage} className="w-full max-w-xs mt-4" />
                    <span className="text-[10px] font-black uppercase text-indigo-500 bg-white dark:bg-zinc-900 px-3 py-1 rounded-full mt-2">Áudio Carregado</span>
                  </div>
                ) : analyzeImage ? (
                  <>
                    <img src={analyzeImage} alt="Upload" className="absolute inset-0 w-full h-full object-contain bg-black/5" referrerPolicy="no-referrer" />
                  </>
                ) : (
                  <div className="p-8 space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400 group-hover:text-indigo-500 transition-colors">
                      <Layers className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-text-primary uppercase tracking-widest mb-2">Upload Extendido</p>
                      <p className="text-xs text-text-secondary font-medium">Imagens, Áudio, Radiologia DICOM, PDFs ou Modelos 3D (STL)</p>
                    </div>
                  </div>
                )}
                
                <div className={`absolute inset-0 flex items-center justify-center backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100 ${(fileType === 'stl' || fileType === 'pdf' || fileType === 'audio') ? 'pointer-events-none' : ''}`}>
                  <p className="text-white bg-black/70 px-4 py-2 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Substituir Arquivo
                  </p>
                </div>

                <input 
                  type="file" 
                  accept="image/*, audio/*, .dcm, application/dicom, .stl, application/pdf" 
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
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
                disabled={(!analyzeImage && !pdfData && !stlGeometry) || isAnalyzeLoading}
                className="w-full bg-indigo-600 text-white py-4 rounded-[20px] font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all shadow-md dark:shadow-none active:scale-95"
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

      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-text-primary tracking-tight">Limpar Histórico?</h3>
                <p className="text-sm text-text-secondary">
                  Tem certeza que deseja apagar todo o histórico deste chat? Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-3 w-full pt-4">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-zinc-100 dark:bg-zinc-800 text-text-primary hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmClearChat}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Sim, Apagar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIAssistant;

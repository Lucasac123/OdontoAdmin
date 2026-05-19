import { CreateMLCEngine, MLCEngine, InitProgressReport } from "@mlc-ai/web-llm";

// Utilizando o modelo otimizado para WebGPU que atua como o Gemma-4-E2B-it no ambiente web/PWA
export const GEMMA_MODEL_ID = "gemma-2-2b-it-q4f32_1-MLC";

class WebLlmService {
  private engine: MLCEngine | null = null;
  private isInitializing = false;
  private initProgressCallback: ((report: InitProgressReport) => void) | null = null;

  async checkHardwareCompatibility(): Promise<{ compatible: boolean; reason?: string }> {
    if (!navigator.gpu) {
      return { compatible: false, reason: "WebGPU não é suportado neste navegador ou dispositivo." };
    }
    
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return { compatible: false, reason: "O navegador bloqueou o acesso à GPU (WebGPU). Tente atualizar o Chrome ou ativar 'WebGPU' em chrome://flags." };
      }
      return { compatible: true };
    } catch (e) {
      return { compatible: false, reason: "Erro ao acessar a GPU via navegador. Verifique se o WebGPU está ativado." };
    }
  }

  setInitProgressCallback(callback: (report: InitProgressReport) => void) {
    this.initProgressCallback = callback;
  }

  async initializeEngine(): Promise<MLCEngine> {
    if (this.engine) return this.engine;
    if (this.isInitializing) {
      // Wait for initialization to finish
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (this.engine) return this.engine;
      throw new Error("Falha na inicialização do motor WebLLM.");
    }

    this.isInitializing = true;
    try {
      this.engine = await CreateMLCEngine(
        GEMMA_MODEL_ID,
        {
          initProgressCallback: (report) => {
            if (this.initProgressCallback) {
              this.initProgressCallback(report);
            }
          }
        }
      );
      return this.engine;
    } finally {
      this.isInitializing = false;
    }
  }

  async generateResponse(
    prompt: string, 
    systemInstruction?: string,
    history: { role: string, text: string }[] = []
  ): Promise<string> {
    if (!this.engine) {
      await this.initializeEngine();
    }

    try {
      const messages: any[] = [];
      let isFirstUser = true;

      for (const msg of history) {
        if (msg.role === 'model') {
          // Remove internal system markers from previous responses
          const text = msg.text.replace(/^\*\(.*?\)\*\n\n/, '');
          messages.push({ role: "assistant", content: text });
        } else if (msg.role === 'user') {
          let content = msg.text;
          if (isFirstUser && systemInstruction) {
            content = `${systemInstruction}\n\n${content}`;
            isFirstUser = false;
          }
          messages.push({ role: "user", content });
        }
      }

      let currentPrompt = prompt;
      if (isFirstUser && systemInstruction) {
          currentPrompt = `${systemInstruction}\n\n${prompt}`;
      }
      messages.push({ role: "user", content: currentPrompt });

      const reply = await this.engine!.chat.completions.create({
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024
      });

      if (!reply || !reply.choices || reply.choices.length === 0) {
        throw new Error("Resposta vazia do modelo local.");
      }

      return reply.choices[0].message.content || "";
    } catch (e: any) {
      console.error("WebLLM generation error:", e);
      throw new Error("Erro na geração de resposta local: " + (e.message || "Desconhecido"));
    }
  }

  isReady(): boolean {
    return this.engine !== null;
  }
}

export const webLlmService = new WebLlmService();

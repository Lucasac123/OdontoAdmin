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
        return { compatible: false, reason: "Nenhum adaptador gráfico compatível encontrado." };
      }
      return { compatible: true };
    } catch (e) {
      return { compatible: false, reason: "Erro ao acessar a GPU do dispositivo." };
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

  async generateResponse(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.engine) {
      await this.initializeEngine();
    }

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const reply = await this.engine!.chat.completions.create({
      messages: messages as any,
    });

    return reply.choices[0].message.content || "";
  }

  isReady(): boolean {
    return this.engine !== null;
  }
}

export const webLlmService = new WebLlmService();

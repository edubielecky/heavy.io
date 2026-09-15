/**
 * Cliente Resiliente de Alta Disponibilidade para a API Google Gemini
 * 
 * Motivação: Modelos de ponta do Gemini frequentemente apresentam picos de demanda
 * e retornam status 503 ("This model is currently experiencing high demand. Spikes in demand are usually temporary").
 * 
 * Esta camada implementa:
 * 1. Cascata de Fallback Inteligente entre modelos compatíveis (3.6-flash -> 3.5-flash -> flash-latest -> 3.5-flash-lite).
 * 2. Backoff exponencial e retry automático em erros transitórios (503, 429, timeouts).
 * 3. AbortController com timeouts granulares por requisição.
 */

export const GEMINI_PREFERRED_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
] as const;

export type GeminiModelName = (typeof GEMINI_PREFERRED_MODELS)[number] | string;

export interface GeminiRequestOptions {
  apiKey: string;
  systemInstruction?: string;
  prompt: string;
  temperature?: number;
  responseMimeType?: 'application/json' | 'text/plain';
  timeoutMs?: number;
  models?: GeminiModelName[];
}

export interface GeminiResponse<T = any> {
  rawText: string;
  data: T;
  usedModel: string;
}

/**
 * Executa uma chamada à API Gemini com proteção contra erros 503 / sobrecarga de modelos,
 * alternando automaticamente para modelos irmãos e executando retries graduais.
 */
export async function callGeminiWithFallback<T = any>(
  options: GeminiRequestOptions
): Promise<GeminiResponse<T>> {
  const {
    apiKey,
    systemInstruction,
    prompt,
    temperature = 0.2,
    responseMimeType = 'application/json',
    timeoutMs = 25000,
    models = GEMINI_PREFERRED_MODELS,
  } = options;

  const trimmedKey = (apiKey || '').trim();
  if (!trimmedKey) {
    throw new Error('Chave de API Gemini não informada.');
  }

  const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
  let lastError: any = null;

  for (let mIdx = 0; mIdx < models.length; mIdx++) {
    const currentModel = models[mIdx];
    const isLastModel = mIdx === models.length - 1;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${trimmedKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }],
              generationConfig: {
                temperature,
                responseMimeType,
              },
            }),
          }
        );

        clearTimeout(timer);

        if (response.ok) {
          const json = await response.json();
          const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!rawText) {
            throw new Error(`Modelo ${currentModel} retornou resposta vazia.`);
          }

          let cleanText = rawText.trim();
          if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
          }

          let parsedData: any = cleanText;
          if (responseMimeType === 'application/json') {
            try {
              parsedData = JSON.parse(cleanText);
            } catch (jsonErr) {
              console.warn(`[heavy.io:geminiClient] Falha ao fazer parse do JSON retornado por ${currentModel}:`, jsonErr);
              throw new Error(`JSON inválido retornado pelo modelo ${currentModel}.`);
            }
          }

          return {
            rawText: cleanText,
            data: parsedData as T,
            usedModel: currentModel,
          };
        }

        // Se retornar 503 (alta demanda) ou 429 (rate limit)
        if (response.status === 503 || response.status === 429) {
          const errBody = await response.text().catch(() => '');
          lastError = new Error(`Gemini API error: ${response.status} ${response.statusText} (${currentModel})`);

          if (attempt === 1) {
            // Tenta mais uma vez o mesmo modelo após backoff curto (1.5s)
            console.warn(`[heavy.io:geminiClient] Modelo ${currentModel} respondeu ${response.status}. Tentando novamente em 1.5s...`);
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          } else if (!isLastModel) {
            // Pula imediatamente para o próximo modelo na cascata de fallback
            const nextModel = models[mIdx + 1];
            console.warn(
              `[heavy.io:geminiClient] Modelo ${currentModel} continua sobrecarregado (status ${response.status}). Ativando fallback para ${nextModel}...`
            );
            break; // sai do loop de tentativas e vai para o próximo modelo
          }
        } else if (response.status === 404 && !isLastModel) {
          // Modelo descontinuado ou indisponível para esta versão de API
          console.warn(`[heavy.io:geminiClient] Modelo ${currentModel} retornou 404. Tentando próximo modelo...`);
          break;
        } else {
          const errDetail = await response.text().catch(() => '');
          throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errDetail.slice(0, 120)}`);
        }
      } catch (fetchErr: any) {
        clearTimeout(timer);
        lastError = fetchErr;

        if (attempt === 1 && (fetchErr?.name === 'AbortError' || fetchErr?.message?.includes('network'))) {
          console.warn(`[heavy.io:geminiClient] Timeout/Rede em ${currentModel}, retentando...`);
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }

        if (!isLastModel) {
          console.warn(`[heavy.io:geminiClient] Falha no modelo ${currentModel}: ${fetchErr?.message || fetchErr}. Alternando para próximo modelo...`);
          break;
        }
      }
    }
  }

  throw lastError || new Error('Todos os modelos Gemini da lista de contingência falharam.');
}

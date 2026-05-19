// Server-side only — OpenRouter API client wrapper

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * 高品質モデル（JSON 出力安定）
 * - openai/gpt-4o-mini: 安く速く、JSON 出力安定、日本語良好
 * - google/gemini-2.0-flash-001: 同等、若干安め
 * - anthropic/claude-3.5-haiku: 文章品質高め
 */
export const MODELS = {
  fast: "google/gemini-2.0-flash-001",
  smart: "openai/gpt-4o-mini",
  writer: "anthropic/claude-3.5-haiku",
} as const;

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
};

export async function openRouterChat({
  model,
  messages,
  jsonMode = false,
  temperature = 0.4,
  maxTokens = 4000,
}: {
  model: string;
  messages: ChatMessage[];
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY が未設定です");
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://gaicyu-madori.vercel.app",
      "X-Title": "Higashiyama Pest Control App",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenRouter: unexpected response shape");
  }
  return content;
}

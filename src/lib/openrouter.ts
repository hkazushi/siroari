// Server-side only — OpenRouter API client wrapper

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * 使用モデル（2026-11 時点で OpenRouter に存在し、安価なもの）
 * - vision: 領収書の読み取り（画像入力対応）
 * - parse : 文章 → 取引データ（JSON は extractJson で取り出す）
 * - chat  : 会計の相談
 * モデルは廃止されることがある（gemini-2.0-flash-001 / claude-3.5-haiku は廃止済み）。
 * 404 / "No endpoints found" が出たら https://openrouter.ai/models で現行 ID を確認する。
 */
export const MODELS = {
  vision: "anthropic/claude-haiku-5.5",
  parse: "anthropic/claude-haiku-5.5",
  chat: "anthropic/claude-haiku-5.5",
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
      "X-Title": "Higashiyama Kaikei",
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

/** モデルの返答から最初の JSON オブジェクトを取り出す（```json で囲まれていても可） */
export function extractJson<T = unknown>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI の返答に JSON がありません");
  return JSON.parse(text.slice(start, end + 1)) as T;
}

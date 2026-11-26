import { MODELS, openRouterChat } from "@/lib/openrouter";
import { requireUser } from "@/lib/serverAuth";

export const maxDuration = 60;

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (user instanceof Response) return user;

  const { messages, context } = (await req.json()) as { messages?: Msg[]; context?: string };
  if (!messages?.length) return Response.json({ error: "メッセージがありません" }, { status: 400 });

  const history = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  try {
    const reply = await openRouterChat({
      model: MODELS.chat,
      temperature: 0.3,
      maxTokens: 1500,
      messages: [
        {
          role: "system",
          content: `あなたは日本の個人事業主（青色申告）を支える、親しみやすい経理アシスタントです。
事業者は「東山メンテナンス」（害虫駆除業・個人事業）。
- 勘定科目の選び方、家事按分、減価償却、消費税（インボイス・2割特例・簡易課税）、確定申告の手順などに、やさしい日本語で具体的に答える。
- 数字の質問には下の帳簿データを根拠に答える。データに無いことは推測で断定しない。
- 税制は年ごとに変わるため、判断が分かれる内容や金額が大きい内容は「最終的には税務署や税理士に確認を」と添える。
- 回答は短めに。箇条書きを使ってよい。

【帳簿データ（アプリが集計）】
${(context ?? "（なし）").slice(0, 8000)}`,
        },
        ...history,
      ],
    });
    return Response.json({ reply });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

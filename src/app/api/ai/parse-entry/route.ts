import { MODELS, extractJson, openRouterChat } from "@/lib/openrouter";
import { requireUser } from "@/lib/serverAuth";
import { ENTRY_JSON_SPEC, accountListForPrompt } from "@/lib/aiPrompt";

export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (user instanceof Response) return user;

  const { text, today } = (await req.json()) as { text?: string; today?: string };
  if (!text?.trim()) return Response.json({ error: "文章がありません" }, { status: 400 });

  try {
    const out = await openRouterChat({
      model: MODELS.parse,
      temperature: 0,
      maxTokens: 500,
      messages: [
        {
          role: "system",
          content: `あなたは日本の個人事業主の経理担当です。話し言葉のメモから取引を1件読み取ります。今日は ${today ?? ""} です（「昨日」「先週の金曜」などはこの日付から計算）。「売上」「入金」「代金をもらった」などは kind=income。\n\n${accountListForPrompt()}\n\n${ENTRY_JSON_SPEC}`,
        },
        { role: "user", content: text.slice(0, 1000) },
      ],
    });
    return Response.json(extractJson(out));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

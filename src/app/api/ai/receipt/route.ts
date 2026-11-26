import { MODELS, extractJson, openRouterChat } from "@/lib/openrouter";
import { requireUser } from "@/lib/serverAuth";
import { ENTRY_JSON_SPEC, accountListForPrompt } from "@/lib/aiPrompt";

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (user instanceof Response) return user;

  const { image, today } = (await req.json()) as { image?: string; today?: string };
  if (!image || !image.startsWith("data:image/")) {
    return Response.json({ error: "画像がありません" }, { status: 400 });
  }
  if (image.length > 4_000_000) {
    return Response.json({ error: "画像が大きすぎます" }, { status: 413 });
  }

  try {
    const text = await openRouterChat({
      model: MODELS.vision,
      temperature: 0,
      maxTokens: 800,
      messages: [
        {
          role: "system",
          content: `あなたは日本の個人事業主の経理担当です。領収書・レシートの画像から取引を読み取ります。今日は ${today ?? ""} です。\n\n${accountListForPrompt()}\n\n${ENTRY_JSON_SPEC}`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "この領収書を読み取ってください。kind は通常 expense です。" },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    });
    return Response.json(extractJson(text));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

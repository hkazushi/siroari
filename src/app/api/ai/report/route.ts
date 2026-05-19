import { NextRequest, NextResponse } from "next/server";
import { openRouterChat, MODELS } from "@/lib/openrouter";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `あなたは害虫駆除業者の報告書ライターです。
施工データから、お客様への報告書文章を「丁寧かつ専門的に」生成してください。

# 文章ルール
- 一人称は使わない、または「弊社」
- 二人称は「お客様」
- 害虫駆除専門用語は適度に使う（チャバネゴキブリ、誘引、忌避、IGR など）
- 「ありがとうございました」「お役立てください」など適切な礼儀
- ${"```"} などのマークダウンは使わず、プレーンな段落で
- 出力は本文のみ（タイトル不要）
- 段落構成（推奨）:
  1. 御礼の挨拶
  2. 【現状の所見】発見した害虫・発生原因の推測
  3. 【施工内容】実施した処置の解説
  4. 【ご報告事項】今後の注意点、再発防止のための提案
  5. 結びの挨拶（次回訪問予定があれば言及）
- 全体で 400〜600 文字を目安
- 「弊社」「お客様」「以下」「下記」などの敬語表現を適切に
`;

export async function POST(req: NextRequest) {
  try {
    const { visit, customer, site } = await req.json();
    if (!visit) {
      return NextResponse.json({ error: "visit が必要です" }, { status: 400 });
    }

    // 必要データだけ整理して LLM に渡す
    const pestStamps = (visit.elements ?? []).filter(
      (e: { type: string; stampType?: string }) =>
        e.type === "stamp" &&
        ["pestRoach", "pestAnt", "pestRodent", "pestTermite", "pestFly"].includes(
          e.stampType ?? "",
        ),
    );
    const treatStamps = (visit.elements ?? []).filter(
      (e: { type: string; stampType?: string }) =>
        e.type === "stamp" &&
        [
          "baitStation",
          "trapMouse",
          "trapGlue",
          "sprayZone",
          "entryPoint",
          "crack",
          "nest",
          "moisture",
        ].includes(e.stampType ?? ""),
    );

    const stampLabels: Record<string, string> = {
      pestRoach: "ゴキブリ",
      pestAnt: "アリ",
      pestRodent: "ネズミ",
      pestTermite: "シロアリ",
      pestFly: "ハエ・蚊",
      baitStation: "毒餌（ベイト）",
      trapMouse: "捕獲器",
      trapGlue: "粘着シート",
      sprayZone: "薬剤散布範囲",
      entryPoint: "侵入経路",
      crack: "クラック",
      nest: "巣・営巣",
      moisture: "水濡れ箇所",
    };
    const groupCount = (arr: { stampType?: string; note?: string }[]) => {
      const m: Record<string, number> = {};
      for (const s of arr) {
        const t = stampLabels[s.stampType ?? ""] ?? s.stampType ?? "";
        m[t] = (m[t] ?? 0) + 1;
      }
      return m;
    };

    const summary = {
      customerName: customer?.name,
      siteName: site?.name,
      buildingType: site?.buildingType,
      floorArea: site?.floorArea,
      visitDate: visit.visitDate
        ? new Date(visit.visitDate).toLocaleDateString("ja-JP")
        : null,
      nextVisitDate: visit.nextVisitDate
        ? new Date(visit.nextVisitDate).toLocaleDateString("ja-JP")
        : null,
      visitNumber: visit.visitNumber,
      pestFindings: groupCount(pestStamps),
      treatments: groupCount(treatStamps),
      chemicals: (visit.chemicals ?? []).map(
        (c: {
          name: string;
          activeIngredient?: string;
          amount: number;
          unit: string;
          dilution?: string;
          location?: string;
        }) => ({
          name: c.name,
          activeIngredient: c.activeIngredient,
          amount: `${c.amount}${c.unit}`,
          dilution: c.dilution,
          location: c.location,
        }),
      ),
      existingNotes: visit.generalNotes,
      stampNotes: (visit.elements ?? [])
        .filter((e: { type: string; note?: string }) => e.type === "stamp" && e.note)
        .map((e: { note?: string }) => e.note),
    };

    const text = await openRouterChat({
      model: MODELS.writer,
      temperature: 0.5,
      maxTokens: 1500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `以下の施工データから報告書文章を生成してください:\n${JSON.stringify(summary, null, 2)}`,
        },
      ],
    });

    return NextResponse.json({ text: text.trim() });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}

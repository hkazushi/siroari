import { NextRequest, NextResponse } from "next/server";
import { openRouterChat, MODELS } from "@/lib/openrouter";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `あなたは害虫駆除業者のための「間取り生成 AI」です。
ユーザーの説明（音声入力をテキスト化したもの）から、建物の間取りと害虫マーキング・施工内容を JSON で出力します。

# 必ず守るルール
- 出力は厳密な JSON のみ。コードフェンスや説明文を一切付けない
- 畳数から正確な寸法を計算する（標準: 1畳 ≒ 1620mm × 910mm）
- 標準的な部屋寸法（半間モジュール）:
  - 3畳: 2730 × 1820
  - 4.5畳: 2730 × 2730
  - 6畳: 2730 × 3640
  - 7.5畳: 2730 × 4550
  - 8畳: 3640 × 3640
  - 10畳: 3640 × 4550
  - 12畳: 3640 × 5460
  - 14畳: 3640 × 6370
  - 16畳: 4550 × 6370
  - 20畳: 4550 × 8190
- 座標は mm 単位、910mm グリッドにスナップさせる
- 部屋同士は隣接配置（重ならない、間に隙間を作らない）
- 「北側」「南側」は y 軸 (北=-y, 南=+y)、「東」=+x, 「西」=-x
- 不明な指示は無理に作らない。明示されたものだけ配置

# 害虫スタンプ種別 (stampType)
pestRoach (ゴキブリ) / pestAnt (アリ) / pestRodent (ネズミ) / pestTermite (シロアリ) / pestFly (ハエ・蚊)

# 施工スタンプ種別
baitStation (毒餌) / trapMouse (捕獲器) / trapGlue (粘着シート) / sprayZone (薬剤散布) / entryPoint (侵入経路) / crack (クラック) / nest (巣) / moisture (水濡れ)

# 出力 JSON スキーマ
{
  "rooms": [
    {
      "label": "部屋名（例: LDK, 寝室, 浴室）",
      "x": 0,                // 左上 mm
      "y": 0,
      "width": 5460,         // mm
      "height": 3640,
      "color": "#fef3c7"     // 部屋ごとに見やすい淡色
    }
  ],
  "stamps": [
    {
      "stampType": "pestRoach",
      "label": "厨房・流し台下",  // どこか説明
      "roomLabel": "LDK",          // 配置先の部屋ラベル
      "hintX": "right",            // left/center/right
      "hintY": "bottom",           // top/center/bottom
      "count": 3                   // 同種を何個置くか
    }
  ],
  "notes": "AI による分析メモ"
}

# 色は以下から循環選択
#fef3c7 (黄), #dbeafe (青), #dcfce7 (緑), #e0e7ff (紫), #fce7f3 (桃), #cffafe (シアン), #fef9c3 (淡黄)
`;

export async function POST(req: NextRequest) {
  try {
    const { description, existing } = await req.json();
    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "description が必要です" }, { status: 400 });
    }

    const userMsg = existing
      ? `既存の間取り（参考）:\n${JSON.stringify(existing).slice(0, 4000)}\n\n以下の修正・追加指示を反映した最終 JSON を返してください:\n${description}`
      : description;

    const raw = await openRouterChat({
      model: MODELS.fast,
      jsonMode: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
    });

    // パース（JSON 以外混入対策）
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // JSON ブロックを抽出
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI が JSON を返しませんでした");
      parsed = JSON.parse(m[0]);
    }
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { openRouterChat, MODELS } from "@/lib/openrouter";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `あなたは害虫駆除業者のための「手描き間取り図 解析 AI」です。
ユーザーが撮影した「紙の手描き図面」や「キャンバスのラフスケッチ」の画像を解析し、清書された間取り JSON を生成します。

# 絶対遵守
- 出力は厳密な JSON のみ。コードフェンス・前置き禁止
- スタンプ種別の英字 ID を厳密に使用

# 手描きを読み解く際の優先順位
1. 数字（mm 記入）→ そのまま採用
2. 畳数記入（「6畳」等）→ 標準寸法に変換
3. 「LDK」「寝室」等の部屋名 → 該当部屋として認識
4. 何も無ければ → 描かれた相対サイズと部屋名から推定

# 標準寸法（半間モジュール: 1畳 = 910×1820mm = 中京間）
1畳=910×1820 / 2畳=1820×1820 / 3畳=1820×2730 / 4畳=1820×3640
4.5畳=2730×2730 / 5畳=1820×4550 / 6畳=2730×3640 / 7畳=1820×6370
7.5畳=2730×4550 / 8畳=3640×3640 / 9畳=2730×5460 / 10畳=3640×4550
12畳=3640×5460 / 14畳=3640×6370 / 15畳=4550×5460 / 16畳=3640×7280
18畳=5460×5460 / 20畳=3640×9100 / 24畳=5460×7280 / 30畳=5460×9100
# 注: 2730×2730 は 4.5畳（4畳ではない）

# 手描きマークの認識（重要）
画像内の手描き文字・記号を以下に対応付け:
- 「G」「ゴキ」「●×N」赤丸: pestRoach
- 「蟻」「アリ」黒い列: pestAnt
- 「ネ」「ねずみ」「鼠」点線足跡: pestRodent
- 「白」「白蟻」: pestTermite
- 「ハチ」「蜂」: pestBee
- 「クモ」「蜘」: pestSpider
- 「ムカデ」「百足」: pestCentipede
- 「ダニ」: pestMite
- 「ノミ」: pestFlea
- 「ハト」「鳩」: pestPigeon
- 「コウモリ」「蝙蝠」: pestBat
- 「イタチ」: pestWeasel
- 「ハクビシン」: pestCivet
- 「アライグマ」: pestRaccoon
- 「タヌキ」「狸」: pestRaccoonDog
- 「ヘビ」「蛇」: pestSnake
- 「カラス」: pestCrow
- 「スズメ」: pestSparrow

# 施工マーク認識
- 「毒」「ベイト」「餌」「B」: baitStation
- 「罠」「捕獲」「カゴ」: trapMouse
- 「粘着」「シート」「P」: trapGlue
- 「薬剤」「散布」「斜線範囲」: sprayZone
- 「侵入」「入口」「穴」「→」: entryPoint
- 「ひび」「亀裂」「クラック」破線: crack
- 「巣」「営巣」: nest
- 「水」「漏れ」「湿」: moisture
- 「燻煙」「燻蒸」: fumigation
- 「UV」「誘虫灯」: uvTrap
- 「超音波」: ultrasonic

# 害虫害獣の全スタンプ ID（再掲）
害虫: pestRoach / pestAnt / pestTermite / pestFly / pestMosquito / pestBee / pestSpider / pestCentipede / pestMillipede / pestHouseCentipede / pestBedbug / pestMite / pestFlea / pestSilverfish / pestStinkbug / pestMoth / pestDrainFly / pestEarwig / pestWeevil
害獣: pestRodent / pestRat / pestMouse / pestWeasel / pestCivet / pestRaccoon / pestRaccoonDog / pestBat / pestSnake / pestStrayCat
害鳥: pestPigeon / pestSparrow / pestCrow / pestStarling / pestSwallow
施工: baitStation / trapMouse / trapGlue / sprayZone / entryPoint / crack / nest / moisture / fumigation / uvTrap / ultrasonic

# 部屋整形ルール
- 手描きの不揃いな線は **きれいな矩形** に変換
- 910mm グリッドにスナップ
- 部屋同士は隣接配置（重なり禁止）
- 不明確な箇所は notes に正直に記載

# 出力 JSON
{
  "rooms": [
    { "label": "LDK", "x": 0, "y": 0, "width": 5460, "height": 3640, "color": "#fef3c7" }
  ],
  "stamps": [
    {
      "stampType": "pestRoach",
      "label": "厨房付近",
      "roomLabel": "LDK",
      "hintX": "right",
      "hintY": "bottom",
      "count": 3
    }
  ],
  "notes": "手描き解釈メモ"
}

# 部屋の色（循環）
LDK=#fef3c7 / 寝室=#dbeafe / 和室=#fef9c3 / 浴室=#cffafe / トイレ=#f1f5f9
洋室=#e0e7ff / 客席=#dcfce7 / 厨房=#fed7aa / 玄関=#f8fafc / 廊下=#f8fafc
事務所=#e0f2fe / 会議室=#ede9fe / 倉庫=#fafaf9
`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, imageUrl, hint } = await req.json();
    if (!imageBase64 && !imageUrl) {
      return NextResponse.json(
        { error: "imageBase64 か imageUrl が必要です" },
        { status: 400 },
      );
    }
    const dataUrl = imageBase64 ?? imageUrl;

    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [
      {
        type: "text",
        text:
          (hint ? `参考情報: ${hint}\n\n` : "") +
          "この画像は手描きの間取り図です。清書した間取り JSON を返してください。手描き文字・記号も読み取り、該当する害虫害獣・施工スタンプに変換してください。",
      },
      { type: "image_url", image_url: { url: dataUrl } },
    ];

    const raw = await openRouterChat({
      model: MODELS.fast, // Gemini 2.0 Flash Vision (画像認識 + JSON)
      jsonMode: true,
      temperature: 0.2,
      maxTokens: 6000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
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

"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Mic, MicOff, Send } from "lucide-react";
import { Button, Card, PageHeader, Spinner, Textarea } from "@/components/ui";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useData } from "@/lib/data";
import { yen } from "@/lib/format";
import { TAX_METHOD_LABELS } from "@/lib/tax";
import { useBooks } from "@/lib/useBooks";
import { useYear } from "@/lib/year";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "今年の所得税はだいたいいくらになりそう？",
  "軽トラックを中古で買ったときの減価償却は？",
  "自宅兼事務所の家賃と電気代はどう按分する？",
  "確定申告までにやることを教えて",
  "インボイス登録した場合の消費税はいくら？",
];

export default function AssistantPage() {
  const { callApi, profile } = useData();
  const { year } = useYear();
  const { pl, tax, months } = useBooks(year);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceInput({ onFinal: (t) => setInput((s) => (s ? `${s} ${t}` : t)) });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  function context(): string {
    const lines = [
      `対象年: ${year}年`,
      `青色申告特別控除: ${yen(profile.blue_deduction)}`,
      `消費税: ${profile.tax_status === "exempt" ? "免税事業者" : `課税事業者（${TAX_METHOD_LABELS[profile.tax_method]}）`}`,
      `売上: ${yen(pl.revenueTotal)}`,
      `経費合計: ${yen(pl.expenseTotal + pl.cogs)}`,
      ...pl.expenses.filter((e) => e.amount).map((e) => `  ${e.name}: ${yen(e.amount)}`),
      `青色申告特別控除前の所得: ${yen(pl.incomeBeforeDeduction)}`,
      `所得金額（控除後）: ${yen(pl.income)}`,
      `月別（売上/経費）: ${months.map((m) => `${m.month}月 ${m.revenue}/${m.expense}`).join(", ")}`,
    ];
    if (profile.tax_status === "taxable") lines.push(`消費税の概算: ${yen(tax.total)}`);
    return lines.join("\n");
  }

  async function send(text = input) {
    const q = text.trim();
    if (!q || busy) return;
    voice.stop();
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { reply } = await callApi<{ reply: string }>("/api/ai/chat", { messages: next, context: context() });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `エラー: ${e instanceof Error ? e.message : e}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="AI 相談" description={`${year}年の帳簿の数字をもとに、経理・税金の疑問に答えます`} />
      <Card className="flex min-h-[60dvh] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="py-6 text-center">
              <Bot size={36} className="mx-auto text-[#1e3a5f]" />
              <p className="mt-2 text-sm text-slate-600">科目の選び方や確定申告のことなど、気軽に聞いてください。</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" ? "bg-[#1e3a5f] text-white" : "bg-slate-100 text-slate-900"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner /> 考えています…
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <Textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="質問を入力（⌘+Enter で送信）"
                className="pr-10"
              />
              {voice.supported && (
                <button
                  type="button"
                  onClick={() => (voice.listening ? voice.stop() : voice.start())}
                  className={`absolute top-2 right-2 rounded-full p-1.5 ${
                    voice.listening ? "animate-pulse bg-red-600 text-white" : "text-slate-500 hover:bg-slate-100"
                  }`}
                  aria-label="音声入力"
                >
                  {voice.listening ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
              )}
            </div>
            <Button onClick={() => send()} disabled={!input.trim() || busy}>
              <Send size={15} />
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400">AI の回答は参考情報です。最終判断は税務署・税理士にご確認ください。</p>
        </div>
      </Card>
    </div>
  );
}

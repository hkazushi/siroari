"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import {
  ArrowLeft,
  Send,
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  Trash2,
} from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "ai-chat:history";

const QUICK_PROMPTS = [
  "飲食店厨房のチャバネゴキブリ大発生。最強の施工パターンと薬剤は？",
  "お客様から「子供がいるので安全な薬剤を」と言われた。何を推奨すべき？",
  "クマネズミとドブネズミの見分け方と、それぞれの対策の違いは？",
  "シロアリ駆除の現場で雨が降ってきた。どうすべき？",
  "雨季前に予防施工を提案したい。お客様向け説明文を考えて。",
  "クレーム対応：「効果が無い」と言われた時の返答例を 3 つ作って。",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const accumulatedRef = useRef(input);

  useEffect(() => {
    accumulatedRef.current = input;
  }, [input]);

  // Load history
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEY);
        if (s) setMessages(JSON.parse(s));
      } catch {}
    });
  }, []);

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
    } catch {}
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  const voice = useVoiceInput({
    lang: "ja-JP",
    onFinal: (t) => {
      const next =
        (accumulatedRef.current + (accumulatedRef.current ? " " : "") + t).trim();
      accumulatedRef.current = next;
      setInput(next);
    },
  });

  const send = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: userText }];
    setMessages(next);
    setInput("");
    accumulatedRef.current = "";
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "応答失敗");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: `❌ エラー: ${(e as Error).message}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const clearAll = () => {
    if (confirm("チャット履歴をすべて削除しますか？")) {
      setMessages([]);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-2 sm:px-6">
          <Link href="/" className="hover:opacity-80">
            <Logo size={36} withText={false} />
          </Link>
          <div className="leading-tight">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft size={12} /> ホームへ
            </Link>
            <div className="flex items-center gap-1 text-[14px] font-bold text-[#1e3a5f]">
              <Sparkles size={14} className="text-amber-500" />
              AI コンシェルジュ
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearAll}
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-50"
              title="履歴クリア"
            >
              <Trash2 size={11} /> クリア
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-3 py-4 sm:px-6"
      >
        {messages.length === 0 ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-gradient-to-br from-amber-50 to-rose-50 p-4 ring-1 ring-amber-200">
              <div className="flex items-center gap-1.5 text-sm font-bold text-[#991b1b]">
                <Sparkles size={14} /> 害虫駆除のベテラン AI が常駐
              </div>
              <div className="mt-2 text-[12px] leading-6 text-slate-700">
                施工に関する疑問・薬剤の選び方・お客様対応文面など、現場で困った時に何でも聞いてください。
                <br />
                音声入力にも対応しています。
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-bold text-slate-500">
                よくある質問（タップで送信）
              </div>
              <div className="space-y-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[12px] text-slate-700 hover:border-[#991b1b] hover:bg-red-50/30"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] leading-6 ${
                    m.role === "user"
                      ? "bg-[#1e3a5f] text-white"
                      : "bg-white text-slate-800 ring-1 ring-slate-200"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white px-3 py-2 text-[13px] text-slate-500 ring-1 ring-slate-200">
                  <Loader2 size={14} className="inline animate-spin" /> 考え中...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white px-3 py-2 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => {
                accumulatedRef.current = e.target.value;
                setInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              placeholder="質問を入力 ／ マイクで音声入力 ／ ⌘ + Enter で送信"
              className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 pr-12 text-sm focus:border-[#991b1b] focus:outline-none"
            />
            {voice.supported && (
              <button
                onClick={() =>
                  voice.listening ? voice.stop() : voice.start()
                }
                title={voice.listening ? "停止" : "音声入力"}
                className={`absolute right-2 top-2 rounded-full p-1.5 ${
                  voice.listening
                    ? "animate-pulse bg-red-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {voice.listening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
            )}
          </div>
          <button
            onClick={() => send()}
            disabled={busy || !input.trim()}
            className="rounded-xl bg-[#991b1b] p-3 text-white hover:bg-[#7f1d1d] disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

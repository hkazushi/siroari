"use client";

import { useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";

/**
 * 音声入力対応 textarea。
 * マイクボタンをタップ → 喋った内容が末尾に追記される。
 */
export function VoiceTextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  const accumulatedRef = useRef(value);
  useEffect(() => {
    accumulatedRef.current = value;
  }, [value]);
  const voice = useVoiceInput({
    lang: "ja-JP",
    onFinal: (t) => {
      const next = (
        accumulatedRef.current + (accumulatedRef.current ? " " : "") + t
      ).trim();
      accumulatedRef.current = next;
      onChange(next);
    },
  });
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => {
          accumulatedRef.current = e.target.value;
          onChange(e.target.value);
        }}
        rows={rows}
        placeholder={placeholder}
        className={
          className ??
          "w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm"
        }
      />
      {voice.supported && (
        <button
          type="button"
          onClick={() => (voice.listening ? voice.stop() : voice.start())}
          title={voice.listening ? "停止" : "音声入力（タップして話す）"}
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
  );
}

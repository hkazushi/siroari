"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SR = SpeechRecognition | null;

// Browser typings
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}
interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

type WindowWithSR = Window & {
  SpeechRecognition?: SpeechRecognitionStatic;
  webkitSpeechRecognition?: SpeechRecognitionStatic;
};

/**
 * Web Speech API による音声入力フック。
 * iOS Safari と Chrome / Edge で動作。Firefox は未対応。
 */
export function useVoiceInput({
  lang = "ja-JP",
  onFinal,
  onInterim,
}: {
  lang?: string;
  onFinal?: (text: string) => void;
  onInterim?: (text: string) => void;
} = {}) {
  const [supported, setSupported] = useState<boolean>(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SR>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as WindowWithSR;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    // Defer to next tick to avoid cascading-renders lint
    queueMicrotask(() => setSupported(!!Ctor));
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const w = window as WindowWithSR;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      alert("このブラウザは音声入力に対応していません。Chrome や Safari をお使いください。");
      return;
    }
    if (recRef.current) {
      recRef.current.abort();
    }
    const r = new Ctor();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (ev: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const transcript = res[0].transcript;
        if (res.isFinal) final += transcript;
        else interim += transcript;
      }
      if (final && onFinal) onFinal(final);
      if (interim && onInterim) onInterim(interim);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.start();
    recRef.current = r;
    setListening(true);
  }, [lang, onFinal, onInterim]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, start, stop };
}

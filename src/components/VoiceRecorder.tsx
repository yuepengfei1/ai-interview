"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 语音识别组件（浏览器 Web Speech API）
 * 点击麦克风 → 实时转写 → 回车或再次点击停止，结果填回 input
 */

interface VoiceRecorderProps {
  onText: (text: string) => void;
  disabled?: boolean;
}

// 类型声明（浏览器 API）
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceRecorder({ onText, disabled }: VoiceRecorderProps) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef<string>("");

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      setSupported(true);
      const rec = new SR();
      rec.lang = "zh-CN";
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event: any) => {
        let interim = "";
        let finalText = finalRef.current;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        finalRef.current = finalText;
        setInterimText(finalText + interim);
      };

      rec.onerror = (e: any) => {
        console.warn("Speech recognition error:", e.error);
        setRecording(false);
      };

      rec.onend = () => {
        setRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggle = () => {
    if (!recognitionRef.current) return;
    if (recording) {
      recognitionRef.current.stop();
      if (finalRef.current.trim()) {
        onText(finalRef.current.trim());
      }
      finalRef.current = "";
      setInterimText("");
    } else {
      finalRef.current = "";
      setInterimText("");
      recognitionRef.current.start();
      setRecording(true);
    }
  };

  if (!supported) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        title={recording ? "停止录音" : "开始语音输入"}
        className={`p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          recording
            ? "bg-red-500 text-white animate-pulse"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
      >
        {recording ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="22" strokeLinecap="round" />
          </svg>
        )}
      </button>
      {recording && interimText && (
        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg max-w-xs whitespace-normal break-all">
          {interimText}
        </div>
      )}
    </div>
  );
}

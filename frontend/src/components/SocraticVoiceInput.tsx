import { useEffect, useRef, useState } from "react";

interface SpeechResult {
    isFinal: boolean;
    0: { transcript: string };
}
interface SpeechEvent {
    results: ArrayLike<SpeechResult>;
}
interface Recognizer {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: SpeechEvent) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
}
type SpeechWindow = Window & {
    SpeechRecognition?: new () => Recognizer;
    webkitSpeechRecognition?: new () => Recognizer;
};

interface Props {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    onListeningChange?: (listening: boolean) => void;
}

export default function SocraticVoiceInput({
    value, onChange, disabled = false, onListeningChange,
}: Props) {
    const [mode, setMode] = useState<"text" | "voice">("text");
    const [listening, setListening] = useState(false);
    const [interim, setInterim] = useState("");
    const [error, setError] = useState("");
    const recognizerRef = useRef<Recognizer | null>(null);
    const sessionRef = useRef(0);
    const baseRef = useRef("");
    const valueRef = useRef(value);
    const changeRef = useRef(onChange);
    const listeningChangeRef = useRef(onListeningChange);
    valueRef.current = value;
    changeRef.current = onChange;
    listeningChangeRef.current = onListeningChange;

    const stop = () => {
        listeningChangeRef.current?.(false);
        sessionRef.current += 1;
        const recognizer = recognizerRef.current;
        recognizerRef.current = null;
        if (recognizer) {
            recognizer.onresult = null;
            recognizer.onerror = null;
            recognizer.onend = null;
            try { recognizer.stop(); } catch { /* Already stopped. */ }
        }
        setListening(false);
        setInterim("");
    };

    useEffect(() => {
        return () => {
            listeningChangeRef.current?.(false);
            sessionRef.current += 1;
            const recognizer = recognizerRef.current;
            recognizerRef.current = null;
            if (recognizer) {
                recognizer.onresult = null;
                recognizer.onerror = null;
                recognizer.onend = null;
                try { recognizer.stop(); } catch { /* Already stopped. */ }
            }
        };
    }, []);

    useEffect(() => {
        listeningChangeRef.current?.(listening);
    }, [listening]);

    useEffect(() => {
        if (disabled) stop();
    }, [disabled]);

    const start = () => {
        if (disabled || listening) return;
        const speechWindow = window as SpeechWindow;
        const Constructor =
            speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
        if (!Constructor) {
            setError("此瀏覽器不支援語音轉文字，請改用文字記錄。");
            return;
        }
        const session = ++sessionRef.current;
        baseRef.current = valueRef.current.trim();
        setInterim("");
        setError("");
        try {
            const recognizer = new Constructor();
            recognizer.lang = "zh-TW";
            recognizer.continuous = true;
            recognizer.interimResults = true;
            recognizer.onresult = (event) => {
                if (session !== sessionRef.current) return;
                const finalParts: string[] = [];
                const interimParts: string[] = [];
                // Rebuild from the current result list to avoid duplicate text.
                for (let i = 0; i < event.results.length; i += 1) {
                    const result = event.results[i];
                    const part = result?.[0]?.transcript?.trim();
                    if (!part) continue;
                    (result.isFinal ? finalParts : interimParts).push(part);
                }
                const finalText = finalParts.join(" ");
                if (finalText) {
                    changeRef.current(
                        [baseRef.current, finalText].filter(Boolean).join(" ")
                    );
                }
                setInterim(interimParts.join(" "));
            };
            recognizer.onerror = (event) => {
                if (session !== sessionRef.current) return;

                console.error("Speech recognition error:", event.error);

                setError(`語音辨識失敗：${event.error}`);
                setListening(false);
                setInterim("");
                recognizerRef.current = null;
            };
            recognizer.onend = () => {
                if (session !== sessionRef.current) return;
                setListening(false);
                setInterim("");
                recognizerRef.current = null;
            };
            recognizerRef.current = recognizer;
            recognizer.start();
            listeningChangeRef.current?.(true);
            setListening(true);
        } catch {
            recognizerRef.current = null;
            setListening(false);
            setError("無法啟動語音辨識，請改用文字記錄。");
        }
    };

    return (
        <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">說說你的想法</p>
            <div role="group" aria-label="反思輸入方式" className="flex rounded-2xl bg-slate-100 p-1">
                {(["text", "voice"] as const).map((item) => (
                    <button
                        key={item}
                        type="button"
                        disabled={disabled}
                        aria-pressed={mode === item}
                        onClick={() => {
                            if (item === mode) return;
                            stop();
                            setError("");
                            setMode(item);
                        }}
                        className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${mode === item ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"
                            } disabled:opacity-50`}
                    >
                        {item === "text" ? "✏️ 文字記錄" : "🎙️ 語音日記"}
                    </button>
                ))}
            </div>
            <textarea
                value={value}
                onChange={(event) => {
                    if (listening) stop();
                    onChange(event.target.value);
                }}
                disabled={disabled}
                rows={3}
                placeholder="寫下你現在想到的答案..."
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 leading-7 text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100 disabled:text-slate-400"
            />
            {mode === "voice" && (
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-700">
                                {listening ? "正在聆聽..." : "語音轉文字"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                辨識完成的文字會填入上方，送出前可以修改。
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={listening ? stop : start}
                            disabled={disabled}
                            aria-pressed={listening}
                            className="rounded-full bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {listening ? "■ 停止聆聽" : "🎙️ 開始說話"}
                        </button>
                    </div>
                    {interim && <p className="mt-3 text-sm text-slate-500" aria-live="polite">辨識中：{interim}</p>}
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                        語音可能由瀏覽器服務處理，資料處理方式依瀏覽器而異。
                        請確認麥克風權限，避免在不適合的環境說出私人資訊。
                    </p>
                </div>
            )}
            {error && <p role="status" className="text-sm text-amber-700">{error}</p>}
        </div>
    );
}

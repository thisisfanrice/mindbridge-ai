import { useEffect, useState } from "react";

export type LumiPosture = "listening" | "tutoring";

interface LumiStatusBarProps {
    posture?: LumiPosture;
    postureState?: string | null;
    moodScore?: number | null;
    title?: string;
    message?: string;
    loading?: boolean;
    className?: string;
}

const moodImages: Record<number, string> = {
    1: "/mascots/mascot-6.png",
    2: "/mascots/mascot-5.png",
    3: "/mascots/mascot-4.png",
    4: "/mascots/mascot-3.png",
    5: "/mascots/mascot-2.png",
    6: "/mascots/mascot-1.png",
};

const postureImages: Record<LumiPosture, string> = {
    // 陪伴／傾聽：吉祥物 8，戴耳機
    listening: "/mascots/mascot-8.png",

    // 伴讀／家教：吉祥物 7，拿鉛筆
    tutoring: "/mascots/mascot-7.png",
};

export default function LumiStatusBar({
    posture = "listening",
    postureState,
    moodScore,
    title,
    message,
    loading = false,
    className = "",
}: LumiStatusBarProps) {
    const [speaking, setSpeaking] = useState(false);
    const [speechError, setSpeechError] = useState("");

    // Only accept a known posture from a future API. Never infer it from
    // journal text or pretend the current Demo API has classified the user.
    const resolvedPosture: LumiPosture =
        postureState === "listening" || postureState === "tutoring"
            ? postureState
            : posture;

    const validMood =
        typeof moodScore === "number" &&
        Number.isInteger(moodScore) &&
        moodScore >= 1 &&
        moodScore <= 6;

    const image = validMood
        ? moodImages[moodScore]
        : postureImages[resolvedPosture];

    const heading =
        title ??
        (resolvedPosture === "tutoring"
            ? "橋寶伴讀中"
            : "橋寶陪伴中");

    const description =
        message ??
        (resolvedPosture === "tutoring"
            ? "不懂的概念或題目，讓橋寶陪你一步步整理。"
            : "可以用自己的步調，記錄今天的心情與想法。");

    useEffect(() => {
        return () => {
            if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const handleSpeech = () => {
        if (!("speechSynthesis" in window)) {
            setSpeechError("此瀏覽器不支援語音朗讀。");
            return;
        }

        if (speaking) {
            window.speechSynthesis.cancel();
            setSpeaking(false);
            return;
        }

        const text = description.trim();
        if (!text) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "zh-TW";
        utterance.rate = 0.95;
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        setSpeechError("");
        setSpeaking(true);
        window.speechSynthesis.speak(utterance);
    };

    return (
        <section
            aria-label="橋寶狀態"
            className={`mindbridge-brand-gradient rounded-3xl border border-white/70 p-4 shadow-sm ring-1 ring-white/60 sm:p-5 ${className}`}
        >
            <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative h-20 w-20 shrink-0 sm:h-24 sm:w-24">
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-sky-100 bg-sky-50">
                        <img
                            src={image}
                            alt={validMood ? `橋寶情緒 ${moodScore} 分造型` : `橋寶${resolvedPosture === "tutoring" ? "伴讀" : "傾聽"}造型`}
                            className="h-full w-full object-contain p-1"
                        />
                    </div>
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
                        吉祥物
                    </span>
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 sm:text-base">
                        {heading}
                    </p>
                    <div className="mt-2 rounded-2xl bg-sky-50 px-3 py-2.5">
                        <p className="text-sm leading-6 text-slate-700">
                            {loading ? "橋寶正在整理中..." : description}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleSpeech}
                    disabled={loading || !description.trim()}
                    aria-label={speaking ? "停止朗讀" : "朗讀橋寶的話"}
                    title={speaking ? "停止朗讀" : "朗讀"}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-700 transition hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {speaking ? (
                        <span aria-hidden="true" className="text-sm font-bold">■</span>
                    ) : (
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                        </svg>
                    )}
                </button>
            </div>
            {speechError && (
                <p role="status" className="mt-3 text-xs text-amber-700">
                    {speechError}
                </p>
            )}
        </section>
    );
}

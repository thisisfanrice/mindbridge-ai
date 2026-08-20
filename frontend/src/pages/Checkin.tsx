import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";

type InputType = "text" | "voice";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: {
    transcript: string;
  };
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;

  start: () => void;
  stop: () => void;

  onresult:
    | ((event: SpeechRecognitionEventLike) => void)
    | null;

  onerror:
    | ((event: SpeechRecognitionErrorEventLike) => void)
    | null;

  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const moodOptions = [
  {
    value: 1,
    emoji: "😫",
    label: "崩潰",
  },
  {
    value: 2,
    emoji: "😟",
    label: "焦慮",
  },
  {
    value: 3,
    emoji: "😐",
    label: "平淡",
  },
  {
    value: 4,
    emoji: "🙂",
    label: "充實",
  },
  {
    value: 5,
    emoji: "😃",
    label: "愉快",
  },
  {
    value: 6,
    emoji: "🤩",
    label: "超棒",
  },
];

const stressLabels: Record<number, string> = {
  1: "極度輕鬆（毫無壓力）",
  2: "非常輕鬆",
  3: "輕鬆",
  4: "微有壓力",
  5: "適度壓力（平常狀態）",
  6: "稍感吃力",
  7: "壓力偏高",
  8: "壓力很大",
  9: "非常吃力",
  10: "極度壓迫",
};

const sleepLabels: Record<number, string> = {
  1: "極度差（徹夜未眠 / 幾乎沒睡）",
  2: "非常差",
  3: "很差（品質不好、頻繁醒來）",
  4: "偏差",
  5: "普通（有睡但還是累）",
  6: "尚可",
  7: "還不錯",
  8: "很好（睡得蠻香）",
  9: "非常好",
  10: "極佳（精力充沛）",
};

const energyOptions = [
  {
    value: 1,
    emoji: "🪫",
    label: "電量耗盡",
  },
  {
    value: 2,
    emoji: "🪫",
    label: "低電量",
  },
  {
    value: 3,
    emoji: "🔋",
    label: "電量中等",
  },
  {
    value: 4,
    emoji: "🔋",
    label: "電量充足",
  },
  {
    value: 5,
    emoji: "⚡",
    label: "電量滿格",
  },
];

function Checkin() {
  const navigate = useNavigate();

  const [moodScore, setMoodScore] =
    useState<number | null>(null);

  const [stressScore, setStressScore] =
    useState<number | null>(null);

  const [sleepScore, setSleepScore] =
    useState<number | null>(null);

  const [energyScore, setEnergyScore] =
    useState<number | null>(null);

  const [note, setNote] = useState("");

  const [inputType, setInputType] =
    useState<InputType>("text");

  const [isListening, setIsListening] =
    useState(false);

  const [voiceSupported, setVoiceSupported] =
    useState(true);

  const [message, setMessage] = useState("");

  const [saving, setSaving] = useState(false);

  const recognitionRef =
    useRef<SpeechRecognitionLike | null>(null);

  const toggleMood = (value: number) => {
    setMoodScore(
      moodScore === value ? null : value
    );
  };

  const toggleEnergy = (value: number) => {
    setEnergyScore(
      energyScore === value ? null : value
    );
  };

  const startVoiceInput = () => {
    setMessage("");

    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    const Recognition =
      speechWindow.SpeechRecognition ||
      speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceSupported(false);
      setMessage(
        "這個瀏覽器目前不支援語音轉文字，可以改用文字輸入。"
      );
      return;
    }

    try {
      const recognition = new Recognition();

      recognition.lang = "zh-TW";
      recognition.continuous = true;
      recognition.interimResults = true;

      let finalTranscript = "";

      recognition.onresult = (event) => {
        let interimTranscript = "";

        for (
          let i = 0;
          i < event.results.length;
          i += 1
        ) {
          const result = event.results[i];

          if (!result || !result[0]) {
            continue;
          }

          const transcript =
            result[0].transcript;

          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript.trim()) {
          setNote((previous) => {
            const existing = previous.trim();

            return existing
              ? `${existing} ${finalTranscript.trim()}`
              : finalTranscript.trim();
          });

          finalTranscript = "";
        }

        if (
          interimTranscript &&
          !isListening
        ) {
          setIsListening(true);
        }
      };

      recognition.onerror = (event) => {
        console.error(
          "Speech recognition error:",
          event.error
        );

        setIsListening(false);

        if (event.error === "not-allowed") {
          setMessage(
            "沒有取得麥克風權限，請允許麥克風後再試一次。"
          );
        } else {
          setMessage(
            "語音辨識暫時無法使用，可以改用文字輸入。"
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;

      setInputType("voice");
      setIsListening(true);

      recognition.start();
    } catch (error) {
      console.error(
        "Start voice input error:",
        error
      );

      setIsListening(false);

      setMessage(
        "無法啟動語音輸入，請稍後再試。"
      );
    }
  };

  const stopVoiceInput = () => {
    recognitionRef.current?.stop();

    recognitionRef.current = null;

    setIsListening(false);
  };

  const switchInputType = (
    type: InputType
  ) => {
    if (
      type === "text" &&
      isListening
    ) {
      stopVoiceInput();
    }

    setInputType(type);
    setMessage("");
  };

  const handleSubmit = async () => {
    try {
      setMessage("");

      const hasContent =
        moodScore !== null ||
        stressScore !== null ||
        sleepScore !== null ||
        energyScore !== null ||
        note.trim().length > 0;

      if (!hasContent) {
        setMessage(
          "至少填一項再送出，不然今天的 Check-in 只剩下哲學上的存在。"
        );
        return;
      }

      const userId =
        localStorage.getItem(
          "mindbridge_user_id"
        );

      if (!userId) {
        setMessage(
          "找不到使用者資料，請先回首頁重新建立匿名使用者。"
        );
        return;
      }

      if (isListening) {
        stopVoiceInput();
      }

      setSaving(true);

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/api/checkin`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            userId,
            moodScore,
            stressScore,
            sleepScore,
            energyScore,

            note:
              note.trim().length > 0
                ? note.trim()
                : null,

            inputType,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to save check-in"
        );
      }

      setMessage(
        "✅ 今日 Check-in 已儲存"
      );

      setTimeout(() => {
        navigate("/history");
      }, 700);
    } catch (error) {
      console.error(
        "Check-in save error:",
        error
      );

      setMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ 儲存時發生錯誤"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="text-sm font-medium text-slate-500 transition hover:text-indigo-600"
        >
          ← 返回首頁
        </Link>

        <header className="mb-8 mt-5">
          <p className="text-sm font-semibold text-indigo-600">
            Daily Check-in
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            今天過得怎麼樣？
          </h1>

          <p className="mt-3 leading-7 text-slate-600">
            不需要每一項都填。記下你現在想記錄的部分就好。
          </p>
        </header>

        <div className="space-y-6">
          {/* Mood */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  今天的心情
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  選一個最接近現在感受的狀態
                </p>
              </div>

              {moodScore !== null && (
                <button
                  type="button"
                  onClick={() =>
                    setMoodScore(null)
                  }
                  className="text-sm text-slate-400 transition hover:text-slate-700"
                >
                  清除
                </button>
              )}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {moodOptions.map(
                (option) => {
                  const selected =
                    moodScore ===
                    option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        toggleMood(
                          option.value
                        )
                      }
                      className={`rounded-2xl border px-2 py-4 text-center transition ${
                        selected
                          ? "border-indigo-500 bg-indigo-50 shadow-sm ring-2 ring-indigo-100"
                          : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-3xl">
                        {option.emoji}
                      </div>

                      <div
                        className={`mt-2 text-sm font-semibold ${
                          selected
                            ? "text-indigo-700"
                            : "text-slate-700"
                        }`}
                      >
                        {option.label}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {option.value}/6
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </section>

          {/* Stress */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  今天的壓力程度
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  1 是非常輕鬆，10 是壓力非常高
                </p>
              </div>

              {stressScore !==
                null && (
                <button
                  type="button"
                  onClick={() =>
                    setStressScore(null)
                  }
                  className="text-sm text-slate-400 hover:text-slate-700"
                >
                  清除
                </button>
              )}
            </div>

            <div className="mt-6">
              <div className="mb-4 flex items-end justify-between">
                <span className="text-sm text-slate-400">
                  1
                </span>

                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-600">
                    {stressScore ?? "－"}
                  </div>

                  <div className="mt-1 text-sm font-medium text-slate-600">
                    {stressScore !== null
                      ? stressLabels[
                          stressScore
                        ]
                      : "尚未選擇"}
                  </div>
                </div>

                <span className="text-sm text-slate-400">
                  10
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="10"
                value={
                  stressScore ?? 5
                }
                onChange={(e) =>
                  setStressScore(
                    Number(
                      e.target.value
                    )
                  )
                }
                className="w-full cursor-pointer accent-indigo-600"
              />
            </div>
          </section>

          {/* Sleep */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  昨晚睡得如何？
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  1 是非常差，10 是非常好
                </p>
              </div>

              {sleepScore !==
                null && (
                <button
                  type="button"
                  onClick={() =>
                    setSleepScore(null)
                  }
                  className="text-sm text-slate-400 hover:text-slate-700"
                >
                  清除
                </button>
              )}
            </div>

            <div className="mt-6">
              <div className="mb-4 flex items-end justify-between">
                <span className="text-sm text-slate-400">
                  1
                </span>

                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-600">
                    {sleepScore ?? "－"}
                  </div>

                  <div className="mt-1 text-sm font-medium text-slate-600">
                    {sleepScore !== null
                      ? sleepLabels[
                          sleepScore
                        ]
                      : "尚未選擇"}
                  </div>
                </div>

                <span className="text-sm text-slate-400">
                  10
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="10"
                value={
                  sleepScore ?? 5
                }
                onChange={(e) =>
                  setSleepScore(
                    Number(
                      e.target.value
                    )
                  )
                }
                className="w-full cursor-pointer accent-indigo-600"
              />
            </div>
          </section>

          {/* Energy */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  今天的能量
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  選填
                </p>
              </div>

              {energyScore !==
                null && (
                <button
                  type="button"
                  onClick={() =>
                    setEnergyScore(null)
                  }
                  className="text-sm text-slate-400 hover:text-slate-700"
                >
                  清除
                </button>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {energyOptions.map(
                (option) => {
                  const selected =
                    energyScore ===
                    option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        toggleEnergy(
                          option.value
                        )
                      }
                      className={`rounded-2xl border px-3 py-4 text-center transition ${
                        selected
                          ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                          : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-2xl">
                        {option.emoji}
                      </div>

                      <div
                        className={`mt-2 text-sm font-semibold ${
                          selected
                            ? "text-indigo-700"
                            : "text-slate-700"
                        }`}
                      >
                        {option.label}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {option.value}/5
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </section>

          {/* Journal */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
            <h2 className="text-lg font-bold text-slate-900">
              今天有什麼想記下來的？
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              選填，可以打字，也可以直接說
            </p>

            <div className="mt-5 flex rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() =>
                  switchInputType(
                    "text"
                  )
                }
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  inputType === "text"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                ✏️ 文字輸入
              </button>

              <button
                type="button"
                onClick={() =>
                  switchInputType(
                    "voice"
                  )
                }
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  inputType === "voice"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                🎙️ 語音輸入
              </button>
            </div>

            {inputType ===
              "text" && (
              <textarea
                value={note}
                onChange={(e) =>
                  setNote(
                    e.target.value
                  )
                }
                rows={5}
                placeholder="今天發生了什麼？有什麼想法或感受想留下來？"
                className="mt-5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            )}

            {inputType ===
              "voice" && (
              <div className="mt-5">
                <div
                  className={`rounded-3xl border p-6 text-center transition ${
                    isListening
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  {isListening ? (
                    <>
                      <div className="flex h-16 items-center justify-center gap-1">
                        {[
                          1, 2, 3, 4, 5,
                          6, 7,
                        ].map(
                          (bar) => (
                            <div
                              key={
                                bar
                              }
                              className="h-8 w-1.5 animate-pulse rounded-full bg-indigo-500"
                              style={{
                                animationDelay: `${bar * 90}ms`,
                              }}
                            />
                          )
                        )}
                      </div>

                      <p className="mt-3 font-semibold text-indigo-700">
                        正在聆聽...
                      </p>

                      <button
                        type="button"
                        onClick={
                          stopVoiceInput
                        }
                        className="mt-4 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
                      >
                        ■ 停止錄音
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl">
                        🎙️
                      </div>

                      <p className="mt-3 font-semibold text-slate-700">
                        用說的也可以
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        語音會轉成文字，
                        不需要上傳錄音檔。
                      </p>

                      <button
                        type="button"
                        onClick={
                          startVoiceInput
                        }
                        disabled={
                          !voiceSupported
                        }
                        className="mt-4 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        🎙️ 開始說話
                      </button>
                    </>
                  )}
                </div>

                {note && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      語音轉文字
                    </p>

                    <textarea
                      value={note}
                      onChange={(e) =>
                        setNote(
                          e.target
                            .value
                        )
                      }
                      rows={4}
                      className="w-full resize-none bg-transparent leading-7 text-slate-700 outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full rounded-2xl bg-indigo-600 px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "儲存中..."
              : "完成今日 Check-in"}
          </button>

          {message && (
            <div className="rounded-2xl bg-white px-4 py-3 text-center text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
              {message}
            </div>
          )}

          <p className="pb-4 text-center text-xs leading-5 text-slate-400">
            MindBridge
            提供日常紀錄與一般支持資訊，
            不作為醫療診斷或專業心理治療的替代。
          </p>
        </div>
      </div>
    </main>
  );
}

export default Checkin;
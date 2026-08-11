import { useState } from "react";
import { Link } from "react-router";

const moodOptions = [
  { value: 1, emoji: "😢", label: "很低落" },
  { value: 2, emoji: "😞", label: "低落" },
  { value: 3, emoji: "😐", label: "普通" },
  { value: 4, emoji: "🙂", label: "還不錯" },
  { value: 5, emoji: "😊", label: "開心" },
  { value: 6, emoji: "😄", label: "很好" },
];

function Checkin() {
  const [mood, setMood] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setMessage("");

      const userId = localStorage.getItem("mindbridge_user_id");

      if (!userId) {
        setMessage("找不到匿名使用者資料，請先回首頁重新整理。");
        return;
      }

      const hasAnyData =
        mood !== null ||
        stress !== null ||
        sleep !== null ||
        note.trim().length > 0;

      if (!hasAnyData) {
        setMessage("至少填寫一項內容再送出。");
        return;
      }

      setLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/checkin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            moodScore: mood,
            stressScore: stress,
            sleepScore: sleep,
            note: note.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save check-in");
      }

      setMessage("✅ 今日 Check-in 已儲存");

      setMood(null);
      setStress(null);
      setSleep(null);
      setNote("");
    } catch (error) {
      console.error("Check-in submit error:", error);

      setMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ 儲存 Check-in 時發生錯誤"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Link
            to="/"
            className="text-sm font-medium text-slate-500 transition hover:text-indigo-600"
          >
            ← 返回首頁
          </Link>

          <h1 className="mt-5 text-3xl font-bold text-slate-900 sm:text-4xl">
            今日 Check-in
          </h1>

          <p className="mt-3 leading-7 text-slate-600">
            不需要全部填完，選擇今天想記錄的內容就好。
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <section className="mb-9">
            <div className="mb-4">
              <h2 className="font-semibold text-slate-800">
                今天的心情如何？
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                選填
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {moodOptions.map((option) => {
                const selected = mood === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setMood(selected ? null : option.value)
                    }
                    className={`rounded-2xl border p-3 text-center transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-3xl">
                      {option.emoji}
                    </div>

                    <div
                      className={`mt-2 text-xs font-medium ${
                        selected
                          ? "text-indigo-700"
                          : "text-slate-500"
                      }`}
                    >
                      {option.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mb-9">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">
                  🔥 壓力
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  選填
                </p>
              </div>

              {stress !== null && (
                <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
                  {stress} / 10
                </span>
              )}
            </div>

            <input
              type="range"
              min="1"
              max="10"
              value={stress ?? 1}
              onChange={(e) =>
                setStress(Number(e.target.value))
              }
              className="w-full text-orange-500"
              style={{
                background: `linear-gradient(
                  to right,
                  #f97316 0%,
                  #f97316 ${
                    stress === null
                      ? 0
                      : ((stress - 1) / 9) * 100
                  }%,
                  #e2e8f0 ${
                    stress === null
                      ? 0
                      : ((stress - 1) / 9) * 100
                  }%,
                  #e2e8f0 100%
                )`,
              }}
            />

            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>1 輕鬆</span>
              <span>10 壓力很大</span>
            </div>

            {stress !== null && (
              <button
                type="button"
                onClick={() => setStress(null)}
                className="mt-3 text-xs text-slate-400 underline hover:text-slate-600"
              >
                清除壓力紀錄
              </button>
            )}
          </section>

          <section className="mb-9">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">
                  😴 睡眠
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  選填
                </p>
              </div>

              {sleep !== null && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  {sleep} / 10
                </span>
              )}
            </div>

            <input
              type="range"
              min="1"
              max="10"
              value={sleep ?? 1}
              onChange={(e) =>
                setSleep(Number(e.target.value))
              }
              className="w-full text-emerald-500"
              style={{
                background: `linear-gradient(
                  to right,
                  #10b981 0%,
                  #10b981 ${
                    sleep === null
                      ? 0
                      : ((sleep - 1) / 9) * 100
                  }%,
                  #e2e8f0 ${
                    sleep === null
                      ? 0
                      : ((sleep - 1) / 9) * 100
                  }%,
                  #e2e8f0 100%
                )`,
              }}
            />

            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>1 很差</span>
              <span>10 很好</span>
            </div>

            {sleep !== null && (
              <button
                type="button"
                onClick={() => setSleep(null)}
                className="mt-3 text-xs text-slate-400 underline hover:text-slate-600"
              >
                清除睡眠紀錄
              </button>
            )}
          </section>

          <section className="mb-8">
            <label className="mb-3 block font-semibold text-slate-800">
              💬 今天有什麼想記錄的？
            </label>

            <p className="mb-3 text-sm text-slate-400">
              選填，只想寫幾句也可以。
            </p>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              placeholder="例如：今天事情很多，有點累，但晚上和朋友聊天後好多了。"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />
          </section>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-2xl bg-indigo-600 px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "儲存中..."
              : "完成今日 Check-in"}
          </button>

          {message && (
            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-700">
              {message}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-6 text-slate-400">
          MindBridge AI 提供一般性的心理狀態紀錄與支持資訊，
          不作為醫療診斷用途。
        </p>
      </div>
    </main>
  );
}

export default Checkin;
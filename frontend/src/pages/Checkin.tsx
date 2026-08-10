import { useState } from "react";
import { Link } from "react-router";

function Checkin() {
  const [mood, setMood] = useState(3);
  const [stress, setStress] = useState(3);
  const [sleep, setSleep] = useState(3);
  const [note, setNote] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const userId = localStorage.getItem("mindbridge_user_id");

    if (!userId) {
      setMessage("❌ 找不到使用者資料，請先回到首頁重新整理。");
      return;
    }
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          moodScore: mood,
          stressScore: stress,
          sleepScore: sleep,
          note: note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "儲存失敗");
      }

      setMessage("✅ 今日紀錄已成功儲存！");
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setMessage(`❌ ${error.message}`);
      } else {
        setMessage("❌ 儲存失敗，請稍後再試。");
      }
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
            花一點時間記錄今天的狀態，沒有標準答案，只需要照你的感受填寫。
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">

          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <label className="font-semibold text-slate-800">
                😊 心情
              </label>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                {mood} / 5
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="5"
              value={mood}
              onChange={(e) => setMood(Number(e.target.value))}
              className="w-full text-indigo-600"
              style={{
                background: `linear-gradient(
                  to right,
                #4f46e5 0%,
                #4f46e5 ${((mood - 1) / 4) * 100}%,
                #e2e8f0 ${((mood - 1) / 4) * 100}%,
                #e2e8f0 100%
              )`,
              }}
            />
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>低落</span>
              <span>很好</span>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <label className="font-semibold text-slate-800">
                🔥 壓力
              </label>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
                {stress} / 5
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="5"
              value={stress}
              onChange={(e) => setStress(Number(e.target.value))}
              className="w-full text-orange-500"
              style={{
                background: `linear-gradient(
                  to right,
                  #f97316 0%,
                  #f97316 ${((stress - 1) / 4) * 100}%,
                  #e2e8f0 ${((stress - 1) / 4) * 100}%,
                  #e2e8f0 100%
                )`,
              }}
            />

            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>輕鬆</span>
              <span>壓力很大</span>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <label className="font-semibold text-slate-800">
                😴 睡眠
              </label>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                {sleep} / 5
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="5"
              value={sleep}
              onChange={(e) => setSleep(Number(e.target.value))}
              className="w-full text-emerald-500"
              style={{
                background: `linear-gradient(
                to right,
                #10b981 0%,
                #10b981 ${((sleep - 1) / 4) * 100}%,
                #e2e8f0 ${((sleep - 1) / 4) * 100}%,
                #e2e8f0 100%
              )`,
              }}
            />

            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>很差</span>
              <span>很好</span>
            </div>
          </div>

          <div className="mb-8">
            <label className="mb-3 block font-semibold text-slate-800">
              💬 今天有什麼想記錄的？
            </label>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="例如：今天報告很多、有點累，但晚上和朋友聊天後好多了。"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-2xl bg-indigo-600 px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "儲存中..." : "完成今日 Check-in"}
          </button>

          {message && (
            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-700">
              {message}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-6 text-slate-400">
          MindBridge AI 提供的是一般性的心理狀態紀錄與支持資訊，
          不作為醫療診斷用途。
        </p>

      </div>
    </main>
  );
}

export default Checkin;
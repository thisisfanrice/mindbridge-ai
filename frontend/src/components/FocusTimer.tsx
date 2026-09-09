import { useEffect, useState } from "react";

const FOCUS_SECONDS = 15 * 60;

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function FocusTimer({ startSignal = 0 }: { startSignal?: number }) {
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (startSignal <= 0) return;
    setSecondsLeft(FOCUS_SECONDS);
    setIsCompleted(false);
    setIsRunning(true);
  }, [startSignal]);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);

          setIsRunning(false);
          setIsCompleted(true);
          setCompletedCount((count) => count + 1);

          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isRunning, secondsLeft]);

  const handleStart = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(FOCUS_SECONDS);
      setIsCompleted(false);
    }

    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(FOCUS_SECONDS);
    setIsCompleted(false);
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="text-center">
        <p className="text-sm font-medium text-slate-500">
          15 分鐘專注時間
        </p>

        <div className="mt-3 text-5xl font-bold tracking-wider text-slate-900">
          {formatTime(secondsLeft)}
        </div>

        <p className="mt-3 text-sm text-slate-500">
          先專心完成眼前的一小步，不用一次處理全部。
        </p>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {!isRunning ? (
          <button
            type="button"
            onClick={handleStart}
            className="rounded-2xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            {secondsLeft === FOCUS_SECONDS
              ? "開始專注"
              : secondsLeft === 0
              ? "再來 15 分鐘"
              : "繼續"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePause}
            className="rounded-2xl bg-slate-700 px-6 py-3 font-semibold text-white hover:bg-slate-800"
          >
            暫停
          </button>
        )}

        <button
          type="button"
          onClick={handleReset}
          className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
        >
          重設
        </button>
      </div>

      {isCompleted && (
        <div className="mt-6 animate-pulse rounded-2xl bg-indigo-50 p-5 text-center">
          <p className="text-lg font-bold text-indigo-700">
            ✓ 15 分鐘專注完成
          </p>

          <p className="mt-1 text-sm text-indigo-600">
            這次的小目標完成了，可以先休息一下。
          </p>
        </div>
      )}

      {completedCount > 0 && (
        <p className="mt-4 text-center text-sm text-slate-500">
          今天已完成 {completedCount} 次專注
        </p>
      )}
    </div>
  );
}

export default FocusTimer;
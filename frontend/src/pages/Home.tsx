import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LumiStatusBar from "../components/LumiStatusBar";
import {
  DEFAULT_NICKNAME,
  getAnonymousAvatar,
  isAnonymousAvatarId,
  type AnonymousProfile,
} from "../lib/anonymousAvatar";

function Home() {
  const navigate = useNavigate();
  const [checkingUser, setCheckingUser] = useState(true);
  const [setupError, setSetupError] = useState("");
  const [anonymousProfile, setAnonymousProfile] =
    useState<AnonymousProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    const setupAnonymousUser = async () => {
      try {
        setSetupError("");

        let userId = localStorage.getItem("mindbridge_user_id");

        // 1. 沒有匿名使用者才建立
        if (!userId) {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/users`,
            { method: "POST" }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Unable to create user");
          }

          userId = data.data.user_id;
          if (userId) {
            localStorage.setItem("mindbridge_user_id", userId);
          }
        }

        // 2. 一律向後端查詢正式完成狀態
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/profile/${userId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load profile");
        }

        const profile = data.data;

        // 使用後端資料顯示目前匿名使用者的頭像與暱稱。
        if (!cancelled && userId) {
          setAnonymousProfile({
            userId,
            nickname:
              typeof profile?.nickname === "string" && profile.nickname.trim()
                ? profile.nickname.trim()
                : DEFAULT_NICKNAME,
            avatarId: isAnonymousAvatarId(profile?.avatar_id)
              ? profile.avatar_id
              : "animal-cat",
          });
        }

        // 3. 只有後端正式標記完成，才視為已完成
        const completed =
          profile?.has_completed_onboarding === true;

        localStorage.setItem(
          "mindbridge_has_completed_onboarding",
          completed ? "true" : "false"
        );

        if (!completed && !cancelled) {
          navigate("/onboarding", { replace: true });
        }
      } catch (error) {
        console.error("Anonymous user setup failed:", error);

        if (!cancelled) {
          setSetupError(
            error instanceof Error
              ? error.message
              : "載入使用者資料時發生錯誤"
          );
        }
      } finally {
        if (!cancelled) {
          setCheckingUser(false);
        }
      }
    };

    setupAnonymousUser();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (checkingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-slate-500">正在準備 MindBridge...</p>
      </main>
    );
  }

  if (setupError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="font-semibold text-slate-800">
            暫時無法載入使用者資料
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {setupError}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white"
          >
            重新載入
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-12">

        {/* Header */}
        <header className="mb-12 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wide text-indigo-600">
              MINDBRIDGE AI
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              了解你的心理狀態變化
            </h1>
          </div>

          <Link
            to="/profile"
            aria-label={`個人設定：${anonymousProfile?.nickname ?? DEFAULT_NICKNAME}`}
            className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-2xl"
              aria-hidden="true"
            >
              {getAnonymousAvatar(anonymousProfile?.avatarId).emoji}
            </span>
            <span className="min-w-0 text-left">
              <span className="block max-w-40 truncate text-sm font-semibold text-slate-800">
                {anonymousProfile?.nickname ?? DEFAULT_NICKNAME}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                ⚙ 個人設定
              </span>
            </span>
          </Link>
        </header>

        <LumiStatusBar
          posture="listening"
          title="Lumi 陪伴中"
          message="可以用自己的步調，記錄今天的心情與想法。"
          className="mb-8"
        />

        {/* Main content */}
        <section className="grid flex-1 items-center gap-10 lg:grid-cols-2">

          {/* 左側 Hero */}
          <div>
            <p className="mb-4 inline-flex rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
              每天 30 秒，累積更清楚的自己
            </p>

            <h2 className="max-w-xl text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
              不只是記錄心情，
              <span className="block text-indigo-600">
                而是看見長期趨勢
              </span>
            </h2>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              MindBridge AI 透過每日 Check-in，整理心情、壓力與睡眠紀錄，
              幫助你觀察近期變化，並提供個人化的狀態洞察。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/checkin"
                className="rounded-xl bg-indigo-600 px-6 py-3 text-center font-semibold text-white"
              >
                開始今日 Check-in
              </Link>

              <Link
                to="/history"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-700"
              >
                查看狀態趨勢
              </Link>

              <Link
                to="/tutor"
                className="rounded-xl bg-violet-100 px-6 py-3 text-center font-semibold text-violet-700 hover:bg-violet-200"
              >
                開啟伴讀模式
              </Link>
            </div>
          </div>

          {/* 右側功能卡 */}
          <div className="grid gap-4 sm:grid-cols-2">

            {/* 每日狀態紀錄 */}
            <Link
              to="/checkin"
              className="group rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-1 hover:shadow-md hover:ring-indigo-200"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="text-3xl">
                  😊
                </div>

                <span className="text-xl text-slate-300 transition duration-200 group-hover:translate-x-1 group-hover:text-indigo-500">
                  →
                </span>
              </div>

              <h3 className="text-lg font-semibold text-slate-900">
                每日狀態紀錄
              </h3>

              <p className="mt-2 leading-7 text-slate-600">
                快速記錄心情、壓力、睡眠與近期事件。
              </p>

              <p className="mt-4 text-sm font-medium text-indigo-600 opacity-0 transition group-hover:opacity-100">
                開始記錄
              </p>
            </Link>

            {/* 趨勢分析 */}
            <Link
              to="/history"
              className="group rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-1 hover:shadow-md hover:ring-indigo-200"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="text-3xl">
                  📈
                </div>

                <span className="text-xl text-slate-300 transition duration-200 group-hover:translate-x-1 group-hover:text-indigo-500">
                  →
                </span>
              </div>

              <h3 className="text-lg font-semibold text-slate-900">
                趨勢分析
              </h3>

              <p className="mt-2 leading-7 text-slate-600">
                從單次感受變成可以觀察的長期變化。
              </p>

              <p className="mt-4 text-sm font-medium text-indigo-600 opacity-0 transition group-hover:opacity-100">
                查看趨勢
              </p>
            </Link>

            {/* 智慧狀態洞察 */}
            <Link
              to="/history"
              className="group rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-1 hover:shadow-md hover:ring-indigo-200 sm:col-span-2"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="text-3xl">
                  💡
                </div>

                <span className="text-xl text-slate-300 transition duration-200 group-hover:translate-x-1 group-hover:text-indigo-500">
                  →
                </span>
              </div>

              <h3 className="text-lg font-semibold text-slate-900">
                智慧狀態洞察
              </h3>

              <p className="mt-2 leading-7 text-slate-600">
                根據近期紀錄整理值得留意的變化，
                提供一般性的支持與自我觀察方向。
              </p>

              <p className="mt-4 text-sm font-medium text-indigo-600 opacity-0 transition group-hover:opacity-100">
                查看洞察
              </p>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
          MindBridge AI · AI 心理健康趨勢洞察與智慧支持平台
        </footer>
      </div>
    </main>
  );
}

export default Home;
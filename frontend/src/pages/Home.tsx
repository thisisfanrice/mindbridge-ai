import { useEffect } from "react";
import { Link } from "react-router";

function Home() {
  useEffect(() => {
    console.log("Home useEffect is running");

    const setupAnonymousUser = async () => {
      const existingUserId = localStorage.getItem("mindbridge_user_id");

      if (existingUserId) {
        console.log("Existing anonymous user:", existingUserId);
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users`, {
          method: "POST",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to create user");
        }

        const newUserId = data.data.user_id;

        localStorage.setItem("mindbridge_user_id", newUserId);

        console.log("New anonymous user created:", newUserId);
      } catch (error) {
        console.error("Anonymous user setup failed:", error);
      }
    };

    setupAnonymousUser();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-12">

        <header className="mb-12 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-indigo-600">
              MINDBRIDGE AI
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              了解你的心理狀態變化
            </h1>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 lg:grid-cols-2">

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
                className="rounded-xl bg-indigo-600 px-6 py-3 text-center font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                開始今日 Check-in
              </Link>

              <Link
                to="/history"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                查看狀態趨勢
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 text-3xl">😊</div>
              <h3 className="text-lg font-semibold text-slate-900">
                每日狀態紀錄
              </h3>
              <p className="mt-2 leading-7 text-slate-600">
                快速記錄心情、壓力、睡眠與近期事件。
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 text-3xl">📈</div>
              <h3 className="text-lg font-semibold text-slate-900">
                趨勢分析
              </h3>
              <p className="mt-2 leading-7 text-slate-600">
                從單次感受變成可以觀察的長期變化。
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:col-span-2">
              <div className="mb-4 text-3xl">💡</div>
              <h3 className="text-lg font-semibold text-slate-900">
                智慧狀態洞察
              </h3>
              <p className="mt-2 leading-7 text-slate-600">
                根據近期紀錄整理值得留意的變化，提供一般性的支持與自我觀察方向。
              </p>
            </div>
          </div>

        </section>

        <footer className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
          MindBridge AI · AI 心理健康趨勢洞察與智慧支持平台
        </footer>
      </div>
    </main>
  );
}

export default Home;
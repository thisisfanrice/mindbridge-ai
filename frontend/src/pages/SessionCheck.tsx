import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type CheckResult = {
  status: number | null;
  hasValidSession: boolean;
  hasLegacyUser: boolean;
  sameAsLegacy: boolean | null;
  message: string;
};

export default function SessionCheck() {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const legacyUserId = localStorage.getItem("mindbridge_user_id");
        const apiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

        const response = await fetch(`${apiUrl}/api/session/me`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = await response.json();
        const hasValidSession = response.ok && data.success === true;
        const sessionUserId = hasValidSession ? data.data?.user_id : null;

        if (!cancelled) {
          setResult({
            status: response.status,
            hasValidSession,
            hasLegacyUser: Boolean(legacyUserId),
            sameAsLegacy:
              hasValidSession && legacyUserId
                ? sessionUserId === legacyUserId
                : null,
            message:
              response.status === 401
                ? "目前瀏覽器沒有有效的 Cookie Session。"
                : hasValidSession
                  ? "目前瀏覽器有有效的 Cookie Session。"
                  : "Session 檢查未成功，請確認後端狀態。",
          });
        }
      } catch {
        if (!cancelled) {
          setResult({
            status: null,
            hasValidSession: false,
            hasLegacyUser: Boolean(
              localStorage.getItem("mindbridge_user_id")
            ),
            sameAsLegacy: null,
            message: "無法連線或讀取 Session 回覆，請確認本機後端正在執行。",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-indigo-600">
          MindBridge 心訊號 · LOCAL DEV
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          身份狀態檢查
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          此頁僅用於本機開發，進行唯讀檢查，不會建立帳號或變更資料。
        </p>

        {loading ? (
          <p className="mt-6 text-slate-500">正在檢查 Session...</p>
        ) : result ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">HTTP 狀態碼</p>
              <p className="mt-1 text-xl font-semibold">
                {result.status ?? "連線失敗"}
              </p>
            </div>

            <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
              <p>
                有效 Cookie Session：
                <strong>{result.hasValidSession ? "有" : "無"}</strong>
              </p>
              <p>
                舊版 localStorage 身份：
                <strong>{result.hasLegacyUser ? "有" : "無"}</strong>
              </p>
              <p>
                Session 與舊身份相同：
                <strong>
                  {result.sameAsLegacy === null
                    ? "無法比較"
                    : result.sameAsLegacy
                      ? "相同"
                      : "不同"}
                </strong>
              </p>
            </div>

            <p className="text-sm leading-7 text-slate-600">
              {result.message}
            </p>

            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              此檢查不能證明舊 UUID 的所有權，也不代表帳號已完成遷移。
              請勿清除瀏覽器資料或使用此頁認領舊帳號。
            </p>
          </div>
        ) : null}

        <Link
          to="/"
          className="mt-6 inline-block text-sm font-medium text-indigo-600"
        >
          返回首頁
        </Link>
      </div>
    </main>
  );
}
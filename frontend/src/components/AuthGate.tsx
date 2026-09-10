import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createAnonymousSession, getAnonymousSession, SessionHttpError } from "../lib/anonymousSession";
import { activateSession, LEGACY_KEY, SESSION_KEY } from "../lib/sessionState";

type State =
  | { kind: "checking" }
  | { kind: "missing"; hasLegacy: boolean }
  | { kind: "confirm"; userId: string; hasLegacy: boolean }
  | { kind: "ready"; userId: string }
  | { kind: "error"; message: string }
  | { kind: "creating" };

export default function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ kind: "checking" });

  const check = useCallback(async () => {
    setState({ kind: "checking" });
    try {
      const response = await getAnonymousSession();
      const userId = response.data.user_id;
      const previous = localStorage.getItem(LEGACY_KEY);
      const knownSession = localStorage.getItem(SESSION_KEY);
      if (previous && previous !== userId && knownSession !== userId) {
        setState({ kind: "confirm", userId, hasLegacy: true });
      } else {
        activateSession(userId);
        setState({ kind: "ready", userId });
      }
    } catch (error) {
      if (error instanceof SessionHttpError && error.status === 401) {
        setState({ kind: "missing", hasLegacy: Boolean(localStorage.getItem(LEGACY_KEY)) });
      } else {
        setState({ kind: "error", message: "無法確認 Session，請檢查本機後端與資料庫連線。" });
      }
    }
  }, []);

  useEffect(() => {
    void check();
    const expired = () => void check();
    window.addEventListener("mindbridge:session-expired", expired);
    return () => window.removeEventListener("mindbridge:session-expired", expired);
  }, [check]);

  const startNew = async () => {
    setState({ kind: "creating" });
    try {
      const response = await createAnonymousSession();
      const userId = response.data.user_id;
      activateSession(userId);
      setState({ kind: "ready", userId });
    } catch (error) {
      if (error instanceof SessionHttpError && error.status === 409) {
        await check();
      } else {
        setState({ kind: "error", message: "建立 Session 失敗。沒有切換或清除原本的資料。" });
      }
    }
  };

  if (state.kind === "ready") {
    return <div key={state.userId}>{children}</div>;
  }

  return (
    <main className="min-h-screen mindbridge-page px-5 py-12">
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-indigo-600">MindBridge 心訊號 · LOCAL DEMO</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">匿名身份確認</h1>
        {state.kind === "checking" || state.kind === "creating" ? (
          <p className="mt-4 text-slate-600">{state.kind === "creating" ? "正在建立新 Session..." : "正在確認目前身份..."}</p>
        ) : state.kind === "error" ? (
          <>
            <p role="alert" className="mt-4 text-sm leading-7 text-red-700">{state.message}</p>
            <button type="button" onClick={() => void check()} className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white">重新檢查</button>
          </>
        ) : state.kind === "confirm" ? (
          <>
            <p className="mt-4 leading-7 text-slate-600">瀏覽器已有有效 Cookie Session，但它與目前保存的舊版身份不同。這可能是先前建立的測試帳號。</p>
            <p className="mt-3 text-sm leading-7 text-amber-800">繼續後會顯示 Cookie 所屬帳號的資料，並保留舊身份供日後可信遷移。這不會合併或刪除舊資料。</p>
            <button type="button" onClick={() => { activateSession(state.userId); setState({ kind: "ready", userId: state.userId }); }} className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white">繼續使用目前 Session</button>
          </>
        ) : (
          <>
            <p className="mt-4 leading-7 text-slate-600">目前沒有有效的 Cookie Session。{state.hasLegacy ? "偵測到舊版匿名身份，但只有 UUID 無法證明帳號所有權。" : "尚未建立新的匿名身份。"}</p>
            {state.hasLegacy && <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-900">建立新帳號會顯示全新的空白資料，不會轉移舊 Check-in、頭像或反思。舊資料仍保留在資料庫與備份中，不能只憑 UUID 認領。</p>}
            <p className="mt-3 text-sm leading-7 text-slate-500">本機 Demo 尚未提供帳號恢復功能。請勿清除 Cookie、瀏覽器資料或登出；正式使用前必須完成安全恢復機制。</p>
            <button type="button" onClick={() => void startNew()} className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white">我了解，建立新的匿名帳號</button>
          </>
        )}
      </section>
    </main>
  );
}

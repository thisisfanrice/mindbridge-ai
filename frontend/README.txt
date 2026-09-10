MindBridge Lumi W4 素材與共用元件

將 public/mascots/ 的八張圖片複製到 frontend/public/mascots/
將 src/components/LumiStatusBar.tsx 複製到 frontend/src/components/

對應（已依團隊確認）：
情緒 1 → mascot-6.png
情緒 2 → mascot-5.png
情緒 3 → mascot-4.png
情緒 4 → mascot-3.png
情緒 5 → mascot-2.png
情緒 6 → mascot-1.png
tutoring → mascot-7.png（鉛筆）
listening → mascot-8.png（耳機）

本元件只處理顯示與瀏覽器 TTS，不呼叫 AI、不儲存心情資料。
postureState 僅接受 listening / tutoring，未提供時使用 posture。
moodScore 有效時優先顯示對應情緒造型；一般狀態膠囊不必傳入。

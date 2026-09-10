import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Checkin from "./pages/Checkin";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Tutor from "./pages/Tutor";
import Onboarding from "./pages/Onboarding";
import AuthGate from "./components/AuthGate";

function App() {
  return (
    <AuthGate>
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/checkin" element={<Checkin />} />
      <Route path="/history" element={<History />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/tutor" element={<Tutor />} />
      </Routes>
    </AuthGate>
  );
}

export default App;
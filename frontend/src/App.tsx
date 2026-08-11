import { Routes, Route } from "react-router";
import Home from "./pages/Home";
import Checkin from "./pages/Checkin";
import History from "./pages/History";
import Profile from "./pages/Profile";


function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/checkin" element={<Checkin />} />
      <Route path="/history" element={<History />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  );
}

export default App;
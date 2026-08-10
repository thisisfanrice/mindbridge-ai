import { Routes, Route } from "react-router";
import Home from "./pages/Home";
import Checkin from "./pages/Checkin";
import History from "./pages/History";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/checkin" element={<Checkin />} />
      <Route path="/history" element={<History />} />
    </Routes>
  );
}

export default App;
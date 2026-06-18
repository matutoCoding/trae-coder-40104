import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Lobby from "@/pages/Lobby";
import Billing from "@/pages/Billing";
import Bills from "@/pages/Bills";
import Schedule from "@/pages/Schedule";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Lobby />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/schedule" element={<Schedule />} />
        </Route>
      </Routes>
    </Router>
  );
}

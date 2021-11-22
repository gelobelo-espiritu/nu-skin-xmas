import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import "./App.css";
import Members from "./screens/members";
import Admin from "./screens/admin";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/members" element={<Members />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}

export default App;

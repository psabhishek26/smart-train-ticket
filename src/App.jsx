import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Admin from "./pages/Admin/Admin";
import QrGenerator from "./pages/QrGenerator/QrGenerator";
import QrScan from "./pages/QrScan/QrScan";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QrScan />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/gen" element={<QrGenerator />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

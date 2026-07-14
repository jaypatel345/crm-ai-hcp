import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import api from "./api/api";
import Home from "./pages/Home";
import Navbar from "./components/Navbar";

function App() {
  useEffect(() => {
    api
      .get("/")
      .then((response) => {
        console.log("Backend reply:", response.data);
      })
      .catch((error) => {
        console.error("API connection failed:", error);
      });
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

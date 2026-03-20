import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import HotspotMap from "./pages/HotspotMap";
import RouteAnalysis from "./pages/RouteAnalysis";
import About from "./pages/About";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<HotspotMap />} />
            <Route path="/analysis" element={<RouteAnalysis />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
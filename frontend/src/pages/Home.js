import { useNavigate } from "react-router-dom";
import "./Home.css";

const stats = [
  { value: "1.19M", label: "Road deaths/year globally", color: "var(--red)" },
  { value: "50M+",  label: "Injuries annually",         color: "var(--orange)" },
  { value: "90%",   label: "In low/middle income nations", color: "var(--yellow)" },
];

const features = [
  {
    icon: "🗺️",
    title: "Interactive Route Map",
    desc: "Enter source & destination to instantly visualize your path with live hotspot overlays.",
  },
  {
    icon: "🔴",
    title: "Risk Severity Zones",
    desc: "Color-coded circles (High / Medium / Low) pinpoint danger clusters along your route.",
  },
  {
    icon: "🤖",
    title: "ML-Powered Predictions",
    desc: "A Random Forest model trained on historical accident data predicts risk levels accurately.",
  },
  {
    icon: "📊",
    title: "Route Analysis",
    desc: "Get a breakdown of hotspot counts by risk category for any route you query.",
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      {/* ── Background Blobs ── */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      {/* ── Hero ── */}
      <section className="hero">

        <h1 className="hero-title fade-up fade-up-1">
          Identify Road Accident
          <br />
          <span className="gradient-text">Hotspots</span> Before You Drive
        </h1>

        <p className="hero-sub fade-up fade-up-2">
          A machine-learning powered web app that maps historical accident data
          onto your travel route — so you can make safer, smarter decisions.
        </p>

        <div className="hero-actions fade-up fade-up-3">
          <button className="btn-primary" onClick={() => navigate("/map")}>
            🗺 Open Live Map
          </button>
          <button className="btn-ghost" onClick={() => navigate("/about")}>
            Learn More
          </button>
        </div>

        {/* Stats Bar */}
        <div className="stats-bar fade-up fade-up-4">
          {stats.map((s) => (
            <div className="stat-item" key={s.label}>
              <span className="stat-value" style={{ color: s.color }}>{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features-section">
        <p className="section-label" style={{ textAlign: "center" }}>What It Does</p>
        <h2 className="features-title">Built to keep you informed</h2>

        <div className="features-grid">
          {features.map((f, i) => (
            <div
              className="feature-card"
              key={f.title}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <span className="feature-icon">{f.icon}</span>
              <h3 className="feature-card-title">{f.title}</h3>
              <p className="feature-card-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="how-section">
        <p className="section-label" style={{ textAlign: "center" }}>How It Works</p>
        <h2 className="features-title">3 steps to safer travel</h2>

        <div className="steps-row">
          {[
            { num: "01", title: "Enter Your Route",   desc: "Type source & destination in the map page." },
            { num: "02", title: "We Analyse the Path", desc: "Backend fetches the route and filters accident hotspots within 500m of your path." },
            { num: "03", title: "See Risk Zones",      desc: "Hotspots are displayed with color-coded severity, powered by our ML model." },
          ].map((step) => (
            <div className="step-card" key={step.num}>
              <span className="step-num">{step.num}</span>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="cta-banner">
        <h2 className="cta-title">Ready to explore your route?</h2>
        <button className="btn-primary" onClick={() => navigate("/map")}>
          Launch the Map →
        </button>
      </section>
    </div>
  );
}
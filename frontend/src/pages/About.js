import "./About.css";

const team = [
  { name: "Santosh", role: "Frontend Developer",      emoji: "💻" },
  { name: "Sumalatha", role: "Backend Developer",       emoji: "⚙️" },
  { name: "Varshitha", role: "ML Engineer",             emoji: "🤖" },
  { name: "Nasserou", role: "Data & Documentation",    emoji: "📊" },
];

const techStack = [
  { layer: "Frontend",  tools: ["React.js", "Leaflet.js", "React Router", "Axios"] },
  { layer: "Backend",   tools: ["Node.js", "Express.js", "OpenRouteService API"] },
  { layer: "ML Model",  tools: ["Python", "Scikit-learn", "Random Forest", "Pandas"] },
  { layer: "Database",  tools: ["MongoDB", "GeoJSON accident dataset"] },
];

export default function About() {
  return (
    <div className="about-page">
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      {/* ── Hero ── */}
      <section className="about-hero fade-up">
        <p className="section-label">About the Project</p>
        <h1 className="about-title">
          Road Accident <span className="gradient-text">Hotspot</span> Identification System
        </h1>
        <p className="about-desc">
          A final year engineering project that combines geospatial mapping, REST APIs, 
          and machine learning to help travellers, researchers, and authorities understand 
          accident-prone zones on any road route across India.
        </p>
      </section>

      {/* ── Mission ── */}
      <section className="mission-section fade-up fade-up-1">
        <div className="mission-card">
          <span className="mission-icon">🎯</span>
          <div>
            <h3 className="mission-title">Our Mission</h3>
            <p className="mission-text">
              Road accidents claim over 1.5 lakh lives in India every year. Our system 
              visualises historical accident data on an interactive map so that anyone 
              planning a trip can instantly see which stretches of their route are 
              statistically dangerous — and plan accordingly.
            </p>
          </div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="tech-section">
        <p className="section-label" style={{ textAlign: "center" }}>Technology Stack</p>
        <h2 className="section-heading">Built with modern tools</h2>
        <div className="tech-grid">
          {techStack.map((t) => (
            <div className="tech-card" key={t.layer}>
              <h3 className="tech-layer">{t.layer}</h3>
              <div className="tech-tags">
                {t.tools.map((tool) => (
                  <span className="tech-tag" key={tool}>{tool}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Team ── */}
      <section className="team-section">
        <p className="section-label" style={{ textAlign: "center" }}>The Team</p>
        <h2 className="section-heading">Meet the developers</h2>
        <div className="team-grid">
          {team.map((member) => (
            <div className="team-card" key={member.name}>
              <span className="team-emoji">{member.emoji}</span>
              <h3 className="team-name">{member.name}</h3>
              <p className="team-role">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="contact-section">
        <div className="contact-card">
          <span className="contact-icon">📬</span>
          <h2 className="contact-title">Get In Touch</h2>
          <p className="contact-sub">
            Have feedback, suggestions, or want to collaborate? We'd love to hear from you.
          </p>
          <div className="contact-links">
            <a className="contact-link" href="mailto:spotsafe108@gmail.com">
              <span>✉️</span> spotsafe108@gmail.com
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
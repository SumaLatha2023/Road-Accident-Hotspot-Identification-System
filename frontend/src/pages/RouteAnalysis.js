import { useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./RouteAnalysis.css";

const RISK_COLORS = {
  High:   { stroke: "#ff3b3b", fill: "rgba(255,59,59,0.18)"  },
  Medium: { stroke: "#ff7c1f", fill: "rgba(255,124,31,0.18)" },
  Low:    { stroke: "#00e676", fill: "rgba(0,230,118,0.18)"  },
};

const RISK_RANK = { High: 3, Medium: 2, Low: 1 };

export default function RouteAnalysis() {
  const [city,      setCity]      = useState("");
  const [hotspots,  setHotspots]  = useState([]);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [loading,   setLoading]   = useState(false);
  const [status,    setStatus]    = useState("");
  const [searched,  setSearched]  = useState(false);

  const analyzeCity = async () => {
    if (!city.trim()) { setStatus("Please enter a city name."); return; }

    setLoading(true);
    setHotspots([]);
    setStatus("Locating city...");
    setSearched(false);

    try {
      // Step 1: Geocode the city to get its bounding box
      const geoRes = await axios.get("http://localhost:5000/geocode-city", {
        params: { city: city.trim() }
      });

      const { lat, lng, boundingBox } = geoRes.data;
      setMapCenter([lat, lng]);

      // Step 2: Send bounding box to backend — it samples a grid and predicts
      setStatus("Analysing accident risk across the city...");
      const hotspotRes = await axios.post(
        "http://localhost:5000/hotspots/city",
        { boundingBox }
      );

      const results = hotspotRes.data;
      // Sort by risk: High first
      results.sort((a, b) => (RISK_RANK[b.risk] || 0) - (RISK_RANK[a.risk] || 0));
      setHotspots(results);
      setSearched(true);

      const counts = results.reduce((acc, s) => {
        acc[s.risk] = (acc[s.risk] || 0) + 1; return acc;
      }, {});
      setStatus(
        `Found ${results.length} hotspots — ` +
        `High: ${counts.High || 0}, Medium: ${counts.Medium || 0}, Low: ${counts.Low || 0}`
      );

    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setStatus(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") analyzeCity(); };

  const counts = hotspots.reduce((acc, s) => {
    acc[s.risk] = (acc[s.risk] || 0) + 1; return acc;
  }, {});

  return (
    <div className="analysis-page">
      <div className="blob blob-1" />

      {/* ── Hero ── */}
      <section className="analysis-hero fade-up">
        <p className="section-label">City Analysis</p>
        <h1 className="analysis-title">
          Explore Risk Zones <span className="gradient-text">By City</span>
        </h1>
        <p className="analysis-sub">
          Enter a city name to identify accident-prone zones across the entire city area,
          powered by our ML model.
        </p>
      </section>

      {/* ── Search Box ── */}
      <section className="city-search fade-up fade-up-1">
        <div className="city-input-row">
          <input
            className="city-input"
            placeholder="Enter city name  e.g. Delhi, Mumbai, Jaipur"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={handleKey}
          />
          <button className="btn-primary btn-analyse" onClick={analyzeCity} disabled={loading}>
            {loading ? <span className="spinner-dark" /> : "Analyse City"}
          </button>
        </div>
        {status && <p className="city-status">{status}</p>}
      </section>

      {/* ── Stats Cards ── */}
      {searched && hotspots.length > 0 && (
        <section className="city-stats fade-up">
          {Object.entries(RISK_COLORS).map(([risk, { stroke }]) => (
            <div className="city-stat-card" key={risk} style={{ borderColor: stroke + "55" }}>
              <span className="city-stat-value" style={{ color: stroke }}>{counts[risk] || 0}</span>
              <span className="city-stat-label">{risk} Risk Zones</span>
            </div>
          ))}
          <div className="city-stat-card city-stat-total">
            <span className="city-stat-value" style={{ color: "var(--yellow)" }}>{hotspots.length}</span>
            <span className="city-stat-label">Total Hotspots</span>
          </div>
        </section>
      )}

      {/* ── Map + List side by side ── */}
      {searched && hotspots.length > 0 && (
        <section className="city-results fade-up fade-up-2">

          {/* Map */}
          <div className="city-map-wrapper">
            <p className="section-label" style={{ marginBottom: "0.75rem" }}>Hotspot Map</p>
            <div className="city-map">
              <MapContainer
                center={mapCenter}
                zoom={12}
                style={{ height: "100%", width: "100%" }}
                key={mapCenter.join(",")}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap contributors"
                />
                {hotspots.map((spot, i) => {
                  const c = RISK_COLORS[spot.risk] || RISK_COLORS.Low;
                  return (
                    <Circle
                      key={i}
                      center={[spot.lat, spot.lng]}
                      radius={600}
                      pathOptions={{ color: c.stroke, fillColor: c.fill, fillOpacity: 1, weight: 2 }}
                    >
                      <Popup>
                        <strong style={{ color: c.stroke }}>{spot.risk} Risk</strong><br />
                        <small>{spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}</small><br />
                        <small>Probability: {(spot.prob * 100).toFixed(1)}%</small>
                      </Popup>
                    </Circle>
                  );
                })}
              </MapContainer>
            </div>
          </div>

          {/* List */}
          <div className="city-list-wrapper">
            <p className="section-label" style={{ marginBottom: "0.75rem" }}>Hotspot List</p>
            <div className="city-list">
              {hotspots.map((spot, i) => {
                const c = RISK_COLORS[spot.risk] || RISK_COLORS.Low;
                return (
                  <div className="city-list-item" key={i}>
                    <span className="list-index">{i + 1}</span>
                    <div className="list-coords">
                      <span className="list-lat">Lat: {spot.lat.toFixed(5)}</span>
                      <span className="list-lng">Lng: {spot.lng.toFixed(5)}</span>
                    </div>
                    <span className="list-prob">{(spot.prob * 100).toFixed(1)}%</span>
                    <span className="list-risk" style={{ color: c.stroke, borderColor: c.stroke + "44" }}>
                      {spot.risk}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </section>
      )}

      {searched && hotspots.length === 0 && !loading && (
        <div className="no-results">No hotspots found for this city. Try a larger city.</div>
      )}
    </div>
  );
}
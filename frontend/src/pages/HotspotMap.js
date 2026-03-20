import { useEffect, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Circle, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./HotspotMap.css";

const RISK_COLORS = {
  High:   { stroke: "#ff3b3b", fill: "rgba(255,59,59,0.18)"  },
  Medium: { stroke: "#ff7c1f", fill: "rgba(255,124,31,0.18)" },
  Low:    { stroke: "#00e676", fill: "rgba(0,230,118,0.18)"  },
};

export default function HotspotMap() {
  const [filteredHotspots, setFilteredHotspots] = useState([]);
  const [routeCoords,      setRouteCoords]      = useState([]);
  const [source,           setSource]           = useState("");
  const [destination,      setDestination]      = useState("");
  const [loading,          setLoading]          = useState(false);
  const [status,           setStatus]           = useState("");
  const [stats,            setStats]            = useState(null);

  useEffect(() => {
    if (filteredHotspots.length === 0) { setStats(null); return; }
    const counts = filteredHotspots.reduce(
      (acc, s) => { acc[s.risk] = (acc[s.risk] || 0) + 1; return acc; },
      {}
    );
    setStats(counts);
  }, [filteredHotspots]);

  const getRoute = async () => {
    if (!source.trim() || !destination.trim()) {
      setStatus("Please enter both source and destination.");
      return;
    }

    setLoading(true);
    setFilteredHotspots([]);
    setRouteCoords([]);
    setStats(null);

    try {
      // Step 1: Geocode source
      setStatus("Finding source location...");
      const srcRes = await axios.get("http://localhost:5000/geocode", {
        params: { place: source }
      });
      const { lat: srcLat, lng: srcLng } = srcRes.data;

      // Step 2: Geocode destination (sequential — Nominatim rate limit)
      setStatus("Finding destination location...");
      const destRes = await axios.get("http://localhost:5000/geocode", {
        params: { place: destination }
      });
      const { lat: destLat, lng: destLng } = destRes.data;

      // Step 3: Get route
      setStatus("Fetching route...");
      const routeRes = await axios.get("http://localhost:5000/route", {
        params: { srcLat, srcLng, destLat, destLng }
      });

      const coords = routeRes.data.routes[0].geometry.coordinates.map(
        ([lng, lat]) => [lat, lng]
      );
      setRouteCoords(coords);

      // Step 4: Get hotspots along route — send only bounding box, not all coords
      setStatus("Finding accident hotspots along route...");
      const lats = coords.map(([lat]) => lat);
      const lngs = coords.map(([, lng]) => lng);
      const bounds = {
        minLat: Math.min(...lats) - 0.05,
        maxLat: Math.max(...lats) + 0.05,
        minLng: Math.min(...lngs) - 0.05,
        maxLng: Math.max(...lngs) + 0.05,
        // Send only every 20th point for filtering — enough accuracy
        routeCoords: coords.filter((_, i) => i % 20 === 0)
      };

      const hotspotRes = await axios.post(
        "http://localhost:5000/hotspots/along-route",
        bounds
      );

      setFilteredHotspots(hotspotRes.data);
      setStatus(
        hotspotRes.data.length > 0
          ? `Found ${hotspotRes.data.length} accident hotspot(s) along your route.`
          : "No significant hotspots found along this route."
      );
    } catch (err) {
      console.error("Route error:", err);
      const msg = err.response?.data?.error || err.message || "Something went wrong.";
      setStatus(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") getRoute(); };

  const resetMap = () => {
    setSource("");
    setDestination("");
    setRouteCoords([]);
    setFilteredHotspots([]);
    setStatus("");
    setStats(null);
  };

  return (
    <div className="map-page">
      <aside className="map-sidebar">
        <h2 className="sidebar-title">Route Planner</h2>
        <p className="sidebar-sub">
          Enter source and destination. Our ML model highlights accident
          hotspots along your route using real historical data.
        </p>

        <div className="input-group">
          <label className="input-label">Source</label>
          <input
            className="map-input"
            placeholder="e.g. Delhi"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Destination</label>
          <input
            className="map-input"
            placeholder="e.g. Hyderabad"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <button className="btn-search" onClick={getRoute} disabled={loading}>
          {loading ? <span className="spinner" /> : "Show Route"}
        </button>

        <button className="btn-reset" onClick={resetMap}>Reset</button>

        {status && <p className="status-msg">{status}</p>}

        <div className="legend">
          <p className="section-label" style={{ marginBottom: "0.75rem" }}>Risk Legend</p>
          {Object.entries(RISK_COLORS).map(([risk, { stroke }]) => (
            <div className="legend-item" key={risk}>
              <span className="legend-dot" style={{ background: stroke }} />
              <span className="legend-label">{risk} Risk</span>
            </div>
          ))}
        </div>

        {stats && (
          <div className="stats-panel">
            <p className="section-label" style={{ marginBottom: "0.75rem" }}>Hotspots on Route</p>
            {Object.entries(stats).map(([risk, count]) => (
              <div className="stat-row" key={risk}>
                <span className="stat-name" style={{ color: RISK_COLORS[risk]?.stroke || "var(--white)" }}>
                  {risk}
                </span>
                <span className="stat-count">{count}</span>
              </div>
            ))}
            <div className="stat-row stat-total">
              <span className="stat-name">Total</span>
              <span className="stat-count">{filteredHotspots.length}</span>
            </div>
          </div>
        )}
      </aside>

      <div className="map-container-wrapper">
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />

          {filteredHotspots.map((spot, i) => {
            const colors = RISK_COLORS[spot.risk] || RISK_COLORS.Low;
            return (
              <Circle
                key={i}
                center={[spot.lat, spot.lng]}
                radius={500}
                pathOptions={{
                  color:       colors.stroke,
                  fillColor:   colors.fill,
                  fillOpacity: 1,
                  weight:      2,
                }}
              >
                <Popup>
                  <div style={{ fontFamily: "sans-serif", minWidth: 130 }}>
                    <strong style={{ color: colors.stroke }}>{spot.risk} Risk</strong>
                    <br />
                    <small>{spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}</small>
                  </div>
                </Popup>
              </Circle>
            );
          })}

          {routeCoords.length > 0 && (
            <Polyline
              positions={routeCoords}
              pathOptions={{ color: "#f5c800", weight: 4, opacity: 0.85 }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
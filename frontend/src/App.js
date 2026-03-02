import { useEffect, useState } from "react";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  Circle,
  Popup,
  Polyline
} from "react-leaflet";

function App() {
  const [hotspots, setHotspots] = useState([]);
  const [routeCoords, setRouteCoords] = useState([]);

  // Input states
  const [srcLat, setSrcLat] = useState("");
  const [srcLng, setSrcLng] = useState("");
  const [destLat, setDestLat] = useState("");
  const [destLng, setDestLng] = useState("");

  // Fetch hotspots
  useEffect(() => {
    axios
      .get("http://localhost:5000/hotspots")
      .then((res) => setHotspots(res.data))
      .catch((err) => console.error(err));
  }, []);

  // Color based on risk
  const getColor = (risk) => {
    if (risk === "High") return "red";
    if (risk === "Medium") return "orange";
    return "green";
  };

  // Fetch route
  const getRoute = async () => {
    try {
      const res = await axios.get("http://localhost:5000/route", {
        params: { srcLat, srcLng, destLat, destLng }
      });

      // OSRM returns coordinates as [lng, lat]
      const coords = res.data.routes[0].geometry.coordinates.map(
        (coord) => [coord[1], coord[0]]
      );

      setRouteCoords(coords);
    } catch (error) {
      console.error("Route error:", error);
      alert("Failed to get route");
    }
  };

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Road Accident Hotspots</h2>

      {/* Input Section */}
      <div style={{ padding: "10px", textAlign: "center" }}>
        <input
          placeholder="Source Lat"
          value={srcLat}
          onChange={(e) => setSrcLat(e.target.value)}
        />
        <input
          placeholder="Source Lng"
          value={srcLng}
          onChange={(e) => setSrcLng(e.target.value)}
        />
        <input
          placeholder="Dest Lat"
          value={destLat}
          onChange={(e) => setDestLat(e.target.value)}
        />
        <input
          placeholder="Dest Lng"
          value={destLng}
          onChange={(e) => setDestLng(e.target.value)}
        />
        <button onClick={getRoute}>Show Route</button>
      </div>

      {/* Map */}
      <MapContainer
        center={[17.385, 78.486]}
        zoom={12}
        style={{ height: "500px", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Hotspots */}
        {hotspots.map((spot, index) => (
          <Circle
            key={index}
            center={[spot.lat, spot.lng]}
            radius={500}
            pathOptions={{ color: getColor(spot.risk) }}
          >
            <Popup>Risk: {spot.risk}</Popup>
          </Circle>
        ))}

        {/* Route */}
        {routeCoords.length > 0 && (
          <Polyline positions={routeCoords} color="blue" />
        )}
      </MapContainer>
    </div>
  );
}

export default App;

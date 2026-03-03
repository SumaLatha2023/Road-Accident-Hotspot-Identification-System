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
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");

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
    // 1️⃣ Get Source Coordinates
    const srcRes = await axios.get("http://localhost:5000/geocode", {
      params: { place: source }
    });

    const destRes = await axios.get("http://localhost:5000/geocode", {
      params: { place: destination }
    });

    const srcLat = srcRes.data.lat;
    const srcLng = srcRes.data.lng;
    const destLat = destRes.data.lat;
    const destLng = destRes.data.lng;

    // 2️⃣ Get Route
    const routeRes = await axios.get("http://localhost:5000/route", {
      params: { srcLat, srcLng, destLat, destLng }
    });

    const coords = routeRes.data.routes[0].geometry.coordinates.map(
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
          placeholder="Enter Source Location"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />

        <input
          placeholder="Enter Destination Location"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
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

const axios = require("axios");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

// Load hotspots data from JSON file
const hotspots = require("./hotspots.json");

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.get("/hotspots", (req, res) => {
  res.json(hotspots);
});

app.get("/route", async (req, res) => {
  const { srcLat, srcLng, destLat, destLng } = req.query;

  if (!srcLat || !srcLng || !destLat || !destLng) {
    return res.status(400).json({ error: "Source and destination required" });
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${srcLng},${srcLat};${destLng},${destLat}?overview=full&geometries=geojson`;

    const response = await axios.get(url);
    const data = response.data;
    
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch route" });
  }
});

// Geocode API (Place name → Lat/Lng)
app.get("/geocode", async (req, res) => {
  const { place } = req.query;

  if (!place) {
    return res.status(400).json({ error: "Place is required" });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${place}`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "road-accident-hotspot-app"
      }
    });

    if (response.data.length === 0) {
      return res.status(404).json({ error: "Location not found" });
    }

    const location = response.data[0];

    res.json({
      lat: parseFloat(location.lat),
      lng: parseFloat(location.lon)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Geocoding failed" });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

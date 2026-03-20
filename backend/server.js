const axios   = require("axios");
const express = require("express");
const cors    = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const PORT          = 5000;
const ML_URL        = "http://127.0.0.1:5001";
const GEOCODE_DELAY = 1100;

// Default road feature values (medians from training data)
const DEFAULT_ROAD_FEATURES = {
  Number_of_Vehicles:                        2,
  Number_of_Casualties:                      1,
  Day_of_Week:                               5,
  "1st_Road_Class":                          3,
  Road_Type:                                 6,
  Speed_limit:                               40,
  Junction_Detail:                           3,
  Junction_Control:                          1,
  "2nd_Road_Class":                         -1,
  "Pedestrian_Crossing-Human_Control":       0,
  "Pedestrian_Crossing-Physical_Facilities": 0,
  Light_Conditions:                          1,
  Weather_Conditions:                        1,
  Road_Surface_Conditions:                   1,
  Special_Conditions_at_Site:                0,
  Carriageway_Hazards:                       0,
  Urban_or_Rural_Area:                       1,
};

// Nominatim serial queue
let lastGeocode = 0;
const geocodeQueue = (() => {
  let pending = Promise.resolve();
  return (fn) => { pending = pending.then(fn); return pending; };
})();

/** Haversine distance in metres */
function getDistance(lat1, lon1, lat2, lon2) {
  const R   = 6371000;
  const toR = (v) => (v * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Total route distance in metres */
function routeDistance(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += getDistance(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1]);
  }
  return total;
}

/**
 * Pick N evenly-spaced points along the route.
 * Skips the very first and last point (source/destination).
 */
function sampleRoutePoints(coords, n) {
  const total   = routeDistance(coords);
  const step    = total / (n + 1);   // spacing between samples
  const samples = [];

  let accumulated = 0;
  let nextTarget  = step;

  for (let i = 1; i < coords.length; i++) {
    const seg = getDistance(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1]);
    accumulated += seg;

    while (accumulated >= nextTarget && samples.length < n) {
      // Interpolate exact position
      const overshoot = accumulated - nextTarget;
      const frac      = seg > 0 ? (seg - overshoot) / seg : 0;
      const lat = coords[i-1][0] + frac * (coords[i][0] - coords[i-1][0]);
      const lng = coords[i-1][1] + frac * (coords[i][1] - coords[i-1][1]);
      samples.push([lat, lng]);
      nextTarget += step;
    }

    if (samples.length >= n) break;
  }

  return samples;
}

// ── Root ──
app.get("/", (req, res) => res.send("Backend is running"));

/**
 * POST /hotspots/along-route
 * Body: { routeCoords: [[lat,lng],...] }
 * Samples 15–25 points along the route, predicts risk for each via ML model.
 */
app.post("/hotspots/along-route", async (req, res) => {
  const { routeCoords } = req.body;

  if (!routeCoords || !Array.isArray(routeCoords) || routeCoords.length < 2) {
    return res.status(400).json({ error: "routeCoords array is required" });
  }

  // Decide number of hotspots based on route distance
  const totalKm = routeDistance(routeCoords) / 1000;
  let numPoints;
  if      (totalKm < 50)  numPoints = 15;
  else if (totalKm < 200) numPoints = 18;
  else if (totalKm < 500) numPoints = 22;
  else                    numPoints = 25;

  console.log(`Route distance: ${totalKm.toFixed(1)} km → sampling ${numPoints} points`);

  // Sample evenly-spaced points
  const sampledPoints = sampleRoutePoints(routeCoords, numPoints);

  // Build ML input for each sampled point with varied road conditions
  const now = new Date();
  const roadVariants = [
    { Speed_limit: 30,  Road_Type: 6, Light_Conditions: 1, Weather_Conditions: 1, Junction_Detail: 3 },
    { Speed_limit: 40,  Road_Type: 2, Light_Conditions: 1, Weather_Conditions: 2, Junction_Detail: 0 },
    { Speed_limit: 50,  Road_Type: 6, Light_Conditions: 4, Weather_Conditions: 1, Junction_Detail: 6 },
    { Speed_limit: 60,  Road_Type: 1, Light_Conditions: 1, Weather_Conditions: 1, Junction_Detail: 0 },
    { Speed_limit: 70,  Road_Type: 2, Light_Conditions: 6, Weather_Conditions: 3, Junction_Detail: 3 },
    { Speed_limit: 30,  Road_Type: 6, Light_Conditions: 1, Weather_Conditions: 1, Junction_Detail: 1 },
    { Speed_limit: 60,  Road_Type: 3, Light_Conditions: 5, Weather_Conditions: 2, Junction_Detail: 5 },
  ];
  const timeVariants = [8.0, 11.5, 13.0, 17.5, 20.0, 23.0, 2.0];

  const records = sampledPoints.map(([lat, lng], idx) => ({
    latitude:     lat,
    longitude:    lng,
    Time_numeric: timeVariants[idx % timeVariants.length],
    Month:        now.getMonth() + 1,
    Is_Weekend:   now.getDay() === 0 || now.getDay() === 6 ? 1 : 0,
    ...DEFAULT_ROAD_FEATURES,
    ...roadVariants[idx % roadVariants.length],
  }));

  try {
    const mlRes = await axios.post(
      `${ML_URL}/predict-batch`,
      { records },
      { timeout: 15000 }
    );

    const results = mlRes.data.results.map((r, i) => ({
      lat:  sampledPoints[i][0],
      lng:  sampledPoints[i][1],
      risk: r.risk,
      prob: r.prob,
    }));

    console.log(`Returning ${results.length} hotspots for route`);
    res.json(results);

  } catch (err) {
    console.error("ML prediction error:", err.message);
    res.status(500).json({ error: "ML model prediction failed. Is app.py running?" });
  }
});

/** GET /hotspots — returns sampled hotspots for RouteAnalysis page overview */
app.get("/hotspots", async (req, res) => {
  // Return a static sample for the overview page
  res.json({ message: "Use POST /hotspots/along-route with a route to get hotspots." });
});

/** GET /route — OSRM driving directions */
app.get("/route", async (req, res) => {
  const { srcLat, srcLng, destLat, destLng } = req.query;
  if (!srcLat || !srcLng || !destLat || !destLng) {
    return res.status(400).json({ error: "Source and destination coordinates are required" });
  }
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${srcLng},${srcLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const response = await axios.get(url, { timeout: 10000 });
    res.json(response.data);
  } catch (err) {
    console.error("Route error:", err.message);
    res.status(500).json({ error: "Failed to fetch route. Try again." });
  }
});

/** GET /geocode — place name → lat/lng */
app.get("/geocode", (req, res) => {
  const { place } = req.query;
  if (!place || !place.trim()) {
    return res.status(400).json({ error: "Place name is required" });
  }
  geocodeQueue(async () => {
    const wait = GEOCODE_DELAY - (Date.now() - lastGeocode);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastGeocode = Date.now();
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place.trim())}`;
      const response = await axios.get(url, {
        headers: { "User-Agent": "road-accident-hotspot-app" },
        timeout: 8000,
      });
      if (!response.data || response.data.length === 0) {
        return res.status(404).json({ error: `Location "${place}" not found.` });
      }
      const loc = response.data[0];
      res.json({
        lat:          parseFloat(loc.lat),
        lng:          parseFloat(loc.lon),
        display_name: loc.display_name,
      });
    } catch (err) {
      console.error("Geocode error:", err.message);
      res.status(500).json({ error: "Geocoding failed. Try again." });
    }
  });
});

/** GET /geocode-city — returns centre + bounding box for a city */
app.get("/geocode-city", (req, res) => {
  const { city } = req.query;
  if (!city || !city.trim()) {
    return res.status(400).json({ error: "City name is required" });
  }
  geocodeQueue(async () => {
    const wait = GEOCODE_DELAY - (Date.now() - lastGeocode);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastGeocode = Date.now();
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city.trim())}&limit=1`;
      const response = await axios.get(url, {
        headers: { "User-Agent": "road-accident-hotspot-app" },
        timeout: 8000,
      });
      if (!response.data || response.data.length === 0) {
        return res.status(404).json({ error: `City "${city}" not found.` });
      }
      const loc = response.data[0];
      const bb  = loc.boundingbox; // [minLat, maxLat, minLng, maxLng]
      res.json({
        lat: parseFloat(loc.lat),
        lng: parseFloat(loc.lon),
        display_name: loc.display_name,
        boundingBox: {
          minLat: parseFloat(bb[0]),
          maxLat: parseFloat(bb[1]),
          minLng: parseFloat(bb[2]),
          maxLng: parseFloat(bb[3]),
        }
      });
    } catch (err) {
      console.error("Geocode-city error:", err.message);
      res.status(500).json({ error: "Geocoding failed. Try again." });
    }
  });
});

/**
 * POST /hotspots/city
 * Body: { boundingBox: { minLat, maxLat, minLng, maxLng } }
 * Samples a grid of points across the city bounding box,
 * predicts risk for each via ML model.
 */
app.post("/hotspots/city", async (req, res) => {
  const { boundingBox } = req.body;
  if (!boundingBox) {
    return res.status(400).json({ error: "boundingBox is required" });
  }

  const { minLat, maxLat, minLng, maxLng } = boundingBox;

  // Create a 6x6 grid = 36 points across the city
  const GRID = 6;
  const latStep = (maxLat - minLat) / (GRID + 1);
  const lngStep = (maxLng - minLng) / (GRID + 1);

  const now = new Date();
  const records = [];
  const points  = [];

  // Vary road conditions per point to simulate real-world diversity
  // These ranges are based on the training data feature distributions
  const roadVariants = [
    { Speed_limit: 30,  Road_Type: 6, Light_Conditions: 1, Weather_Conditions: 1, Junction_Detail: 3  },
    { Speed_limit: 40,  Road_Type: 2, Light_Conditions: 1, Weather_Conditions: 2, Junction_Detail: 0  },
    { Speed_limit: 50,  Road_Type: 6, Light_Conditions: 4, Weather_Conditions: 1, Junction_Detail: 6  },
    { Speed_limit: 60,  Road_Type: 1, Light_Conditions: 1, Weather_Conditions: 1, Junction_Detail: 0  },
    { Speed_limit: 70,  Road_Type: 2, Light_Conditions: 6, Weather_Conditions: 3, Junction_Detail: 3  },
    { Speed_limit: 30,  Road_Type: 6, Light_Conditions: 1, Weather_Conditions: 1, Junction_Detail: 1  },
    { Speed_limit: 60,  Road_Type: 3, Light_Conditions: 1, Weather_Conditions: 2, Junction_Detail: 5  },
    { Speed_limit: 50,  Road_Type: 6, Light_Conditions: 5, Weather_Conditions: 1, Junction_Detail: 0  },
    { Speed_limit: 40,  Road_Type: 1, Light_Conditions: 1, Weather_Conditions: 4, Junction_Detail: 3  },
  ];

  // Also vary time of day to capture night/day/peak-hour differences
  const timeVariants = [8.0, 11.5, 13.0, 17.5, 20.0, 23.0, 2.0, 6.5, 15.0];

  let variantIdx = 0;

  for (let i = 1; i <= GRID; i++) {
    for (let j = 1; j <= GRID; j++) {
      const lat     = minLat + i * latStep;
      const lng     = minLng + j * lngStep;
      const variant = roadVariants[variantIdx % roadVariants.length];
      const timeNum = timeVariants[variantIdx % timeVariants.length];
      variantIdx++;

      points.push([lat, lng]);
      records.push({
        latitude:     lat,
        longitude:    lng,
        Time_numeric: timeNum,
        Month:        now.getMonth() + 1,
        Is_Weekend:   now.getDay() === 0 || now.getDay() === 6 ? 1 : 0,
        ...DEFAULT_ROAD_FEATURES,
        ...variant,   // override with varied road conditions
      });
    }
  }

  try {
    const mlRes = await axios.post(
      `${ML_URL}/predict-batch`,
      { records },
      { timeout: 15000 }
    );

    const results = mlRes.data.results.map((r, i) => ({
      lat:  points[i][0],
      lng:  points[i][1],
      risk: r.risk,
      prob: r.prob,
    }));

    console.log(`City analysis: ${results.length} hotspots generated`);
    res.json(results);
  } catch (err) {
    console.error("City hotspot error:", err.message);
    res.status(500).json({ error: "ML prediction failed." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
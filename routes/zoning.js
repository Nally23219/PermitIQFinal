import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/lookup", async (req, res) => {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: "Address required" });

  try {
    // Use Boston's official geocoder first
    const geoRes = await axios.get(
      "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
      {
        params: {
          address: address + ", Boston, MA",
          benchmark: "Public_AR_Current",
          format: "json"
        },
        timeout: 8000,
        headers: { "Accept": "application/json" }
      }
    );

    const matches = geoRes.data?.result?.addressMatches;
    if (!matches || matches.length === 0) {
      return res.status(404).json({ error: "Address not found. Try a full Boston street address, e.g. '548 East Third Street, South Boston'" });
    }

    const match = matches[0];
    const lat = match.coordinates?.y;
    const lng = match.coordinates?.x;
    const formattedAddress = match.matchedAddress;

    // Look up zoning using BPDA ArcGIS REST API
    let zoningDistrict = null;
    let article = null;

    if (lat && lng) {
      try {
        const zoningRes = await axios.get(
          "https://services.arcgis.com/sFnw0xNflSi8J0uh/arcgis/rest/services/Zoning_Subdistricts/FeatureServer/0/query",
          {
            params: {
              geometry: `${lng},${lat}`,
              geometryType: "esriGeometryPoint",
              inSR: "4326",
              spatialRel: "esriSpatialRelIntersects",
              outFields: "*",
              returnGeometry: false,
              f: "json"
            },
            timeout: 8000,
            headers: { "Accept": "application/json" }
          }
        );

        const zf = zoningRes.data?.features;
        if (zf && zf.length > 0) {
          const za = zf[0].attributes;
          zoningDistrict = za.ZONE_ || za.ZonAbbr || za.SUBDISTRIC || za.DISTRICT || null;
          article = za.ARTICLE || za.Article || null;
        }
      } catch (e) {
        console.log("BPDA zoning lookup failed:", e.message);
      }

      // Fallback: try parcels layer for property info
      let parcelInfo = null;
      try {
        const parcelRes = await axios.get(
          "https://services.arcgis.com/sFnw0xNflSi8J0uh/arcgis/rest/services/Boston_Parcels_2023/FeatureServer/0/query",
          {
            params: {
              geometry: `${lng},${lat}`,
              geometryType: "esriGeometryPoint",
              inSR: "4326",
              spatialRel: "esriSpatialRelIntersects",
              outFields: "OWNER,LAND_USE,GROSS_AREA,LIVING_AREA,YR_BUILT,NUM_FLOORS",
              returnGeometry: false,
              f: "json"
            },
            timeout: 8000,
            headers: { "Accept": "application/json" }
          }
        );
        const pf = parcelRes.data?.features;
        if (pf && pf.length > 0) parcelInfo = pf[0].attributes;
      } catch (e) {
        console.log("Parcel lookup failed:", e.message);
      }

      return res.json({
        address: formattedAddress,
        lat, lng,
        owner: parcelInfo?.OWNER || null,
        landUse: parcelInfo?.LAND_USE || null,
        grossArea: parcelInfo?.GROSS_AREA || null,
        livingArea: parcelInfo?.LIVING_AREA || null,
        yearBuilt: parcelInfo?.YR_BUILT || null,
        floors: parcelInfo?.NUM_FLOORS || null,
        zoningDistrict: zoningDistrict ? { ZONE_: zoningDistrict, ARTICLE: article } : null
      });
    }

    res.json({ address: formattedAddress, lat, lng, zoningDistrict: null });

  } catch (err) {
    console.error("Zoning lookup error:", err.message);
    res.status(500).json({ error: "Lookup failed: " + err.message });
  }
});

export default router;

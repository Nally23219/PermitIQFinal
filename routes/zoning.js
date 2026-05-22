import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/lookup", async (req, res) => {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: "Address required" });

  try {
    // Step 1: Geocode address using Boston's ArcGIS geocoder
    const geoRes = await axios.get(
      `https://services.arcgis.com/sFnw0xNflSi8J0uh/arcgis/rest/services/Boston_Parcels/FeatureServer/0/query`,
      {
        params: {
          where: `upper(FULL_ADDRESS) LIKE upper('%${address.replace(/'/g,"''")}%')`,
          outFields: "FULL_ADDRESS,OWNER,LAND_USE,GROSS_AREA,LIVING_AREA,YR_BUILT,NUM_FLOORS",
          returnGeometry: true,
          outSR: 4326,
          f: "json",
          resultRecordCount: 1
        }
      }
    );

    const features = geoRes.data?.features;
    if (!features || features.length === 0) {
      return res.status(404).json({ error: "Address not found in Boston parcel data" });
    }

    const parcel = features[0];
    const attrs = parcel.attributes;
    const geom = parcel.geometry;
    const lat = geom?.y;
    const lng = geom?.x;

    // Step 2: Look up zoning district using BPDA zoning layer
    let zoningDistrict = null;
    let zoningOverlays = [];
    if (lat && lng) {
      try {
        const zoningRes = await axios.get(
          `https://services.arcgis.com/sFnw0xNflSi8J0uh/arcgis/rest/services/Zoning_Districts/FeatureServer/0/query`,
          {
            params: {
              geometry: `${lng},${lat}`,
              geometryType: "esriGeometryPoint",
              inSR: 4326,
              spatialRel: "esriSpatialRelIntersects",
              outFields: "ZONE_,DISTRICT,ARTICLE,STATUS",
              returnGeometry: false,
              f: "json"
            }
          }
        );
        const zFeatures = zoningRes.data?.features;
        if (zFeatures && zFeatures.length > 0) {
          zoningDistrict = zFeatures[0].attributes;
        }
      } catch (e) {
        console.log("Zoning lookup failed:", e.message);
      }
    }

    res.json({
      address: attrs.FULL_ADDRESS,
      owner: attrs.OWNER,
      landUse: attrs.LAND_USE,
      grossArea: attrs.GROSS_AREA,
      livingArea: attrs.LIVING_AREA,
      yearBuilt: attrs.YR_BUILT,
      floors: attrs.NUM_FLOORS,
      lat, lng,
      zoningDistrict,
      zoningOverlays
    });

  } catch (err) {
    console.error("Zoning lookup error:", err.message);
    res.status(500).json({ error: "Could not look up address. Try entering a full Boston street address." });
  }
});

export default router;

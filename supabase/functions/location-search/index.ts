import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

interface GooglePlacesResponse {
  predictions: PlacePrediction[];
  status: string;
  error_message?: string;
}

interface LocationResult {
  id: string;
  full_location: string;
  city: string;
  community: string | null;
  building: string | null;
  location_type: "city" | "community" | "building";
  country: string;
  place_id?: string;
}

function determineLocationType(types: string[]): "city" | "community" | "building" {
  if (types.includes("establishment") || types.includes("premise") || types.includes("street_address")) {
    return "building";
  }
  if (types.includes("sublocality") || types.includes("neighborhood") || types.includes("sublocality_level_1")) {
    return "community";
  }
  return "city";
}

function extractLocationParts(prediction: PlacePrediction): { city: string; community: string | null; building: string | null } {
  const mainText = prediction.structured_formatting.main_text;
  const secondaryText = prediction.structured_formatting.secondary_text || "";
  const locationType = determineLocationType(prediction.types);
  
  const secondaryParts = secondaryText.split(",").map(s => s.trim());
  
  if (locationType === "building") {
    return {
      building: mainText,
      community: secondaryParts[0] || null,
      city: secondaryParts[1] || secondaryParts[0] || mainText,
    };
  }
  
  if (locationType === "community") {
    return {
      building: null,
      community: mainText,
      city: secondaryParts[0] || mainText,
    };
  }
  
  return {
    building: null,
    community: null,
    city: mainText,
  };
}

function extractCountry(secondaryText: string): string {
  const parts = secondaryText.split(",").map(s => s.trim());
  const lastPart = parts[parts.length - 1]?.toLowerCase() || "";
  
  if (lastPart.includes("emirates") || lastPart.includes("uae")) return "UAE";
  if (lastPart.includes("qatar")) return "Qatar";
  if (lastPart.includes("saudi") || lastPart.includes("ksa")) return "Saudi Arabia";
  if (lastPart.includes("bahrain")) return "Bahrain";
  if (lastPart.includes("oman")) return "Oman";
  if (lastPart.includes("kuwait")) return "Kuwait";
  
  return parts[parts.length - 1] || "Unknown";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, country, limit = 10 } = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ locations: [], message: "Query too short" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

    if (!apiKey) {
      console.log("GOOGLE_PLACES_API_KEY not configured - returning empty results");
      return new Response(
        JSON.stringify({ 
          locations: [], 
          message: "Location search not configured. Please add GOOGLE_PLACES_API_KEY." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build country restriction for Google Places API
    const countryCodeMap: Record<string, string> = {
      "UAE": "ae",
      "Qatar": "qa",
      "Saudi Arabia": "sa",
      "Bahrain": "bh",
      "Oman": "om",
      "Kuwait": "kw",
    };

    // Build the API URL
    const baseUrl = "https://maps.googleapis.com/maps/api/place/autocomplete/json";
    const params = new URLSearchParams({
      input: query.trim(),
      key: apiKey,
      types: "geocode|establishment",
      language: "en",
    });

    // Add country restriction if specified
    if (country && countryCodeMap[country]) {
      params.append("components", `country:${countryCodeMap[country]}`);
    } else {
      // Default to GCC countries if no country specified
      params.append("components", "country:ae|country:qa|country:sa|country:bh|country:om|country:kw");
    }

    const response = await fetch(`${baseUrl}?${params.toString()}`);
    const data: GooglePlacesResponse = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Places API error:", data.status, data.error_message);
      return new Response(
        JSON.stringify({ 
          locations: [], 
          error: data.error_message || `API error: ${data.status}` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const locations: LocationResult[] = (data.predictions || [])
      .slice(0, limit)
      .map((prediction) => {
        const locationType = determineLocationType(prediction.types);
        const locationParts = extractLocationParts(prediction);
        const detectedCountry = extractCountry(prediction.structured_formatting.secondary_text || "");

        return {
          id: prediction.place_id,
          place_id: prediction.place_id,
          full_location: prediction.description,
          city: locationParts.city,
          community: locationParts.community,
          building: locationParts.building,
          location_type: locationType,
          country: detectedCountry,
        };
      });

    return new Response(
      JSON.stringify({ locations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Location search error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, locations: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

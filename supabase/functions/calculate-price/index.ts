import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { distance_km, duration_minutes, pickup_address, dropoff_address } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get current date for fuel price context
    const today = new Date().toISOString().split('T')[0];
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Du bist ein intelligentes Preisberechnungssystem für einen Fahrdienst. 
Berechne faire Preise basierend auf:
- Distanz in Kilometern
- Geschätzte Fahrzeit
- Aktuelle Kraftstoffpreise (ca. 1.75€/L Diesel für ${today})
- Tageszeit und möglicher Verkehr
- Basispreis von 3.50€

Antworte NUR mit einem JSON-Objekt im Format:
{"price": number, "breakdown": {"base": number, "distance": number, "time": number, "fuel_surcharge": number}}`
          },
          {
            role: "user",
            content: `Berechne den Preis für diese Fahrt:
- Distanz: ${distance_km.toFixed(2)} km
- Geschätzte Dauer: ${duration_minutes} Minuten
- Von: ${pickup_address}
- Nach: ${dropoff_address}
- Datum: ${today}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse the JSON from AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const priceData = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify(priceData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback calculation if AI fails
    const basePrice = 3.5;
    const pricePerKm = 1.5;
    const pricePerMin = 0.3;
    const fallbackPrice = basePrice + (distance_km * pricePerKm) + (duration_minutes * pricePerMin);
    
    return new Response(JSON.stringify({ 
      price: Math.round(fallbackPrice * 100) / 100,
      breakdown: {
        base: basePrice,
        distance: Math.round(distance_km * pricePerKm * 100) / 100,
        time: Math.round(duration_minutes * pricePerMin * 100) / 100,
        fuel_surcharge: 0
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Price calculation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

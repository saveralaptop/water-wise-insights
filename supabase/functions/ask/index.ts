// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const buildFallbackAnswer = (reading: any) => {
  if (!reading) {
    return "No sensor data is available yet. Please send at least one reading and ask again.";
  }

  const issues: string[] = [];
  if (reading.ph < 6.5 || reading.ph > 8.5) issues.push("pH out of safe range");
  if (reading.tds > 1000) issues.push("TDS above 1000 ppm");
  if (reading.turbidity > 25) issues.push("turbidity above 25 NTU");

  if (issues.length === 0) {
    return "Latest reading appears safe for general use based on pH, TDS, and turbidity.";
  }

  return `Latest reading is NOT SAFE: ${issues.join(", ")}. Avoid drinking until treated and re-tested.`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question } = await req.json();
    if (typeof question !== "string" || !question.trim()) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: reading } = await supabase
      .from("readings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const context = reading
      ? `Latest water reading (at ${reading.created_at}):
- pH: ${reading.ph} (safe range 6.5–8.5)
- TDS: ${reading.tds} ppm (safe ≤ 1000)
- Turbidity: ${reading.turbidity} NTU (safe ≤ 25)
- Temperature: ${reading.temperature} °C
- Status: ${reading.status}`
      : "No sensor readings have been received yet.";

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ answer: buildFallbackAnswer(reading), reading }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              // text: `${context}\n\nQuestion: ${question}`,
              text: `You are HydroSentinel, an intelligent water quality assistant.

Your job is:
1. Analyze water parameters (pH, TDS, turbidity)
2. Decide if water is SAFE or NOT SAFE
3. Give clear practical advice

Rules:
- If SAFE → say safe and where it can be used (drinking, washing, etc.)
- If NOT SAFE → explain why + give solution (boil, filter, avoid, etc.)
- Keep answer short (max 60 words)
- Be direct and useful (like a real-world expert)
-Use very simple and clear language.
-Avoid technical words.
-Explain like you are talking to a normal person.
-Keep sentences short and easy to understand.

-always keep the latest water reading in mind when answering. Here is the latest reading:
-always answer based on the actual numbers, not just general knowledge. If you don't have enough info, say so.
-always consider all parameters together to give a holistic answer.
-always keep answer short and practical, like advice from a water quality expert.
-Always suggest at least one action. For example, if water is not safe to drink, suggest boiling or filtration before use.

${context}

Question: ${question}`,
            },
          ],
        },
      ],
    }),
  }
);


    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
        return `NOT SAFE: ${issues.join(", ")}. Avoid drinking. Use filtration or boiling before use.`;
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // const json = await aiRes.json();
    // const answer = json.choices?.[0]?.message?.content ?? "(no response)";
    const text = await aiRes.text();
console.log("Gemini raw:", text);

const json = JSON.parse(text);
    const answer = json.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
    

    return new Response(JSON.stringify({ answer, reading }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ask error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

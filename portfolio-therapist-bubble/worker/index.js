export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/therapist/explain" && request.method === "POST") {
      if (!env.GEMINI_API_KEY) return Response.json({ error: "AI explanation is not configured" }, { status: 503 });
      const { mode, finding } = await request.json();
      const safeFinding = {
        label: finding?.label,
        score: finding?.score,
        summary: finding?.summary,
        evidence: finding?.evidence,
        breakdown: finding?.breakdown,
      };
      const prompt = `You are Portfolio Therapist. Use ONLY this supplied behavioural finding: ${JSON.stringify(safeFinding)}. Write one concise ${mode === "serious" ? "neutral behavioural-finance explanation" : "witty roast"}. Do not invent facts, diagnose the user, judge an investment, or recommend buying or selling. Return only the explanation, under 45 words.`;
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: mode === "serious" ? 0.2 : 0.75, maxOutputTokens: 100 } }),
      });
      if (!geminiResponse.ok) return Response.json({ error: "AI explanation failed" }, { status: 502 });
      const data = await geminiResponse.json();
      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
      return Response.json({ text });
    }

    if (url.pathname === "/api/therapist/speak" && request.method === "POST") {
      if (!env.ELEVENLABS_API_KEY) return Response.json({ error: "Voice is not configured" }, { status: 503 });
      const { text } = await request.json();
      if (typeof text !== "string" || !text.trim() || text.length > 800) return Response.json({ error: "Invalid text" }, { status: 400 });
      const voiceId = env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
      const voiceResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: { "content-type": "application/json", "xi-api-key": env.ELEVENLABS_API_KEY, accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.55, similarity_boost: 0.72 } }),
      });
      if (!voiceResponse.ok) return Response.json({ error: "Voice generation failed" }, { status: 502 });
      return new Response(voiceResponse.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
    }

    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};

import { NextResponse } from "next/server";

const REPLICATE_MODEL_VERSION =
  "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

async function pollReplicate(predictionId, replicateKey) {
  const url = `https://api.replicate.com/v1/predictions/${predictionId}`;
  const headers = { Authorization: `Token ${replicateKey}` };

  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Replicate poll failed: ${res.status}`);

    const data = await res.json();

    if (data.status === "succeeded") {
      return Array.isArray(data.output) ? data.output[0] : data.output;
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Replicate prediction ${data.status}`);
    }
    // status is "starting" or "processing" — keep polling
  }

  throw new Error("Replicate prediction timed out");
}

export async function POST(request) {
  const { prompt, width, height } = await request.json();

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const w = width || 1024;
  const h = height || 1024;

  // --- Try Stability AI first ---
  const stabilityKey = process.env.STABILITY_AI;

  if (stabilityKey) {
    try {
      const stabilityRes = await fetch(
        "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${stabilityKey}`,
          },
          body: JSON.stringify({
            text_prompts: [{ text: prompt, weight: 1 }],
            cfg_scale: 7,
            width: w,
            height: h,
            steps: 30,
            samples: 1,
          }),
        }
      );

      if (stabilityRes.ok) {
        const data = await stabilityRes.json();
        const artifact = (data.artifacts || []).find(
          (a) => a.finishReason === "SUCCESS"
        ) || data.artifacts?.[0];

        if (artifact?.base64) {
          return NextResponse.json({
            image: `data:image/png;base64,${artifact.base64}`,
            provider: "stability",
          });
        }
      }
    } catch (_) {
      // fall through to Replicate
    }
  }

  // --- Fallback: Replicate ---
  const replicateKey = process.env.REPLICATE_1 || process.env.REPLICATE_2;

  if (replicateKey) {
    try {
      const createRes = await fetch(
        "https://api.replicate.com/v1/predictions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${replicateKey}`,
          },
          body: JSON.stringify({
            version: REPLICATE_MODEL_VERSION,
            input: { prompt, width: w, height: h },
          }),
        }
      );

      if (!createRes.ok) {
        throw new Error(`Replicate create failed: ${createRes.status}`);
      }

      const prediction = await createRes.json();
      const imageUrl = await pollReplicate(prediction.id, replicateKey);

      return NextResponse.json({ image: imageUrl, provider: "replicate" });
    } catch (_) {
      // fall through to error
    }
  }

  // Replicate SDXL
  const replicateToken = process.env.REPLICATE_API_TOKEN
  if (replicateToken) {
    try {
      const createRes = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: { Authorization: `Token ${replicateToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: 'da77bc59ee60423279fd632efb4795ab731d9e3ca9705ef3341091fb989b7eaf', input: { prompt: prompt.slice(0, 1000), width: 1024, height: 1024, num_outputs: 1 } }),
        signal: AbortSignal.timeout(10000),
      })
      const pred = await createRes.json()
      let result = pred
      const start = Date.now()
      while (['starting', 'processing'].includes(result.status) && Date.now() - start < 55000) {
        await new Promise(r => setTimeout(r, 2500))
        const poll = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, { headers: { Authorization: `Token ${replicateToken}` }, signal: AbortSignal.timeout(10000) })
        result = await poll.json()
      }
      if (result.output?.[0]) return Response.json({ image: result.output[0], provider: 'replicate-sdxl' })
    } catch {}
  }

  // --- No provider available ---
  return NextResponse.json(
    { error: "No image generation keys configured", provider: "none" },
    { status: 503 }
  );
}

import { NextResponse } from "next/server";

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export async function POST(request) {
  const { text, voiceId } = await request.json();

  if (!text || typeof text !== "string" || text.trim() === "") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const elevenLabsKey = process.env.ELEVENLABS;

  if (!elevenLabsKey) {
    return NextResponse.json(
      { error: "ElevenLabs not configured" },
      { status: 503 }
    );
  }

  const voice = voiceId || DEFAULT_VOICE_ID;

  const ttsRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!ttsRes.ok) {
    const errorText = await ttsRes.text().catch(() => "Unknown error");
    return NextResponse.json(
      { error: `ElevenLabs request failed: ${ttsRes.status}`, detail: errorText },
      { status: ttsRes.status }
    );
  }

  const audioBuffer = await ttsRes.arrayBuffer();

  return new Response(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audioBuffer.byteLength),
    },
  });
}

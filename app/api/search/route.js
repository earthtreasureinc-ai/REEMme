import { NextResponse } from "next/server";

export async function POST(request) {
  const { query, numResults } = await request.json();

  if (!query || typeof query !== "string" || query.trim() === "") {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const count = numResults || 5;

  // --- Try Exa AI first ---
  const exaKey = process.env.EXA_AI || process.env.EXA__AI;

  if (exaKey) {
    try {
      const exaRes = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": exaKey,
        },
        body: JSON.stringify({
          query,
          numResults: count,
          useAutoprompt: true,
          contents: { text: true },
        }),
      });

      if (exaRes.ok) {
        const data = await exaRes.json();
        const results = (data.results || []).map((r) => ({
          url: r.url,
          title: r.title,
          text: r.text,
          publishedDate: r.publishedDate,
        }));
        return NextResponse.json({ results, provider: "exa" });
      }
    } catch (_) {
      // fall through to Tavily
    }
  }

  // --- Fallback: Tavily ---
  const tavilyKey = process.env.TAVILY;

  if (tavilyKey) {
    try {
      const tavilyRes = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query,
          search_depth: "basic",
          max_results: count,
        }),
      });

      if (tavilyRes.ok) {
        const data = await tavilyRes.json();
        const results = (data.results || []).map((r) => ({
          url: r.url,
          title: r.title,
          text: r.content,
          publishedDate: null,
        }));
        return NextResponse.json({ results, provider: "tavily" });
      }
    } catch (_) {
      // fall through to none
    }
  }

  // --- No provider available ---
  return NextResponse.json({ results: [], provider: "none" });
}

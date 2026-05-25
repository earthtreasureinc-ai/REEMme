export async function POST(req) {
  const { model, inputs, task, parameters } = await req.json()
  if (!model || !inputs) return Response.json({ error: 'model and inputs required' }, { status: 400 })
  const token = process.env.HUGGING_FACE
  if (!token) return Response.json({ error: 'HUGGING_FACE not configured' }, { status: 503 })

  try {
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs, parameters: parameters || {} }),
      signal: AbortSignal.timeout(30000),
    })
    if (res.status === 503) {
      const err = await res.json()
      return Response.json({ loading: true, estimatedTime: err.estimated_time }, { status: 503 })
    }
    if (!res.ok) throw new Error(`HF Inference: ${res.status}`)
    const result = await res.json()
    return Response.json({ result, model, task })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req) {
  // Return popular task-specific models
  return Response.json({
    models: {
      sentiment: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
      summarization: 'facebook/bart-large-cnn',
      translation_en_fr: 'Helsinki-NLP/opus-mt-en-fr',
      ner: 'dslim/bert-base-NER',
      zeroshot: 'facebook/bart-large-mnli',
      image_classification: 'google/vit-base-patch16-224',
      embedding: 'sentence-transformers/all-MiniLM-L6-v2',
    }
  })
}

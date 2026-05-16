export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API manquante.' });

  try {
    const { messages, system } = req.body;
    const groqMessages = [];
    if (system) groqMessages.push({ role: 'system', content: system });

    for (const msg of messages) {
      if (Array.isArray(msg.content)) {
        const parts = msg.content.map(p => {
          if (p.type === 'text') return { type: 'text', text: p.text };
          if (p.type === 'image_url') return { type: 'image_url', image_url: { url: p.image_url.url } };
          return null;
        }).filter(Boolean);
        groqMessages.push({ role: msg.role, content: parts });
      } else {
        groqMessages.push({ role: msg.role, content: msg.content || ' ' });
      }
    }

    const hasImage = messages.some(m => Array.isArray(m.content) && m.content.some(p => p.type === 'image_url'));
    const model = hasImage ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile';

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, max_tokens: 1500, messages: groqMessages }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Erreur API' });
    const reply = data.choices?.[0]?.message?.content || "Je n'ai pas pu répondre.";
    return res.status(200).json({ content: [{ type: 'text', text: reply }] });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur interne.' });
  }
}

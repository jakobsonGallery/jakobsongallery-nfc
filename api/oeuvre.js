const AIRTABLE_BASE = 'appZQ3yquS8uPXZy6';
const AIRTABLE_TABLE = 'tblwzvPNp07L2pu4Y';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  const { id } = req.query;
  if (!id || !id.startsWith('rec')) {
    return res.status(400).json({ error: 'ID invalide' });
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API manquante' });

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}/${id}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    if (!response.ok) return res.status(404).json({ error: 'Oeuvre introuvable' });

    const data = await response.json();
    const f = data.fields || {};

    const photoUrl = (() => {
      const photos = f['Photo'];
      if (Array.isArray(photos) && photos.length > 0) {
        return photos[0].thumbnails?.large?.url || photos[0].url || null;
      }
      return null;
    })();

    return res.status(200).json({
      id: data.id,
      oeuvre: f['\u0152uvre'] || f['Oeuvre'] || '',
      artiste: f['Artiste'] || '',
      technique: f['Technique'] || '',
      dimensions: f['Dimensions (cm)'] || '',
      annee: f['Ann\u00e9e de l\'\u0153uvre'] || '',
      notes: f['Notes'] || '',
      photo_url: photoUrl,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
}

const AIRTABLE_BASE = 'appZQ3yquS8uPXZy6';
const OEUVRES_TABLE = 'tblwzvPNp07L2pu4Y';
const ACHATS_TABLE  = 'tbln43SRK0PdGH9Gi';

// IDs des champs OEUVRES
const F = {
  oeuvre:     'fldEB4ApP5ajbkg4L',
  artiste:    'fldHhZUoLG8Ht5fkZ',
  photo:      'fldmZixVmqpdLfbym',
  dimensions: 'fldZQrcXm9Ds4b36U',
  technique:  'fldKbkhGxJ975ZA88',
  annee:      'fldAdpAj4vf6K785v',
  notes:      'fldnwiBffTWnBKDoo',
  achat:      'fldNHe5ResC5gdZbC',
};

// IDs des champs ACHATS
const A = {
  oeuvre:    'fldwBtMqArBGXfpZw',
  token:     'fldyxCKWQ5UZuZsnx',
};

async function fetchAT(path, apiKey) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (!res.ok) return null;
  return res.json();
}

async function findAchatByToken(token, apiKey) {
  const formula = encodeURIComponent(`{TOKEN_NFC}="${token}"`);
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/${ACHATS_TABLE}?filterByFormula=${formula}&maxRecords=1`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.records?.[0] || null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Token manquant' });

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API manquante' });

  try {
    let of = null;

    // Recherche par TOKEN_NFC (format JAK-XXXXXXXX)
    if (id.startsWith('JAK-')) {
      const achat = await findAchatByToken(id, apiKey);
      if (!achat) return res.status(404).json({ error: 'Certificat introuvable' });

      const oeuvreIds = achat.fields?.[A.oeuvre];
      if (Array.isArray(oeuvreIds) && oeuvreIds.length > 0) {
        const r = await fetchAT(`/${OEUVRES_TABLE}/${oeuvreIds[0]}`, apiKey);
        of = r?.fields || null;
      }
    }
    // Fallback : ancien format rec*** (pour compatibilité)
    else if (id.startsWith('rec')) {
      const tryOeuvre = await fetchAT(`/${OEUVRES_TABLE}/${id}`, apiKey);
      if (tryOeuvre?.fields?.[F.oeuvre]) {
        of = tryOeuvre.fields;
      } else {
        const tryAchat = await fetchAT(`/${ACHATS_TABLE}/${id}`, apiKey);
        if (!tryAchat) return res.status(404).json({ error: 'Introuvable' });
        const oeuvreIds = tryAchat.fields?.[A.oeuvre];
        if (Array.isArray(oeuvreIds) && oeuvreIds.length > 0) {
          const r = await fetchAT(`/${OEUVRES_TABLE}/${oeuvreIds[0]}`, apiKey);
          of = r?.fields || null;
        }
      }
    } else {
      return res.status(400).json({ error: 'Format invalide' });
    }

    if (!of) return res.status(404).json({ error: 'Oeuvre introuvable' });

    // Photo
    const photos = of[F.photo];
    const photoUrl = Array.isArray(photos) && photos.length > 0
      ? photos[0].thumbnails?.large?.url || photos[0].url || null
      : null;

    // Technique
    const techniqueRaw = of[F.technique];
    const technique = typeof techniqueRaw === 'object'
      ? techniqueRaw?.name || ''
      : techniqueRaw || '';

    // Réponse publique — SANS infos client, prix, date
    return res.status(200).json({
      oeuvre:     of[F.oeuvre]     || '',
      artiste:    of[F.artiste]    || '',
      technique,
      dimensions: of[F.dimensions] || '',
      annee:      of[F.annee]      || '',
      notes:      of[F.notes]      || '',
      photo_url:  photoUrl,
    });

  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
}

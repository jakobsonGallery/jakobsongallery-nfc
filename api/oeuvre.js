const AIRTABLE_BASE = 'appZQ3yquS8uPXZy6';
const OEUVRES_TABLE = 'tblwzvPNp07L2pu4Y';
const ACHATS_TABLE = 'tbln43SRK0PdGH9Gi';
const CLIENTS_TABLE = 'tblKxwOtgwwt04IA2';

// IDs des champs de la table OEUVRES
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

// IDs des champs de la table ACHATS
const A = {
  oeuvre:      'fldwBtMqArBGXfpZw',
  client:      'fldKj24KajkrU3zFj',
  prix:        'fldWP6SqCbemWBIBd',
  dateAchat:   'fldiChcxNg2hfAaW3',
};

async function fetchAT(path, apiKey) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (!res.ok) return null;
  return res.json();
}

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
    let of = null; // oeuvre fields
    let af = null; // achat fields

    // Essai 1 : l'ID est une œuvre
    const tryOeuvre = await fetchAT(`/${OEUVRES_TABLE}/${id}`, apiKey);
    if (tryOeuvre?.fields?.[F.oeuvre]) {
      of = tryOeuvre.fields;
      // Chercher l'achat lié
      const achatIds = of[F.achat];
      if (Array.isArray(achatIds) && achatIds.length > 0) {
        const achatRec = await fetchAT(`/${ACHATS_TABLE}/${achatIds[0]}`, apiKey);
        af = achatRec?.fields || null;
      }
    } else {
      // Essai 2 : l'ID est un achat
      const tryAchat = await fetchAT(`/${ACHATS_TABLE}/${id}`, apiKey);
      if (!tryAchat) return res.status(404).json({ error: 'Introuvable' });
      af = tryAchat.fields;
      const oeuvreIds = af?.[A.oeuvre];
      if (Array.isArray(oeuvreIds) && oeuvreIds.length > 0) {
        const oeuvreRec = await fetchAT(`/${OEUVRES_TABLE}/${oeuvreIds[0]}`, apiKey);
        of = oeuvreRec?.fields || null;
      }
    }

    if (!of) return res.status(404).json({ error: 'Oeuvre introuvable' });

    // Photo
    const photos = of[F.photo];
    const photoUrl = Array.isArray(photos) && photos.length > 0
      ? photos[0].thumbnails?.large?.url || photos[0].url || null
      : null;

    // Technique (c'est un objet singleSelect)
    const techniqueRaw = of[F.technique];
    const technique = typeof techniqueRaw === 'object' ? techniqueRaw?.name || '' : techniqueRaw || '';

    // Prix
    const prixRaw = af?.[A.prix];
    const prixAchat = prixRaw ? `${Number(prixRaw).toLocaleString('fr-FR')} €` : '';

    // Date
    let dateAchat = '';
    const dateRaw = af?.[A.dateAchat];
    if (dateRaw) {
      dateAchat = new Date(dateRaw).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
    }

    // Client
    let client = '';
    const clientIds = af?.[A.client];
    if (Array.isArray(clientIds) && clientIds.length > 0) {
      const clientRec = await fetchAT(`/${CLIENTS_TABLE}/${clientIds[0]}`, apiKey);
      client = clientRec?.fields?.['Client'] || '';
    }

    return res.status(200).json({
      oeuvre:     of[F.oeuvre] || '',
      artiste:    of[F.artiste] || '',
      technique:  technique,
      dimensions: of[F.dimensions] || '',
      annee:      of[F.annee] || '',
      notes:      of[F.notes] || '',
      photo_url:  photoUrl,
      client,
      date_achat: dateAchat,
      prix_achat: prixAchat,
    });

  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
}

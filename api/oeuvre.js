const AIRTABLE_BASE = 'appZQ3yquS8uPXZy6';
const OEUVRES_TABLE = 'tblwzvPNp07L2pu4Y';
const ACHATS_TABLE = 'tbln43SRK0PdGH9Gi';

const F = {
  oeuvre: 'Œuvre',
  artiste: 'Artiste',
  photo: 'Photo',
  dimensions: 'Dimensions (cm)',
  technique: 'Technique',
  annee: "Année de l'œuvre",
  notes: 'Notes'
};

const A = {
  oeuvre: 'Œuvre',
  proprietaire: 'Nom du client',
 dateAchat: 'Date d’achat'
};

async function fetchAT(path, apiKey) {
  const res = await fetch('https://api.airtable.com/v0/' + AIRTABLE_BASE + path, {
    headers: {
      Authorization: 'Bearer ' + apiKey
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Airtable error ' + res.status + ': ' + text);
  }

  return res.json();
}

async function findAchatByToken(token, apiKey) {
  const formula = encodeURIComponent('{TOKEN_NFC}="' + token + '"');

  const res = await fetch(
    'https://api.airtable.com/v0/' +
      AIRTABLE_BASE +
      '/' +
      ACHATS_TABLE +
      '?filterByFormula=' +
      formula +
      '&maxRecords=1',
    {
      headers: {
        Authorization: 'Bearer ' + apiKey
      }
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Airtable search error ' + res.status + ': ' + text);
  }

  const data = await res.json();
  return data.records && data.records[0] ? data.records[0] : null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  const id = req.query.id;

  if (!id) {
    return res.status(400).json({ error: 'Token manquant' });
  }

  const apiKey = process.env.AIRTABLE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Clé API manquante' });
  }

  try {
let oeuvreFields = null;
let proprietaire = '';
const dateComplete = achat.fields[A.dateAchat] || '';
dateAchat = dateComplete
  ? new Date(dateComplete).getFullYear().toString()
  : '';
};

    if (id.startsWith('JAK-')) {
      const achat = await findAchatByToken(id, apiKey);

      if (!achat) {
        return res.status(404).json({ error: 'Certificat introuvable' });
      }

      proprietaire = achat.fields[A.proprietaire] || '';
      dateAchat = achat.fields[A.dateAchat] || '';

      if (Array.isArray(proprietaire)) {
        proprietaire = proprietaire.join(', ');
      }

      const oeuvreIds = achat.fields[A.oeuvre];

      if (!Array.isArray(oeuvreIds) || oeuvreIds.length === 0) {
        return res.status(404).json({
          error: 'Aucune œuvre liée à cet achat',
          champs_disponibles: Object.keys(achat.fields)
        });
      }

      const oeuvreRecord = await fetchAT('/' + OEUVRES_TABLE + '/' + oeuvreIds[0], apiKey);
      oeuvreFields = oeuvreRecord.fields;

    } else if (id.startsWith('rec')) {
      const oeuvreRecord = await fetchAT('/' + OEUVRES_TABLE + '/' + id, apiKey);
      oeuvreFields = oeuvreRecord.fields;

    } else {
      return res.status(400).json({ error: 'Format invalide' });
    }

    if (!oeuvreFields) {
      return res.status(404).json({ error: 'Œuvre introuvable' });
    }

    const photos = oeuvreFields[F.photo];

    const photoUrl =
      Array.isArray(photos) && photos.length > 0
        ? photos[0].url
        : null;

    const techniqueRaw = oeuvreFields[F.technique];

    const technique =
      typeof techniqueRaw === 'object' && techniqueRaw !== null
        ? techniqueRaw.name || ''
        : techniqueRaw || '';

    return res.status(200).json({
      oeuvre: oeuvreFields[F.oeuvre] || '',
      artiste: oeuvreFields[F.artiste] || '',
      technique: technique,
      dimensions: oeuvreFields[F.dimensions] || '',
     annee: dateAchat || '',
      notes: oeuvreFields[F.notes] || '',
      photo_url: photoUrl,
      proprietaire: proprietaire
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Erreur serveur',
      detail: err.message
    });
  }
};

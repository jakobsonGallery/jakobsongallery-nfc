const AIRTABLE_BASE = 'appZQ3yquS8uPXZy6';
const OEUVRES_TABLE = 'tblwzvPNp07L2pu4Y';
const ACHATS_TABLE = 'tbln43SRK0PdGH9Gi';
const CLIENTS_TABLE = 'tblKxwOtgwwt04IA2';

async function fetchAirtable(url, apiKey) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
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
    let oeuvreData = null;
    let achatData = null;

    // Essai 1 : l'ID est directement une œuvre
    const tryOeuvre = await fetchAirtable(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${OEUVRES_TABLE}/${id}`,
      apiKey
    );

    if (tryOeuvre) {
      oeuvreData = tryOeuvre;
      // Chercher l'achat lié à cette œuvre
      const achatIds = tryOeuvre.fields?.['Achat'];
      if (Array.isArray(achatIds) && achatIds.length > 0) {
        achatData = await fetchAirtable(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/${ACHATS_TABLE}/${achatIds[0]}`,
          apiKey
        );
      }
    } else {
      // Essai 2 : l'ID est un achat → on cherche l'œuvre liée
      const tryAchat = await fetchAirtable(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${ACHATS_TABLE}/${id}`,
        apiKey
      );
      if (!tryAchat) return res.status(404).json({ error: 'Introuvable' });

      achatData = tryAchat;
      const oeuvreIds = tryAchat.fields?.['\u0152uvre'];
      if (Array.isArray(oeuvreIds) && oeuvreIds.length > 0) {
        oeuvreData = await fetchAirtable(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/${OEUVRES_TABLE}/${oeuvreIds[0]}`,
          apiKey
        );
      }
    }

    if (!oeuvreData) return res.status(404).json({ error: 'Oeuvre introuvable' });

    const f = oeuvreData.fields || {};
    const a = achatData?.fields || {};

    // Photo
    const photoUrl = (() => {
      const photos = f['Photo'];
      if (Array.isArray(photos) && photos.length > 0) {
        return photos[0].thumbnails?.large?.url || photos[0].url || null;
      }
      return null;
    })();

    // Prix
    const prixAchat = a['Prix de vente']
      ? `${Number(a['Prix de vente']).toLocaleString('fr-FR')} €`
      : '';

    // Date
    let dateAchat = '';
    if (a["Date D'achat"]) {
      dateAchat = new Date(a["Date D'achat"]).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
    }

    // Client
    let client = '';
    const clientIds = a['Client'];
    if (Array.isArray(clientIds) && clientIds.length > 0) {
      const clientData = await fetchAirtable(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${CLIENTS_TABLE}/${clientIds[0]}`,
        apiKey
      );
      client = clientData?.fields?.['Client'] || '';
    }

    return res.status(200).json({
      id: oeuvreData.id,
      oeuvre: f['\u0152uvre'] || f['Oeuvre'] || '',
      artiste: f['Artiste'] || '',
      technique: typeof f['Technique'] === 'object' ? f['Technique']?.name || '' : f['Technique'] || '',
      dimensions: f['Dimensions (cm)'] || '',
      annee: f['Ann\u00e9e de l\'\u0153uvre'] || '',
      notes: f['Notes'] || '',
      photo_url: photoUrl,
      client,
      date_achat: dateAchat,
      prix_achat: prixAchat,
    });

  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
}

const AIRTABLE_BASE = 'appZQ3yquS8uPXZy6';
const OEUVRES_TABLE = 'tblwzvPNp07L2pu4Y';
const ACHATS_TABLE = 'tbln43SRK0PdGH9Gi';
const CLIENTS_TABLE = 'tblKxwOtgwwt04IA2';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  const { id } = req.query;
  if (!id || !id.startsWith('rec')) {
    return res.status(400).json({ error: 'ID invalide' });
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API manquante' });

  const headers = { Authorization: `Bearer ${apiKey}` };

  try {
    // 1. Récupérer l'œuvre
    const oeuvreRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${OEUVRES_TABLE}/${id}`,
      { headers }
    );

    // Si l'ID n'est pas dans OEUVRES, on cherche dans ACHATS pour trouver l'œuvre liée
    let oeuvreId = id;
    if (!oeuvreRes.ok) {
      // Peut-être que c'est un ID d'achat — on cherche l'œuvre via ACHATS
      const achatRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${ACHATS_TABLE}/${id}`,
        { headers }
      );
      if (!achatRes.ok) return res.status(404).json({ error: 'Introuvable' });
      const achatData = await achatRes.json();
      const oeuvreIds = achatData.fields?.['Œuvre'];
      if (!Array.isArray(oeuvreIds) || !oeuvreIds.length) return res.status(404).json({ error: 'Oeuvre non liée' });
      oeuvreId = oeuvreIds[0];
    }

    // 2. Charger l'œuvre avec le bon ID
    const finalOeuvreRes = oeuvreId === id ? oeuvreRes : await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${OEUVRES_TABLE}/${oeuvreId}`,
      { headers }
    );
    if (!finalOeuvreRes.ok) return res.status(404).json({ error: 'Oeuvre introuvable' });

    const oeuvreData = await finalOeuvreRes.json();
    const f = oeuvreData.fields || {};

    // Photo
    const photoUrl = (() => {
      const photos = f['Photo'];
      if (Array.isArray(photos) && photos.length > 0) {
        return photos[0].thumbnails?.large?.url || photos[0].url || null;
      }
      return null;
    })();

    // Dimensions depuis la fiche oeuvre
    const dimensions = f['Dimensions (cm)'] || '';

    // 3. Récupérer l'achat lié pour client, date, prix
    let client = '';
    let dateAchat = '';
    let prixAchat = '';

    const achatIds = f['Achat'];
    if (Array.isArray(achatIds) && achatIds.length > 0) {
      const achatRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${ACHATS_TABLE}/${achatIds[0]}`,
        { headers }
      );
      if (achatRes.ok) {
        const achatData = await achatRes.json();
        const a = achatData.fields || {};

        prixAchat = a['Prix de vente']
          ? `${Number(a['Prix de vente']).toLocaleString('fr-FR')} €`
          : '';

        if (a["Date D'achat"]) {
          dateAchat = new Date(a["Date D'achat"]).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric'
          });
        }

        // Client
        const clientIds = a['Client'];
        if (Array.isArray(clientIds) && clientIds.length > 0) {
          const clientRes = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE}/${CLIENTS_TABLE}/${clientIds[0]}`,
            { headers }
          );
          if (clientRes.ok) {
            const clientData = await clientRes.json();
            client = clientData.fields?.['Client'] || '';
          }
        }
      }
    }

    return res.status(200).json({
      id: oeuvreData.id,
      oeuvre: f['\u0152uvre'] || f['Oeuvre'] || '',
      artiste: f['Artiste'] || '',
      technique: typeof f['Technique'] === 'object' ? f['Technique']?.name || '' : f['Technique'] || '',
      dimensions,
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

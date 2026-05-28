const AIRTABLE_BASE = 'appZQ3yquS8uPXZy6';
const OEUVRES_TABLE = 'tblwzvPNp07L2pu4Y';
const ACHATS_TABLE = 'tbln43SRK0PdGH9Gi';

// IDs réels des champs de la table Œuvres
const F = {
  oeuvre:     'fldEB4ApP5ajbkg4L',
  artiste:    'fldHhZUoLG8Ht5fkZ',
  photo:      'fldmZixVmqpdLfbym',
  dimensions: 'fldZQrcXm9Ds4b36U',
  technique:  'fldKbkhGxJ975ZA88',
  annee:      'fldJHrGOSu7dAMye1',
  notes:      'fldPU0iDRqZA8f9ja'
};

// ID du champ Œuvre dans la table Achats (lien vers Œuvres)
const ACHAT_OEUVRE_FIELD = 'fldwBtMqArBGXfpZw';

async function fetchAT(path, apiKey) {
  const res = await fetch('https://api.airtable.com/v0/' + AIRTABLE_BASE + path, {
    headers: { Authorization: 'Bearer ' + apiKey }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Airtable error ' + res.status + ': ' + text);
  }
  return res.json();
}

async function findAchatByToken(token, apiKey) {
  // Le token JAK-F4ZD7OSA est basé sur les 8 premiers chars du record ID (sans "rec")
  // On filtre via la formule native Airtable
  const formula = encodeURIComponent(
    'LEFT(SUBSTITUTE(RECORD_ID(),"rec",""),

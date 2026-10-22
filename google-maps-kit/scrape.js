#!/usr/bin/env node
// Extrator de leads do Google Maps via Places API (New) — sem dependências, Node 18+.
// Uso: node scrape.js "dentista em Goiânia" [--grid 3] [--emails] [--out saida]
//      node scrape.js --file buscas.txt --emails
//      node scrape.js "fisioterapia" --perto "Diamond Center, Teresina" --raio 1500

import fs from 'node:fs';
import path from 'node:path';

const API_URL = process.env.PLACES_API_URL || 'https://places.googleapis.com/v1/places:searchText';
const FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.primaryTypeDisplayName',
  'places.location',
  'places.viewport',
  'places.businessStatus',
  'places.regularOpeningHours.weekdayDescriptions',
  'nextPageToken',
];
const COLUMNS = [
  'busca', 'nome', 'categoria', 'telefone', 'whatsapp', 'site', 'emails', 'instagram',
  'endereco', 'nota', 'avaliacoes', 'status', 'horarios', 'lat', 'lng', 'link_maps', 'place_id',
];

// ---------- argumentos ----------

function parseArgs(argv) {
  const opts = {
    queries: [], grid: 1, emails: false, out: 'resultados', lang: 'pt-BR', region: 'BR', max: Infinity,
    near: '', radius: 1500, exclude: null, keep: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--file') opts.queries.push(...readQueries(next()));
    else if (a === '--grid') opts.grid = Math.max(1, parseInt(next(), 10) || 1);
    else if (a === '--emails') opts.emails = true;
    else if (a === '--out') opts.out = next();
    else if (a === '--lang') opts.lang = next();
    else if (a === '--region') opts.region = next();
    else if (a === '--max') opts.max = parseInt(next(), 10) || Infinity;
    else if (a === '--perto') opts.near = next();
    else if (a === '--raio') opts.radius = parseInt(next(), 10) || 1500;
    else if (a === '--excluir') opts.exclude = new RegExp(next(), 'i');
    else if (a === '--manter') opts.keep = new RegExp(next(), 'i');
    else if (a === '-h' || a === '--help') opts.help = true;
    else opts.queries.push(a);
  }
  return opts;
}

function readQueries(file) {
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function loadEnv() {
  const envFile = path.join(path.dirname(new URL(import.meta.url).pathname), '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// ---------- Places API ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchText(body, apiKey, attempt = 1) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELDS.join(','),
    },
    body: JSON.stringify(body),
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    await sleep(1000 * 2 ** attempt);
    return searchText(body, apiKey, attempt + 1);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Places API ${res.status}: ${data.error?.message || res.statusText}`);
  return data;
}

// Uma busca devolve no máximo 60 lugares (3 páginas de 20).
async function searchAllPages(query, opts, apiKey, rectangle) {
  const places = [];
  let pageToken;
  do {
    const body = { textQuery: query, languageCode: opts.lang, regionCode: opts.region, pageSize: 20 };
    if (rectangle) body.locationRestriction = { rectangle };
    if (pageToken) body.pageToken = pageToken;
    const data = await searchText(body, apiKey);
    places.push(...(data.places || []));
    pageToken = data.nextPageToken;
  } while (pageToken && places.length < opts.max);
  return places;
}

// Para passar do limite de 60, divide a área da cidade numa grade N x N e busca em cada célula.
function gridCells(viewport, n) {
  const { low, high } = viewport;
  const dLat = (high.latitude - low.latitude) / n;
  const dLng = (high.longitude - low.longitude) / n;
  const cells = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      cells.push({
        low: { latitude: low.latitude + i * dLat, longitude: low.longitude + j * dLng },
        high: { latitude: low.latitude + (i + 1) * dLat, longitude: low.longitude + (j + 1) * dLng },
      });
    }
  }
  return cells;
}

async function resolveViewport(query, opts, apiKey) {
  // Pega a área da cidade a partir do texto depois de " em " / " in " (ex.: "dentista em Goiânia").
  const m = query.match(/\s(?:em|in|near|perto de)\s+(.+)$/i);
  const data = await searchText({ textQuery: m ? m[1] : query, languageCode: opts.lang, regionCode: opts.region, pageSize: 1 }, apiKey);
  return data.places?.[0]?.viewport;
}

// Área quadrada em volta de um ponto de referência ("Diamond Center, Teresina" ou "-5.06,-42.79").
async function areaAround(near, radius, opts, apiKey) {
  let point;
  const m = near.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (m) {
    point = { latitude: Number(m[1]), longitude: Number(m[2]) };
  } else {
    const data = await searchText({ textQuery: near, languageCode: opts.lang, regionCode: opts.region, pageSize: 1 }, apiKey);
    const ref = data.places?.[0];
    if (!ref?.location) throw new Error(`não achei o ponto de referência "${near}"`);
    console.log(`Referência: ${ref.displayName?.text} — ${ref.formattedAddress}`);
    point = ref.location;
  }
  const dLat = radius / 111320;
  const dLng = radius / (111320 * Math.cos((point.latitude * Math.PI) / 180));
  return {
    low: { latitude: point.latitude - dLat, longitude: point.longitude - dLng },
    high: { latitude: point.latitude + dLat, longitude: point.longitude + dLng },
  };
}

// ---------- enriquecimento (site) ----------

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const INSTA_RE = /instagram\.com\/([A-Za-z0-9_.]{2,30})/gi;
const WHATS_RE = /(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\d{10,15})/i;
const JUNK_EMAIL = /\.(png|jpe?g|gif|webp|svg)$|example\.|sentry|wixpress|@2x/i;

async function scanWebsite(url) {
  const out = { emails: [], instagram: '', whatsapp: '' };
  if (!url) return out;
  let pages;
  try {
    pages = [url, new URL('/contato', url).href, new URL('/contact', url).href];
  } catch {
    return out;
  }
  const emails = new Set();
  for (const page of pages) {
    try {
      const res = await fetch(page, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'Mozilla/5.0 (lead-kit)' },
        redirect: 'follow',
      });
      if (!res.ok || !(res.headers.get('content-type') || '').includes('html')) continue;
      const html = (await res.text()).replace(/&#64;|\[at\]|\(at\)/gi, '@');
      for (const e of html.match(EMAIL_RE) || []) if (!JUNK_EMAIL.test(e)) emails.add(e.toLowerCase());
      if (!out.instagram) {
        const insta = [...html.matchAll(INSTA_RE)].map((x) => x[1]).find((h) => !/^(p|reel|explore|accounts)$/i.test(h));
        if (insta) out.instagram = `https://instagram.com/${insta}`;
      }
      if (!out.whatsapp) out.whatsapp = html.match(WHATS_RE)?.[1] || '';
      if (emails.size) break;
    } catch {
      // site fora do ar, timeout ou bloqueio: segue para a próxima página
    }
  }
  out.emails = [...emails];
  return out;
}

async function mapLimit(items, limit, fn) {
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

// ---------- saída ----------

function toRow(place, query) {
  const phone = place.internationalPhoneNumber || '';
  const digits = phone.replace(/\D/g, '');
  // No Brasil, celular tem 9 depois do DDD (55 + DDD + 9xxxx-xxxx): provável WhatsApp.
  const mobile = /^55\d{2}9\d{8}$/.test(digits);
  return {
    busca: query,
    nome: place.displayName?.text || '',
    categoria: place.primaryTypeDisplayName?.text || '',
    telefone: place.nationalPhoneNumber || phone,
    whatsapp: mobile ? `https://wa.me/${digits}` : '',
    site: place.websiteUri || '',
    emails: '',
    instagram: '',
    endereco: place.formattedAddress || '',
    nota: place.rating ?? '',
    avaliacoes: place.userRatingCount ?? '',
    status: place.businessStatus || '',
    horarios: (place.regularOpeningHours?.weekdayDescriptions || []).join(' | '),
    lat: place.location?.latitude ?? '',
    lng: place.location?.longitude ?? '',
    link_maps: place.googleMapsUri || '',
    place_id: place.id,
  };
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeOutputs(rows, out) {
  const csv = [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(','))].join('\n');
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(`${out}.csv`, '﻿' + csv); // BOM: acentos certos ao abrir no Excel
  fs.writeFileSync(`${out}.json`, JSON.stringify(rows, null, 2));
}

// ---------- main ----------

const HELP = `
Uso:
  node scrape.js "dentista em Goiânia" ["pizzaria em Recife" ...] [opções]
  node scrape.js --file buscas.txt [opções]

Opções:
  --grid N     divide a cidade em N x N áreas para passar do limite de 60 por busca (ex.: 3)
  --emails     visita o site de cada lugar e procura e-mail, Instagram e WhatsApp
  --max N      para cada busca depois de N resultados
  --perto TXT  busca só em volta de um lugar ("Diamond Center, Teresina") ou de "lat,lng"
  --raio M     distância em metros do --perto (padrão: 1500)
  --excluir RE descarta lugares cujo nome/categoria bate com a expressão (ex.: "dentist|odonto")
  --manter RE  mantém mesmo assim os que batem com esta (ex.: "buco|maxilo")
  --out NOME   prefixo dos arquivos de saída (padrão: resultados -> resultados.csv/.json)
  --lang XX    idioma dos resultados (padrão: pt-BR)
  --region XX  país (padrão: BR)

Precisa da variável GOOGLE_MAPS_API_KEY (ou do arquivo .env nesta pasta).
`;

async function main() {
  loadEnv();
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.queries.length) {
    console.log(HELP);
    process.exit(opts.help ? 0 : 1);
  }
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Falta GOOGLE_MAPS_API_KEY. Copie .env.example para .env e coloque sua chave.');
    process.exit(1);
  }

  const nearArea = opts.near ? await areaAround(opts.near, opts.radius, opts, apiKey) : null;
  const byId = new Map();
  let excluded = 0;
  for (const query of opts.queries) {
    let found = [];
    if (nearArea && opts.grid === 1) {
      found = await searchAllPages(query, opts, apiKey, nearArea);
    } else if (opts.grid > 1) {
      const viewport = nearArea || (await resolveViewport(query, opts, apiKey));
      if (!viewport) {
        console.warn(`! não achei a área de "${query}", buscando sem grade`);
        found = await searchAllPages(query, opts, apiKey);
      } else {
        const cells = gridCells(viewport, opts.grid);
        for (const [i, rect] of cells.entries()) {
          const part = await searchAllPages(query, opts, apiKey, rect);
          process.stdout.write(`\r  ${query}: área ${i + 1}/${cells.length} (${found.length + part.length})`);
          found.push(...part);
          if (found.length >= opts.max) break;
        }
        process.stdout.write('\n');
      }
    } else {
      found = await searchAllPages(query, opts, apiKey);
    }
    let added = 0;
    for (const p of found.slice(0, opts.max)) {
      if (byId.has(p.id)) continue;
      const row = toRow(p, query);
      const label = `${row.nome} ${row.categoria}`;
      if (opts.exclude?.test(label) && !opts.keep?.test(label)) {
        excluded++;
        continue;
      }
      byId.set(p.id, row);
      added++;
    }
    console.log(`✓ ${query}: ${found.length} encontrados, ${added} novos`);
  }

  const rows = [...byId.values()];
  if (opts.emails) {
    const withSite = rows.filter((r) => r.site);
    let done = 0;
    await mapLimit(withSite, 8, async (row) => {
      const info = await scanWebsite(row.site);
      row.emails = info.emails.join('; ');
      row.instagram = info.instagram;
      if (!row.whatsapp && info.whatsapp) row.whatsapp = `https://wa.me/${info.whatsapp}`;
      process.stdout.write(`\r  sites visitados: ${++done}/${withSite.length}`);
    });
    if (withSite.length) process.stdout.write('\n');
  }

  writeOutputs(rows, opts.out);
  const n = (k) => rows.filter((r) => r[k]).length;
  if (excluded) console.log(`${excluded} descartados pelo --excluir`);
  console.log(`\n${rows.length} lugares salvos em ${opts.out}.csv e ${opts.out}.json`);
  console.log(`  com telefone: ${n('telefone')} | WhatsApp: ${n('whatsapp')} | site: ${n('site')}` +
    (opts.emails ? ` | e-mail: ${n('emails')} | Instagram: ${n('instagram')}` : ''));
}

main().catch((err) => {
  console.error(`\nErro: ${err.message}`);
  process.exit(1);
});

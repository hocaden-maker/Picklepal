// Scrapes REAL named pickleball courts from OpenStreetMap via Overpass API.
// Every result is a GPS-verified facility that someone physically mapped.
// Deduplication: skips anything matching an existing name OR within 200m of
// an existing court.
// Run: node scripts/scrape_courts.js

const db = require('../db');

const US_STATES = [
  { name: 'Alabama',        bbox: '30.1,-88.5,35.0,-84.9' },
  { name: 'Arizona',        bbox: '31.3,-114.8,37.0,-109.0' },
  { name: 'Arkansas',       bbox: '33.0,-94.6,36.5,-89.6' },
  { name: 'California-N',   bbox: '36.0,-124.4,42.0,-114.1' },
  { name: 'California-S',   bbox: '32.5,-121.0,36.0,-114.1' },
  { name: 'Colorado',       bbox: '37.0,-109.0,41.0,-102.0' },
  { name: 'Connecticut',    bbox: '40.9,-73.7,42.1,-71.8' },
  { name: 'Delaware',       bbox: '38.4,-75.8,39.8,-75.0' },
  { name: 'Florida-N',      bbox: '27.5,-87.6,31.0,-80.0' },
  { name: 'Florida-S',      bbox: '24.5,-82.0,27.5,-80.0' },
  { name: 'Georgia',        bbox: '30.4,-85.6,35.0,-81.0' },
  { name: 'Idaho',          bbox: '42.0,-117.2,49.0,-111.0' },
  { name: 'Illinois',       bbox: '37.0,-91.5,42.5,-87.5' },
  { name: 'Indiana',        bbox: '37.8,-88.1,41.8,-84.8' },
  { name: 'Iowa',           bbox: '40.4,-96.6,43.5,-90.1' },
  { name: 'Kansas',         bbox: '37.0,-102.1,40.0,-94.6' },
  { name: 'Kentucky',       bbox: '36.5,-89.6,39.1,-82.0' },
  { name: 'Louisiana',      bbox: '28.9,-94.0,33.0,-89.0' },
  { name: 'Maine',          bbox: '43.1,-71.1,47.5,-67.0' },
  { name: 'Maryland',       bbox: '37.9,-79.5,39.7,-75.0' },
  { name: 'Massachusetts',  bbox: '41.2,-73.5,42.9,-69.9' },
  { name: 'Michigan',       bbox: '41.7,-90.4,48.3,-82.4' },
  { name: 'Minnesota',      bbox: '43.5,-97.2,49.4,-89.5' },
  { name: 'Mississippi',    bbox: '30.1,-91.6,35.0,-88.1' },
  { name: 'Missouri',       bbox: '36.0,-95.8,40.6,-89.1' },
  { name: 'Montana',        bbox: '44.4,-116.0,49.0,-104.0' },
  { name: 'Nebraska',       bbox: '40.0,-104.1,43.0,-95.3' },
  { name: 'Nevada',         bbox: '35.0,-120.0,42.0,-114.0' },
  { name: 'New Hampshire',  bbox: '42.7,-72.6,45.3,-70.6' },
  { name: 'New Jersey',     bbox: '38.9,-75.6,41.4,-73.9' },
  { name: 'New Mexico',     bbox: '31.3,-109.0,37.0,-103.0' },
  { name: 'New York',       bbox: '40.5,-79.8,45.0,-71.9' },
  { name: 'North Carolina', bbox: '33.8,-84.3,36.6,-75.5' },
  { name: 'North Dakota',   bbox: '45.9,-104.0,49.0,-96.6' },
  { name: 'Ohio',           bbox: '38.4,-84.8,42.0,-80.5' },
  { name: 'Oklahoma',       bbox: '33.6,-103.0,37.0,-94.4' },
  { name: 'Oregon',         bbox: '42.0,-124.6,46.2,-116.5' },
  { name: 'Pennsylvania',   bbox: '39.7,-80.5,42.3,-74.7' },
  { name: 'Rhode Island',   bbox: '41.1,-71.9,42.0,-71.1' },
  { name: 'South Carolina', bbox: '32.0,-83.4,35.2,-78.5' },
  { name: 'South Dakota',   bbox: '42.5,-104.1,45.9,-96.4' },
  { name: 'Tennessee',      bbox: '34.9,-90.3,36.7,-81.7' },
  { name: 'Texas-N',        bbox: '31.0,-106.6,36.5,-93.5' },
  { name: 'Texas-S',        bbox: '25.8,-100.0,31.0,-93.5' },
  { name: 'Utah',           bbox: '37.0,-114.0,42.0,-109.0' },
  { name: 'Vermont',        bbox: '42.7,-73.4,45.0,-71.5' },
  { name: 'Virginia',       bbox: '36.5,-83.7,39.5,-75.2' },
  { name: 'Washington',     bbox: '45.5,-124.8,49.0,-116.9' },
  { name: 'West Virginia',  bbox: '37.2,-82.6,40.6,-77.7' },
  { name: 'Wisconsin',      bbox: '42.5,-92.9,47.1,-86.8' },
  { name: 'Wyoming',        bbox: '41.0,-111.0,45.0,-104.1' },
  { name: 'Canada-W',       bbox: '49.0,-141.0,60.0,-100.0' },
  { name: 'Canada-E',       bbox: '42.0,-100.0,60.0,-52.0' },
  { name: 'Europe',         bbox: '35.0,-10.0,60.0,32.0' },
  { name: 'Australia',      bbox: '-44.0,112.0,-10.0,154.0' },
  { name: 'Asia-Pacific',   bbox: '1.0,100.0,50.0,145.0' },
];

// Haversine distance in meters
function distMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function queryOverpass(bbox) {
  // Only fetch nodes/ways with a name AND sport=pickleball
  const q = `[out:json][timeout:30];(node["sport"="pickleball"]["name"](${bbox});way["sport"="pickleball"]["name"](${bbox});node["leisure"="pitch"]["sport"="pickleball"]["name"](${bbox});way["leisure"="pitch"]["sport"="pickleball"]["name"](${bbox});node["amenity"]["sport"="pickleball"]["name"](${bbox}););out center;`;
  const resp = await fetch(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`,
    { signal: AbortSignal.timeout(35000) }
  );
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function guessAccess(tags) {
  const fee   = (tags.fee    || '').toLowerCase();
  const access= (tags.access || '').toLowerCase();
  const op    = (tags.operator|| tags.brand || '').toLowerCase();
  if (access === 'private' || op.includes('country club') || op.includes(' club'))
    return 'members';
  if (fee === 'yes' || access === 'customers')
    return 'fee';
  return 'public';
}

const stmt = db.prepare(`
  INSERT OR IGNORE INTO courts_cache (id, name, lat, lon, city, court_count, access, description)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

// Build in-memory index of existing courts for fast proximity check
const existingCourts = db.prepare('SELECT name, lat, lon FROM courts_cache').all();
const existingNames  = new Set(existingCourts.map(c => c.name.toLowerCase().trim()));
// Grid index: bucket by rounded lat/lon for fast lookup
const grid = {};
for (const c of existingCourts) {
  const key = `${Math.round(c.lat * 50)},${Math.round(c.lon * 50)}`;
  if (!grid[key]) grid[key] = [];
  grid[key].push(c);
}

function isTooClose(lat, lon) {
  // Check 3x3 grid cells (each cell ≈ 2km)
  for (let dlat = -1; dlat <= 1; dlat++) {
    for (let dlon = -1; dlon <= 1; dlon++) {
      const key = `${Math.round(lat * 50) + dlat},${Math.round(lon * 50) + dlon}`;
      for (const c of (grid[key] || [])) {
        if (distMeters(lat, lon, c.lat, c.lon) < 200) return true;
      }
    }
  }
  return false;
}

function addToIndex(name, lat, lon) {
  existingNames.add(name.toLowerCase().trim());
  const key = `${Math.round(lat * 50)},${Math.round(lon * 50)}`;
  if (!grid[key]) grid[key] = [];
  grid[key].push({ name, lat, lon });
}

let totalInserted = 0;

async function processRegion(region) {
  let data;
  try { data = await queryOverpass(region.bbox); }
  catch (e) { console.log(`  ✗ ${region.name}: ${e.message}`); return 0; }

  let inserted = 0;
  for (const el of (data.elements || [])) {
    const tags = el.tags || {};
    const name = (tags.name || '').trim();
    if (!name) continue;  // skip unnamed

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!lat || !lon) continue;

    // Deduplicate: name match
    if (existingNames.has(name.toLowerCase().trim())) continue;
    // Deduplicate: coordinate proximity (< 200 m = same facility)
    if (isTooClose(lat, lon)) continue;

    const courts  = parseInt(tags.courts || tags['capacity'] || '0') || 0;
    const city    = tags['addr:city'] || tags['addr:town'] || '';
    const access  = guessAccess(tags);
    const surface = tags.surface || '';
    const desc    = surface ? `${surface.charAt(0).toUpperCase() + surface.slice(1)} surface` : '';

    try {
      stmt.run(`osm_${el.id}`, name, lat, lon, city, courts, access, desc);
      addToIndex(name, lat, lon);
      inserted++;
    } catch {}
  }
  return inserted;
}

async function main() {
  const before = db.prepare('SELECT COUNT(*) as c FROM courts_cache').get().c;
  console.log(`DB has ${before} courts before scrape.\n`);

  for (const region of US_STATES) {
    process.stdout.write(`  ${region.name.padEnd(18)} `);
    const n = await processRegion(region);
    totalInserted += n;
    console.log(`+${n}`);
    await sleep(1100); // polite delay between Overpass requests
  }

  const after = db.prepare('SELECT COUNT(*) as c FROM courts_cache').get().c;
  console.log(`\nInserted ${totalInserted} new real named courts.`);
  console.log(`DB total: ${after}`);
}

main().catch(console.error);

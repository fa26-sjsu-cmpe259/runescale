// Snapshots the 5e SRD monster list from Open5e into data/monsters.json.
// Run with `npm run snapshot:monsters`. The app and eval read the snapshot, not the live API.

import { writeFile } from 'node:fs/promises';

const SOURCE = 'https://api.open5e.com/v1/monsters/?document__slug=wotc-srd&limit=100';
const OUTPUT = new URL('./monsters.json', import.meta.url);

interface Open5eMonster {
  slug: string;
  name: string;
  size: string;
  type: string;
  subtype: string;
  alignment: string;
  armor_class: number;
  hit_points: number;
  hit_dice: string;
  speed: Record<string, number | boolean>;
  challenge_rating: string;
  environments: string[];
}

interface Open5ePage {
  next: string | null;
  results: Open5eMonster[];
}

async function fetchAll(): Promise<Open5eMonster[]> {
  const monsters: Open5eMonster[] = [];
  let url: string | null = SOURCE;
  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open5e request failed: ${res.status} ${url}`);
    const page = (await res.json()) as Open5ePage;
    monsters.push(...page.results);
    url = page.next;
  }
  return monsters;
}

const monsters = (await fetchAll())
  .map((m) => ({
    slug: m.slug,
    name: m.name,
    cr: m.challenge_rating,
    size: m.size,
    type: m.type,
    subtype: m.subtype,
    alignment: m.alignment,
    ac: m.armor_class,
    hp: m.hit_points,
    hitDice: m.hit_dice,
    speed: m.speed,
    environments: m.environments,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const snapshot = {
  source: SOURCE,
  license: 'OGL 1.0a (5e SRD)',
  fetchedAt: new Date().toISOString(),
  count: monsters.length,
  monsters,
};

await writeFile(OUTPUT, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Wrote ${monsters.length} monsters to data/monsters.json`);

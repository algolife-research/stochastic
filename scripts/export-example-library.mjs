#!/usr/bin/env node
// Rebuild the example library manifest (public/examples-library/index.json)
// from the files present in the library:
//   examples/*.json      — in-app graph examples (Example format)
//   compositions/*.sto   — full serialized compositions
//
// Add or edit a file, then run: node scripts/export-example-library.mjs

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(root, 'public', 'examples-library');

const CATEGORIES = [
  'Tutorials', 'Demos', 'Synthesis', 'Generative', 'Effects & Routing',
  'Composition', 'Physics & Timing', 'Orchestral', 'Evolutionary',
];

if (!existsSync(LIB)) {
  console.error(`Library not found at ${LIB}`);
  process.exit(1);
}

const previous = existsSync(path.join(LIB, 'index.json'))
  ? JSON.parse(readFileSync(path.join(LIB, 'index.json'), 'utf8'))
  : { version: 0 };

const exampleEntries = [];
for (const file of readdirSync(path.join(LIB, 'examples')).filter(f => f.endsWith('.json')).sort()) {
  const example = JSON.parse(readFileSync(path.join(LIB, 'examples', file), 'utf8'));
  const key = file.replace('.json', '');
  if (!CATEGORIES.includes(example.category)) {
    console.error(`${file}: unknown category "${example.category}"`);
    process.exit(1);
  }
  exampleEntries.push({
    key,
    name: example.name,
    category: example.category,
    description: example.description,
    bpm: example.bpm,
    path: `examples/${file}`,
  });
}

const compositionEntries = [];
for (const file of readdirSync(path.join(LIB, 'compositions')).filter(f => f.endsWith('.sto')).sort()) {
  const data = JSON.parse(readFileSync(path.join(LIB, 'compositions', file), 'utf8'));
  const sceneCount = data.scenes?.length ?? 1;
  compositionEntries.push({
    key: file.replace('.sto', ''),
    name: data.meta?.name || file.replace('.sto', ''),
    description: `Full composition — ${sceneCount} scene${sceneCount > 1 ? 's' : ''}`,
    scenes: sceneCount,
    path: `compositions/${file}`,
  });
}

const manifest = {
  version: (previous.version ?? 0) + 1,
  generated: new Date().toISOString(),
  categories: CATEGORIES,
  examples: exampleEntries,
  compositions: compositionEntries,
};
writeFileSync(path.join(LIB, 'index.json'), JSON.stringify(manifest, null, 2));

console.log(`manifest v${manifest.version}: ${exampleEntries.length} examples, ${compositionEntries.length} compositions`);

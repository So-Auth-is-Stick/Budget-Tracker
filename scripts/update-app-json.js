// One-time helper: adds what the new features need to YOUR app.json, without touching anything else
// (app name, package id, version, EAS project id all stay exactly as they are).
// Run from the project folder:   node scripts/update-app-json.js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app.json');
const raw = fs.readFileSync(file, 'utf8');
const json = JSON.parse(raw);
const expo = json.expo || json;

const NEEDED = [
  'expo-secure-store',
  ['expo-notifications', { color: '#E8B84B' }],
  ['expo-local-authentication', { faceIDPermission: 'Allow Ledger to use Face ID to unlock.' }],
  'expo-font',
];

expo.plugins = expo.plugins || [];
const nameOf = (p) => (Array.isArray(p) ? p[0] : p);
const have = new Set(expo.plugins.map(nameOf));
const added = [];
NEEDED.forEach((p) => {
  if (!have.has(nameOf(p))) { expo.plugins.push(p); added.push(nameOf(p)); }
});

const changes = [];
if (expo.userInterfaceStyle !== 'automatic') {
  changes.push(`userInterfaceStyle: "${expo.userInterfaceStyle || '(not set)'}" -> "automatic" (lets the Auto theme follow dark mode)`);
  expo.userInterfaceStyle = 'automatic';
}

if (!fs.existsSync(file + '.backup')) fs.writeFileSync(file + '.backup', raw); // keep the very first original
fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');

console.log('app.json updated (old copy saved as app.json.backup)');
console.log(added.length ? '  plugins added: ' + added.join(', ') : '  plugins: already up to date');
changes.forEach((c) => console.log('  ' + c));
console.log('  android.package: ' + ((expo.android && expo.android.package) || '(not set!)') + '  <- must stay the same so the new APK updates your app');

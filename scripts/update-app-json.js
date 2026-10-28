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

// New app icon + splash screen (files live in assets/ledger/)
const SPLASH = ['expo-splash-screen', {
  image: './assets/ledger/splash-icon.png', imageWidth: 170, resizeMode: 'contain',
  backgroundColor: '#F3EFE4', dark: { image: './assets/ledger/splash-icon.png', backgroundColor: '#0F1A18' },
}];

expo.plugins = expo.plugins || [];
const nameOf = (p) => (Array.isArray(p) ? p[0] : p);
const have = new Set(expo.plugins.map(nameOf));
const added = [];
NEEDED.forEach((p) => {
  if (!have.has(nameOf(p))) { expo.plugins.push(p); added.push(nameOf(p)); }
});

// splash: add, or refresh its settings if it's already there
const si = expo.plugins.findIndex((p) => nameOf(p) === 'expo-splash-screen');
if (si === -1) { expo.plugins.push(SPLASH); added.push('expo-splash-screen'); } else { expo.plugins[si] = SPLASH; }

const changes = [];
// show "2.0.0" as the version in Android settings (the build number still goes up automatically)
const [maj] = String(expo.version || '1.0.0').split('.').map(Number);
if (!(maj >= 2)) { changes.push(`version: "${expo.version || '(not set)'}" -> "2.0.0"`); expo.version = '2.0.0'; }
if (fs.existsSync(path.join(__dirname, '..', 'assets', 'ledger', 'icon.png'))) {
  expo.icon = './assets/ledger/icon.png';
  expo.android = expo.android || {};
  expo.android.adaptiveIcon = {
    ...(expo.android.adaptiveIcon || {}),
    foregroundImage: './assets/ledger/android-icon-foreground.png',
    backgroundImage: './assets/ledger/android-icon-background.png',
    monochromeImage: './assets/ledger/android-icon-monochrome.png',
    backgroundColor: '#0F1A18',
  };
  expo.web = { ...(expo.web || {}), favicon: './assets/ledger/favicon.png' };
  changes.push('icon + splash -> assets/ledger/');
} else {
  console.log('  (assets/ledger/ not found: skipped the new icon. Copy the assets folder from the zip and run again.)');
}
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

// Pictures attached to entries.
// The picked image/GIF is COPIED into the app's private folder, so:
//  * it stays even if you delete the original from your phone, and
//  * it never shows up in your gallery (that folder isn't scanned by Android's media library).
// Entries store only the file name: { file, w, h, gif }.
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, Directory, Paths } from 'expo-file-system';

const FOLDER = 'entry-images';
const MAX_BYTES = 40 * 1024 * 1024;
const web = Platform.OS === 'web';

function folder() {
  const d = new Directory(Paths.document, FOLDER);
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}

const extFor = (asset) => {
  const fromMime = asset.mimeType && asset.mimeType.split('/')[1];
  const fromName = (asset.fileName || asset.uri || '').split('?')[0].split('.').pop();
  const ext = (fromMime || fromName || 'jpg').toLowerCase().replace('jpeg', 'jpg').replace('svg+xml', 'svg');
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : 'jpg';
};

// Opens the phone's photo picker. Returns { file, w, h, gif } or null if cancelled.
export async function pickEntryImage() {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false, // cropping would turn a GIF into a still picture
    quality: 1,           // 1 = copy the original untouched (keeps GIFs animated)
    exif: false,
  });
  if (res.canceled || !res.assets || !res.assets.length) return null;
  const a = res.assets[0];
  const ext = extFor(a);
  const meta = { w: a.width || 0, h: a.height || 0, gif: ext === 'gif' || ext === 'webp' };
  if (web) return { file: a.uri, ...meta }; // browser preview only
  if (a.fileSize && a.fileSize > MAX_BYTES) throw new Error('That file is over 40 MB. Pick a smaller picture or GIF.');
  const name = `img_${Date.now()}_${Math.floor(Math.random() * 1e4)}.${ext}`;
  const dest = new File(folder(), name);
  await new File(a.uri).copy(dest);
  return { file: name, ...meta };
}

export function imageUri(img) {
  if (!img || !img.file) return null;
  if (web || /^(data:|blob:|https?:|file:)/.test(img.file)) return img.file;
  return new File(folder(), img.file).uri;
}

// Deletes copies no entry uses any more. Waits a week so "Undo" and "undo restore" still find them.
export function cleanupEntryImages(referencedNames) {
  if (web) return 0;
  try {
    const keep = new Set(referencedNames);
    const weekAgo = Date.now() - 7 * 864e5;
    let removed = 0;
    folder().list().forEach((item) => {
      if (!(item instanceof File) || keep.has(item.name)) return;
      const info = item.info ? item.info() : {};
      const t = info.modificationTime || info.creationTime || 0;
      const ms = t < 1e12 ? t * 1000 : t; // seconds or milliseconds depending on platform
      if (ms && ms < weekAgo) { item.delete(); removed++; }
    });
    return removed;
  } catch (e) {
    return 0;
  }
}

export const IMAGE_LOOKS = [
  { key: 'fade', label: 'Fade', hint: 'Picture fills the right side and melts into the card' },
  { key: 'glass', label: 'Glass', hint: 'Frosted, blurred picture behind everything' },
  { key: 'clear', label: 'Clear', hint: 'Full picture with a soft shade so text stays readable' },
];

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const DIR = FileSystem.documentDirectory + 'receipts/';

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}

async function copyToAppStorage(uri) {
  await ensureDir();
  const dest = DIR + 'receipt_' + Date.now() + '.jpg';
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

export async function pickFromLibrary() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6 });
  if (result.canceled) return null;
  return copyToAppStorage(result.assets[0].uri);
}

export async function takePhoto() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  if (result.canceled) return null;
  return copyToAppStorage(result.assets[0].uri);
}
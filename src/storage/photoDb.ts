import { del, get, set } from 'idb-keyval';
import { logger } from '../utils/logger';

export const savePhotoBlob = async (key: string, blob: Blob) => {
  // IndexedDB keeps media local and avoids LocalStorage quota issues.
  await set(key, blob);
  logger.info('Photos: blob saved', { key, size: blob.size });
};

export const loadPhotoBlob = async (key: string) => {
  const blob = await get<Blob>(key);
  logger.info('Photos: blob loaded', { key, found: Boolean(blob) });
  return blob ?? null;
};

export const deletePhotoBlob = async (key: string) => {
  await del(key);
  logger.info('Photos: blob deleted', { key });
};

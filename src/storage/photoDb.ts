import { del, get, set } from 'idb-keyval';

export const savePhotoBlob = async (key: string, blob: Blob) => {
  await set(key, blob);
};

export const loadPhotoBlob = async (key: string) => {
  const blob = await get<Blob>(key);
  return blob ?? null;
};

export const deletePhotoBlob = async (key: string) => {
  await del(key);
};

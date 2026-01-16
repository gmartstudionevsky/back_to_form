import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { savePhotoBlob, loadPhotoBlob, deletePhotoBlob } from '../storage/photoDb';

const PhotosPage = () => {
  const { data, addPhotoMeta, removePhotoMeta } = useAppStore();
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const next: Record<string, string> = {};
      for (const photo of data.logs.photos) {
        if (previews[photo.id]) continue;
        const blob = await loadPhotoBlob(photo.blobKey);
        if (blob) {
          next[photo.id] = URL.createObjectURL(blob);
        }
      }
      if (Object.keys(next).length > 0) {
        setPreviews(prev => ({ ...prev, ...next }));
      }
    };
    load();
  }, [data.logs.photos, previews]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const blobKey = crypto.randomUUID();
    await savePhotoBlob(blobKey, file);
    addPhotoMeta({
      id: crypto.randomUUID(),
      dateTime: new Date().toISOString(),
      kind: 'front',
      blobKey,
      notes: ''
    });
    event.target.value = '';
  };

  const handleDelete = async (id: string, blobKey: string) => {
    await deletePhotoBlob(blobKey);
    removePhotoMeta(id);
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Фото</h1>
        <p className="text-sm text-slate-500">
          Фото остаются только на устройстве. Экспорт JSON не включает blobs.
        </p>
      </header>

      <div className="card p-4">
        <label className="text-sm font-semibold text-slate-600">Добавить фото</label>
        <input type="file" accept="image/*" className="input mt-2" onChange={handleUpload} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {data.logs.photos.map(photo => (
          <div key={photo.id} className="card p-2">
            {previews[photo.id] ? (
              <img
                src={previews[photo.id]}
                alt="Фото прогресса"
                className="h-40 w-full rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                Загрузка...
              </div>
            )}
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{new Date(photo.dateTime).toLocaleDateString('ru-RU')}</span>
              <button
                className="text-red-500"
                onClick={() => handleDelete(photo.id, photo.blobKey)}
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PhotosPage;

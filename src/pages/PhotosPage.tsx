import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { savePhotoBlob, loadPhotoBlob, deletePhotoBlob } from '../storage/photoDb';
import { BottomSheet } from '../components/BottomSheet';
import { todayISO } from '../utils/date';

const PhotosPage = () => {
  const { data, addPhotoMeta, removePhotoMeta } = useAppStore();
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [uploadMeta, setUploadMeta] = useState({
    kind: 'front' as const,
    date: todayISO(),
    notes: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);

  const dayPlan = data.planner.dayPlans.find(plan => plan.date === selectedDate);
  const requiredPhotos = dayPlan?.requirements.requirePhotos ?? [];
  const photoLabels: Record<'front' | 'side', string> = {
    front: 'фронт',
    side: 'профиль'
  };

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

  useEffect(() => {
    return () => {
      Object.values(previews).forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    const blobKey = crypto.randomUUID();
    await savePhotoBlob(blobKey, selectedFile);
    addPhotoMeta({
      id: crypto.randomUUID(),
      dateTime: `${uploadMeta.date}T${new Date().toISOString().slice(11, 19)}`,
      kind: uploadMeta.kind,
      blobKey,
      notes: uploadMeta.notes
    });
    setSelectedFile(null);
    setUploadMeta({ kind: 'front', date: todayISO(), notes: '' });
    setSheetOpen(false);
  };

  const handleDelete = async (id: string, blobKey: string) => {
    await deletePhotoBlob(blobKey);
    if (previews[id]) {
      URL.revokeObjectURL(previews[id]);
    }
    setPreviews(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    removePhotoMeta(id);
  };

  const groupedPhotos = useMemo(() => {
    return data.logs.photos.reduce((acc: Record<string, typeof data.logs.photos>, photo) => {
      const date = photo.dateTime.slice(0, 10);
      if (!acc[date]) acc[date] = [];
      acc[date].push(photo);
      return acc;
    }, {});
  }, [data.logs.photos]);

  const openPlanUpload = (kind: 'front' | 'side') => {
    setUploadMeta(prev => ({ ...prev, kind, date: selectedDate }));
    setSheetOpen(true);
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Фото</h1>
        <p className="text-sm text-slate-500">
          Фото хранятся локально. Экспорт JSON не включает файлы.
        </p>
      </header>

      <div className="card p-4 space-y-3">
        <label className="text-sm font-semibold text-slate-600">Дата</label>
        <input
          type="date"
          value={selectedDate}
          onChange={event => setSelectedDate(event.target.value)}
          className="input"
        />
        {requiredPhotos.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Нужно сделать сегодня:</p>
            <div className="flex gap-2">
              {requiredPhotos.map(kind => (
                <button key={kind} className="btn-primary" onClick={() => openPlanUpload(kind)}>
                  Добавить {photoLabels[kind]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Нет обязательных фото на эту дату.</p>
        )}
      </div>

      <div className="card p-4">
        <button className="btn-primary w-full" onClick={() => setSheetOpen(true)}>
          Добавить фото вручную
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedPhotos)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, photos]) => (
            <div key={date} className="space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-400">{date}</p>
              <div className="grid grid-cols-2 gap-3">
                {photos.map(photo => (
                  <div key={photo.id} className="card p-2">
                    {previews[photo.id] ? (
                      <img
                        src={previews[photo.id]}
                        alt="Фото прогресса"
                        className="h-40 w-full rounded-xl object-cover"
                        onClick={() => setFullscreenId(photo.id)}
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                        Загрузка...
                      </div>
                    )}
                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      <div className="flex items-center justify-between">
                        <span>{photo.kind}</span>
                        <button
                          className="text-red-500"
                          onClick={() => handleDelete(photo.id, photo.blobKey)}
                        >
                          Удалить
                        </button>
                      </div>
                      {photo.notes ? <p>{photo.notes}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      <BottomSheet open={sheetOpen} title="Новое фото" onClose={() => setSheetOpen(false)}>
        <label className="text-sm font-semibold text-slate-600">Файл</label>
        <input
          type="file"
          accept="image/*"
          className="input"
          onChange={event => setSelectedFile(event.target.files?.[0] ?? null)}
        />
        <label className="text-sm font-semibold text-slate-600">Тип</label>
        <select
          className="input"
          value={uploadMeta.kind}
          onChange={event =>
            setUploadMeta(prev => ({ ...prev, kind: event.target.value as typeof prev.kind }))
          }
        >
          <option value="front">Фронт</option>
          <option value="side">Профиль</option>
          <option value="other">Другое</option>
        </select>
        <label className="text-sm font-semibold text-slate-600">Дата</label>
        <input
          type="date"
          className="input"
          value={uploadMeta.date}
          onChange={event => setUploadMeta(prev => ({ ...prev, date: event.target.value }))}
        />
        <label className="text-sm font-semibold text-slate-600">Заметки</label>
        <textarea
          className="input min-h-[80px]"
          value={uploadMeta.notes}
          onChange={event => setUploadMeta(prev => ({ ...prev, notes: event.target.value }))}
        />
        <button className="btn-primary" onClick={handleUpload}>
          Сохранить фото
        </button>
      </BottomSheet>

      {fullscreenId && previews[fullscreenId] ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setFullscreenId(null)}
            aria-label="Закрыть"
          />
          <img
            src={previews[fullscreenId]}
            alt="Полноэкранное фото"
            className="relative max-h-full max-w-full rounded-2xl object-contain"
          />
        </div>
      ) : null}
    </section>
  );
};

export default PhotosPage;

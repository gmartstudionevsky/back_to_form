export const todayISO = () => new Date().toISOString().slice(0, 10);

export const formatDate = (iso: string) => {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
};

export const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
};

export const currentTimeString = () =>
  new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export const combineDateTime = (date: string, time?: string) => {
  const safeTime = time?.trim() ? time : currentTimeString();
  return new Date(`${date}T${safeTime}:00`).toISOString();
};

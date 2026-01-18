import { NavLink } from 'react-router-dom';

const MorePage = () => {
  const links = [
    { path: '/library', label: 'Библиотеки' },
    { path: '/progress', label: 'Прогресс' },
    { path: '/photos', label: 'Фото' },
    { path: '/settings', label: 'Настройки' }
  ];

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Ещё</h1>
        <p className="text-sm text-slate-500">Дополнительные разделы и настройки.</p>
      </header>

      <div className="space-y-3">
        {links.map(link => (
          <NavLink
            key={link.path}
            to={link.path}
            className="card flex items-center justify-between p-4 text-sm font-semibold text-slate-900"
          >
            <span>{link.label}</span>
            <span className="text-slate-400">Открыть</span>
          </NavLink>
        ))}
      </div>
    </section>
  );
};

export default MorePage;

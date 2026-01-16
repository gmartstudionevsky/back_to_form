import { NavLink } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Сегодня', icon: '☀️' },
  { path: '/plan', label: 'План', icon: '🗓️' },
  { path: '/track', label: 'Трек', icon: '✅' },
  { path: '/library', label: 'База', icon: '📚' },
  { path: '/progress', label: 'Прогресс', icon: '📈' },
  { path: '/photos', label: 'Фото', icon: '📷' },
  { path: '/settings', label: 'Настройки', icon: '⚙️' }
];

export const BottomTabs = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 safe-bottom">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-2 py-2">
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold ${
                isActive ? 'text-slate-900' : 'text-slate-400'
              }`
            }
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

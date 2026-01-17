import { NavLink } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Сегодня' },
  { path: '/plan', label: 'План' },
  { path: '/track', label: 'Трекер' },
  { path: '/library', label: 'Библиотека' },
  { path: '/more', label: 'Ещё' }
];

export const BottomTabs = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-3 py-2">
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end
            className={({ isActive }) =>
              `flex flex-1 items-center justify-center rounded-xl px-2 py-2 text-[11px] font-semibold transition sm:text-xs ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`
            }
          >
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

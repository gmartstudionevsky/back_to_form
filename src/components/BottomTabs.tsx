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
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-md items-center justify-between px-2 py-2">
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end
            className={({ isActive }) =>
              `flex flex-1 items-center justify-center rounded-xl px-1 py-2 text-[11px] font-semibold sm:text-xs ${
                isActive ? 'text-slate-900' : 'text-slate-400'
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

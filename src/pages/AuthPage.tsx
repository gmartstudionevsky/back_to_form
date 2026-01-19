import { useState } from 'react';
import { useProfileStore } from '../store/useProfileStore';

const AuthPage = () => {
  const registerProfile = useProfileStore(state => state.registerProfile);
  const login = useProfileStore(state => state.login);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState({ login: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    login: '',
    password: '',
    confirm: '',
    name: ''
  });
  const [error, setError] = useState('');

  const submitLogin = () => {
    setError('');
    const result = login(loginForm.login.trim(), loginForm.password);
    if (!result.ok) {
      setError(result.error ?? 'Не удалось войти.');
    }
  };

  const submitRegister = () => {
    setError('');
    if (!registerForm.login.trim() || !registerForm.password) {
      setError('Заполните логин и пароль.');
      return;
    }
    if (registerForm.password !== registerForm.confirm) {
      setError('Пароли не совпадают.');
      return;
    }
    const result = registerProfile({
      login: registerForm.login.trim(),
      password: registerForm.password,
      name: registerForm.name.trim() || undefined
    });
    if (!result.ok) {
      setError(result.error ?? 'Не удалось зарегистрироваться.');
    }
  };

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4 py-8">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Back to Form</h1>
        <p className="text-sm text-slate-500">
          Войдите в профайл или зарегистрируйтесь, чтобы продолжить.
        </p>
      </header>

      <div className="card p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            className={mode === 'login' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Вход
          </button>
          <button
            className={mode === 'register' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            Регистрация
          </button>
        </div>

        {mode === 'login' ? (
          <div className="space-y-3">
            <label className="text-xs text-slate-500">
              Логин
              <input
                className="input mt-1"
                value={loginForm.login}
                onChange={event =>
                  setLoginForm(prev => ({ ...prev, login: event.target.value }))
                }
              />
            </label>
            <label className="text-xs text-slate-500">
              Пароль
              <input
                className="input mt-1"
                type="password"
                value={loginForm.password}
                onChange={event =>
                  setLoginForm(prev => ({ ...prev, password: event.target.value }))
                }
              />
            </label>
            <button className="btn-primary w-full" onClick={submitLogin}>
              Войти
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-xs text-slate-500">
              Логин
              <input
                className="input mt-1"
                value={registerForm.login}
                onChange={event =>
                  setRegisterForm(prev => ({ ...prev, login: event.target.value }))
                }
              />
            </label>
            <label className="text-xs text-slate-500">
              Пароль
              <input
                className="input mt-1"
                type="password"
                value={registerForm.password}
                onChange={event =>
                  setRegisterForm(prev => ({ ...prev, password: event.target.value }))
                }
              />
            </label>
            <label className="text-xs text-slate-500">
              Повтор пароля
              <input
                className="input mt-1"
                type="password"
                value={registerForm.confirm}
                onChange={event =>
                  setRegisterForm(prev => ({ ...prev, confirm: event.target.value }))
                }
              />
            </label>
            <label className="text-xs text-slate-500">
              Имя (необязательно)
              <input
                className="input mt-1"
                value={registerForm.name}
                onChange={event =>
                  setRegisterForm(prev => ({ ...prev, name: event.target.value }))
                }
              />
            </label>
            <button className="btn-primary w-full" onClick={submitRegister}>
              Создать профайл
            </button>
          </div>
        )}

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </div>
    </section>
  );
};

export default AuthPage;

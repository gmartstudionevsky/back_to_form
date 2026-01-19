import { ProfileEditor } from '../components/ProfileEditor';
import { useProfileStore } from '../store/useProfileStore';

const ProfileSetupPage = () => {
  const profile = useProfileStore(state =>
    state.profiles.find(item => item.id === state.activeProfileId)
  );
  const replaceProfile = useProfileStore(state => state.replaceProfile);

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100/40 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <ProfileEditor
        profile={profile}
        submitLabel="Сохранить и продолжить"
        description="Первый вход в профайл — заполните базовые данные, чтобы расчёты были точнее."
        completeSetup
        onSubmit={updated => replaceProfile({ ...updated, setupCompleted: true })}
      />
    </div>
  );
};

export default ProfileSetupPage;

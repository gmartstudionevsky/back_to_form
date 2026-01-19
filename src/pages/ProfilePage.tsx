import { ProfileEditor } from '../components/ProfileEditor';
import { useProfileStore } from '../store/useProfileStore';

const ProfilePage = () => {
  const profile = useProfileStore(state =>
    state.profiles.find(item => item.id === state.activeProfileId)
  );
  const replaceProfile = useProfileStore(state => state.replaceProfile);
  const logout = useProfileStore(state => state.logout);

  if (!profile) return null;

  return (
    <ProfileEditor
      profile={profile}
      submitLabel="Сохранить изменения"
      onSubmit={updated => replaceProfile(updated)}
      onLogout={logout}
    />
  );
};

export default ProfilePage;

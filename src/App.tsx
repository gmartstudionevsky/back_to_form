import { Route, Routes } from 'react-router-dom';
import { BottomTabs } from './components/BottomTabs';
import TodayPage from './pages/TodayPage';
import PlanPage from './pages/PlanPage';
import TrackPage from './pages/TrackPage';
import LibraryPage from './pages/LibraryPage';
import ProgressPage from './pages/ProgressPage';
import PhotosPage from './pages/PhotosPage';
import SettingsPage from './pages/SettingsPage';
import MorePage from './pages/MorePage';

const App = () => {
  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="mx-auto max-w-md px-4 pt-5">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/photos" element={<PhotosPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
      <BottomTabs />
    </div>
  );
};

export default App;

import { Route, Routes } from 'react-router-dom';
import { BottomTabs } from './components/BottomTabs';
import TodayPage from './pages/TodayPage';
import PlanPage from './pages/PlanPage';
import TrackPage from './pages/TrackPage';
import LibraryPage from './pages/LibraryPage';
import NutritionPage from './pages/NutritionPage';
import ActivityPage from './pages/ActivityPage';
import HealthPage from './pages/HealthPage';
import ProgressPage from './pages/ProgressPage';
import PhotosPage from './pages/PhotosPage';
import SettingsPage from './pages/SettingsPage';
import MorePage from './pages/MorePage';

const App = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100/40 pb-28 text-slate-900">
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/nutrition" element={<NutritionPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/health" element={<HealthPage />} />
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

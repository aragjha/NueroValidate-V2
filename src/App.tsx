import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { AppProvider, useAppContext } from '@/context/AppContext';
import { AuthPage } from '@/pages/AuthPage';
import { CreateProjectPage } from '@/pages/CreateProjectPage';
import { CriteriaPage } from '@/pages/CriteriaPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ReviewPage } from '@/pages/ReviewPage';

function AppRoutes() {
  const { loading } = useAppContext();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading NeuroValidate...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route element={<AppLayout />}>
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<CreateProjectPage />} />
        <Route path="/projects/:projectId/criteria" element={<CriteriaPage />} />
        <Route path="/projects/:projectId/review" element={<ReviewPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}

export default App;

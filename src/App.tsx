import { Component, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { AppProvider, useAppContext } from '@/context/AppContext';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace' }}>
          <h1 style={{ color: 'red' }}>Runtime Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#fee', padding: 16 }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
import { AuthPage } from '@/pages/AuthPage';
import { HomePage } from '@/pages/HomePage';
import { CreateProjectPage } from '@/pages/CreateProjectPage';
import { CriteriaPage } from '@/pages/CriteriaPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ReviewPage } from '@/pages/ReviewPage';
import { WorkflowsPage } from '@/pages/WorkflowsPage';
import { CreateWorkflowPage } from '@/pages/CreateWorkflowPage';
import { WorkflowDetailPage } from '@/pages/WorkflowDetailPage';
import { GuidePage } from '@/pages/GuidePage';
import { AgentRunnerPage } from '@/pages/AgentRunnerPage';
import { AgentBuilderPage } from '@/pages/AgentBuilderPage';
import { WorkflowGeneratorPage } from '@/pages/WorkflowGeneratorPage';
import { AgenticStudioPage } from '@/pages/AgenticStudioPage';
import { DataVaultPage } from '@/pages/DataVaultPage';
import CohortExplorerPage from '@/pages/CohortExplorerPage';
import { CTOverviewPage } from '@/pages/CTOverviewPage';
import { CTCriterionDetailPage } from '@/pages/CTCriterionDetailPage';
import CTFunnelPage from '@/pages/CTFunnelPage';
import CTMatrixPage from '@/pages/CTMatrixPage';
import CTAtomDetailPage from '@/pages/CTAtomDetailPage';

function AppRoutes() {
  const { loading } = useAppContext();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading Neuro Audit...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route element={<AppLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<CreateProjectPage key={location.key} />} />
        <Route path="/projects/:projectId/criteria" element={<CriteriaPage />} />
        <Route path="/projects/:projectId/review" element={<ReviewPage />} />
        <Route path="/projects/:projectId/ct-overview" element={<CTOverviewPage />} />
        <Route path="/projects/:projectId/ct-criteria/:criterionId" element={<CTCriterionDetailPage />} />
        <Route path="/projects/:projectId/ct-atom/:atomId" element={<CTAtomDetailPage />} />
        <Route path="/projects/:projectId/ct-funnel" element={<CTFunnelPage />} />
        <Route path="/projects/:projectId/ct-matrix" element={<CTMatrixPage />} />
        <Route path="/vault" element={<DataVaultPage />} />
        <Route path="/vault/:cohortId" element={<CohortExplorerPage />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
        <Route path="/workflows/new" element={<CreateWorkflowPage key={location.key} />} />
        <Route path="/workflows/generate" element={<WorkflowGeneratorPage key={location.key} />} />
        <Route path="/workflows/:workflowId" element={<WorkflowDetailPage />} />
        <Route path="/studio" element={<AgenticStudioPage key={location.key} />} />
        <Route path="/agent-runner" element={<AgentRunnerPage />} />
        <Route path="/agent-builder" element={<AgentBuilderPage key={location.key} />} />
        <Route path="/guide" element={<GuidePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;

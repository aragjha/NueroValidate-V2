import React from 'react';
import { useAppStore } from './store/useAppStore';
import { Layout } from './components/common/Layout';
import { Login } from './features/auth/Login';
import { Dashboard } from './features/dashboard/Dashboard';
import { CriteriaWorkspace } from './features/criteria/CriteriaWorkspace';
import { RunManager } from './features/runs/RunManager';
import { SampleRun } from './features/runs/SampleRun';
import { ProjectSummary } from './features/projects/ProjectSummary';
import { FullRun } from './features/runs/FullRun';
import { ExportCenter } from './features/export/ExportCenter';
import { ReviewValidate } from './features/review/ReviewValidate';
import { CreateProjectFlow } from './features/projects/CreateProjectFlow';
import { CandidateBuilder } from './features/discovery/candidate-builder/CandidateBuilder';

function App() {
  const { isAuthenticated, currentStep, isCreatingProject } = useAppStore();

  if (!isAuthenticated) {
    return <Login />;
  }

  if (isCreatingProject) {
    return <CreateProjectFlow />;
  }

  const renderContent = () => {
    switch (currentStep) {
      case 0:
        return <Dashboard />;
      case 1:
        return <CriteriaWorkspace />;
      case 2:
        return <CandidateBuilder />;
      case 3:
        return <RunManager />;
      case 4:
        return <SampleRun />;
      case 4.5:
        return <ReviewValidate />;
      case 5:
        return <ProjectSummary />;
      case 6:
        return <ExportCenter />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout>
      {renderContent()}
    </Layout>
  );
}

export default App;

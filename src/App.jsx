import { useAppStore } from './store/useAppStore'
import { Layout } from './components/common/Layout'
import { Dashboard } from './features/dashboard/Dashboard'
import { CriteriaWorkspace } from './features/criteria/CriteriaWorkspace'
import { RunManager } from './features/runs/RunManager'
import { SampleRun } from './features/runs/SampleRun'
import { ReviewValidate } from './features/review/ReviewValidate'
import { FullRun } from './features/runs/FullRun'
import { ExportCenter } from './features/export/ExportCenter'
import { Login } from './features/auth/Login'
import { CreateProjectFlow } from './features/projects/CreateProjectFlow'
import { CandidateBuilder } from './features/discovery/candidate-builder/CandidateBuilder'
import { ProjectSummary } from './features/projects/ProjectSummary'

function App() {
    const { currentStep, isAuthenticated, isCreatingProject, newProjectData } = useAppStore();

    if (!isAuthenticated) {
        return <Login />;
    }

    const renderContent = () => {
        if (isCreatingProject) {
            return <CreateProjectFlow />;
        }

        switch (currentStep) {
            case 0:
                return <Dashboard />;
            case 1:
                return <CriteriaWorkspace />;
            case 2:
                return <RunManager />;
            case 3:
                return <SampleRun />;
            case 4:
                return <ReviewValidate />;
            case 5:
                return <ProjectSummary />;
            case 6:
                return <FullRun />;
            case 7:
                return <ExportCenter />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                            Step {currentStep + 1}
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            This workflow stage is being initialized.
                        </p>
                    </div>
                );
        }
    };

    const content = renderContent();

    if (newProjectData.isInitializingPatients) {
        return <CandidateBuilder />;
    }

    return (
        <Layout>
            {content}
        </Layout>
    )
}

export default App

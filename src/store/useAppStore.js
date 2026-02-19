import { create } from 'zustand';

/**
 * Global application state representing the 7-step canonical flow.
 */
export const useAppStore = create((set) => ({
    // Navigation State
    currentStep: 0,
    projectId: null,
    criterionId: null,
    runId: null,

    // Auth State
    isAuthenticated: false,
    user: null,

    // Project Creation State
    isCreatingProject: false,
    creationStep: 0,
    newProjectData: {
        name: '',
        disease: '',
        projectType: '',
        goals: '',
        teamEmails: {
            lead: '',
            reviewer: '',
            dsTeam: '',
            dataTeam: '',
            reviewer1: '',
            reviewer2: ''
        },
        criteria: [],
        isInitializingPatients: false
    },

    // Data State
    project: null,
    cohortFile: null,
    isRunLocked: false,

    // Actions
    login: (user) => set({ isAuthenticated: true, user }),
    logout: () => set({ isAuthenticated: false, user: null, currentStep: 0 }),

    setProjectId: (id) => set({ projectId: id, isCreatingProject: false }),
    setStep: (step) => set((state) => {
        if (step > state.currentStep + 1 && !state.projectId && !state.isCreatingProject) return state;
        return { currentStep: step };
    }),

    startProjectCreation: () => set({ isCreatingProject: true, creationStep: 0 }),
    cancelProjectCreation: () => set({ isCreatingProject: false }),
    setCreationStep: (step) => set({ creationStep: step }),
    updateProjectData: (data) => set((state) => ({
        newProjectData: { ...state.newProjectData, ...data }
    })),

    initiateProject: () => set((state) => ({
        isCreatingProject: false,
        newProjectData: { ...state.newProjectData, isInitializingPatients: true }
    })),

    lockRun: (runId) => set({ runId, isRunLocked: true }),
    resetRun: () => set({ runId: null, isRunLocked: false, currentStep: 2 }),

    setCohort: (file) => set({ cohortFile: file })
}));

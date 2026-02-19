/**
 * Mock API Service for NeuroAudit V2
 * Simulates AI processing steps and failures.
 */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const MockApiService = {
    getProjects: async () => {
        await delay(800);
        return [
            { id: 'proj-1', name: 'Diabetes Cohort Study', status: 'active', criteriaCount: 12 },
            { id: 'proj-2', name: 'Oncology Phase III', status: 'active', criteriaCount: 5 },
            { id: 'proj-draft', name: 'Biohaven Epilepsy Study (Draft)', status: 'draft', criteriaCount: 8 }
        ];
    },

    executeStep: async (stepName, shouldFail = false) => {
        await delay(1500);
        if (shouldFail) {
            throw new Error(`AI processing failed during ${stepName}: Malformed token response from model.`);
        }
        switch (stepName) {
            case 'extraction':
                return { status: 'success', evidence: 'Found mention of HbA1c 8.2% in encounter 2023-10-12' };
            case 'validation':
                return { status: 'success', result: 'ELIGIBLE', confidence: 0.94 };
            case 'reasoning':
                return { status: 'success', text: 'Patient exceeds the inclusion threshold of 7.5%.' };
            default:
                return { status: 'success' };
        }
    },

    uploadCohort: async (file, onProgress) => {
        let progress = 0;
        while (progress < 100) {
            progress += Math.random() * 20;
            if (progress > 100) progress = 100;
            onProgress(Math.floor(progress));
            await delay(400);
        }
        return { fileId: 'cohort-123', name: file.name, rowCount: 15420 };
    }
};

import React, { useState } from 'react';
import {
    ChevronRight,
    HelpCircle,
    History,
    User,
    Save,
    ArrowRight,
    CheckCircle2,
    Database,
    Zap,
    RotateCcw,
    X,
    Layout
} from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { SeedMySQL } from './steps/SeedMySQL';
import { RefineElastic } from './steps/RefineElastic';
import { QCTable } from './steps/QCTable';
import { AuditLogModal } from './components/AuditLogModal';

export const CandidateBuilder = () => {
    const { newProjectData, setStep: setGlobalStep, updateProjectData } = useAppStore();
    const [currentStep, setCurrentStep] = useState(1);
    const [showAuditLog, setShowAuditLog] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [hasResults, setHasResults] = useState(false);

    const stepper = [
        { id: 1, label: '1 SEED (MYSQL)', status: currentStep > 1 ? 'complete' : currentStep === 1 ? 'active' : 'pending' },
        { id: 2, label: '2 REFINE (ELASTIC)', status: currentStep > 2 ? 'complete' : currentStep === 2 ? 'active' : 'pending' },
        { id: 3, label: '3 QC TABLE', status: currentStep > 3 ? 'complete' : currentStep === 3 ? 'active' : 'pending' },
        { id: 4, label: 'PUBLISH', status: currentStep === 4 ? 'active' : 'pending' },
    ];

    const handleNext = () => {
        if (currentStep === 1 && !hasResults) {
            setIsRunning(true);
            setTimeout(() => { setIsRunning(false); setHasResults(true); }, 2000);
            return;
        }
        if (currentStep === 3) {
            setIsRunning(true);
            setTimeout(() => {
                setIsRunning(false);
                updateProjectData({ isInitializingPatients: false });
                setGlobalStep(2);
            }, 1500);
            return;
        }
        setCurrentStep(prev => Math.min(prev + 1, 4));
    };

    const handleBack = () => { setCurrentStep(prev => Math.max(prev - 1, 1)); };

    const getPrimaryCTALabel = () => {
        if (currentStep === 1) {
            if (isRunning) return 'RUNNING...';
            if (hasResults) return 'CONTINUE TO ELASTIC REFINEMENT';
            return 'RUN MYSQL QUERY';
        }
        if (currentStep === 2) { if (isRunning) return 'RUNNING...'; return 'RUN ELASTIC REFINEMENT'; }
        if (currentStep === 3) return 'PUSH APPROVED LIST TO RUN SETUP';
        return 'FINALIZE CANDIDATE LIST';
    };

    return (
        <div className="fixed inset-0 bg-slate-50 z-[60] flex flex-col font-sans text-slate-900 overflow-hidden">
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <nav className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <span className="hover:text-primary cursor-pointer transition-colors">PROJECTS</span>
                        <ChevronRight size={8} />
                        <span className="text-slate-600">{newProjectData.name || 'BIOHAVEN'}</span>
                        <ChevronRight size={8} />
                        <span className="text-primary">CANDIDATE BUILDER</span>
                    </nav>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-full border border-slate-200">
                    {stepper.map((s, i) => (
                        <div key={s.id} className="flex items-center">
                            <div className={`flex items-center gap-2.5 px-4 py-1.5 rounded-full transition-all ${s.status === 'active' ? 'bg-white border border-slate-200 shadow-sm' : ''}`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${s.status === 'complete' ? 'bg-emerald-500 text-white' : s.status === 'active' ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'}`}>
                                    {s.status === 'complete' ? <CheckCircle2 size={10} /> : s.id}
                                </div>
                                <span className={`text-[8px] font-black tracking-widest ${s.status === 'active' ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
                            </div>
                            {i < stepper.length - 1 && <div className="w-4 h-[1px] bg-slate-200 mx-0.5" />}
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowAuditLog(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all">
                        <History size={12} />
                        AUDIT LOG
                    </button>
                    <div className="w-[1px] h-4 bg-slate-200" />
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"><HelpCircle size={18} /></button>
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-md"><User size={16} /></div>
                </div>
            </header>
            <main className="flex-1 overflow-hidden relative flex flex-col bg-slate-50">
                {currentStep === 1 && <SeedMySQL isRunning={isRunning} hasResults={hasResults} />}
                {currentStep === 2 && <RefineElastic />}
                {currentStep === 3 && <QCTable />}
            </main>
            <footer className="h-20 bg-white border-t border-slate-200 flex items-center justify-between px-10 shrink-0 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-8">
                    <button onClick={handleBack} disabled={currentStep === 1} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-20 disabled:cursor-not-allowed group">
                        <RotateCcw size={14} className="group-hover:rotate-[-45deg] transition-all" />
                        BACK TO PREVIOUS
                    </button>
                    <div className="w-[1px] h-6 bg-slate-100" />
                    <button className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-all text-[10px] font-black uppercase tracking-widest">
                        <Save size={14} />
                        SAVE DRAFT
                    </button>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Syncing</span>
                        </div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5 italic">Auto-save 12s ago</span>
                    </div>
                    <button onClick={handleNext} disabled={isRunning} className={`flex items-center gap-4 px-12 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl min-w-[280px] justify-center ${isRunning ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none' : 'bg-primary text-white hover:scale-[1.01] active:scale-95 shadow-primary/20'}`}>
                        {getPrimaryCTALabel()}
                        {!isRunning && <ArrowRight size={18} />}
                        {isRunning && <RotateCcw size={18} className="animate-spin" />}
                    </button>
                </div>
            </footer>
            <AuditLogModal isOpen={showAuditLog} onClose={() => setShowAuditLog(false)} />
        </div>
    );
};

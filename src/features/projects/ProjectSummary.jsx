import React from 'react';
import {
    CheckCircle2,
    ArrowRight,
    Zap,
    Database,
    MessageSquare,
    BarChart3,
    Clock,
    User,
    ChevronRight,
    Play
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const ProjectSummary = () => {
    const { setStep, newProjectData } = useAppStore();

    const sections = [
        { id: 1, label: 'Criteria Config', status: 'verified', icon: Database },
        { id: 2, label: 'Candidate Builder', status: 'verified', icon: Zap },
        { id: 3, label: 'Run Setup', status: 'verified', icon: BarChart3 },
        { id: 4, label: 'Sample Review', status: 'verified', icon: CheckCircle2 },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[2rem] bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/20">
                        <CheckCircle2 size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Neurology Project Readiness Summary</h1>
                        <p className="text-slate-500 font-medium">All neurology validation steps completed. Ready for full cohort execution.</p>
                    </div>
                </div>
                <button onClick={() => setStep(5)} className="flex items-center gap-3 bg-primary text-white px-10 py-5 rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-2xl shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all group">
                    <Play size={20} className="fill-white" />
                    INITIATE FULL RUN
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-8">
                {sections.map(section => (
                    <div key={section.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-primary border border-slate-100 group-hover:bg-primary/10 transition-colors">
                                    <section.icon size={20} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900">{section.label}</h3>
                            </div>
                            <span className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">{section.status}</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-400 uppercase tracking-widest">Efficiency</span>
                                <span className="text-slate-900">100% Logic Coverage</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-full" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 to-transparent" />
                <div className="relative z-10 grid grid-cols-3 gap-12">
                    <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total Patient Universe</span>
                        <div className="text-4xl font-black tabular-nums tracking-tighter">154,202</div>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">Filtered &amp; de-duplicated neurology patients from neuro index.</p>
                    </div>
                    <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Clinical Sample Verified</span>
                        <div className="text-4xl font-black tabular-nums tracking-tighter">50</div>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">Neurology manual adjudication complete with 98% AI alignment.</p>
                    </div>
                    <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Estimated Duration</span>
                        <div className="text-4xl font-black tabular-nums tracking-tighter">12m 40s</div>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">Parallel processing across 8 extraction workers.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

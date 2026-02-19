import React, { useState, useEffect } from 'react';
import {
    Play,
    RotateCcw,
    CheckCircle2,
    XCircle,
    Loader2,
    Activity,
    User,
    Search,
    ChevronRight,
    AlertTriangle,
    FileText,
    Clock,
    Zap,
    Users,
    ArrowRight,
    CheckCircle,
    Database,
    ShieldCheck,
    BrainCircuit
} from 'lucide-react';
import { MockApiService } from '../../services/mockApi';
import { useAppStore } from '../../store/useAppStore';

export const SampleRun = () => {
    const { setStep } = useAppStore();
    const [processingState, setProcessingState] = useState('idle');
    const [currentStage, setCurrentStage] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        let interval;
        if (processingState === 'processing') {
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else if (processingState === 'idle') {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [processingState]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs.toString().padStart(2, '0')}s`;
    };

    const stages = [
        { id: 'retrieval', label: 'Retrieval Layer', icon: Database },
        { id: 'extraction', label: 'Feature Extraction', icon: Activity },
        { id: 'validation', label: 'Inference Validation', icon: ShieldCheck },
        { id: 'reasoning', label: 'Protocol Synthesis', icon: BrainCircuit },
    ];

    const patients = [
        { id: 'PAT-8821', status: 'completed', result: 'Eligible' },
        { id: 'PAT-4402', status: 'completed', result: 'Ineligible' },
        { id: 'PAT-1193', status: 'processing', result: null },
        { id: 'PAT-5567', status: 'pending', result: null },
        { id: 'PAT-0023', status: 'pending', result: null },
    ];

    const runSample = async () => {
        setProcessingState('processing');
        try {
            for (const stage of stages) {
                setCurrentStage(stage.id);
                await MockApiService.executeStep(stage.id);
            }
            setProcessingState('completed');
        } catch (err) {
            setProcessingState('failed');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-500 overflow-hidden">
            <header className="bg-white border-b border-slate-200 px-10 py-6 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${processingState === 'processing' ? 'bg-primary text-white animate-pulse' : 'bg-slate-900 text-white'}`}>
                        <Zap size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Run Progress: RUN-9402</h1>
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                                Sample Protocol v2.1
                            </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                <Clock size={14} />
                                Elapsed: <span className="text-slate-900">{formatTime(elapsedTime)}</span>
                            </div>
                            <div className="h-4 w-[1px] bg-slate-200" />
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                <Users size={14} />
                                Cohort: <span className="text-slate-900">50 Records</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {processingState === 'completed' ? (
                        <button
                            onClick={() => setStep(4)}
                            className="flex items-center gap-3 bg-emerald-500 text-white px-8 py-4 rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all group"
                        >
                            <CheckCircle size={18} />
                            Go to Review Results
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <button
                            onClick={runSample}
                            disabled={processingState === 'processing'}
                            className="flex items-center gap-3 bg-primary text-white px-8 py-4 rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:bg-slate-300"
                        >
                            {processingState === 'processing' ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} className="fill-white" />}
                            {processingState === 'idle' ? 'Start Extraction' : 'Retry Sequence'}
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                <div className="grid grid-cols-3 gap-8">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                <FileText size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Dataset Ready</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-1">biohaven_cohort.csv</p>
                            </div>
                        </div>
                        <CheckCircle2 className="text-emerald-500" size={24} />
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm group hover:border-indigo-200 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                    <Activity size={18} />
                                </div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Extraction Velocity</h3>
                            </div>
                            <span className="text-xl font-black text-slate-900 tabular-nums">1.2s<span className="text-[10px] text-slate-400 font-bold">/pt</span></span>
                        </div>
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full bg-indigo-500 transition-all duration-1000 ${processingState === 'processing' ? 'w-3/4' : 'w-0'}`} />
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm group hover:border-primary-200 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all">
                                    <Users size={18} />
                                </div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Overall Progress</h3>
                            </div>
                            <span className="text-xl font-black text-slate-900 tabular-nums">
                                {processingState === 'completed' ? '50' : processingState === 'processing' ? '12' : '0'}
                                <span className="text-[10px] text-slate-400 font-bold"> / 50</span>
                            </span>
                        </div>
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full bg-primary transition-all duration-1000 ${processingState === 'completed' ? 'w-full' : processingState === 'processing' ? 'w-[24%]' : 'w-0'}`} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-8 items-start">
                    <div className="col-span-1 bg-white rounded-[3rem] border border-slate-200 p-8 shadow-sm">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8 px-2 flex items-center gap-3">
                            <div className="w-1 h-4 bg-primary rounded-full" />
                            Processing Pipeline
                        </h3>
                        <div className="space-y-6">
                            {stages.map((stage, i) => {
                                const isCurrent = currentStage === stage.id;
                                const isCompleted = stages.findIndex(s => s.id === currentStage) > i || processingState === 'completed';
                                return (
                                    <div key={stage.id} className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${isCurrent ? 'bg-primary/5 border-primary/20 shadow-lg shadow-primary/5' : isCompleted ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50/50 border-slate-100 text-slate-400'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isCompleted ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-300'}`}>
                                                {isCompleted ? <CheckCircle2 size={18} /> : isCurrent ? <Loader2 size={18} className="animate-spin" /> : <stage.icon size={18} />}
                                            </div>
                                            <div>
                                                <div className={`text-xs font-black uppercase tracking-tight ${isCurrent ? 'text-primary' : 'text-slate-900'}`}>{stage.label}</div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                    {isCompleted ? 'Verified' : isCurrent ? 'Active Inference' : 'Network Queue'}
                                                </div>
                                            </div>
                                        </div>
                                        {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="col-span-2 bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                        <div className="relative z-10 flex items-center justify-between mb-8">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Real-time Patient Monitor
                            </h3>
                            <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors">
                                View Logs
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {patients.map(p => (
                                <div key={p.id} className="p-6 rounded-[2rem] bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${p.status === 'completed' ? 'bg-emerald-500' : p.status === 'processing' ? 'bg-primary animate-pulse' : 'bg-slate-700'}`} />
                                        <div className="font-mono text-sm font-black text-slate-300 group-hover:text-white transition-colors">{p.id}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {p.result && (
                                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${p.result === 'Eligible' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                                                {p.result}
                                            </span>
                                        )}
                                        <ArrowRight className="text-slate-700 group-hover:text-primary transition-colors" size={14} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-center gap-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Streaming patient execution from hospital index...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

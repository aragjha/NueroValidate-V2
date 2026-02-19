import React, { useState } from 'react';
import {
    Play,
    FileUp,
    Zap,
    Settings2,
    BarChart3,
    ChevronRight,
    Lock,
    Loader2,
    AlertCircle,
    RotateCcw,
    Plus,
    History,
    Search,
    Filter,
    Activity,
    BrainCircuit,
    Cpu,
    Database,
    CheckCircle2,
    Server,
    ShieldCheck
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { MockApiService } from '../../services/mockApi';

export const RunManager = () => {
    const { setStep, lockRun } = useAppStore();
    const [runId, setRunId] = useState(`RUN-${Math.floor(1000 + Math.random() * 9000)}`);
    const [isDuplicate, setIsDuplicate] = useState(false);
    const [runType, setRunType] = useState('sample');
    const [isTestRun, setIsTestRun] = useState(true);
    const [recordCount, setRecordCount] = useState(50);

    const previousRuns = [
        { id: 'RUN-1102', status: 'Completed', type: 'Sample', date: '2h ago' },
        { id: 'RUN-1098', status: 'Failed', type: 'Full', date: '5h ago' },
        { id: 'RUN-1085', status: 'Completed', type: 'Sample', date: 'Yesterday' },
    ];

    const handleCreateRun = () => {
        if (isDuplicate) return;
        lockRun(runId);
        setStep(3);
    };

    return (
        <div className="flex h-full bg-slate-50 animate-in fade-in duration-500 overflow-hidden">
            <div className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0">
                <div className="p-8 border-b border-slate-100">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-6">
                        <History size={16} />
                        Previous Executions
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <input
                            type="text"
                            placeholder="Search Run ID..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-medium outline-none"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {previousRuns.map(run => (
                        <div key={run.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:bg-white hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-black text-slate-900 font-mono tracking-tight">{run.id}</span>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${run.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} uppercase tracking-widest`}>
                                    {run.status}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                <span>{run.type} Run</span>
                                <span>{run.date}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                    <button className="w-full bg-white border border-slate-200 py-3 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                        <Filter size={14} />
                        Filter Status
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-10">
                    <div className="flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[2rem] bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-900/20">
                                <Zap className="text-white" size={32} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Clinical Extraction Run</h1>
                                <p className="text-slate-500 font-medium">Configure project scaling and model overrides for this batch.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCreateRun}
                                className="flex items-center gap-3 bg-primary text-white px-8 py-4 rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-2xl shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all group"
                            >
                                <Play size={16} className="fill-white" />
                                START PROCESSING RUN
                                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-8 flex flex-col">
                            <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                                <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-900 flex items-center justify-center border border-slate-100">
                                    <Settings2 size={20} />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">1. Batch Identity</h3>
                            </div>

                            <div className="space-y-6 flex-1">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sequence ID (Unique)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={runId}
                                            onChange={(e) => setRunId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-black text-slate-900 font-mono outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <CheckCircle2 size={16} className="text-emerald-500" />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 rounded-3xl bg-amber-50 border border-amber-100 flex items-start gap-4">
                                    <Lock size={18} className="text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                                        Once initiated, this Run ID will be locked to the current criteria version to ensure audit integrity.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-8">
                            <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                                    <Database size={20} />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">2. Batch Scaling</h3>
                            </div>

                            <div className="space-y-8">
                                <div className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                    <div>
                                        <div className="text-sm font-black text-slate-900">Patient Test Sample</div>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase mt-1 tracking-tight">Run logic on a small subset first</p>
                                    </div>
                                    <button
                                        onClick={() => setIsTestRun(!isTestRun)}
                                        className={`w-12 h-6 rounded-full transition-all relative ${isTestRun ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isTestRun ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className={`space-y-4 transition-all ${isTestRun ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sampling Record Count</label>
                                        <span className="text-xs font-black text-primary">{recordCount} Records</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="500"
                                        step="10"
                                        value={recordCount}
                                        onChange={(e) => setRecordCount(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
                                        <span>Min: 10</span>
                                        <span>Max: 500</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center justify-between border-b border-white/5 pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary">
                                        <Cpu size={20} />
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-widest">3. Operational Overrides</h3>
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Default Profile Active</span>
                            </div>

                            <div className="grid grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Model Engine</label>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold text-slate-300 flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer">
                                        GPT-4o (Clinical Opt)
                                        <ChevronRight size={14} className="text-slate-500" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority Keywords</label>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold text-slate-300 flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer">
                                        Protocol Core Only
                                        <ChevronRight size={14} className="text-slate-500" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Context Window</label>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold text-slate-300 flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer">
                                        128k Tokens (Full)
                                        <ChevronRight size={14} className="text-slate-500" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

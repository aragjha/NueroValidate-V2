import React, { useState, useEffect } from 'react';
import {
    Play,
    Pause,
    RotateCcw,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    Users,
    BarChart3,
    Clock,
    ChevronRight,
    TrendingUp,
    ShieldCheck
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const FullRun = () => {
    const { setStep } = useAppStore();
    const [status, setStatus] = useState('idle');
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState({ eligible: 0, ineligible: 0, unclear: 0, total: 1250 });

    useEffect(() => {
        let interval;
        if (status === 'running' && progress < 100) {
            interval = setInterval(() => {
                setProgress(prev => {
                    const next = prev + 1;
                    if (next >= 100) { setStatus('completed'); return 100; }
                    if (next % 2 === 0) {
                        const rand = Math.random();
                        if (rand > 0.6) setStats(s => ({ ...s, eligible: s.eligible + 5 }));
                        else if (rand > 0.2) setStats(s => ({ ...s, ineligible: s.ineligible + 3 }));
                        else setStats(s => ({ ...s, unclear: s.unclear + 1 }));
                    }
                    return next;
                });
            }, 200);
        }
        return () => clearInterval(interval);
    }, [status, progress]);

    const toggleRun = () => { if (status === 'running') setStatus('paused'); else setStatus('running'); };
    const resetRun = () => { setProgress(0); setStatus('idle'); setStats({ eligible: 0, ineligible: 0, unclear: 0, total: 1250 }); };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Full Cohort Execution</h1>
                        <p className="text-sm text-slate-500 mt-1">Processing 1,250 patient records against validated criteria.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {status === 'completed' ? (
                        <button onClick={() => setStep(6)} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-indigo-500/20">
                            <span>GENERATING BUNDLES</span>
                            <ChevronRight size={18} />
                        </button>
                    ) : (
                        <>
                            <button onClick={resetRun} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50">
                                <RotateCcw size={18} />
                            </button>
                            <button onClick={toggleRun} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow-lg transition-all ${status === 'running' ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}>
                                {status === 'running' ? <Pause size={18} /> : <Play size={18} />}
                                <span>{status === 'running' ? 'PAUSE EXECUTION' : status === 'paused' ? 'RESUME' : 'START FULL RUN'}</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full -mr-32 -mt-32"></div>
                        <div className="relative z-10 space-y-8">
                            <div className="flex items-end justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Overall Progress</h3>
                                    <div className="text-5xl font-black text-slate-900 dark:text-white tabular-nums">{progress}%</div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
                                        <Clock size={16} />
                                        <span>Est. Remaining</span>
                                    </div>
                                    <div className="text-xl font-bold text-slate-700 dark:text-slate-300">~{Math.max(0, Math.ceil((100 - progress) * 0.4))}m 12s</div>
                                </div>
                            </div>
                            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 relative" style={{ width: `${progress}%` }}>
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:24px_24px]"></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-6 pt-4">
                                <div className="space-y-1">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Throughput</div>
                                    <div className="text-lg font-bold text-slate-700 dark:text-slate-200">12 records/sec</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Worker Nodes</div>
                                    <div className="text-lg font-bold text-slate-700 dark:text-slate-200">8 Active</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs font-bold text-slate-400 uppercase">GPU Load</div>
                                    <div className="text-lg font-bold text-slate-700 dark:text-slate-200">68% Avg</div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <TrendingUp size={16} className="text-indigo-500" />
                                Live Stream
                            </h3>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Processing</span>
                            </span>
                        </div>
                        <div className="p-4 h-48 overflow-hidden font-mono text-[11px] space-y-1 text-slate-500">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="flex gap-4">
                                    <span className="text-slate-300">[{new Date().toLocaleTimeString()}]</span>
                                    <span className="text-indigo-400">PAT-{Math.floor(Math.random() * 9000) + 1000}</span>
                                    <span>Processing extraction node: reasoning_synthesis...</span>
                                    <span className="text-green-500 font-bold ml-auto">SUCCESS</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl shadow-indigo-900/20">
                        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-6 flex items-center justify-between">
                            Cohort Distribution
                            <BarChart3 size={14} />
                        </h3>
                        <div className="space-y-6">
                            {[
                                { label: 'Eligible', value: stats.eligible, color: 'bg-emerald-500' },
                                { label: 'Ineligible', value: stats.ineligible, color: 'bg-rose-500' },
                                { label: 'Unclear / Flagged', value: stats.unclear, color: 'bg-amber-500' }
                            ].map(item => (
                                <div key={item.label} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-slate-300">{item.label}</span>
                                        <span className="font-bold text-white">{item.value}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color} transition-all`} style={{ width: `${(item.value / stats.total) * 100}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 pt-6 border-t border-slate-800 flex items-center gap-3 text-xs text-slate-400">
                            <ShieldCheck size={16} className="text-indigo-400" />
                            <span>All results encrypted with AES-256 for clinical compliance.</span>
                        </div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl">
                        <div className="flex gap-3">
                            <AlertCircle className="text-amber-600 shrink-0" size={18} />
                            <div>
                                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-400">Compute Resource Warning</h4>
                                <p className="text-[10px] text-amber-800/70 dark:text-amber-500/70 mt-1 leading-relaxed">
                                    High GPU utilization detected. Cohort processing speed may be throttled to maintain system stability.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

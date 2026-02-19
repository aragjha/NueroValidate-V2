import React, { useState } from 'react';
import {
    Search,
    Database,
    Calendar,
    Clock,
    Cpu,
    Zap,
    CheckCircle2,
    AlertCircle,
    Info,
    Download,
    Plus,
    Trash2,
    Eye,
    MessageSquare,
    RotateCcw,
    Layers,
    Table,
    FileJson,
    Users
} from 'lucide-react';

export const RefineElastic = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [hasResults, setHasResults] = useState(false);
    const [configRows, setConfigRows] = useState([
        { id: 1, category: 'inc_3_seizure', keywords: ['focal seizure', 'seizure'], offset: 0 },
        { id: 2, category: 'inc_4_phs', keywords: ['post-herpetic', 'phs'], offset: 3 },
    ]);

    const handleRun = () => {
        setIsRunning(true);
        setTimeout(() => { setIsRunning(false); setHasResults(true); }, 3000);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 p-6 overflow-y-auto border-r border-slate-200 custom-scrollbar flex flex-col gap-8 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 tracking-tight">Clinical Refinement</h2>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5 italic">Semantic Context Retrieval (ElasticSearch)</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] font-black text-slate-400 uppercase">Target Index</span>
                                <span className="text-[10px] font-black text-primary uppercase">clinical_notes_v2_prod</span>
                            </div>
                            <div className="w-[1px] h-6 bg-slate-100" />
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase">Status:</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isRunning ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {isRunning ? 'PROCESSING' : 'IDLE'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Search Scope</label>
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-900 outline-none">
                                <option>Historical EHR (All)</option>
                                <option>Encounter Only</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lookback Window</label>
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-900 outline-none">
                                <option>Last 24 Months</option>
                                <option>Last 5 Years</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Date Anchor</label>
                            <div className="flex gap-1.5">
                                <button className="flex-1 py-2.5 bg-primary text-white rounded-xl text-[9px] font-black uppercase shadow-sm">Admission</button>
                                <button className="flex-1 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase">Discharge</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                <Layers size={14} className="text-primary" />
                                Retrieval Logic Builder
                            </div>
                            <button className="flex items-center gap-2 text-[9px] font-black text-primary uppercase hover:underline">
                                <Plus size={12} />
                                Add Retrieval Row
                            </button>
                        </div>
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Class</th>
                                        <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Clinical Keywords</th>
                                        <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Logic</th>
                                        <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {configRows.map(row => (
                                        <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-5 py-4">
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${row.id === 1 ? 'bg-blue-50 text-primary border-primary/20' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                                    {row.id === 1 ? 'Inclusion' : 'Exclusion'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {row.keywords.map(kv => (
                                                        <span key={kv} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-bold border border-slate-200">{kv}</span>
                                                    ))}
                                                    <button className="w-5 h-5 flex items-center justify-center bg-slate-50 border border-slate-200 rounded text-slate-400 hover:text-primary transition-all">
                                                        <Plus size={10} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-[10px] font-bold text-slate-600 uppercase">Fuzzy (+{row.offset}d)</td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-1.5 text-slate-400 hover:bg-white rounded border border-transparent hover:border-slate-200 shadow-sm"><Eye size={12} /></button>
                                                    <button className="p-1.5 text-slate-400 hover:bg-white rounded border border-transparent hover:border-red-100 hover:text-red-500 shadow-sm"><Trash2 size={12} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="w-[30%] p-6 bg-slate-50 overflow-y-auto custom-scrollbar flex flex-col gap-8">
                    <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
                                <Cpu className={`text-primary ${isRunning ? 'animate-spin' : ''}`} size={16} />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-tight">Engine Load</h3>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">ElasticSearch Cluster-01</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest mb-1">
                                <span className="text-slate-400">Retrieval Progress</span>
                                <span className="text-primary">{isRunning ? '42%' : '100%'}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full bg-primary transition-all duration-1000 ${isRunning ? 'w-[42%]' : 'w-full'}`} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-400 uppercase">Latency</span>
                                    <span className="text-[10px] font-black text-slate-700 uppercase">124ms</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-[8px] font-black text-slate-400 uppercase">Samples</span>
                                    <span className="text-[10px] font-black text-slate-700 uppercase">1.2k / 18k</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                            <Zap size={14} className="text-primary" />
                            Clinical Hit Stream
                        </div>
                        <div className="space-y-2.5">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col gap-2 shadow-sm hover:border-primary/20 transition-all group relative overflow-hidden">
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-2">
                                            <Users size={10} className="text-slate-400" />
                                            <span className="text-[9px] font-black text-slate-700 font-mono">PT-{8800 + i}</span>
                                        </div>
                                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">Matched</span>
                                    </div>
                                    <p className="text-[9px] font-medium text-slate-500 line-clamp-2 leading-relaxed italic relative z-10 group-hover:text-slate-800 transition-colors">
                                        "...patient exhibits signs of focal epilepsy. EEG results from 2023-11-20 indicate persistent activity..."
                                    </p>
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/10 group-hover:bg-primary/30 transition-colors" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

import React, { useState } from 'react';
import {
    Database,
    Calendar,
    Search,
    Filter,
    Users,
    Terminal,
    Code2,
    Copy,
    History,
    Zap,
    CheckCircle2,
    AlertCircle,
    Info,
    Download,
    ChevronDown,
    FileText,
    Activity,
    Layout,
    User
} from 'lucide-react';

export const SeedMySQL = ({ isRunning, hasResults }) => {
    const [testMode, setTestMode] = useState(false);
    const [showSQL, setShowSQL] = useState(false);

    const runHistory = [
        { id: 'run_04', label: 'EPILEPSY_DENT_V2', user: 'Sarah Chen', date: '2024-02-19 10:25', patients: '1,248', status: 'Success' },
        { id: 'run_03', label: 'EPILEPSY_DENT_V1', user: 'Sarah Chen', date: '2024-02-18 14:12', patients: '1,102', status: 'Success' },
    ];

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {hasResults && !isRunning && (
                <div className="mx-10 mt-6 p-6 bg-emerald-50 border border-emerald-100 rounded-[2rem] flex items-center justify-between animate-in slide-in-from-top-4 duration-300 shadow-sm">
                    <div className="flex gap-10">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">PATIENTS FOUND</span>
                            <span className="text-2xl font-black text-emerald-600 leading-none">1,248</span>
                        </div>
                        <div className="w-[1px] h-full bg-emerald-200" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">UNIQUE PATIENTS</span>
                            <span className="text-2xl font-black text-emerald-600 leading-none">1,012</span>
                        </div>
                        <div className="w-[1px] h-full bg-emerald-200" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">ENCOUNTER ROWS</span>
                            <span className="text-2xl font-black text-emerald-600 leading-none">4,520</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                            <AlertCircle size={14} className="text-amber-600" />
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Warnings: missing DOB for 12 patients</span>
                        </div>
                        <button className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 transition-all shadow-sm">
                            <Download size={14} />
                            DOWNLOAD SEED CSV
                        </button>
                    </div>
                </div>
            )}

            {testMode && (
                <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-25deg] text-[15rem] font-black text-primary/5 whitespace-nowrap uppercase tracking-[0.2em]">
                        TEST MODE — NOT PUBLISHABLE
                    </div>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                <div className="w-[30%] border-r border-slate-200 bg-white flex flex-col p-6 overflow-y-auto custom-scrollbar gap-8">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 tracking-tight">Structured Seed</h2>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5 italic">MySQL Retrieval Layer</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                            <button onClick={() => setTestMode(!testMode)} className={`px-2 py-1 rounded text-[8px] font-black uppercase transition-all ${testMode ? 'bg-primary text-white shadow-sm' : 'text-slate-400'}`}>
                                Test Mode
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                            <Database size={14} className="text-primary" />
                            1. System Schema
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Hospital Schema</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-900 outline-none">
                                    <option>emb_dent_care_prod</option>
                                    <option>st_jude_res_v4</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cutoff Date</label>
                                <input type="date" defaultValue="2024-02-19" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-900 outline-none" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                            <Search size={14} className="text-primary" />
                            2. Diagnosis Filter
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ICD-10 Codes</label>
                                    <button className="text-[8px] font-black text-primary uppercase">Paste List</button>
                                </div>
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-1.5">
                                    <span className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded text-[9px] font-black text-primary">G40.219</span>
                                    <span className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded text-[9px] font-black text-primary">G40.309</span>
                                    <input className="bg-transparent text-xs font-bold text-slate-900 outline-none w-20 placeholder:text-slate-300" placeholder="..." />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lookback</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 outline-none">
                                        <option>All Time</option>
                                        <option>Last 1Y</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Strategy</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 outline-none">
                                        <option>ANY MATCH</option>
                                        <option>ALL MATCHES</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                            <Users size={14} className="text-primary" />
                            3. Demographics
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Min Age</label>
                                <input placeholder="18" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Max Age</label>
                                <input placeholder="99" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-slate-50 p-6 flex flex-col gap-6 overflow-hidden">
                    <div className="flex items-center justify-between shrink-0">
                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Layout size={14} className="text-slate-400" />
                            Real-Time Cohort Preview
                        </h3>
                        {hasResults && (
                            <div className="flex items-center gap-4 animate-in fade-in zoom-in duration-500">
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-400 uppercase">Matches Found</p>
                                    <p className="text-lg font-black text-primary -mt-1">1,248 <span className="text-[10px] text-slate-400 ml-1">Patients</span></p>
                                </div>
                                <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-primary transition-all shadow-sm">
                                    <Download size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
                        {!hasResults && !isRunning ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-200">
                                    <Activity size={32} />
                                </div>
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">No Active Query</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed max-w-[280px]">
                                    Configure system filters and execute the MySQL query to see a preview of the candidate cohort.
                                </p>
                            </div>
                        ) : isRunning ? (
                            <div className="flex-1 flex flex-col items-center justify-center animate-pulse">
                                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying System Database...</span>
                            </div>
                        ) : (
                            <div className="overflow-auto custom-scrollbar flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                                        <tr>
                                            {['Patient ID', 'Last Encounter', 'Age', 'Status'].map(h => (
                                                <th key={h} className="px-6 py-4 text-[8px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-3.5 text-xs font-mono font-bold text-slate-900">PAT-0{8800 + i}</td>
                                                <td className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase">2024-02-19</td>
                                                <td className="px-6 py-3.5 text-xs font-bold text-slate-600">{60 + i}</td>
                                                <td className="px-6 py-3.5">
                                                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase">Seeded</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-[25%] border-l border-slate-200 bg-white flex flex-col overflow-y-auto custom-scrollbar p-6 gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-2">
                            <Copy size={14} className="text-slate-400" />
                            SQL Performance
                        </div>
                        <div className="bg-slate-900 rounded-xl p-4 overflow-hidden relative group">
                            <pre className="text-[10px] font-mono text-emerald-400/80 leading-relaxed overflow-x-auto whitespace-pre">
                                {`SELECT p.id, MAX(e.date)\nFROM schema.patients p\nJOIN schema.encounters e\nWHERE e.code IN (...)`}
                            </pre>
                            <button className="absolute top-2 right-2 p-1.5 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded text-white active:scale-95">
                                <Copy size={12} />
                            </button>
                            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                                <span className="text-[8px] font-black text-emerald-400/50 uppercase">Execution Time: 42ms</span>
                                <button onClick={() => setShowSQL(!showSQL)} className="text-[8px] font-black text-white hover:text-primary transition-colors underline uppercase tracking-widest">Expand</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-2">
                            <History size={14} className="text-slate-400" />
                            Run History
                        </div>
                        <div className="space-y-2">
                            {runHistory.map(run => (
                                <div key={run.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary/20 transition-all cursor-pointer group">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-black text-slate-700">{run.label}</span>
                                        <span className="text-[9px] font-black text-primary font-mono">{run.patients}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-tight">
                                        <span>{run.date}</span>
                                        <span className="text-emerald-500 font-black">SUCCESS</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

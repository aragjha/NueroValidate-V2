import React, { useState } from 'react';
import {
    Filter,
    Table,
    Download,
    RotateCcw,
    Info,
    Layout,
    CheckCircle2,
    XCircle,
    User
} from 'lucide-react';

export const QCTable = () => {
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [decision, setDecision] = useState(null);

    const patients = [
        { id: 'PAT_1248', age: 64, status: 'Done', decisionReason: 'QUALIFIED', notes: 'FOCAL EPILEPSY CONFIRMED VIA EEG RECORD AT ENCOUNTER.', lastActivity: '12M AGO' },
        { id: 'PAT_1152', age: 42, status: 'Needs Review', decisionReason: '--', notes: 'AWAITING NEUROLOGIST VERIFICATION OF ICD-10 CODE ACCURACY.', lastActivity: '2H AGO' },
        { id: 'PAT_0984', age: 58, status: 'Done', decisionReason: 'REMOVED', notes: 'PATIENT EXCLUDED DUE TO COMORBID BRAIN METASTASIS HISTORY.', lastActivity: '1D AGO' },
        { id: 'PAT_0542', age: 31, status: 'Needs Review', decisionReason: '--', notes: 'POTENTIAL CANDIDATE BUT REQUIRES MANUAL CHART REVIEW FOR PHN.', lastActivity: '4D AGO' }
    ];

    return (
        <div className="flex-1 flex overflow-hidden bg-white">
            <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">
                <div className="h-12 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1.5 group cursor-pointer">
                            <Filter size={12} className="text-slate-400 group-hover:text-primary transition-colors" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-900 transition-colors">Project Filters</span>
                        </div>
                        <div className="w-[1px] h-3 bg-slate-100" />
                        <div className="flex items-center gap-1.5 group cursor-pointer">
                            <Table size={12} className="text-slate-400 group-hover:text-primary transition-colors" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-900 transition-colors">Columns</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">842 Records Found</span>
                        <div className="flex bg-slate-50 p-0.5 rounded-lg border border-slate-100">
                            <button className="p-1 px-2.5 bg-white shadow-sm rounded text-[8px] font-black text-slate-900 transition-all border border-slate-100 uppercase">Grid</button>
                            <button className="p-1 px-2.5 text-[8px] font-black text-slate-400 hover:text-slate-700 transition-all uppercase">List</button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/20">
                    <table className="w-full border-collapse text-left">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-white border-b border-slate-200">
                                <th className="px-6 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-50 italic">Status</th>
                                <th className="px-6 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-50">Patient ID</th>
                                <th className="px-6 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-50">Age</th>
                                <th className="px-6 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-50">QC Decision</th>
                                <th className="px-6 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-50">Clinical Notes</th>
                                <th className="px-6 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">Activity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {patients.map(p => (
                                <tr key={p.id} onClick={() => setSelectedPatient(p)} className={`transition-all cursor-pointer group ${selectedPatient?.id === p.id ? 'bg-primary/5' : 'bg-white hover:bg-slate-50'}`}>
                                    <td className="px-6 py-3 border-r border-slate-50 text-center">
                                        <div className={`w-1.5 h-1.5 rounded-full mx-auto ${p.status === 'Needs Review' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                    </td>
                                    <td className="px-6 py-3 border-r border-slate-50 text-[11px] font-black text-slate-900 font-mono tracking-tight">{p.id}</td>
                                    <td className="px-6 py-3 border-r border-slate-50 text-[11px] font-bold text-slate-500">{p.age}</td>
                                    <td className="px-6 py-3 border-r border-slate-50">
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${p.decisionReason === '--' ? 'bg-slate-50 text-slate-300 border-slate-100' : p.decisionReason === 'REMOVED' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'} uppercase tracking-tight`}>
                                            {p.decisionReason}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 border-r border-slate-50 text-[10px] font-medium text-slate-500 truncate max-w-[200px] italic">{p.notes}</td>
                                    <td className="px-6 py-3 text-[9px] font-black text-slate-300 uppercase tracking-tighter">{p.lastActivity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="w-[340px] flex flex-col shrink-0 bg-white z-20">
                {selectedPatient ? (
                    <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-md"><User size={20} /></div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">{selectedPatient.id}</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Clinical Record Triage</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl">
                                    <span className="text-[7px] font-black text-slate-400 uppercase block mb-0.5">AGE</span>
                                    <span className="text-[11px] font-black text-slate-900">{selectedPatient.age}Y</span>
                                </div>
                                <div className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl">
                                    <span className="text-[7px] font-black text-slate-400 uppercase block mb-0.5">STATUS</span>
                                    <span className="text-[11px] font-black text-primary uppercase">{selectedPatient.status}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                            <div className="space-y-3">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">QC Determination</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setDecision('Approve')} className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${decision === 'Approve' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/10' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-500 hover:text-emerald-600'}`}>Approve</button>
                                    <button onClick={() => setDecision('Remove')} className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${decision === 'Remove' ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/10' : 'bg-white border-slate-200 text-slate-400 hover:border-red-500 hover:text-red-600'}`}>Remove</button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5 block">Reason Code</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-900 outline-none focus:border-primary/50 cursor-pointer">
                                    <option>-- Select Requirement --</option>
                                    <option>Fulfills Inclusions</option>
                                    <option>Excluded via History</option>
                                    <option>Data Inconsistency</option>
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5 block">Internal QC Notes</label>
                                <textarea className="w-full h-28 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium text-slate-900 outline-none focus:border-primary/50 resize-none placeholder:text-slate-300" placeholder="Clinical justification..." />
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-white">
                            <button className="w-full py-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2">
                                <RotateCcw size={14} />
                                COMMIT ROW CHANGES
                            </button>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter text-center mt-3 italic">Changes sync to master study log</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 opacity-60">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 border border-slate-200"><Layout size={20} /></div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Patient</h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed max-w-[180px]">Highlight a row in the grid to perform clinical quality review.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

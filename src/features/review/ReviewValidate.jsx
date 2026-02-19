import React, { useState } from 'react';
import {
    CheckCircle2,
    XCircle,
    HelpCircle,
    ChevronRight,
    Search,
    Filter,
    FileText,
    ExternalLink,
    AlertCircle,
    User,
    Download,
    Eye,
    History,
    MessageSquare,
    Save,
    Quote,
    Layers,
    ClipboardCheck,
    ArrowRight
} from 'lucide-react';

export const ReviewValidate = () => {
    const [selectedPatient, setSelectedPatient] = useState('PAT-8821');
    const [decision, setDecision] = useState(null);
    const [notes, setNotes] = useState('');

    const patients = [
        { id: 'PAT-8821', status: 'Eligible', score: 0.95, date: '10:45 AM' },
        { id: 'PAT-4402', status: 'Ineligible', score: 0.12, date: '10:46 AM' },
        { id: 'PAT-1193', status: 'Unclear', score: 0.55, date: '10:48 AM' },
        { id: 'PAT-5567', status: 'Eligible', score: 0.88, date: '10:50 AM' },
        { id: 'PAT-0023', status: 'Eligible', score: 0.92, date: '10:52 AM' },
    ];

    const evidence = [
        {
            id: 1,
            type: 'Clinical Note',
            source: 'Neurology Progress Note (01/15/2024)',
            snippet: 'Patient exhibits symptoms of early-stage cognitive decline. MMSE score recorded at 24/30. MRI indicates mild hippocampal atrophy.',
            relevance: 'High',
            tags: ['Diagnosis', 'Radiology']
        },
        {
            id: 2,
            type: 'Lab Result',
            source: 'CSF Biomarkers (01/10/2024)',
            snippet: 'Abeta 42/40 ratio: 0.05 (Low). pTau 181: 52 pg/mL (Elevated). Consistent with AD pathology.',
            relevance: 'High',
            tags: ['Biomarkers']
        },
        {
            id: 3,
            type: 'Encounter',
            source: 'Initial Geri-Psych Assessment (12/20/2023)',
            snippet: 'Family reports 6-month history of progressive memory impairment and word-finding difficulties. No history of major depression.',
            relevance: 'Medium',
            tags: ['History']
        }
    ];

    const handleDownload = () => {
        const headers = "PatientID,Status,Score,Date\n";
        const body = patients.map(p => `${p.id},${p.status},${p.score},${p.date}`).join("\n");
        const blob = new Blob([headers + body], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `review_results_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="flex h-full bg-slate-50 animate-in fade-in duration-500 overflow-hidden">
            <div className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Patient Queue</h3>
                        <span className="text-[9px] font-black py-0.5 px-2 bg-slate-100 rounded-full text-slate-500 uppercase tracking-tighter">5 Cases</span>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <input
                            type="text"
                            placeholder="Filter queue..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-medium outline-none"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {patients.map(p => (
                        <div
                            key={p.id}
                            onClick={() => setSelectedPatient(p.id)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer group ${selectedPatient === p.id ? 'bg-primary border-primary shadow-lg shadow-primary/10 text-white' : 'bg-slate-50 border-slate-100 hover:border-primary/20 hover:bg-white'}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black font-mono tracking-tight">{p.id}</span>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest ${selectedPatient === p.id ? 'bg-white/20 text-white' : p.status === 'Eligible' ? 'bg-emerald-50 text-emerald-600' : p.status === 'Ineligible' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {p.status}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-tight opacity-70">
                                <div className="flex items-center gap-1">
                                    <ClipboardCheck size={10} />
                                    Match: {(p.score * 100).toFixed(0)}%
                                </div>
                                <span>{p.date}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={handleDownload}
                        className="w-full bg-white border border-slate-200 py-3 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Download size={14} />
                        Export Audit Trail
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
                <header className="bg-white border-b border-slate-200 px-8 py-5 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md">
                            <User size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 tracking-tight">{selectedPatient}</h2>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 italic">Clinical Evidence Analysis Tooling</p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                            <Quote size={12} />
                            Case Evidence
                        </h3>
                        <div className="flex-1 h-[1px] bg-slate-200" />
                    </div>

                    {evidence.map(item => (
                        <div key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-center justify-between bg-slate-50/50 px-6 py-3 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <FileText size={16} className="text-slate-400" />
                                    <div>
                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{item.type}</span>
                                        <span className="text-[10px] font-medium text-slate-400 ml-2">| {item.source}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${item.relevance === 'High' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {item.relevance} Relevance
                                    </span>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="relative">
                                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                                    <p className="text-sm font-medium text-slate-700 leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">
                                        "{item.snippet}"
                                    </p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex gap-1.5">
                                        {item.tags.map(tag => (
                                            <span key={tag} className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md uppercase tracking-tight">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <button className="flex items-center gap-1.5 text-[9px] font-black text-primary uppercase tracking-widest hover:translate-x-1 transition-all">
                                        Open Record
                                        <ExternalLink size={10} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-96 border-l border-slate-200 bg-white flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <ClipboardCheck size={14} />
                        Clinical Adjudication
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Eligibility Status</label>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { id: 'eligible', label: 'Patient Eligible', sub: 'Protocol Criteria Met', color: 'emerald', icon: CheckCircle2 },
                                { id: 'ineligible', label: 'Ineligible', sub: 'Protocol Exclusion Met', color: 'rose', icon: XCircle },
                                { id: 'unclear', label: 'Requires Review', sub: 'Manual Audit Needed', color: 'amber', icon: HelpCircle }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setDecision(opt.id)}
                                    className={`p-4 rounded-xl border transition-all flex items-center justify-between group ${decision === opt.id ? `bg-${opt.color}-50 border-${opt.color}-500 shadow-sm` : 'bg-white border-slate-100 hover:border-slate-300'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${decision === opt.id ? `bg-${opt.color}-500 text-white` : `bg-${opt.color}-50 text-${opt.color}-500`}`}>
                                            <opt.icon size={18} />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-xs font-black text-slate-900 group-hover:text-primary transition-colors">{opt.label}</div>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">{opt.sub}</p>
                                        </div>
                                    </div>
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${decision === opt.id ? `border-${opt.color}-500 bg-${opt.color}-500` : 'border-slate-200'}`}>
                                        {decision === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare size={12} />
                            Adjudication Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Provide clinical rationale..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-6 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary/10 transition-all min-h-[140px] resize-none"
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex items-center gap-3 shrink-0">
                    <button className="flex-1 bg-primary text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2">
                        <Save size={16} />
                        Finalize Case Decision
                    </button>
                </div>
            </div>
        </div>
    );
};

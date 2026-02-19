import React, { useState } from 'react';
import {
    Settings,
    Database,
    MessageSquare,
    Play,
    Save,
    History,
    Search,
    Plus,
    Trash2,
    Copy,
    ChevronRight,
    Info,
    Shield,
    Activity,
    BrainCircuit,
    Clock,
    Users,
    ArrowRight,
    RotateCcw,
    Zap,
    Terminal,
    Eye,
    Layers,
    Cpu,
    FileText,
    FileJson,
    CheckCircle2,
    FileUp,
    Download
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { TestPanel } from '../testing/TestPanel';

export const CriteriaWorkspace = () => {
    const { setStep, newProjectData, updateProjectData } = useAppStore();
    const [viewMode, setViewMode] = useState('list');
    const [selectedCriterionId, setSelectedCriterionId] = useState('c1');

    const criteriaList = [
        { id: 'c1', title: 'Age >= 18', type: 'Inclusion', status: 'ready', description: 'Patient birth date or age at primary encounter.' },
        { id: 'c2', title: 'HbA1c > 7.5%', type: 'Inclusion', status: 'ready', description: 'Most recent lab result within 6 months.' },
        { id: 'c3', title: 'Prior Insulin Use', type: 'Exclusion', status: 'needs-config', description: 'Medication history for any insulin analogs.' },
    ];

    const currentCriterion = criteriaList.find(c => c.id === selectedCriterionId) || criteriaList[0];

    const stats = [
        { label: 'Total Criteria', value: criteriaList.length.toString(), icon: Layers, color: 'text-primary' },
        { label: 'Readiness', value: '84%', icon: Zap, color: 'text-emerald-500' },
        { label: 'Version', value: 'v2.4', icon: Cpu, color: 'text-blue-500' },
    ];

    if (viewMode === 'detail') {
        return (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setViewMode('list')}
                            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
                        >
                            <RotateCcw size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${currentCriterion.type === 'Inclusion' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {currentCriterion.type}
                                </span>
                                <h2 className="text-xl font-black text-slate-900">{currentCriterion.title}</h2>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">{currentCriterion.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                            <History size={16} />
                            VERSION HISTORY
                        </button>
                        <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                            <Save size={16} />
                            UPDATE PROTOCOL
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 bg-slate-50 custom-scrollbar">
                    <div className="max-w-5xl mx-auto space-y-10">
                        <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6 shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                                        <Database size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">1. Clinical Dataset</h3>
                                        <p className="text-xs text-slate-500 font-medium mt-1">Select the cohort source for extraction and validation.</p>
                                    </div>
                                </div>
                                <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
                                    <FileUp size={14} />
                                    Choose Data File
                                </button>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <FileText className="text-slate-400" size={24} />
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-slate-900">biohaven_epilepsy_cohort_v2.csv</div>
                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-tight mt-1">154,202 Records | Last updated 2 hours ago</div>
                                </div>
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">ACTIVE SOURCE</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 text-slate-900 font-black uppercase tracking-widest text-xs border-b border-slate-200 pb-4">
                                    <MessageSquare size={16} className="text-primary" />
                                    Extraction Pipeline
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extraction Prompt</label>
                                        <div className="bg-white border border-slate-200 rounded-3xl p-6 min-h-[160px] shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                            <textarea
                                                className="w-full h-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 resize-none outline-none leading-relaxed"
                                                defaultValue="Identify all mentions of prior insulin use, including specific analogs, dosages, and frequency."
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extraction Validation Prompt</label>
                                        <div className="bg-white border border-slate-200 rounded-3xl p-6 min-h-[120px] shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                            <textarea
                                                className="w-full h-full bg-transparent border-none p-0 text-sm font-medium text-slate-500 italic resize-none outline-none leading-relaxed"
                                                defaultValue="Verify that the extracted text is indeed a medication mention and not a general discussion or template text."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-3 text-slate-900 font-black uppercase tracking-widest text-xs border-b border-slate-200 pb-4">
                                    <BrainCircuit size={16} className="text-indigo-500" />
                                    Reasoning Engine
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reasoning Prompt</label>
                                        <div className="bg-white border border-slate-200 rounded-3xl p-6 min-h-[160px] shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                            <textarea
                                                className="w-full h-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 resize-none outline-none leading-relaxed"
                                                defaultValue="Based on the identified medication history, determine if the patient has used any form of insulin therapy prior to the index date."
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reasoning Validation Prompt</label>
                                        <div className="bg-white border border-slate-200 rounded-3xl p-6 min-h-[120px] shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                            <textarea
                                                className="w-full h-full bg-transparent border-none p-0 text-sm font-medium text-slate-500 italic resize-none outline-none leading-relaxed"
                                                defaultValue="Confirm that the eligibility determination strictly follows the clinical definitions provided in the study protocol."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-500">
            <header className="bg-white border-b border-slate-200 px-10 py-8 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[2rem] bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm">
                            <Settings className="text-primary" size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                                    {newProjectData.name || 'Epilepsy_Biohaven_V4'}
                                </h1>
                                <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-widest">
                                    Protocol Configuration
                                </span>
                            </div>
                            <div className="flex items-center gap-6 text-slate-500">
                                {stats.map((stat, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <stat.icon size={14} className={stat.color} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{stat.label}:</span>
                                        <span className="text-xs font-black text-slate-900">{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                            <History size={16} />
                            Audit History
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-hidden p-10 flex gap-8">
                <div className="flex-1 bg-white rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-3">
                            <Layers size={18} className="text-primary" />
                            Clinical Logic Matrix
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Filter criteria..."
                                    className="bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/10 transition-all w-64"
                                />
                            </div>
                            <button className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                                <Plus size={16} />
                                New Criteria
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10 space-y-4 custom-scrollbar">
                        {criteriaList.map(c => (
                            <div
                                key={c.id}
                                className="group p-8 rounded-[2.5rem] bg-slate-50 border border-slate-200 flex items-center justify-between hover:bg-white hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer"
                                onClick={() => {
                                    setSelectedCriterionId(c.id);
                                    setViewMode('detail');
                                }}
                            >
                                <div className="flex items-center gap-8">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${c.type === 'Inclusion' ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'}`}>
                                        {c.id.charAt(0).toUpperCase()}{c.id.slice(1)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="text-xl font-black text-slate-800 tracking-tight">{c.title}</h4>
                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${c.type === 'Inclusion' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'} uppercase tracking-widest`}>
                                                {c.type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium">{c.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-10">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</span>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${c.status === 'ready' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{c.status === 'ready' ? 'Ready for Execution' : 'Awaiting Config'}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-96 flex flex-col gap-8 shrink-0">
                    <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white relative overflow-hidden flex flex-col items-center text-center">
                        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />
                        <div className="w-20 h-20 rounded-[2rem] bg-primary/20 flex items-center justify-center border border-primary/30 mb-8 shadow-2xl shadow-primary/40">
                            <Zap className="text-primary fill-primary" size={32} />
                        </div>
                        <h3 className="text-2xl font-black mb-3">Launch Processing</h3>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium mb-8">Initiate patient universe construction based on defined inclusion/exclusion markers.</p>
                        <button
                            onClick={() => updateProjectData({ isInitializingPatients: true })}
                            className="w-full bg-primary text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <Users size={16} />
                            Launch Candidate Builder
                            <ArrowRight size={16} />
                        </button>
                    </div>

                    <div className="flex-1 bg-white rounded-[3.5rem] border border-slate-200 p-10 space-y-8 flex flex-col">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-4">Logic Governance</h3>
                        <div className="space-y-6 flex-1">
                            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex items-center gap-4 group hover:border-primary/20 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors border border-slate-100 shadow-sm">
                                    <Database size={18} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Hospital Schema</div>
                                    <div className="text-xs font-bold text-slate-900 leading-none">st_jude_res_v4</div>
                                </div>
                            </div>
                            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex items-center gap-4 group hover:border-primary/20 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors border border-slate-100 shadow-sm">
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Index Cutoff</div>
                                    <div className="text-xs font-bold text-slate-900 leading-none">Feb 19, 2024</div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setStep(2)}
                            className="w-full py-4 border border-slate-200 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                        >
                            Skip to Run Setup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

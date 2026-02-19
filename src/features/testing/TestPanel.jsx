import React, { useState } from 'react';
import {
    Search,
    Database,
    Zap,
    CheckCircle2,
    Play,
    RefreshCcw,
    ChevronDown,
    Code,
    Terminal,
    AlertCircle
} from 'lucide-react';
import { MockApiService } from '../../services/mockApi';

export const TestPanel = () => {
    const [status, setStatus] = useState('idle');
    const [activeNode, setActiveNode] = useState(null);
    const [results, setResults] = useState({
        retrieval: null,
        extraction: null,
        outcome: null
    });

    const runSandbox = async () => {
        setStatus('running');
        setActiveNode('retrieval');
        await new Promise(r => setTimeout(r, 1200));
        setResults(prev => ({ ...prev, retrieval: "Found 4 clinical snippets from 2023-10-12 to 2023-11-15 matching 'HbA1c'." }));
        setActiveNode('extraction');
        await new Promise(r => setTimeout(r, 1500));
        setResults(prev => ({ ...prev, extraction: { value: 8.2, unit: '%', text: "HbA1c level is 8.2%" } }));
        setActiveNode('outcome');
        await new Promise(r => setTimeout(r, 800));
        setResults(prev => ({ ...prev, outcome: "ELIGIBLE" }));
        setStatus('success');
        setActiveNode(null);
    };

    const Node = ({ id, title, icon: Icon, children, isActive, isCompleted }) => (
        <div className={`relative flex gap-6 transition-all duration-500 ${isActive ? 'scale-[1.02]' : ''}`}>
            <div className="absolute left-6 top-10 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800 -z-0"></div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shadow-sm z-10 transition-all ${isActive ? 'bg-primary border-primary text-white ring-4 ring-primary/10' :
                    isCompleted ? 'bg-status-eligible border-status-eligible text-white' :
                        'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                }`}>
                <Icon size={20} className={isActive ? 'animate-pulse' : ''} />
            </div>
            <div className={`flex-1 pb-10 transition-opacity ${!isActive && !isCompleted && status !== 'idle' ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{title}</h4>
                    {isCompleted && <CheckCircle2 size={14} className="text-status-eligible" />}
                </div>
                <div className={`p-4 rounded-xl border transition-all ${isActive ? 'bg-white dark:bg-slate-900 border-primary shadow-lg shadow-primary/5' :
                        isCompleted ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800' :
                            'bg-slate-50/20 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'
                    }`}>
                    {children}
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-full gap-6">
            <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-0 pt-4">
                    <Node id="retrieval" title="Search & Retrieval" icon={Search} isActive={activeNode === 'retrieval'} isCompleted={results.retrieval}>
                        {results.retrieval ? (
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed">{results.retrieval}</p>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                                <Terminal size={14} /> Waiting for execution...
                            </div>
                        )}
                    </Node>
                    <Node id="extraction" title="LLM Extraction" icon={Zap} isActive={activeNode === 'extraction'} isCompleted={results.extraction}>
                        {results.extraction ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-primary uppercase">Prompt: extraction_v2.1</span>
                                    <span className="text-[10px] text-slate-500">Model: GPT-4o</span>
                                </div>
                                <div className="p-2 bg-slate-100 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                    {`"extracted_value": ${results.extraction.value}, "unit": "${results.extraction.unit}"`}
                                </div>
                                <p className="text-xs text-slate-500 italic">"{results.extraction.text}"</p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                                <Code size={14} /> Waiting for extraction step...
                            </div>
                        )}
                    </Node>
                    <Node id="outcome" title="Final Decision" icon={CheckCircle2} isActive={activeNode === 'outcome'} isCompleted={results.outcome}>
                        <div className="flex items-center gap-4">
                            {results.outcome ? (
                                <>
                                    <div className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold rounded">{results.outcome}</div>
                                    <span className="text-[11px] text-slate-500">Confidence Score: 0.94</span>
                                </>
                            ) : (
                                <div className="text-xs text-slate-400 italic">Awaiting summary synthesis...</div>
                            )}
                        </div>
                    </Node>
                </div>
            </div>
            <div className="w-80 space-y-4">
                <section className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Sandbox Controls</h3>
                    <button
                        onClick={runSandbox}
                        disabled={status === 'running'}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm shadow-sm transition-all active:scale-95 ${status === 'running' ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary-hover shadow-primary/20'}`}
                    >
                        {status === 'running' ? <RefreshCcw size={16} className="animate-spin" /> : <Play size={16} />}
                        {status === 'idle' ? 'RUN TEST' : status === 'running' ? 'EXECUTING...' : 'RE-RUN TEST'}
                    </button>
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Selected Test Patient</label>
                            <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs">
                                <span className="font-mono text-slate-700 dark:text-slate-300">PAT-8821</span>
                                <ChevronDown size={14} className="text-slate-400" />
                            </div>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-lg flex gap-3">
                            <AlertCircle size={14} className="text-blue-600 shrink-0" />
                            <p className="text-[10px] text-blue-700/80 dark:text-blue-500/80 leading-relaxed italic">
                                Sandbox runs are volatile and won't affect the project audit log until a real Run ID is created.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

import React, { useState } from 'react';
import { X, History, User, Shield, Terminal, Download, Zap } from 'lucide-react';

export const AuditLogModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const auditEvents = [
        { id: 1, user: 'Sarah Chen', role: 'Clinical Lead', action: 'Ran MySQL Seed Query', timestamp: '2024-02-19 10:25:04', type: 'system' },
        { id: 2, user: 'Sarah Chen', role: 'Clinical Lead', action: 'Modified ICD-10 Filters (Added G40.219)', timestamp: '2024-02-19 10:20:12', type: 'config' },
        { id: 3, user: 'System', role: 'Automation', action: 'Completed Elastic Refinement (Run #04)', timestamp: '2024-02-19 10:15:22', type: 'system' },
        { id: 4, user: 'Anurag K.', role: 'Admin', action: 'Exported Approved Candidate CSV', timestamp: '2024-02-19 09:45:00', type: 'export' },
    ];

    const getTypeIcon = (type) => {
        switch (type) {
            case 'system': return <Terminal size={14} className="text-blue-500" />;
            case 'config': return <Shield size={14} className="text-amber-500" />;
            case 'export': return <Download size={14} className="text-emerald-500" />;
            default: return <History size={14} className="text-slate-500" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] border border-slate-200 flex flex-col overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <History className="text-primary" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Audit History</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Traceability & Record of Decisions</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar max-h-[60vh]">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 bg-slate-100 p-1 rounded-xl border border-slate-200 flex">
                            {['All Events', 'Configuration', 'Systems', 'Exports'].map((filter, i) => (
                                <button key={i} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${i === 0 ? 'bg-white text-primary shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    {auditEvents.map(event => (
                        <div key={event.id} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-200 flex flex-col gap-3 group hover:border-primary/30 transition-all">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-200 group-hover:border-primary/30 transition-all">
                                        <User size={14} className="text-slate-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-slate-900">{event.user}</span>
                                        <span className="text-[9px] font-black text-primary uppercase tracking-tighter">{event.role}</span>
                                    </div>
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 font-mono tracking-tighter">{event.timestamp}</span>
                            </div>
                            <div className="flex items-center gap-3 pl-11">
                                {getTypeIcon(event.type)}
                                <p className="text-xs font-bold text-slate-600 tracking-tight">{event.action}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 italic">Showing last 24 hours of activity.</p>
                    <button className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-2 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-all">
                        <Download size={14} />
                        Download Full Report
                    </button>
                </div>
            </div>
        </div>
    );
};

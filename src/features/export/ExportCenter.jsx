import React from 'react';
import {
    Download,
    FileCheck,
    FileJson,
    FileText,
    ShieldCheck,
    Share2,
    CheckCircle2,
    ChevronRight,
    ExternalLink,
    Archive
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const ExportCenter = () => {
    const { setStep } = useAppStore();

    const artifacts = [
        { id: 'report', name: 'Clinical Validation Report', type: 'PDF', size: '2.4 MB', desc: 'High-level summary of eligibility distribution and inclusion/exclusion statistics.', icon: FileText, color: 'bg-red-50 text-red-600' },
        { id: 'audit', name: 'Full Audit Trail', type: 'JSON', size: '18.1 MB', desc: 'Raw machine-readable logs including evidence snippets and confidence scores for every patient.', icon: FileJson, color: 'bg-blue-50 text-blue-600' },
        { id: 'bundle', name: 'Regulatory Submission Bundle', type: 'ZIP', size: '42.5 MB', desc: 'Consolidated package including source PDF references and signed validator certificates.', icon: Archive, color: 'bg-indigo-50 text-indigo-600' }
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-12 py-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full mb-4 shadow-lg shadow-green-500/10">
                    <CheckCircle2 size={40} />
                </div>
                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Run Complete!</h1>
                <p className="text-lg text-slate-500 max-w-xl mx-auto">
                    Cohort execution <strong>RUN-2024-8821</strong> has been successfully finalized and signed.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {artifacts.map((artifact) => (
                    <div key={artifact.id} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex items-center gap-6">
                        <div className={`p-4 rounded-xl ${artifact.color} shrink-0`}>
                            <artifact.icon size={28} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{artifact.name}</h3>
                                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">.{artifact.type}</span>
                            </div>
                            <p className="text-sm text-slate-500 leading-relaxed max-w-lg">{artifact.desc}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 font-medium tracking-tight">
                                <span className="flex items-center gap-1"><FileCheck size={12} /> Size: {artifact.size}</span>
                                <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-green-500" /> Signed & Verified</span>
                            </div>
                        </div>
                        <button className="flex items-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-slate-900/10">
                            <Download size={16} />
                            DOWNLOAD
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between p-8 rounded-3xl bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary text-white rounded-2xl"><Share2 size={24} /></div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">External Integration</h4>
                        <p className="text-xs text-slate-500">Push results directly to clinical trial management systems via API.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 text-sm font-bold text-primary hover:underline px-4 py-2">VIEW API DOCS <ExternalLink size={14} /></button>
                    <button onClick={() => setStep(0)} className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20">
                        RETURN TO DASHBOARD <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

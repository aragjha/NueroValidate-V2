import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Database,
    Users,
    Settings2,
    Shield,
    X,
    FileText,
    Zap
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const CreateProjectFlow = () => {
    const [creationStep, setCreationStep] = useState(0);
    const [isCommitted, setIsCommitted] = useState(false);
    const {
        newProjectData,
        updateProjectData,
        resetNewProjectData,
        cancelProjectCreation,
        initiateProject
    } = useAppStore();

    const steps = [
        { id: 0, title: 'Basics', icon: Settings2, desc: 'Project identity' },
        { id: 1, title: 'Team', icon: Users, desc: 'Collaboration' },
        { id: 2, title: 'Criteria', icon: FileText, desc: 'Clinical parameters' },
        { id: 3, title: 'Review', icon: Shield, desc: 'Validation' },
    ];

    const neurologyDiseases = [
        'Migraine', "Alzheimer's Disease (AD)", "Parkinson's Disease (PD)",
        'Multiple Sclerosis (MS)', 'Epilepsy', 'Amyotrophic Lateral Sclerosis (ALS)',
        "Huntington's Disease", 'Stroke'
    ];

    const projectTypes = ['RWD (Real World Data)', 'RWE (Real World Evidence)', 'Clinical Trials'];

    const next = () => setCreationStep(Math.min(steps.length - 1, creationStep + 1));
    const back = () => setCreationStep(Math.max(0, creationStep - 1));

    const handleFormUpdate = (field, value) => { updateProjectData({ [field]: value }); };

    return (
        <div className="fixed inset-0 bg-white dark:bg-slate-950 z-50 flex flex-col animate-in fade-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={cancelProjectCreation} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Initiate Clinical Project</h2>
                        <p className="text-xs text-slate-500">Configure your validation workspace</p>
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    {steps.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${creationStep > i ? 'bg-status-eligible text-white' : creationStep === i ? 'bg-primary text-white ring-4 ring-primary/10' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                {creationStep > i ? <Check size={14} /> : i + 1}
                            </div>
                            <div className="hidden lg:block">
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${creationStep === i ? 'text-primary' : 'text-slate-400'}`}>{s.title}</p>
                            </div>
                            {i < steps.length - 1 && <div className="hidden lg:block w-8 h-[2px] bg-slate-100 dark:bg-slate-800 ml-2" />}
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <button className="text-[10px] font-black tracking-widest text-slate-400 hover:text-primary transition-colors uppercase">Save as Draft</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto flex items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                    <div className="p-12 space-y-10">
                        {creationStep === 0 && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Basic Configuration</h3>
                                    <p className="text-sm text-slate-500">Define the clinical core of your project.</p>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Native Name</label>
                                            <span className="text-[9px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">Format: Client_Disease_Alias(ID)</span>
                                        </div>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" placeholder="GeneralHosp_Migraine_Phase3(v1.2)" value={newProjectData.name} onChange={e => handleFormUpdate('name', e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disease / Diagnosis</label>
                                            <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none" value={newProjectData.disease} onChange={e => handleFormUpdate('disease', e.target.value)}>
                                                <option value="">Select Neurology Area...</option>
                                                {neurologyDiseases.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Classification</label>
                                            <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none" value={newProjectData.projectType} onChange={e => handleFormUpdate('projectType', e.target.value)}>
                                                <option value="">Select Project Type...</option>
                                                {projectTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Objectives (1-liner)</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all outline-none" placeholder="e.g., Validate inclusion for migraine patients with specific medication history" value={newProjectData.goals} onChange={e => handleFormUpdate('goals', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {creationStep === 1 && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Clinical Team Setup</h3>
                                    <p className="text-sm text-slate-500">Assign key roles and invite stakeholders to this project.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    {['lead', 'reviewer', 'dsTeam', 'dataTeam', 'reviewer1', 'reviewer2'].map(role => (
                                        <div key={role} className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{role.replace(/([A-Z])/g, ' $1')} Email</label>
                                            <input type="email" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" placeholder="email@hospital.com" value={newProjectData.teamEmails[role] || ''} onChange={e => updateProjectData({ teamEmails: { ...newProjectData.teamEmails, [role]: e.target.value } })} />
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-relaxed">
                                        Note: Clicking "Continue" will trigger automated workspace invitations to all specified emails.
                                    </p>
                                </div>
                            </div>
                        )}

                        {creationStep === 2 && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Clinical Parameters</h3>
                                    <p className="text-sm text-slate-500">Define the logic for inclusion and exclusion cohorts.</p>
                                </div>
                                <div className="space-y-10">
                                    {['inclusion', 'exclusion'].map(type => (
                                        <div key={type} className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${type === 'inclusion' ? 'bg-status-eligible' : 'bg-status-ineligible'}`} />
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{type} Criteria</h4>
                                                </div>
                                                <button onClick={() => updateProjectData({ criteria: [...newProjectData.criteria, { id: Date.now(), text: '', type }] })} className="text-[9px] font-black text-primary hover:tracking-widest transition-all uppercase">
                                                    + Add {type}
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                {newProjectData.criteria.filter(c => c.type === type).map(c => (
                                                    <div key={c.id} className="flex gap-3 group">
                                                        <input type="text" className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none" placeholder={type === 'inclusion' ? 'e.g., Age >= 18 years' : 'e.g., Previous history of stroke'} value={c.text} onChange={e => { const nc = [...newProjectData.criteria]; nc[nc.findIndex(i => i.id === c.id)].text = e.target.value; updateProjectData({ criteria: nc }); }} />
                                                        <button onClick={() => updateProjectData({ criteria: newProjectData.criteria.filter(i => i.id !== c.id) })} className="p-3 text-slate-300 hover:text-status-ineligible transition-colors opacity-0 group-hover:opacity-100">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {newProjectData.criteria.filter(c => c.type === type).length === 0 && (
                                                    <p className="text-[10px] text-slate-400 italic text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">No {type} criteria added yet.</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {creationStep === 3 && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 pb-10">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Project Finalization</h3>
                                    <p className="text-sm text-slate-500">Verify every clinical parameter before initiating the workspace.</p>
                                </div>
                                <div className="space-y-6">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Settings2 size={20} /></div>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metadata & Objectives</h4>
                                            </div>
                                            <button onClick={() => setCreationStep(0)} className="text-[9px] font-black text-primary uppercase hover:tracking-widest transition-all">Change</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-8 pt-2">
                                            <div><p className="text-[9px] font-bold text-slate-400 uppercase">Native Name</p><p className="text-xs font-bold text-slate-900 dark:text-white">{newProjectData.name || 'Not specified'}</p></div>
                                            <div><p className="text-[9px] font-bold text-slate-400 uppercase">Disease Area</p><p className="text-xs font-bold text-slate-900 dark:text-white">{newProjectData.disease || 'Not specified'}</p></div>
                                            <div><p className="text-[9px] font-bold text-slate-400 uppercase">Project Type</p><p className="text-xs font-bold text-slate-900 dark:text-white">{newProjectData.projectType || 'Not specified'}</p></div>
                                            <div className="col-span-2"><p className="text-[9px] font-bold text-slate-400 uppercase">Primary Goal</p><p className="text-xs font-medium text-slate-600 dark:text-slate-300 italic">"{newProjectData.goals || 'No goal specified'}"</p></div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex items-start gap-4">
                                        <div className="pt-1">
                                            <input type="checkbox" id="clinical-commitment" checked={isCommitted} onChange={(e) => setIsCommitted(e.target.checked)} className="w-5 h-5 rounded-lg border-2 border-primary/20 bg-white checked:bg-primary checked:border-primary transition-all cursor-pointer accent-primary" />
                                        </div>
                                        <label htmlFor="clinical-commitment" className="flex-1 cursor-pointer">
                                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Ready for Clinical Deployment</p>
                                            <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                                                I confirm that all clinical parameters, stakeholder assignments, and disease metadata are accurate and ready for workspace initialization.
                                            </p>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <button onClick={back} disabled={creationStep === 0} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${creationStep === 0 ? 'opacity-0 pointer-events-none' : 'text-slate-600 hover:bg-slate-200'}`}>
                            <ArrowLeft size={18} />
                            BACK
                        </button>
                        {creationStep === steps.length - 1 ? (
                            <button onClick={initiateProject} disabled={!isCommitted} className={`px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center gap-2 ${isCommitted ? 'bg-status-eligible text-white shadow-green-500/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed grayscale'}`}>
                                <Zap size={18} fill="currentColor" />
                                INITIATE PROJECT
                            </button>
                        ) : (
                            <button onClick={next} className="bg-slate-900 dark:bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center gap-2">
                                CONTINUE
                                <ArrowRight size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

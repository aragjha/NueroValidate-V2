import React, { useEffect, useState } from 'react';
import {
    Plus,
    Filter,
    Search,
    Calendar,
    Users,
    FileText,
    Activity,
    MoreVertical,
    ChevronRight,
    TrendingUp,
    Shield
} from 'lucide-react';
import { MockApiService } from '../../services/mockApi';
import { useAppStore } from '../../store/useAppStore';

export const Dashboard = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All Projects');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [advFilterCategory, setAdvFilterCategory] = useState('Date');
    const { setProjectId, setStep, startProjectCreation, updateProjectData } = useAppStore();

    const handleProjectSelect = (id) => {
        setProjectId(id);
        updateProjectData({ isInitializingPatients: true });
    };

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const data = await MockApiService.getProjects();
                const enhancedData = data.map(p => {
                    const isEpilepsy = p.id === 'proj-1';
                    const isAlz = p.id === 'proj-2';
                    return {
                        ...p,
                        client: isEpilepsy ? 'Neuro Research Institute' : isAlz ? 'Mayo Clinic Neurology' : 'Biohaven Neuro',
                        dueDate: isEpilepsy ? '2024-03-24' : isAlz ? '2024-04-12' : '2024-05-01',
                        type: 'Inclusion',
                        category: isEpilepsy ? 'Epilepsy' : isAlz ? "Alzheimer's" : 'Migraine',
                        patients: isEpilepsy ? 8420 : isAlz ? 1240 : 560,
                        completion: isEpilepsy ? 68 : isAlz ? 34 : 12,
                        failures: isEpilepsy ? 2 : 0,
                        owner: { name: 'Dr. Sarah Chen', avatar: 'SC' },
                        team: ['JD', 'AL']
                    };
                });
                setProjects(enhancedData);
            } catch (error) {
                console.error("Failed to fetch projects", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const filterTags = ['All Projects', 'Epilepsy', 'Migraine', "Alzheimer's", 'MS', 'Failures Detected'];

    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.client.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === 'All Projects' ||
            (activeFilter === 'Failures Detected' && project.failures > 0) ||
            project.category === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const totalPatients = projects.reduce((sum, p) => sum + (p.patients || 0), 0);
    const activeRuns = projects.length * 12;

    const advFilterOptions = [
        { id: 'Date', icon: Calendar },
        { id: 'Keywords', icon: Search },
        { id: 'Amount', icon: TrendingUp },
        { id: 'Categories', icon: Shield },
        { id: 'Accounts', icon: Users },
        { id: 'Status', icon: Activity },
    ];

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/20 to-transparent flex items-center justify-end pr-10">
                    <Activity size={120} className="opacity-10" />
                </div>
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <Shield className="text-primary" size={24} />
                        </div>
                        <div>
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Neurology Mission Control</h2>
                            <h1 className="text-4xl font-black tracking-tighter">NeuroAudit Center</h1>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-8 pt-4 border-t border-white/10">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Total Patients</span>
                            <div className="text-2xl font-black">{(totalPatients / 1000).toFixed(1)}k+</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Total Projects</span>
                            <div className="text-2xl font-black text-primary">{projects.length}</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Active Runs</span>
                            <div className="text-2xl font-black text-status-eligible">{activeRuns}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 px-4">
                <div className="flex items-center gap-4 w-full lg:w-auto relative">
                    <div className="relative flex-1 lg:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Find neurology projects, trials, or cohorts..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium shadow-sm focus:ring-4 focus:ring-primary/10 transition-all outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={`p-4 rounded-2xl transition-all shadow-sm border ${showAdvancedFilters ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-primary'}`}>
                        <Filter size={20} />
                    </button>

                    {showAdvancedFilters && (
                        <div className="absolute top-full left-0 mt-4 w-[600px] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden flex animate-in fade-in zoom-in-95 duration-200">
                            <div className="w-48 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-100 dark:border-slate-800 p-4 space-y-2">
                                {advFilterOptions.map((opt) => (
                                    <button key={opt.id} onClick={() => setAdvFilterCategory(opt.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${advFilterCategory === opt.id ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-900'}`}>
                                        <opt.icon size={16} />
                                        {opt.id}
                                        {advFilterCategory === opt.id && <ChevronRight size={14} className="ml-auto" />}
                                    </button>
                                ))}
                            </div>
                            <div className="flex-1 p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Filter By {advFilterCategory}</h4>
                                    <button onClick={() => setShowAdvancedFilters(false)} className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-tighter">Close</button>
                                </div>
                                {advFilterCategory === 'Date' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">From</label>
                                                <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-bold" defaultValue="2024-01-01" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">To</label>
                                                <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-bold" defaultValue="2024-12-31" />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {['Today', 'This Week', 'This Month', 'This Year'].map(label => (
                                                <button key={label} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold hover:bg-primary hover:text-white transition-all">{label}</button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {advFilterCategory === 'Amount' && (
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                <span>Minimum Patients</span>
                                                <span className="text-primary">1,000</span>
                                            </div>
                                            <input type="range" min="0" max="10000" step="500" className="w-full accent-primary h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                <span>Criteria Complexity</span>
                                                <span className="text-primary">High (&gt;10)</span>
                                            </div>
                                            <div className="flex gap-2">
                                                {['Low', 'Medium', 'High'].map(level => (
                                                    <button key={level} className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/20">{level}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {advFilterCategory !== 'Date' && advFilterCategory !== 'Amount' && (
                                    <div className="flex items-center justify-center py-12 text-slate-400 flex-col gap-4">
                                        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Filter configuration coming soon</p>
                                    </div>
                                )}
                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                                    <button className="flex-1 py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-900/10">Apply Filters</button>
                                    <button className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:bg-slate-200">Reset</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <button onClick={startProjectCreation} className="flex-1 lg:flex-none px-8 py-4 bg-primary text-white rounded-2xl text-sm font-black shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                        <Plus size={20} strokeWidth={3} />
                        CREATE NEW PROJECT
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 px-4">
                {filterTags.map((tag) => (
                    <button key={tag} onClick={() => setActiveFilter(tag)} className={`px-6 py-2.5 rounded-full text-xs font-bold border transition-all ${activeFilter === tag ? 'bg-slate-900 dark:bg-primary text-white border-transparent shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-400'}`}>
                        {tag}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 px-4">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-96 rounded-[3rem] bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
                    ))
                ) : (
                    filteredProjects.map((project) => (
                        <div key={project.id} onClick={() => handleProjectSelect(project.id)} className="group bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer flex flex-col gap-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${project.type === 'Inclusion' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>{project.type}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{project.client}</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{project.name}</h3>
                                </div>
                                <div className="flex -space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-slate-900">{project.owner.avatar}</div>
                                    {project.team.map((m, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-slate-900">{m}</div>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl space-y-1">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Users size={14} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Cohort Size</span>
                                    </div>
                                    <p className="text-xl font-black text-slate-900 dark:text-white">{(project.patients / 1000).toFixed(1)}k</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl space-y-1">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <FileText size={14} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Criteria</span>
                                    </div>
                                    <p className="text-xl font-black text-slate-900 dark:text-white">{project.criteriaCount}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Calendar size={14} />
                                        <span>DUE {project.dueDate}</span>
                                    </div>
                                    <div className={project.failures > 0 ? 'text-status-ineligible' : 'text-status-eligible'}>
                                        {project.failures > 0 ? `${project.failures} FAILURES DETECTED` : 'ALL RUNS OPTIMAL'}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black text-slate-900 dark:text-white">Audit Progress</span>
                                        <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{project.completion}% COMPLETE</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${project.completion}%` }} />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <button className="text-xs font-black text-primary hover:tracking-widest transition-all uppercase">Open Workspace</button>
                                <ChevronRight size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

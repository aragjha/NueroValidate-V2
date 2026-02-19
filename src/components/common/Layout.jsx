import React, { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, Moon, Sun, Bell, Search, User } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    const { currentStep } = useAppStore();

    return (
        <div className={darkMode ? 'dark' : ''}>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
                {/* Top Navigation */}
                <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-primary tracking-tight text-lg">NEUROAUDIT</span>
                        <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            PROD
                        </div>
                    </div>

                    <div className="flex-1 max-w-md mx-8 relative hidden sm:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Global search..."
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                        >
                            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 relative transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                        </button>
                        <div className="h-10 w-10 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 shadow-sm">
                            <User size={20} />
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 flex overflow-hidden">
                        {currentStep > 0 && (
                            <aside
                                className={`transition-all duration-300 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'}`}
                            >
                                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between overflow-hidden">
                                    {sidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Workflow</span>}
                                    <button
                                        onClick={() => setSidebarOpen(!sidebarOpen)}
                                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                                    >
                                        {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                                    </button>
                                </div>

                                <div className="flex-1 py-6 overflow-y-auto">
                                    <div className="space-y-2 px-3">
                                        {['Project', 'Criteria', 'Candidates', 'Run ID', 'Sample Run', 'Review', 'Full Run', 'Export'].map((step, i) => (
                                            <div
                                                key={step}
                                                className={`flex items-center gap-4 px-3 py-3 rounded-2xl ${i + 1 === currentStep ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                    } cursor-pointer transition-all group font-bold text-sm`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] border-2 ${i + 1 === currentStep ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'border-slate-200 dark:border-slate-700'
                                                    }`}>
                                                    {i + 1}
                                                </div>
                                                {sidebarOpen && <span className="tracking-tight">{step}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </aside>
                        )}

                        <main className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-950 p-8">
                            <div className="max-w-[1600px] mx-auto">
                                {children}
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
};

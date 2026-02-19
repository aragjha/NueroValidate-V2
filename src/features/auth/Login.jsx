import React, { useState } from 'react';
import { Lock, User, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const Login = () => {
    const { login } = useAppStore();
    const [isLoading, setIsLoading] = useState(false);
    const [credentials, setCredentials] = useState({ email: '', password: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        await new Promise(r => setTimeout(r, 1500));
        login({ email: credentials.email, role: 'Admin', name: 'Dr. Sarah Chen' });
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 mb-6">
                        <ShieldCheck size={32} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">NeuroAudit</h1>
                    <p className="text-slate-500 mt-3 text-sm font-medium">Neurology Clinical Data Validation</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                    <div className="p-8">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Secure Sign In</h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input type="email" required placeholder="dr.chen@neuroclinic.org" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" value={credentials.email} onChange={e => setCredentials({ ...credentials, email: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input type="password" required placeholder="••••••••" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                                    <span className="text-xs text-slate-500">Remember session</span>
                                </label>
                                <button type="button" className="text-xs font-bold text-primary hover:underline">Forgot access?</button>
                            </div>
                            <button type="submit" disabled={isLoading} className="w-full bg-slate-900 dark:bg-primary hover:opacity-90 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50">
                                {isLoading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        <span>ENTER PORTAL</span>
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 text-center border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[11px] text-slate-500 leading-relaxed italic">
                            This is a restricted clinical application. Unauthorized access is monitored and reported according to HIPAA/GDPR clinical data standards.
                        </p>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-50">Build v2.4.9-STABLE // NeuroAudit Clinical Core</p>
                </div>
            </div>
        </div>
    );
};

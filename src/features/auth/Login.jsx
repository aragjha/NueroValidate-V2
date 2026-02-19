import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export const Login = () => {
    const { login } = useAppStore();
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [rememberSession, setRememberSession] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        await new Promise(r => setTimeout(r, 1500));
        login({ email: credentials.email, role: 'Admin', name: 'Dr. Sarah Chen' });
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
            <div className="w-full max-w-md">
                <div className="mb-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary text-white shadow-xl shadow-primary/30 mb-6">
                        <span className="font-black text-xl">N</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">NEUROAUDIT V2</h1>
                    <p className="text-slate-500 mt-2 text-sm font-medium">Clinical AI Validation Platform</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-xl shadow-slate-900/5 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Email</label>
                        <input
                            type="email"
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                            placeholder="dr.chen@neurology.org"
                            value={credentials.email}
                            onChange={e => setCredentials(p => ({ ...p, email: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Code</label>
                        <input
                            type="password"
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                            placeholder="••••••••"
                            value={credentials.password}
                            onChange={e => setCredentials(p => ({ ...p, password: e.target.value }))}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="remember"
                            checked={rememberSession}
                            onChange={(e) => setRememberSession(e.target.checked)}
                            className="w-4 h-4 accent-primary"
                        />
                        <label htmlFor="remember" className="text-xs font-bold text-slate-500 cursor-pointer">Remember clinical session (8 hrs)</label>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/25 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Authenticating...' : 'Access Platform'}
                    </button>
                </form>

                <p className="text-center text-[10px] text-slate-400 mt-6 font-bold uppercase tracking-wider">
                    Protected by clinical-grade encryption
                </p>
            </div>
        </div>
    );
};

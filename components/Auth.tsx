// Auth.tsx edited to remove hardcoded credentials and add password visibility toggle
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Mail, Lock, Loader2, Landmark, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export const Auth: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            toast.success('Bem-vindo de volta!');
        } catch (error: any) {
            toast.error(error.message || 'Erro na autenticação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 relative overflow-hidden font-sans selection:bg-green-500/30 selection:text-green-200">
            {/* Ambient Lighting Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-500/10 blur-[120px] rounded-full animate-pulse duration-[10000ms]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse duration-[12000ms]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.03),transparent_70%)] pointer-events-none"></div>

            <div className="w-full max-w-[400px] p-6 relative z-10 perspective-1000">
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-[2rem] p-8 shadow-2xl shadow-black/50 relative overflow-hidden group">

                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>

                    <div className="flex flex-col items-center mb-10 relative">
                        <div className="w-20 h-20 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center mb-6 shadow-xl shadow-green-900/20 group-hover:border-green-500/30 transition-colors duration-500 relative">
                            <div className="absolute inset-0 bg-green-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <Landmark className="text-green-500 relative z-10" size={36} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter">
                            Darfiny <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">CRM</span>
                        </h1>
                        <p className="text-slate-500 text-xs font-medium mt-2 tracking-wide">
                            Faça login para continuar
                        </p>
                    </div>


                    <form onSubmit={handleAuth} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                E-mail Corporativo
                            </label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="text-slate-500 group-focus-within/input:text-green-500 transition-colors" size={18} />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 transition-all text-sm font-medium"
                                    placeholder="seu.email@empresa.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                Senha de Acesso
                            </label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="text-slate-500 group-focus-within/input:text-green-500 transition-colors" size={18} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3.5 pl-11 pr-12 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 transition-all text-sm font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none p-1"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-900/20 hover:shadow-green-900/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 group/btn mt-2"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <span className="tracking-wide">Acessar Painel</span>
                                    <LogIn size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="flex items-center justify-center gap-4 mt-8 opacity-60">
                    <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
                        Powered by Egeolabs
                    </p>
                </div>
            </div>
        </div>
    );
};


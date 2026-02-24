import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export const Auth: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                alert('Check your email for the login link or log in directly if email confirmation is disabled.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onLogin();
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-xl shadow-2xl">
                <h1 className="text-3xl font-black mb-6 text-center tracking-tighter">
                    BRZI<span className="text-indigo-500">.AI</span>
                </h1>
                <p className="text-zinc-400 text-center mb-8 text-sm">
                    {isSignUp ? 'Create your sovereign core account.' : 'Authenticate to access your sovereign core.'}
                </p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded p-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="commander@brzi.ai"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded p-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded transition-colors disabled:opacity-50 mt-4"
                    >
                        {loading ? 'PROCESSING...' : isSignUp ? 'INITIALIZE ACCOUNT' : 'AUTHENTICATE'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-xs text-zinc-500 hover:text-white transition-colors"
                    >
                        {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                    </button>
                </div>
            </div>
        </div>
    );
};

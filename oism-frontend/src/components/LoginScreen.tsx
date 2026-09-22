// src/components/LoginScreen.tsx
import React, { useState } from 'react';
import { api } from '../api/axiosClient';
import { Lock, Mail, Store } from 'lucide-react';

interface LoginScreenProps {
    onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('admin@oism.vn'); // Thay bằng email bạn code trong AuthService
    const [password, setPassword] = useState('123456');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const response = await api.post('/auth/login', { email, password });
            const token = response.data.token || response.data.Token;
            
            // Lưu token vào LocalStorage
            localStorage.setItem('token', token);
            onLoginSuccess();
            
        } catch (err: any) {
            setError('Sai email hoặc mật khẩu. Vui lòng kiểm tra lại!');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="bg-indigo-600 p-8 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-4 backdrop-blur-sm">
                        <Store className="text-white w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tight">OISM POS</h2>
                    <p className="text-indigo-100 mt-2">Hệ thống Quản lý Bán lẻ Đa kênh</p>
                </div>
                
                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center font-medium border border-red-100">{error}</div>}
                        
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Email đăng nhập</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input 
                                    type="email" 
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-12 py-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Mật khẩu</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input 
                                    type="password" 
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-12 py-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-indigo-600 text-white font-bold rounded-xl py-4 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:bg-indigo-400 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30"
                        >
                            {isLoading ? 'Đang xác thực...' : 'Đăng Nhập Quầy'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
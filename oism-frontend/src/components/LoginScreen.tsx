import React, { useState } from 'react';
import { api } from '../api/axiosClient';
import { Lock, Mail, Package, ShieldCheck, ArrowRight, TrendingUp, Box } from 'lucide-react';

interface LoginScreenProps {
    onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('admin@oism.vn');
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
            localStorage.setItem('token', token);
            onLoginSuccess();
        } catch (err: any) {
            setError('Thông tin đăng nhập không chính xác. Vui lòng thử lại!');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            {/* Cột trái: Form Đăng nhập (Chiếm 45%) */}
            <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 lg:px-20 bg-white relative z-10 shadow-[20px_0_40px_rgba(0,0,0,0.05)]">
                <div className="max-w-md w-full mx-auto">
                    {/* Logo & Tiêu đề */}
                    <div className="mb-12">
                        <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-600/30">
                            <Package className="text-white w-8 h-8" strokeWidth={2.5} />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Hệ thống Quản lý Kho</h2>
                        <p className="text-slate-500 mt-2 text-base font-medium">Nền tảng kiểm soát tồn kho & chuỗi cung ứng OISM</p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3.5 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <ShieldCheck className="w-5 h-5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Địa chỉ Email</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <input 
                                        type="email" 
                                        required
                                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium placeholder:text-slate-400 hover:border-slate-300"
                                        placeholder="admin@oism.vn"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-semibold text-slate-700">Mật khẩu</label>
                                    <a href="#" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">Quên mật khẩu?</a>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <input 
                                        type="password" 
                                        required
                                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium placeholder:text-slate-400 hover:border-slate-300"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-indigo-600 text-white font-semibold rounded-xl py-3.5 mt-4 flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:bg-slate-300 disabled:cursor-not-allowed group shadow-lg shadow-indigo-600/25"
                        >
                            <span className="text-base">{isLoading ? 'Đang xác thực...' : 'Đăng Nhập Hệ Thống'}</span>
                            {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>
                    
                    <div className="mt-8 text-center text-sm text-slate-500 font-medium">
                        &copy; 2024 OISM Solutions. All rights reserved.
                    </div>
                </div>
            </div>

            {/* Cột phải: Visual/Banner (Chiếm 55%) */}
            <div className="hidden lg:flex w-[55%] bg-slate-900 relative overflow-hidden items-center justify-center p-12">
                {/* Background Gradients */}
                <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
                <div className="absolute bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[100px]"></div>
                
                {/* Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '48px 48px' }}></div>
                
                <div className="relative z-10 max-w-xl">
                    {/* Abstract UI Element (Đại diện cho Dashboard kho hàng) */}
                    <div className="mb-12 relative">
                        {/* Main Card */}
                        <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                    <TrendingUp className="text-indigo-400 w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-slate-300 text-sm font-medium">Tổng xuất nhập tồn</div>
                                    <div className="text-white text-2xl font-bold tracking-tight">+24,500 <span className="text-sm font-normal text-slate-400">đơn vị</span></div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-[75%] rounded-full"></div>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[45%] rounded-full"></div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Floating Card */}
                        <div className="absolute -bottom-6 -right-6 bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-xl flex items-center gap-4 animate-bounce" style={{ animationDuration: '3s' }}>
                            <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400">
                                <Box className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-white text-sm font-bold">Đồng bộ tự động</div>
                                <div className="text-slate-400 text-xs">Vừa cập nhật 1 phút trước</div>
                            </div>
                        </div>
                    </div>

                    <h1 className="text-4xl font-bold text-white leading-tight mb-4 tracking-tight">
                        Kiểm soát tồn kho <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">chính xác tuyệt đối.</span>
                    </h1>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed">
                        Tối ưu hóa không gian lưu trữ, theo dõi luân chuyển hàng hóa thời gian thực và quản lý chuỗi cung ứng thông minh với OISM.
                    </p>
                </div>
            </div>
        </div>
    );
};
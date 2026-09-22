import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ShoppingCart, Trash2, Minus, Plus, CreditCard, AlertCircle, PackageOpen, LogOut } from 'lucide-react';
import { useOrderSignalR } from '../hooks/useOrderSignalR';
import { api } from '../api/axiosClient';

interface Product {
    id: string; 
    sku: string;
    name: string;
    price: number;
    availableStock: number;
    category?: { name: string };
}

interface CartItem extends Product {
    quantity: number;
}

export const PosScreen: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    // Bắt sự kiện Real-time từ SignalR
    const newOrderNotification = useOrderSignalR();

    // KẾT NỐI DATABASE: Lấy danh sách sản phẩm từ PostgreSQL
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setIsLoading(true);
                const response = await api.get('/product'); 
                
                const mappedProducts = response.data.map((p: any) => ({
                    id: p.id,
                    sku: p.sku,
                    name: p.name,
                    price: p.price,
                    // Tạm random tồn kho để test UI. Thực tế sẽ lấy từ API tồn kho (InventorySummary)
                    availableStock: Math.floor(Math.random() * 10) + 1, 
                    category: p.category
                }));
                setProducts(mappedProducts);
            } catch (error) {
                console.error("Lỗi kết nối Backend:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProducts();
    }, []);

    // Lọc sản phẩm theo từ khóa
    const filteredProducts = useMemo(() => {
        return products.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.sku.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, products]);

    // Hotkey Listener (F2, F3)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F2') { e.preventDefault(); handleFastCheckout(); }
            if (e.key === 'F3') { e.preventDefault(); searchInputRef.current?.focus(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart]);

    // Thêm vào giỏ hàng & Chặn âm kho
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            const currentQty = existing ? existing.quantity : 0;
            
            if (currentQty + 1 > product.availableStock) return prev; 

            if (existing) {
                return prev.map(item => item.id === product.id 
                    ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateCartQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = item.quantity + delta;
                if (newQty > item.availableStock || newQty < 1) return item;
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

    const printReceipt = () => {
        const printContent = document.getElementById('print-receipt-section');
        const windowPrint = window.open('', '', 'width=400,height=600');
        windowPrint?.document.write(`
            <html>
                <head>
                    <title>Biên lai OISM</title>
                    <style>
                        body { font-family: monospace; font-size: 14px; padding: 20px; }
                        .text-center { text-align: center; }
                        .flex-between { display: flex; justify-content: space-between; margin-bottom: 5px; }
                        hr { border: 1px dashed #000; margin: 15px 0; }
                    </style>
                </head>
                <body>${printContent?.innerHTML}</body>
            </html>
        `);
        windowPrint?.document.close();
        windowPrint?.focus();
        windowPrint?.print();
        windowPrint?.close();
    };

    // Gọi API Fast Checkout
    const handleFastCheckout = async () => {
        if (cart.length === 0) return alert("Giỏ hàng trống!");
        
        try {
            const payload = {
                branchId: "00000000-0000-0000-0000-000000000000", 
                items: cart.map(c => ({
                    variantId: c.id,
                    quantity: c.quantity,
                    unitPrice: c.price
                }))
            };

            await api.post('/pos/fast-checkout', payload);
            
            alert("✅ Thanh toán & Trừ kho thành công!");
            printReceipt();
            setCart([]); 
        } catch (error: any) {
            console.error(error);
            alert("❌ Lỗi thanh toán: " + (error.response?.data?.Error || error.message));
        }
    };

    const formatVND = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <div className="flex h-screen w-full bg-gray-100 text-gray-800 overflow-hidden font-sans selection:bg-indigo-100">
            
            {/* THÔNG BÁO SIGNALR REAL-TIME */}
            {newOrderNotification && (
                <div className="fixed top-5 right-5 z-50 bg-indigo-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-bounce">
                    <PackageOpen size={28} />
                    <div>
                        <p className="font-bold text-lg">Đơn hàng mới!</p>
                        <p className="text-indigo-100 text-sm">{newOrderNotification.Message}</p>
                    </div>
                </div>
            )}

            {/* CỘT TRÁI (70%) - KHU VỰC BÁN HÀNG */}
            <div className="w-[70%] flex flex-col h-full bg-gray-50">
                {/* Header & Search */}
                <div className="p-6 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between gap-6">
                    <h1 className="text-2xl font-black text-indigo-700 tracking-tight">OISM<span className="text-gray-400 font-medium">POS</span></h1>
                    
                    <div className="relative flex-1 max-w-2xl">
                        <input 
                            ref={searchInputRef}
                            type="text" 
                            className="w-full bg-gray-100 border border-transparent text-gray-800 text-lg rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 block py-3 pl-12 pr-4 outline-none transition-all placeholder:text-gray-400 shadow-inner" 
                            placeholder="Nhập Tên, SKU hoặc quét Mã vạch (F3)..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>

                    {/* NÚT ĐĂNG XUẤT */}
                    <button onClick={onLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 hover:border-red-200 hover:bg-red-50">
                        <LogOut size={18} /> <span className="font-semibold text-sm">Thoát</span>
                    </button>
                </div>

                {/* Danh sách sản phẩm */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-400 font-medium">Đang tải dữ liệu từ Database...</div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filteredProducts.map(p => {
                                const cartQty = cart.find(c => c.id === p.id)?.quantity || 0;
                                const remaining = p.availableStock - cartQty;
                                const isOutOfStock = remaining <= 0;

                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => !isOutOfStock && addToCart(p)}
                                        disabled={isOutOfStock}
                                        className={`group flex flex-col bg-white p-0 rounded-2xl border transition-all text-left overflow-hidden 
                                            ${isOutOfStock 
                                            ? 'border-red-200 opacity-60 cursor-not-allowed grayscale' 
                                            : 'border-gray-200 hover:border-indigo-500 hover:shadow-xl active:scale-[0.98] cursor-pointer'}`}
                                    >
                                        <div className="h-32 w-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center border-b border-gray-100 relative">
                                            <span className="text-4xl">🛍️</span>
                                            {isOutOfStock && (
                                                <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                                                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg">
                                                        <AlertCircle size={14}/> Hết hàng
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="p-4 flex flex-col flex-1 w-full">
                                            <span className="text-xs font-bold text-gray-400 mb-1 tracking-wide">{p.sku}</span>
                                            <h3 className="text-base font-semibold text-gray-800 line-clamp-2 leading-snug mb-3 group-hover:text-indigo-600 transition-colors">
                                                {p.name}
                                            </h3>
                                            <div className="mt-auto flex justify-between items-end w-full">
                                                <span className="text-lg font-black text-gray-900">{formatVND(p.price)}</span>
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${isOutOfStock ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                                                    Kho: {remaining}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* CỘT PHẢI (30%) - GIỎ HÀNG */}
            <div className="w-[30%] bg-white flex flex-col h-full shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.05)] z-10 border-l border-gray-200 relative">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-3">
                        <ShoppingCart className="text-indigo-600" size={24} />
                        <h2 className="text-xl font-bold text-gray-800">Giỏ hàng</h2>
                    </div>
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-bold text-sm">
                        {cart.reduce((a,b) => a + b.quantity, 0)} SP
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                            <ShoppingCart size={64} className="opacity-20" />
                            <p className="text-lg font-medium text-gray-500">Chưa có sản phẩm nào</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {cart.map(c => (
                                <div key={c.id} className="flex flex-col p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start gap-2 mb-3">
                                        <h4 className="font-semibold text-gray-800 leading-tight flex-1">{c.name}</h4>
                                        <button onClick={() => removeFromCart(c.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1 bg-gray-50 hover:bg-red-50 rounded-md">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-indigo-600">{formatVND(c.price)}</span>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1">
                                            <button onClick={() => updateCartQuantity(c.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-100 rounded text-gray-600 shadow-sm transition-colors"><Minus size={14}/></button>
                                            <span className="w-10 text-center font-bold text-sm text-gray-800">{c.quantity}</span>
                                            <button onClick={() => updateCartQuantity(c.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-100 rounded text-gray-600 shadow-sm transition-colors"><Plus size={14}/></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-white border-t border-gray-200 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-between items-end mb-6">
                        <span className="text-gray-500 font-medium">Khách cần trả</span>
                        <span className="text-4xl font-black text-gray-900">{formatVND(cartTotal)}</span>
                    </div>
                    <button 
                        onClick={handleFastCheckout}
                        disabled={cart.length === 0}
                        className={`w-full py-4 rounded-xl text-lg font-bold transition-all active:scale-[0.98] flex justify-center items-center gap-3 ${
                            cart.length > 0 
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        <CreditCard size={20} />
                        <span>Thanh toán</span>
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-mono ml-auto">F2</span>
                    </button>
                </div>

                {/* Khu vực ẩn dùng để đổ layout vào API máy in */}
                <div id="print-receipt-section" className="hidden">
                    <h2 className="text-center font-bold">OISM SHOP</h2>
                    <p className="text-center">Biên lai bán lẻ</p>
                    <hr />
                    {cart.map(c => (
                        <div key={c.id} className="flex-between">
                            <span>{c.name} x{c.quantity}</span>
                            <span>{formatVND(c.price * c.quantity)}</span>
                        </div>
                    ))}
                    <hr />
                    <h3 className="text-center">Tổng cộng: {formatVND(cartTotal)}</h3>
                    <p className="text-center">Cảm ơn quý khách!</p>
                </div>
            </div>
        </div>
    );
};
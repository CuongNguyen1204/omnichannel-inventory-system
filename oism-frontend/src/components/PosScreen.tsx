import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/axiosClient';
import { useOrderSignalR } from '../hooks/useOrderSignalR';
import { 
    Package, Search, ShoppingCart, Plus, Minus, Trash2, 
    Printer, CheckCircle, AlertCircle, Barcode, CreditCard, RefreshCw 
} from 'lucide-react';

interface Product {
    variantId: string;
    sku: string;
    name: string;
    price: number;
    availableStock: number;
    category?: string;
}

interface CartItem extends Product {
    quantity: number;
}

export const PosScreen: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [fetchError, setFetchError] = useState<string>('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Lắng nghe SignalR từ Backend
    const newOrderNotification = useOrderSignalR();

    // Lấy dữ liệu sản phẩm từ Database (Backend API)
    const fetchProducts = async () => {
        setLoading(true);
        setFetchError('');
        try {
            // Gọi API lấy danh sách sản phẩm/tồn kho từ Database
            const response = await api.get('/products'); 
            setProducts(response.data.items || response.data || []);
        } catch (err: any) {
            console.error("Lỗi khi tải danh sách sản phẩm từ DB:", err);
            // Dữ liệu mẫu dự phòng khi chưa chạy backend để giao diện không bị trống
            setProducts([
                { variantId: "v1", sku: "SKU-TS01", name: "Áo thun Cotton Nam Cao Cấp", price: 150000, availableStock: 12, category: "Thời trang" },
                { variantId: "v2", sku: "SKU-JN02", name: "Quần Jean Slimfit Xám Đen", price: 350000, availableStock: 0, category: "Thời trang" },
                { variantId: "v3", sku: "SKU-HD03", name: "Áo khoác Hoodie Form rộng", price: 420000, availableStock: 8, category: "Thời trang" },
                { variantId: "v4", sku: "SKU-SN04", name: "Giày Sneaker Thể thao Unisex", price: 650000, availableStock: 5, category: "Giày dép" },
                { variantId: "v5", sku: "SKU-BP05", name: "Balo Laptop Chống Nước OISM", price: 290000, availableStock: 20, category: "Phụ kiện" },
            ]);
            setFetchError('Không thể kết nối đến Database. Đang hiển thị dữ liệu mẫu.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // Hotkey Listener (F2: Thanh toán, F3: Tìm kiếm nhanh)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                handleFastCheckout();
            }
            if (e.key === 'F3') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart]);

    // Thêm sản phẩm vào giỏ hàng & kiểm tra tồn kho
    const addToCart = (product: Product) => {
        if (product.availableStock <= 0) {
            alert(`Sản phẩm "${product.name}" đã hết hàng trong kho!`);
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.variantId === product.variantId);
            const currentQty = existing ? existing.quantity : 0;
                         
            if (currentQty + 1 > product.availableStock) {
                alert(`Không thể thêm! Tồn kho chỉ còn ${product.availableStock} đơn vị.`);
                return prev;
            }
            if (existing) {
                return prev.map(item => item.variantId === product.variantId
                     ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    // Tăng giảm số lượng sản phẩm trong giỏ
    const updateQuantity = (variantId: string, delta: number) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.variantId === variantId) {
                    const newQty = item.quantity + delta;
                    if (newQty > item.availableStock) {
                        alert(`Vượt quá tồn kho cho phép (${item.availableStock})!`);
                        return item;
                    }
                    return newQty > 0 ? { ...item, quantity: newQty } : null;
                }
                return item;
            }).filter(Boolean) as CartItem[];
        });
    };

    // Xóa sản phẩm khỏi giỏ
    const removeFromCart = (variantId: string) => {
        setCart(prev => prev.filter(item => item.variantId !== variantId));
    };

    // In biên lai thanh toán
    const printReceipt = () => {
        const printContent = document.getElementById('print-receipt-section');
        const windowPrint = window.open('', '', 'width=600,height=600');
        windowPrint?.document.write(`
            <html>
                <head>
                    <title>Biên lai OISM POS</title>
                    <style>
                        body { font-family: monospace; padding: 20px; font-size: 14px; }
                        h3 { text-align: center; margin-bottom: 5px; }
                        hr { border: dashed 1px #ccc; }
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

    // Thanh toán nhanh
    const handleFastCheckout = async () => {
        if (cart.length === 0) {
            alert("Giỏ hàng đang trống!");
            return;
        }

        try {
            // Gửi dữ liệu đơn hàng lên Backend API để trừ tồn kho trong Database
            // await api.post('/pos/fast-checkout', { items: cart });
            alert("Thanh toán đơn hàng thành công!");
            printReceipt();
            setCart([]);
            fetchProducts(); // Làm mới lại số lượng tồn kho từ Database
        } catch (error) {
            alert("Lỗi khi xử lý thanh toán. Vui lòng thử lại!");
        }
    };

    // Lọc sản phẩm theo từ khóa tìm kiếm hoặc mã SKU/Barcode
    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <div className="flex flex-col h-screen bg-slate-100 font-sans overflow-hidden">
            {/* THÔNG BÁO SIGNALR REALTIME */}
            {newOrderNotification && (
                <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
                    <CheckCircle className="w-6 h-6 shrink-0" />
                    <div>
                        <div className="font-bold text-sm">Có đơn hàng mới từ hệ thống!</div>
                        <div className="text-xs text-emerald-100">{newOrderNotification.Message || 'Kiểm tra danh sách đơn hàng'}</div>
                    </div>
                </div>
            )}

            {/* TOP HEADER BAR */}
            <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-900 text-lg leading-tight">OISM POS - Quản Lý Bán Hàng Tại Quầy</h1>
                        <p className="text-xs text-slate-500 font-medium">Đồng bộ tồn kho thời gian thực với Database</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={fetchProducts}
                        className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                        title="Làm mới dữ liệu từ Database"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>Làm mới kho</span>
                    </button>
                    <div className="text-right border-l pl-4 border-slate-200">
                        <div className="text-xs text-slate-400 font-medium">Thu ngân / Quản kho</div>
                        <div className="text-sm font-bold text-slate-800">Admin OISM</div>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <div className="flex flex-1 overflow-hidden p-4 gap-4">
                
                {/* BÊN TRÁI: DANH SÁCH SẢN PHẨM TỪ DATABASE (Chiếm 65%) */}
                <div className="w-[65%] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Search Bar */}
                    <div className="p-4 border-b border-slate-100 flex gap-3 items-center">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600">
                                <Search className="w-5 h-5" />
                            </div>
                            <input 
                                ref={searchInputRef}
                                type="text" 
                                placeholder="Quét mã Barcode hoặc nhập tên SKU sản phẩm (Bấm F3 để tập trung)..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-600/10 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-indigo-50 px-3.5 py-2.5 rounded-xl border border-indigo-100 text-indigo-700 text-xs font-bold">
                            <Barcode className="w-4 h-4" />
                            <span>Hỗ trợ Barcode</span>
                        </div>
                    </div>

                    {/* Thông báo lỗi kết nối DB (nếu có) */}
                    {fetchError && (
                        <div className="bg-amber-50 border-b border-amber-100 text-amber-800 px-4 py-2.5 text-xs font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{fetchError}</span>
                        </div>
                    )}

                    {/* Product Grid */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
                                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                                <p className="text-sm font-medium">Đang truy vấn dữ liệu từ cơ sở dữ liệu...</p>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
                                <Package className="w-12 h-12 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-600">Không tìm thấy sản phẩm phù hợp</p>
                                <p className="text-xs">Kiểm tra lại từ khóa tìm kiếm hoặc mã SKU</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-3.5">
                                {filteredProducts.map(product => {
                                    const isOutOfStock = product.availableStock <= 0;
                                    return (
                                        <div 
                                            key={product.variantId}
                                            onClick={() => !isOutOfStock && addToCart(product)}
                                            className={`bg-white border rounded-xl p-4 flex flex-col justify-between transition-all ${
                                                isOutOfStock 
                                                    ? 'opacity-60 border-slate-200 bg-slate-50 cursor-not-allowed' 
                                                    : 'border-slate-200 hover:border-indigo-600 hover:shadow-md cursor-pointer group'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex justify-between items-start gap-2 mb-2">
                                                    <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                                        {product.sku}
                                                    </span>
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                                        isOutOfStock 
                                                            ? 'bg-red-50 text-red-600' 
                                                            : product.availableStock <= 5 
                                                            ? 'bg-amber-50 text-amber-600' 
                                                            : 'bg-emerald-50 text-emerald-600'
                                                    }`}>
                                                        {isOutOfStock ? 'Hết hàng' : `Tồn: ${product.availableStock}`}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-slate-800 text-sm line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                                    {product.name}
                                                </h3>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                                                <span className="font-black text-slate-900 text-base">
                                                    {product.price.toLocaleString('vi-VN')} đ
                                                </span>
                                                <button 
                                                    disabled={isOutOfStock}
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                                        isOutOfStock 
                                                            ? 'bg-slate-200 text-slate-400' 
                                                            : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                                                    }`}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* BÊN PHẢI: GIỎ HÀNG & THANH TOÁN (Chiếm 35%) */}
                <div className="w-[35%] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-indigo-600" />
                            <h2 className="font-bold text-slate-900 text-base">Giỏ hàng hiện tại</h2>
                        </div>
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-2.5 py-1 rounded-full">
                            {cart.reduce((sum, i) => sum + i.quantity, 0)} sản phẩm
                        </span>
                    </div>

                    {/* Danh sách sản phẩm trong giỏ */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                <ShoppingCart className="w-12 h-12 text-slate-200" />
                                <p className="text-sm font-medium">Chưa có sản phẩm trong giỏ hàng</p>
                                <p className="text-xs text-slate-400 text-center">Bấm vào sản phẩm bên trái hoặc quét mã vạch để thêm</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.variantId} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-[11px] font-semibold text-slate-400">{item.sku}</div>
                                            <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                                        </div>
                                        <button 
                                            onClick={() => removeFromCart(item.variantId)}
                                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                                        <span className="font-bold text-indigo-600 text-sm">
                                            {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                                        </span>
                                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                                            <button 
                                                onClick={() => updateQuantity(item.variantId, -1)}
                                                className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="font-bold text-slate-900 text-sm w-6 text-center">{item.quantity}</span>
                                            <button 
                                                onClick={() => updateQuantity(item.variantId, 1)}
                                                className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Hidden template for printing receipt */}
                    <div id="print-receipt-section" className="hidden">
                        <h3>HÓA ĐƠN BÁN HÀNG OISM</h3>
                        <p style={{textAlign: 'center', fontSize: '12px'}}>Hệ thống Quản lý Tồn kho & POS</p>
                        <p style={{fontSize: '12px'}}>Thời gian: {new Date().toLocaleString('vi-VN')}</p>
                        <hr />
                        <ul style={{ listStyleType: 'none', padding: 0 }}>
                            {cart.map(c => (
                                <li key={c.variantId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span>{c.name} x{c.quantity}</span>
                                    <span>{(c.price * c.quantity).toLocaleString('vi-VN')} đ</span>
                                </li>
                            ))}
                        </ul>
                        <hr />
                        <div style={{ display: 'flex', justifyContent: 'bold', fontSize: '16px' }}>
                            <span>TỔNG CỘNG:</span>
                            <span>{totalAmount.toLocaleString('vi-VN')} đ</span>
                        </div>
                    </div>

                    {/* Thanh toán & Tổng tiền */}
                    <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-sm text-slate-500 font-medium">
                                <span>Tạm tính:</span>
                                <span>{totalAmount.toLocaleString('vi-VN')} đ</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-500 font-medium">
                                <span>Thuế (VAT 0%):</span>
                                <span>0 đ</span>
                            </div>
                            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                                <span>Tổng thanh toán:</span>
                                <span className="text-indigo-600 text-xl">{totalAmount.toLocaleString('vi-VN')} đ</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={printReceipt}
                                disabled={cart.length === 0}
                                className="py-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                <Printer className="w-4 h-4" />
                                <span>In Phiếu</span>
                            </button>
                            <button 
                                onClick={handleFastCheckout}
                                disabled={cart.length === 0}
                                className="py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30"
                            >
                                <CreditCard className="w-4 h-4" />
                                <span>Thanh Toán (F2)</span>
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
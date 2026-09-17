import React, { useState, useEffect, useRef } from 'react';
import { useOrderSignalR } from '../hooks/useOrderSignalR';

interface Product {
    variantId: string;
    sku: string;
    name: string;
    price: number;
    availableStock: number;
}

interface CartItem extends Product {
    quantity: number;
}

export const PosScreen: React.FC = () => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    // FR-SIM-02: Lắng nghe SignalR
    const newOrderNotification = useOrderSignalR();

    // Hotkey Listener
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

    // Logic chặn bán quá tồn kho
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.variantId === product.variantId);
            const currentQty = existing ? existing.quantity : 0;
            
            if (currentQty + 1 > product.availableStock) {
                alert(`Sản phẩm ${product.name} chỉ còn ${product.availableStock} trong kho!`);
                return prev;
            }

            if (existing) {
                return prev.map(item => item.variantId === product.variantId 
                    ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    // Tích hợp in biên lai (Web Browser Print API)
    const printReceipt = () => {
        const printContent = document.getElementById('print-receipt-section');
        const windowPrint = window.open('', '', 'width=600,height=600');
        windowPrint?.document.write(`
            <html>
                <head><title>Biên lai OISM</title></head>
                <body>${printContent?.innerHTML}</body>
            </html>
        `);
        windowPrint?.document.close();
        windowPrint?.focus();
        windowPrint?.print();
        windowPrint?.close();
    };

    const handleFastCheckout = async () => {
        if (cart.length === 0) return alert("Giỏ hàng trống!");
        
        // Gọi API FastCheckout đã viết ở Backend
        try {
            // await axios.post('http://localhost:5223/api/pos/fast-checkout', { items: cart, branchId: ... })
            alert("Thanh toán thành công!");
            printReceipt();
            setCart([]); // Clear cart
        } catch (error) {
            alert("Lỗi thanh toán!");
        }
    };

    return (
        <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
            {/* THÔNG BÁO SIGNALR */}
            {newOrderNotification && (
                <div style={{ position: 'fixed', top: 10, right: 10, background: 'green', color: 'white', padding: '10px' }}>
                    {newOrderNotification.Message}
                </div>
            )}

            {/* KHU VỰC TÌM KIẾM & DANH SÁCH (Bên Trái) */}
            <div style={{ flex: 2 }}>
                <h2>Sản phẩm (Bấm F3 để tìm)</h2>
                <input 
                    ref={searchInputRef}
                    type="text" 
                    placeholder="Quét Barcode hoặc nhập SKU..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '10px', fontSize: '18px' }}
                />
                {/* Giả lập danh sách sản phẩm lấy từ API */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button onClick={() => addToCart({ variantId: "v1", sku: "SKU01", name: "Áo thun", price: 150000, availableStock: 5 })}>
                        Áo thun (Tồn: 5)
                    </button>
                    <button onClick={() => addToCart({ variantId: "v2", sku: "SKU02", name: "Quần Jean", price: 300000, availableStock: 0 })}>
                        Quần Jean (Tồn: 0)
                    </button>
                </div>
            </div>

            {/* KHU VỰC GIỎ HÀNG (Bên Phải) */}
            <div style={{ flex: 1, border: '1px solid #ccc', padding: '20px' }}>
                <h2>Giỏ hàng</h2>
                <div id="print-receipt-section">
                    <h3 style={{textAlign: 'center'}}>OISM SHOP</h3>
                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                        {cart.map(c => (
                            <li key={c.variantId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{c.name} x{c.quantity}</span>
                                <span>{c.price * c.quantity} ₫</span>
                            </li>
                        ))}
                    </ul>
                    <hr />
                    <h3>Tổng: {cart.reduce((sum, item) => sum + item.price * item.quantity, 0)} ₫</h3>
                </div>
                
                <button 
                    onClick={handleFastCheckout} 
                    style={{ width: '100%', padding: '15px', background: 'blue', color: 'white', fontSize: '16px', marginTop: '20px' }}>
                    Thanh toán (F2)
                </button>
            </div>
        </div>
    );
};
// src/App.tsx
import { useState, useEffect } from 'react';
import { PosScreen } from './components/PosScreen';
import { LoginScreen } from './components/LoginScreen';

function App() {
    // Kiểm tra xem trong máy đã có JWT Token chưa
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
    };

    if (!isAuthenticated) {
        return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
    }

    // Truyền prop handleLogout vào PosScreen nếu bạn muốn có nút Đăng xuất trên header
    return <PosScreen onLogout={handleLogout} />;
}

export default App;
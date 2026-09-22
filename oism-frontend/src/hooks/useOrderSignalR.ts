import { useEffect, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

export const useOrderSignalR = () => {
    const [incomingOrder, setIncomingOrder] = useState<any>(null);

    useEffect(() => {
        const connection = new HubConnectionBuilder()
            .withUrl("http://localhost:5223/order-hub") // Cổng API Backend .NET 8
            .configureLogging(LogLevel.Information)
            .withAutomaticReconnect()
            .build();

        connection.on("ReceiveNewOrder", (order) => {
            setIncomingOrder(order);
            // Push âm thanh
            const audio = new Audio('/sounds/cash-register.mp3'); // Đặt file mp3 vào thư mục public
            audio.play().catch(e => console.log("Audio play blocked by browser", e));
            // Cấp toast notification (react-toastify)
        });

        connection.start()
            .then(() => console.log("SignalR Connected!"))
            .catch(err => console.error("SignalR Connection Error: ", err));

        return () => {
            connection.stop();
        };
    }, []);

    return incomingOrder;
};
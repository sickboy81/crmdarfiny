import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAppStore } from '../stores/useAppStore';

export const useWhatsAppSocket = () => {
    const { setWaConnectionStatus } = useAppStore();

    useEffect(() => {
        const serverUrl = import.meta.env.VITE_WHATSAPP_SERVER_URL || 'http://localhost:3001';

        const socket = io(serverUrl, {
            transports: ['polling', 'websocket'],
            path: '/socket.io/'
        });

        socket.on('status', (status: any) => {
            console.log('📡 WhatsApp Global Status:', status);
            setWaConnectionStatus(status);
        });

        socket.on('connect_error', () => {
            setWaConnectionStatus('error');
        });

        return () => {
            socket.disconnect();
        };
    }, [setWaConnectionStatus]);
};

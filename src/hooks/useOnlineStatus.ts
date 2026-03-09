import { useState, useEffect, useCallback, useRef } from 'react';

export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const syncCallbacksRef = useRef<Array<() => void>>([]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Fire all pending sync callbacks
            syncCallbacksRef.current.forEach((cb) => cb());
            syncCallbacksRef.current = [];
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const onReconnect = useCallback((callback: () => void) => {
        if (navigator.onLine) {
            callback();
        } else {
            syncCallbacksRef.current.push(callback);
        }
    }, []);

    return { isOnline, onReconnect };
}

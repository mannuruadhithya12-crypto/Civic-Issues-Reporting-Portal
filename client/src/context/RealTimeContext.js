import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AuthContext } from './AuthContext';

const RealTimeContext = createContext();

export const RealTimeProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState(null);
    const listenersRef = useRef(new Map());
    const eventSourceRef = useRef(null);

    const subscribe = useCallback((eventType, callback) => {
        if (!listenersRef.current.has(eventType)) {
            listenersRef.current.set(eventType, new Set());
        }
        listenersRef.current.get(eventType).add(callback);

        return () => {
            if (listenersRef.current.has(eventType)) {
                listenersRef.current.get(eventType).delete(callback);
            }
        };
    }, []);

    const notifySubscribers = useCallback((eventData) => {
        setLastEvent(eventData);
        
        // Broadcast to specific event listeners
        if (eventData.eventType && listenersRef.current.has(eventData.eventType)) {
            listenersRef.current.get(eventData.eventType).forEach(cb => cb(eventData));
        }

        // Broadcast to wildcard listeners
        if (listenersRef.current.has('*')) {
            listenersRef.current.get('*').forEach(cb => cb(eventData));
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!user || !token) {
            setIsConnected(false);
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            return;
        }

        let isUnmounted = false;
        let retryTimeout = null;

        const connectSSE = () => {
            try {
                if (eventSourceRef.current) {
                    eventSourceRef.current.close();
                }

                const streamUrl = `/api/admin/operations/stream?token=${encodeURIComponent(token)}`;
                const es = new EventSource(streamUrl);
                eventSourceRef.current = es;

                es.onopen = () => {
                    if (!isUnmounted) setIsConnected(true);
                };

                es.onmessage = (e) => {
                    try {
                        const parsed = JSON.parse(e.data);
                        if (parsed.eventType === 'CONNECTED') {
                            setIsConnected(true);
                        } else {
                            notifySubscribers(parsed);
                        }
                    } catch (err) {
                        console.error('SSE Message parse error:', err);
                    }
                };

                es.onerror = (err) => {
                    if (!isUnmounted) {
                        setIsConnected(false);
                        es.close();
                        // Retry connection in 5 seconds
                        retryTimeout = setTimeout(connectSSE, 5000);
                    }
                };
            } catch (err) {
                console.error('Failed to establish SSE stream:', err);
                if (!isUnmounted) {
                    setIsConnected(false);
                    retryTimeout = setTimeout(connectSSE, 5000);
                }
            }
        };

        connectSSE();

        return () => {
            isUnmounted = true;
            if (retryTimeout) clearTimeout(retryTimeout);
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [user, notifySubscribers]);

    return (
        <RealTimeContext.Provider value={{ isConnected, lastEvent, subscribe }}>
            {children}
        </RealTimeContext.Provider>
    );
};

export const useRealTime = () => {
    const context = useContext(RealTimeContext);
    if (!context) {
        return { isConnected: false, lastEvent: null, subscribe: () => () => {} };
    }
    return context;
};

export default RealTimeContext;

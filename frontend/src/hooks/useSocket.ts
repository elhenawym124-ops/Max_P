import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { buildWsUrl } from '../utils/urlHelper';

export interface SocketEvents {
  // رسائل جديدة
  new_message: (message: any) => void;
  message_delivered: (data: { messageId: string; timestamp: Date }) => void;
  message_read: (data: { messageId: string; timestamp: Date }) => void;
  
  // حالة الكتابة
  user_typing: (data: { userId: string; userName: string; conversationId: string }) => void;
  user_stopped_typing: (data: { userId: string; conversationId: string }) => void;
  
  // حالة الاتصال
  user_online: (data: { userId: string; timestamp: Date }) => void;
  user_offline: (data: { userId: string; timestamp: Date }) => void;
  
  // تحديثات المحادثات
  conversation_updated: (conversation: any) => void;
  conversation_deleted: (conversationId: string) => void;
  
  // إشعارات
  notification: (notification: any) => void;
}

export interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  connectionError: string | null;
  emit: (event: string, data?: any) => void;
  on: <K extends keyof SocketEvents>(event: K, handler: SocketEvents[K]) => void;
  off: <K extends keyof SocketEvents>(event: K, handler?: SocketEvents[K]) => void;
  connect: () => void;
  disconnect: () => void;
}

const useSocket = (
  url: string = buildWsUrl(),
  options: any = {}
): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const defaultOptions = {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: maxReconnectAttempts,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: false,
    ...options
  };

  // إنشاء الاتصال
  const connect = useCallback(() => {
    if (socket?.connected) return;

    console.log('🔌 Connecting to Socket.IO server...');
    
    // Get fresh token for each connection attempt
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    
    const connectionOptions = {
      ...defaultOptions,
      auth: {
        token: token
      }
    };
    
    console.log('🔑 [SOCKET-AUTH] Using token for connection:', token ? 'Token present' : 'No token');
    
    const newSocket = io(url, connectionOptions);
    
    // معالجات الأحداث الأساسية
    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected successfully');
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionError(null);
      reconnectAttempts.current = 0;
      
      // إرسال معلومات المستخدم عند الاتصال مع دعم عزل الشركات
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          const userJoinData = {
            userId: user.id,
            userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'مستخدم',
            companyId: user.companyId
          };
          
          console.log('🔌 [SOCKET-JOIN] Sending user_join with company isolation:', userJoinData);
          newSocket.emit('user_join', userJoinData);
          
          // Add main listener for new messages
          newSocket.on('new_message', (data) => {
            console.log('📨 [NEW-MESSAGE] Received new message:', data);
            console.log('📨 [NEW-MESSAGE] Message conversation:', data.conversationId);
            console.log('📨 [NEW-MESSAGE] Message type:', data.type);
            console.log('📨 [NEW-MESSAGE] Is from customer:', data.isFromCustomer);
            // This will be handled by the conversation components
          });
          
        } catch (error) {
          console.error('❌ [SOCKET-JOIN] Error parsing user data:', error);
        }
      } else {
        console.warn('⚠️ [SOCKET-JOIN] No user data found for Socket.IO connection');
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // الخادم قطع الاتصال، إعادة الاتصال يدوياً
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔥 Socket.IO connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
      
      reconnectAttempts.current++;
      if (reconnectAttempts.current < maxReconnectAttempts) {
        setIsReconnecting(true);
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`🔄 Reconnection attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts}`);
          newSocket.connect();
        }, delay);
      } else {
        setIsReconnecting(false);
        setConnectionError('فشل في الاتصال بالخادم بعد عدة محاولات');
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket.IO reconnected after ${attemptNumber} attempts`);
      setIsReconnecting(false);
      reconnectAttempts.current = 0;
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Socket.IO reconnection attempt ${attemptNumber}`);
      setIsReconnecting(true);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('💥 Socket.IO failed to reconnect');
      setIsReconnecting(false);
      setConnectionError('فشل في إعادة الاتصال بالخادم');
    });

    setSocket(newSocket);
  }, [url, defaultOptions]);

  // قطع الاتصال
  const disconnect = useCallback(() => {
    if (socket) {
      console.log('🔌 Disconnecting from Socket.IO server...');
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setIsReconnecting(false);
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, [socket]);

  // إرسال حدث
  const emit = useCallback((event: string, data?: any) => {
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn('⚠️ Cannot emit event: Socket not connected');
    }
  }, [socket]);

  // الاستماع لحدث
  const on = useCallback(<K extends keyof SocketEvents>(
    event: K,
    handler: SocketEvents[K]
  ) => {
    if (socket) {
      socket.on(event as string, handler as any);
    }
  }, [socket]);

  // إلغاء الاستماع لحدث
  const off = useCallback(<K extends keyof SocketEvents>(
    event: K,
    handler?: SocketEvents[K]
  ) => {
    if (socket) {
      if (handler) {
        socket.off(event as string, handler as any);
      } else {
        socket.off(event as string);
      }
    }
  }, [socket]);

  // تنظيف عند إلغاء المكون
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []); // إزالة disconnect من dependencies لتجنب الحلقة اللانهائية

  // الاتصال التلقائي
  useEffect(() => {
    if (defaultOptions.autoConnect) {
      connect();
    }
  }, []); // إزالة connect من dependencies لتجنب الحلقة اللانهائية

  return {
    socket,
    isConnected,
    isReconnecting,
    connectionError,
    emit,
    on,
    off,
    connect,
    disconnect
  };
};

export default useSocket;

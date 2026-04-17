import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from './stores';

let stompClient: Client | null = null;
let subscriptions: Map<string, StompSubscription> = new Map();
let globalMessageHandler: ((msg: any) => void) | null = null;
let userNotificationHandler: ((msg: any) => void) | null = null;

export const connectWebSocket = (onConnect?: () => void) => {
  const { currentUser } = useAuthStore.getState();

  if (!currentUser) return;

  // Nếu đã kết nối rồi thì không kết nối lại
  if (stompClient && stompClient.connected) {
    onConnect?.();
    return;
  }

  stompClient = new Client({
    webSocketFactory: () => new SockJS((process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080') + '/ws'),
    connectHeaders: {
      Authorization: `Bearer ${currentUser.token}`,
    },
    debug: (str) => console.log(str),
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  });

  stompClient.onConnect = () => {
    console.log('✅ WebSocket connected');
    onConnect?.();
  };

  stompClient.activate();
};

// Set global handler cho TẤT CẢ tin nhắn đến
export const setGlobalMessageHandler = (handler: (msg: any) => void) => {
  globalMessageHandler = handler;
};

// Set handler for user notifications (new chats, etc.)
export const setUserNotificationHandler = (handler: (msg: any) => void) => {
  userNotificationHandler = handler;
};

// Subscribe to personal user topic for new chat notifications
export const subscribeToUserTopic = (username: string) => {
  if (!stompClient?.connected) return;
  const key = `user_${username}`;
  if (subscriptions.has(key)) return;

  const sub = stompClient.subscribe(
    `/topic/user/${username}`,
    (message: IMessage) => {
      const parsed = JSON.parse(message.body);
      if (userNotificationHandler) {
        userNotificationHandler(parsed);
      }
    }
  );
  subscriptions.set(key, sub);
};

// Subscribe tới 1 chat topic
export const subscribeToChat = (chatId: string) => {
  if (!stompClient?.connected) return;
  if (subscriptions.has(chatId)) return;

  const sub = stompClient.subscribe(
    `/topic/chat/${chatId}`,
    (message: IMessage) => {
      const parsed = JSON.parse(message.body);
      if (globalMessageHandler) {
        globalMessageHandler(parsed);
      }
    }
  );
  subscriptions.set(chatId, sub);
};

// Subscribe tới nhiều chat topics
export const subscribeToChats = (chatIds: string[]) => {
  chatIds.forEach((id) => subscribeToChat(id));
};

export const sendMessage = (chatId: string, content: string) => {
  if (stompClient && stompClient.connected) {
    const payload = {
      chatId,
      content,
      senderUsername: useAuthStore.getState().currentUser?.username,
    };
    stompClient.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify(payload),
    });
  }
};

export const disconnectWebSocket = () => {
  subscriptions.forEach((sub) => sub.unsubscribe());
  subscriptions.clear();
  globalMessageHandler = null;
  userNotificationHandler = null;
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }
};
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FaPaperPlane, FaStore, FaMapMarkerAlt } from 'react-icons/fa';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './CustomerPages.css';

const Chat = () => {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [messagesByRoom, setMessagesByRoom] = useState({});
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const currentRoomRef = useRef(null);
  const pendingMessageIdsRef = useRef(new Set());
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const formatMessageTime = (msg) => {
    if (msg?.time) return msg.time;
    if (msg?.createdAt) {
      return new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return '';
  };

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const loadChats = async () => {
      setLoading(true);
      setError('');
      try {
        const ordersRes = await axios.get('/api/orders', { params: { status: 'all', limit: 200 } });
        const orders = ordersRes.data.orders || [];
        const storeIds = [...new Set(orders.map((o) => o.storeId).filter(Boolean))];

        const stores = await Promise.all(
          storeIds.map(async (storeId) => {
            const res = await axios.get(`/api/stores/${storeId}`);
            return res.data.store;
          })
        );

        if (cancelled) return;
        const nextChats = (stores || []).filter(Boolean).map((store) => ({
          id: store._id,
          storeName: store.storeName,
          distance: null,
          avatarUrl: store.sellerId?.avatarUrl || '',
          roomId: `chat:store:${store._id}:customer:${user.id}`
        }));
        setChats(nextChats);
        if (!selectedChat && nextChats.length) {
          setSelectedChat(nextChats[0]);
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Could not load chats.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadChats();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const messages = useMemo(() => {
    if (!selectedChat?.roomId) return [];
    return messagesByRoom[selectedChat.roomId] || [];
  }, [messagesByRoom, selectedChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const socket = io(API_BASE_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('receive-message', (payload) => {
      if (!payload?.roomId || !payload?.message) return;
      if (payload.message.clientId && pendingMessageIdsRef.current.has(payload.message.clientId)) {
        pendingMessageIdsRef.current.delete(payload.message.clientId);
        return;
      }
      setMessagesByRoom((prev) => {
        const existing = prev[payload.roomId] || [];
        return {
          ...prev,
          [payload.roomId]: [...existing, payload.message]
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [API_BASE_URL]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socketRef.current) return;
    const nextRoom = selectedChat?.roomId;
    const currentRoom = currentRoomRef.current;

    if (currentRoom && currentRoom !== nextRoom) {
      socketRef.current.emit('leave-room', currentRoom);
    }

    if (nextRoom && currentRoom !== nextRoom) {
      socketRef.current.emit('join-room', nextRoom);
      currentRoomRef.current = nextRoom;
    }
  }, [selectedChat]);

  useEffect(() => {
    if (!selectedChat?.roomId) return;
    let cancelled = false;

    const loadMessages = async () => {
      try {
        const res = await axios.get('/api/messages', {
          params: { roomId: selectedChat.roomId, limit: 200 }
        });
        if (!cancelled) {
          setMessagesByRoom((prev) => ({
            ...prev,
            [selectedChat.roomId]: res.data.messages || []
          }));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.message || 'Could not load messages.');
        }
      }
    };

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [selectedChat?.roomId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedChat?.roomId) return;

    const trimmed = message.trim();

    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage = {
      id: clientId,
      clientId,
      text: trimmed,
      senderId: user?.id,
      senderName: user?.name,
      senderRole: user?.role,
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    pendingMessageIdsRef.current.add(clientId);

    setMessagesByRoom((prev) => {
      const existing = prev[selectedChat.roomId] || [];
      return {
        ...prev,
        [selectedChat.roomId]: [...existing, optimisticMessage]
      };
    });

    setMessage('');

    try {
      const res = await axios.post('/api/messages', {
        roomId: selectedChat.roomId,
        text: trimmed,
        clientId
      });

      const savedMessage = res.data?.message;
      if (!savedMessage) return;

      setMessagesByRoom((prev) => {
        const existing = prev[selectedChat.roomId] || [];
        const replaced = existing.map((msg) =>
          msg.clientId && msg.clientId === savedMessage.clientId ? savedMessage : msg
        );

        const hasSaved = replaced.some((msg) => msg.id === savedMessage.id);
        return {
          ...prev,
          [selectedChat.roomId]: hasSaved ? replaced : [...replaced, savedMessage]
        };
      });
    } catch (e) {
      pendingMessageIdsRef.current.delete(clientId);
      setError(e.response?.data?.message || 'Could not send message.');
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h2>Messages</h2>
          </div>
          <div className="chat-list">
            {loading && <div className="chat-item-message">Loading chats...</div>}
            {!loading && error && <div className="chat-item-message">{error}</div>}
            {!loading && !error && chats.length === 0 && (
              <div className="chat-item-message">No conversations yet.</div>
            )}
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                onClick={() => setSelectedChat(chat)}
              >
                <div className="chat-item-avatar">
                  {chat.avatarUrl ? (
                    <img src={chat.avatarUrl} alt={chat.storeName} />
                  ) : (
                    <FaStore />
                  )}
                </div>
                <div className="chat-item-info">
                  <div className="chat-item-header">
                    <h4>{chat.storeName}</h4>
                  </div>
                  <p className="chat-item-message">Store chat</p>
                  {chat.distance !== null ? (
                    <p className="chat-item-distance">
                      <FaMapMarkerAlt /> {chat.distance} km
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chat-main">
          {selectedChat ? (
            <>
              <div className="chat-header">
                <div className="chat-header-info">
                  <h3>{selectedChat.storeName}</h3>
                  <p>
                    <FaMapMarkerAlt /> {selectedChat.distance} km away
                  </p>
                </div>
                <button className="btn-secondary">View Store</button>
              </div>

              <div className="chat-messages">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.senderId === user?.id ? 'message-sent' : 'message-received'}`}
                  >
                    <div className="message-content">
                      <p>{msg.text}</p>
                      <span className="message-time">{formatMessageTime(msg)}</span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form className="chat-input" onSubmit={handleSend}>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button type="submit" className="send-btn">
                  <FaPaperPlane />
                </button>
              </form>
            </>
          ) : (
            <div className="chat-empty">
              <FaStore className="empty-icon" />
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;


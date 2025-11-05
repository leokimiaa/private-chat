import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { supabase } from './supabase'; 

const socket = io.connect("http://localhost:3001");

function App() {
  const [user, setUser] = useState(null); 
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [otherUserStatus, setOtherUserStatus] = useState(false); // <-- NEW STATE
  const messageListRef = useRef(null);

  // --- NEW: Define the other user ---
  const otherUser = user === 'Leo' ? 'Janice' : 'Leo';

  // --- Login Logic ---
  const handleLogin = (e) => {
    e.preventDefault();
    const formattedUser = password.charAt(0).toUpperCase() + password.slice(1).toLowerCase();
    if (formattedUser === 'Leo' || formattedUser === 'Janice') {
      setUser(formattedUser);
    } else {
      alert('Invalid user. Please enter "Leo" or "Janice".');
    }
  };

  // --- UPDATED useEffect ---
  useEffect(() => {
    if (!user) return; 

    // --- NEW: Tell the server we are online ---
    socket.emit('user_joined', { user: user });

    // 1. Fetch chat history
    async function fetchHistory() {
      // ... (no change to this function)
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching history:", error);
      } else {
        const formattedHistory = data.map(dbMsg => ({
          user: dbMsg.user_name,
          message: dbMsg.message_text,
          time: dbMsg.sent_at_time
        }));
        setMessages(formattedHistory);
      }
    }

    fetchHistory();

    // 2. Set up real-time message listener
    const receiveMessageHandler = (data) => {
      setMessages((list) => [...list, data]);
    };
    socket.on("receive_message", receiveMessageHandler);

    // --- NEW: 3. Set up online status listener ---
    const statusUpdateHandler = (onlineUserList) => {
      // Check if the *other* user's name is in the list
      setOtherUserStatus(onlineUserList.includes(otherUser));
    };
    socket.on("online_status_update", statusUpdateHandler);


    // Clean up all listeners
    return () => {
      socket.off("receive_message", receiveMessageHandler);
      socket.off("online_status_update", statusUpdateHandler); // <-- NEW
    };

  }, [user, otherUser]); // <-- UPDATED dependencies

  // --- Send Message (no change) ---
  const sendMessage = async (e) => {
    e.preventDefault();
    if (message.trim() === '') return;

    const messageData = {
      user: user,
      message: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    socket.emit("send_message", messageData); 
    setMessages((list) => [...list, messageData]); 
    setMessage('');
  };

  // --- Scroll to bottom (no change) ---
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);


  // --- Render UI ---

  // Login Screen UI (no change)
  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen bg-white text-black">
        <form
          className="flex flex-col justify-center items-center h-full p-5"
          onSubmit={handleLogin}
        >
          <h1 className="text-3xl font-bold mb-6">Private Chat</h1>
          <input
            type="password"
            placeholder="Enter your name"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-lg text-center p-2 border-2 border-black rounded-md w-full"
          />
          <button
            type="submit"
            className="mt-4 px-6 py-2 bg-black text-white text-lg font-semibold rounded-md hover:bg-gray-800 transition w-full"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  // --- UPDATED Chat Room UI ---
  return (
    <div className="flex justify-center items-center h-screen bg-white text-black">
      <div className="w-full max-w-md h-[90vh] max-h-[700px] border-2 border-black rounded-lg shadow-lg flex flex-col">
        {/* === HEADER UPDATED HERE === */}
        <div className="p-4 border-b-2 border-black">
          <h2 className="text-xl font-bold">{otherUser}</h2>
          {otherUserStatus ? (
            <p className="text-sm text-green-600">Online</p>
          ) : (
            <p className="text-sm text-gray-500">Offline</p>
          )}
        </div>
        {/* ============================ */}
    
        {/* Message List (no change) */}
        <div className="flex-grow p-4 overflow-y-auto space-y-4" ref={messageListRef}>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${msg.user === user ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[70%] py-2 px-4 rounded-lg ${
                  msg.user === user
                    ? 'bg-black text-white rounded-br-none'
                    : 'bg-gray-100 text-black rounded-bl-none'
                }`}
              >
                <div className="text-xs font-bold mb-1">
                  {msg.user === user ? 'You' : msg.user}
                </div>
                <p className="text-sm">{msg.message}</p>
                <div className="text-xs text-right opacity-70 mt-1">
                  {msg.time}
                </div>
              </div>
            </div>
          ))}
        </div>
    
        {/* Input Form (no change) */}
        <form className="p-2 border-t-2 border-black flex items-center gap-2" onSubmit={sendMessage}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow p-2 bg-transparent border-none focus:outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-black text-white font-semibold rounded-md disabled:bg-gray-400"
            disabled={message.trim() === ''}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
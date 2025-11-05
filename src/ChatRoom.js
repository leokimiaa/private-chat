// src/ChatRoom.js
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

// This will be our Supabase channel
let realtimeChannel;

function ChatRoom({ user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUserStatus, setOtherUserStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messageListRef = useRef(null);

  const otherUser = user === 'Leo' ? 'Janice' : 'Leo';
  const presenceChannelName = 'online-status';

  useEffect(() => {
    // --- 1. Fetch initial messages ---
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error) {
        setMessages(data);
      }
    };
    fetchMessages();

    // --- 2. Set up Realtime Subscription for new messages ---
    const messageSubscription = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prevMessages) => [...prevMessages, payload.new]);
        }
      )
      .subscribe();

    // --- 3. Set up Presence (Online Status) ---
    realtimeChannel = supabase.channel(presenceChannelName, {
      config: {
        presence: {
          key: user, // Use the user's name as their unique key
        },
      },
    });

    realtimeChannel.on('presence', { event: 'sync' }, () => {
      const state = realtimeChannel.presenceState();
      // Check if the other user's key exists in the presence state
      const otherUserIsOnline = Object.keys(state).includes(otherUser);
      setOtherUserStatus(otherUserIsOnline);
    });

    realtimeChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Tell everyone you are online
        await realtimeChannel.track();
      }
    });

    // --- 4. Cleanup ---
    return () => {
      supabase.removeChannel(messageSubscription);
      if (realtimeChannel) {
        realtimeChannel.untrack(); // Tell everyone you're offline
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [user, otherUser]);

  // --- Scroll to bottom ---
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  // --- Handle Sending Text ---
  const handleSend = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    await supabase
      .from('messages')
      .insert([
        { user_name: user, type: 'text', content: newMessage }
      ]);
    setNewMessage('');
  };

  // --- Handle File Upload ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    let fileType = 'file';
    if (file.type.startsWith('image/')) fileType = 'image';
    if (file.type.startsWith('video/')) fileType = 'video';
    if (file.type.startsWith('audio/')) fileType = 'audio';

    const filePath = `${user}/${file.name}_${Date.now()}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload Error:', uploadError);
      setUploading(false);
      return;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);

    // Save message to database
    await supabase.from('messages').insert([
      {
        user_name: user,
        type: fileType,
        content: urlData.publicUrl,
        file_name: file.name
      }
    ]);
    setUploading(false);
  };
  
  // --- Handle Logout ---
  const handleLogoutClick = async () => {
    if (realtimeChannel) {
      await realtimeChannel.untrack(); // Set self to offline
    }
    onLogout();
  };

  // --- Render Message Content ---
  const renderMessageContent = (msg) => {
    switch (msg.type) {
      case 'text':
        return <p>{msg.content}</p>;
      case 'image':
        return <img src={msg.content} alt={msg.file_name || 'Uploaded image'} className="rounded-md" />;
      case 'video':
        return <video src={msg.content} controls className="rounded-md" />;
      case 'audio':
        return <audio src={msg.content} controls />;
      default:
        return <a href={msg.content} target="_blank" rel="noopener noreferrer" className="underline">{msg.file_name || 'Download file'}</a>;
    }
  };

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b-2 border-black flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Chatting as {user}</h2>
          <div className="flex items-center gap-2 text-sm">
            {otherUser} is
            <span className={`w-3 h-3 rounded-full ${otherUserStatus ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            {otherUserStatus ? 'Online' : 'Offline'}
          </div>
        </div>
        <button
          onClick={handleLogoutClick}
          className="px-3 py-1 text-xs border border-black rounded hover:bg-gray-100"
        >
          Logout
        </button>
      </div>

      {/* Message List */}
      <div className="flex-grow p-4 overflow-y-auto space-y-3" ref={messageListRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.user_name === user ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                msg.user_name === user
                  ? 'bg-black text-white rounded-br-none'
                  : 'bg-gray-100 text-black rounded-bl-none'
              }`}
            >
              <div className="text-xs font-bold mb-1">
                {msg.user_name === user ? 'You' : msg.user_name}
              </div>
              <div className="text-sm">
                {renderMessageContent(msg)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Form */}
      <form className="p-2 border-t-2 border-black flex items-center gap-2" onSubmit={handleSend}>
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <label
          htmlFor="file-upload"
          className={`text-2xl cursor-pointer p-2 ${uploading ? 'text-gray-400' : 'hover:bg-gray-100 rounded-full'}`}
        >
          📎
        </label>
        
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={uploading ? "Uploading..." : "Type a message..."}
          className="flex-grow p-2 bg-transparent border-none focus:outline-none"
          disabled={uploading}
        />
        <button
          type="submit"
          className="px-5 py-2 bg-black text-white font-semibold rounded-md disabled:bg-gray-400"
          disabled={uploading || newMessage.trim() === ''}
        >
          Send
        </button>
      </form>
    </>
  );
}

export default ChatRoom;
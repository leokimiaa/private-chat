// src/LoginScreen.js
import React, { useState } from 'react';

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password) {
      onLogin(password);
    }
  };

  return (
    <form
      className="flex flex-col justify-center items-center h-full p-5"
      onSubmit={handleSubmit}
    >
      <h1 className="text-3xl font-bold mb-6">Private Chat</h1>
      <input
        type="password"
        placeholder="Enter your name"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="text-lg text-center p-2 border-2 border-black rounded-md w-3/4"
      />
      <button
        type="submit"
        className="mt-4 px-6 py-2 bg-black text-white text-lg font-semibold rounded-md hover:bg-gray-800 transition"
      >
        Enter
      </button>
    </form>
  );
}

export default LoginScreen;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Login({ darkMode, setDarkMode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { signup, login } = useAuth();
  const navigate = useNavigate();

  async function handleSignup() {
    try {
      await signup(username, password);
      toast.success('Signup successful!');
      navigate('/rooms');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Signup error');
    }
  }

  async function handleLogin() {
    try {
      await login(username, password);
      toast.success('Login successful!');
      navigate('/rooms');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login error');
    }
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen flex items-center justify-center px-4 
                      bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded shadow-xl p-6">
          <div className="text-center mb-3">
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className={`
                px-4 py-2 rounded font-semibold
                bg-gray-300 dark:bg-gray-700
                text-gray-800 dark:text-gray-200
                hover:bg-gray-400 dark:hover:bg-gray-600
                transition
              `}
            >
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
          <h1 className="text-3xl font-bold mb-6 text-blue-600 dark:text-blue-400 text-center">
            EDA Chat
          </h1>
          <div className="mb-4">
            <label className="block mb-1 font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border rounded px-3 py-2 
                        focus:outline-none focus:ring-2 focus:ring-blue-300 
                        dark:focus:ring-blue-600 dark:bg-gray-700 
                        dark:border-gray-600 dark:text-gray-100"
              placeholder="Enter username"
            />
          </div>
          <div className="mb-6">
            <label className="block mb-1 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 
                        focus:outline-none focus:ring-2 focus:ring-blue-300 
                        dark:focus:ring-blue-600 dark:bg-gray-700 
                        dark:border-gray-600 dark:text-gray-100"
              placeholder="Enter password"
            />
          </div>
          <div className="flex justify-around mt-4">
            <button
              onClick={handleLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold 
                        px-4 py-2 rounded transition"
            >
              Log In
            </button>
            <button
              onClick={handleSignup}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold 
                        px-4 py-2 rounded transition"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}







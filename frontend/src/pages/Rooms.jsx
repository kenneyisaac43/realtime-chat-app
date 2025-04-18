import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';

export default function Rooms({ darkMode, setDarkMode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [rooms, setRooms] = useState([]);
  const [newRoom, setNewRoom] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Grab current user's username from localStorage
  const stored = localStorage.getItem('user');
  const currentUser = stored ? JSON.parse(stored).username : 'Unknown';

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    api
      .get('/rooms')
      .then((res) => setRooms(res.data.rooms))
      .catch((err) => 
        toast.error(err.response?.data?.error || 'Room fetch error')
      );
  }, [user, navigate]);

  async function createRoom() {
    if (!newRoom) return;
    try {
      const { data } = await api.post('/rooms', { name: newRoom });
      toast.success(`Room "${data.room.name}" created!`);
      navigate(`/rooms/${data.room.name}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error creating room');
    }
  }

  // Filter rooms based on search 
  const filteredRooms = rooms.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 
                      text-gray-800 dark:text-gray-200 transition-colors">
        <header className="flex items-center justify-between p-3 
                          bg-gray-200 dark:bg-gray-800 shadow">
          <div>
            <h2 className="font-bold text-xl text-blue-600 dark:text-blue-400">
              Rooms
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
                You are: <span className="font-medium">{currentUser}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(prev => !prev)}
              className="px-4 py-2 rounded font-semibold bg-gray-300 dark:bg-gray-700
                         text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-600
                         transition"
            >
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Log Out
            </button>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-xl bg-white dark:bg-gray-800 
                          rounded shadow-xl p-6 animate-slide-down flex flex-col">
            <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">
              Create or Join Rooms
            </h3>
            <div className="flex gap-2 mb-6">
              <input
                className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="New room name"
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
              />
              <button
                onClick={createRoom}
                className="bg-blue-600 text-white font-semibold px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                Create
              </button>
            </div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-teal-600 dark:text-teal-400">
                Available Rooms
              </h4>
              <input
                type="text"
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-1/2 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
            <div className="overflow-y-auto max-h-64">
              <ul className="space-y-2">
                {filteredRooms.map((r) => (
                  <li
                    key={r._id}
                    onClick={() => navigate(`/rooms/${r.name}`)}
                    className="p-3 border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    {r.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}












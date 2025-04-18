import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';

export default function Admin({ darkMode, setDarkMode }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (!user || user.username !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  async function fetchLogs() {
    try {
      const { data } = await api.get('/admin/logs');
      setLogs(data.logs);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Log fetch error');
    }
  }

  async function fetchMetrics() {
    try {
      const { data } = await api.get('/admin/metrics');
      setMetrics(data.metrics);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Metrics fetch error');
    }
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 
                      text-gray-800 dark:text-gray-200 transition-colors">

        <header className="flex items-center justify-between p-3 bg-gray-200 dark:bg-gray-800 shadow">
          <div className="flex items-center gap-3">
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
            <h2 className="font-bold text-lg text-blue-600 dark:text-blue-400">
              Admin
            </h2>
          </div>
          <button
            onClick={() => navigate('/rooms')}
            className="bg-blue-600 text-white px-4 py-2 rounded 
                       hover:bg-blue-700 transition"
          >
            Back
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 
                          shadow-xl rounded p-6">
            <div className="flex gap-4 mb-6">
              <button
                onClick={fetchLogs}
                className="bg-blue-500 text-white px-4 py-2 rounded 
                           hover:bg-blue-600 transition"
              >
                Fetch Logs
              </button>
              <button
                onClick={fetchMetrics}
                className="bg-teal-500 text-white px-4 py-2 rounded 
                           hover:bg-teal-600 transition"
              >
                Fetch Metrics
              </button>
            </div>

            <h4 className="text-lg font-bold text-teal-600 dark:text-teal-400 mb-2">
              Recent Logs
            </h4>
            <textarea
              className="w-full h-40 border rounded p-2 text-sm mb-6 
                         focus:outline-none focus:ring-2 
                         focus:ring-blue-300 dark:focus:ring-blue-600
                         dark:bg-gray-700 dark:border-gray-600 
                         dark:text-gray-100"
              readOnly
              value={logs.join('\n')}
            />

            <h4 className="text-lg font-bold text-teal-600 dark:text-teal-400 mb-2">
              System Metrics
            </h4>
            {metrics ? (
              <pre className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm">
                {JSON.stringify(metrics, null, 2)}
              </pre>
            ) : (
              <p className="italic text-gray-500 dark:text-gray-400">
                No metrics yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}







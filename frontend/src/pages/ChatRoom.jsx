import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import api from '../api';
import toast from 'react-hot-toast';

// Pastel classes for other users' messages 
const pastelBubbleClasses = [
  'bg-purple-200 text-gray-900',
  'bg-pink-200 text-gray-900',
  'bg-green-200 text-gray-900',
  'bg-yellow-200 text-gray-900',
  'bg-orange-200 text-gray-900',
  'bg-indigo-200 text-gray-900',
];

// Hash username => index in pastelBubbleClasses 
function getUserColorIndex(username) {
  let sum = 0;
  for (let i = 0; i < username.length; i++) {
    sum += username.charCodeAt(i);
  }
  return sum % pastelBubbleClasses.length;
}

/** 
 * Return bubble classes:
 * - If it's my message, use a blue-teal gradient.
 * - Otherwise, pick a pastel color based on the sender.
 */
function getBubbleClasses(sender, isMine) {
  if (isMine) {
    return 'bg-gradient-to-r from-blue-500 to-teal-500 text-white';
  } else {
    const idx = getUserColorIndex(sender);
    return pastelBubbleClasses[idx];
  }
}

// Return an hour-based key (e.g., "2023-04-07-11") to group messages.
function getHourKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  const h = String(dateObj.getHours()).padStart(2, '0');
  return `${y}-${m}-${d}-${h}`;
}

// Format a Date object as "Fri, Apr 4 at 11:24 AM"
function formatHourDivider(dateObj) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const day = days[dateObj.getDay()];
  const month = months[dateObj.getMonth()];
  const date = dateObj.getDate();

  let hours = dateObj.getHours();
  let ampm = 'AM';
  if (hours === 0) {
    hours = 12;
  } else if (hours === 12) {
    ampm = 'PM';
  } else if (hours > 12) {
    hours -= 12;
    ampm = 'PM';
  }
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${day}, ${month} ${date} at ${hours}:${minutes} ${ampm}`;
}

export default function ChatRoom({ darkMode, setDarkMode }) {
  const { name } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();

  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null); // For auto-scroll

  // Get current user's name from localStorage
  const stored = localStorage.getItem('user');
  const currentUser = stored ? JSON.parse(stored).username : 'Unknown';

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Set up socket listeners and join/leave the room
  useEffect(() => {
    if (!socket) return;
    const handleChat = (msg) => setMessages((prev) => [...prev, msg]);
    const handleUserList = (users) => setOnlineUsers(users);
    const handleUserJoined = (data) =>
      setMessages((prev) => [...prev, { system: true, text: `${data.user} joined` }]);
    const handleUserLeft = (data) =>
      setMessages((prev) => [...prev, { system: true, text: `${data.user} left` }]);
    const handleError = (errData) => toast.error(errData.error);

    socket.on('chat message', handleChat);
    socket.on('user list', handleUserList);
    socket.on('user joined', handleUserJoined);
    socket.on('user left', handleUserLeft);
    socket.on('error', handleError);

    socket.emit('join room', { room: name, username: currentUser });

    return () => {
      socket.emit('leave room', { room: name, username: currentUser });
      socket.off('chat message', handleChat);
      socket.off('user list', handleUserList);
      socket.off('user joined', handleUserJoined);
      socket.off('user left', handleUserLeft);
      socket.off('error', handleError);
    };
  }, [socket, name, currentUser]);

  // Load history only when "Load History" is clicked
  function loadHistory() {
    api
      .get(`/messages?room=${encodeURIComponent(name)}`)
      .then((res) => {
        const hist = [...res.data.messages].reverse();
        // Filter out duplicates: check by _id if available, or (timestamp, sender, text)
        setMessages((prev) => {
          const filteredHist = hist.filter((h) => 
            !prev.some(m => (m._id && m._id === h._id) ||
              (m.timestamp === h.timestamp && m.sender === h.sender && m.text === h.text))
          );
          return [...filteredHist, ...prev];
        });
        setHistoryLoaded(true);
      })
      .catch((err) => toast.error(err.response?.data?.error || 'History error'));
  }

  // Send message handler
  function sendMessage(e) {
    e.preventDefault();
    const text = inputRef.current?.value.trim();
    if (!text) return;
    socket.emit('chat message', {
      room: name,
      message: text,
      sender: currentUser,
    });
    inputRef.current.value = '';
  }

  // Variables for grouping messages
  let prevHourKey = '';
  let prevSender = null;

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors">
        {/* Header */}
        <header className="flex items-center justify-between p-3 bg-gray-200 dark:bg-gray-800 shadow">
          <div>
            <h2 className="font-bold text-lg text-blue-600 dark:text-blue-400">
              Room: {name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              You are: <span className="font-medium">{currentUser}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className="px-4 py-2 rounded font-semibold bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-600 transition"
            >
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button
              onClick={() => navigate('/rooms')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Leave
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-56 bg-white dark:bg-gray-700 p-3 border-r border-gray-300 dark:border-gray-600 overflow-y-auto rounded">
            <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">
              Online Users
            </h3>
            <ul className="space-y-1">
              {onlineUsers.map((u) => (
                <li key={u} className="p-1 border rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                  {u}
                </li>
              ))}
            </ul>
          </aside>

          {/* Main chat area */}
          <section className="flex-1 flex flex-col">
            {/* Scrollable container for messages */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-gray-200 dark:bg-gray-800">
              <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-3 shadow">
                {messages.map((m, i) => {
                  // System message (joined/left)
                  if (m.system) {
                    return (
                      <div key={i} className="text-center text-sm text-gray-500 dark:text-gray-400 my-2">
                        *** {m.text} ***
                      </div>
                    );
                  }

                  const msgDate = new Date(m.timestamp);
                  const hourKey = getHourKey(msgDate);

                  let showHourDivider = false;
                  if (hourKey !== prevHourKey) {
                    showHourDivider = true;
                    prevHourKey = hourKey;
                    // Reset grouping when a new hour divider is shown
                    prevSender = null;
                  }

                  let isSameBlockAsPrev = false;
                  if (prevSender === m.sender) {
                    isSameBlockAsPrev = true;
                  }
                  prevSender = m.sender;

                  const isMine = m.sender === currentUser;
                  const bubbleClasses = getBubbleClasses(m.sender, isMine);

                  // If same block, no extra top margin; else, small margin.
                  const marginTop = isSameBlockAsPrev ? 'mt-1' : 'mt-2';

                  return (
                    <React.Fragment key={i}>
                      {showHourDivider && (
                        <div className="my-4 text-xs text-gray-500 dark:text-gray-300 text-center">
                          {formatHourDivider(msgDate)}
                        </div>
                      )}
                      <div className={`${marginTop} flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div>
                          {(!isMine && !isSameBlockAsPrev) && (
                            <div className="text-xs text-gray-600 dark:text-gray-300 mb-1 font-medium">
                              {m.sender}
                            </div>
                          )}
                          <div className={`max-w-sm px-3 py-2 rounded-xl transform transition hover:scale-105 hover:shadow-md ${bubbleClasses}`}>
                            <div className="text-sm">{m.text}</div>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* "Load History" button shown if history is not loaded */}
            {!historyLoaded && (
              <div className="p-3 bg-gray-200 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600 text-center">
                <button
                  onClick={loadHistory}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-600 transition"
                >
                  Load History
                </button>
              </div>
            )}

            {/* Bottom form */}
            <form onSubmit={sendMessage} className="flex gap-2 p-3 bg-gray-200 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600">
              <input
                ref={inputRef}
                className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="Type your message..."
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
                Send
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}



























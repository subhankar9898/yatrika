import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { FiX, FiSend, FiMessageSquare, FiCheck, FiEdit2 } from 'react-icons/fi'
import { BsCheckAll } from 'react-icons/bs'
import useAuthStore from '../../store/authStore'
import { chatApi } from '../../api/index'
import toast from 'react-hot-toast'

export default function ChatModal({ booking, onClose }) {
  const { user, accessToken } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const ws = useRef(null)
  const messagesEndRef = useRef(null)

  // Timer to force re-renders for the 20s edit rule
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch history and connect WebSocket
  useEffect(() => {
    let isMounted = true

    // 1. Fetch History
    chatApi.getHistory(booking.id).then(res => {
      if (isMounted) {
        setMessages(res.data)
        setLoading(false)
      }
    }).catch(err => {
      if (isMounted) {
        toast.error("Failed to load chat history")
        setLoading(false)
      }
    })

    // 2. Connect WebSocket
    // Derive WS URL from the current window location or a fixed base
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/^http(s?):\/\//, `${protocol}//`)
      : `${protocol}//localhost:8000/api/v1`

    const wsUrl = `${host}/ws/chat/${booking.id}?token=${accessToken}`

    ws.current = new WebSocket(wsUrl)

    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({ type: 'mark_seen' }))
    }

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'new_message') {
        setMessages(prev => [...prev, data])
        if (data.sender_id !== user.id) {
          ws.current.send(JSON.stringify({ type: 'mark_seen' }))
        }
      } else if (data.type === 'messages_seen') {
        setMessages(prev => prev.map(m => m.sender_id === user.id ? { ...m, seen: true } : m))
      } else if (data.type === 'message_edited') {
        setMessages(prev => prev.map(m => m.message_id === data.message_id ? { ...m, text: data.text } : m))
      } else if (data.type === 'error') {
        toast.error(data.message)
      }
    }

    ws.current.onerror = (error) => {
      console.error('WebSocket Error:', error)
    }

    return () => {
      isMounted = false
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [booking.id, accessToken])

  const sendMessage = (e) => {
    e.preventDefault()
    if (!inputText.trim() || !ws.current) return

    if (editingMessageId) {
      ws.current.send(JSON.stringify({ type: 'edit_message', message_id: editingMessageId, text: inputText.trim() }))
      setEditingMessageId(null)
    } else {
      ws.current.send(JSON.stringify({ type: 'new_message', text: inputText.trim() }))
    }
    setInputText('')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
        className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden border border-white/50"
      >

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FiMessageSquare className="text-emerald-500" />
              Chat: {booking.place_name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {user.role === 'guide' ? `Tourist: ${booking.user_name || 'Tourist'}` : `Guide: ${booking.guide_name}`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full border border-gray-100 shadow-sm transition-colors">
            <FiX size={18} />
          </button>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <FiMessageSquare size={40} className="mb-2 opacity-50" />
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = msg.sender_id === user.id
              const msgTime = new Date(msg.timestamp).getTime()
              const ageSeconds = (currentTime - msgTime) / 1000
              const canEdit = isMine && (!msg.seen || ageSeconds <= 20)

              return (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, x: isMine ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group`}
                >
                  {!isMine && (
                    <span className="text-[10px] text-gray-400 ml-1 mb-1">{msg.sender_name}</span>
                  )}
                  <div className={`flex items-center gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div
                      className={`max-w-[250px] sm:max-w-[320px] px-4 py-2 rounded-2xl text-sm shadow-sm break-words ${isMine
                        ? 'bg-emerald-500 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                        }`}
                    >
                      {msg.text}
                    </div>
                    {isMine && canEdit && (
                      <button
                        onClick={() => { setEditingMessageId(msg.message_id); setInputText(msg.text); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-all"
                        title="Edit message"
                      >
                        <FiEdit2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-gray-400 opacity-70">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMine && (
                      msg.seen ? <BsCheckAll size={16} className="text-blue-500" /> : <FiCheck size={14} className="text-gray-400" />
                    )}
                  </div>
                </motion.div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-2 items-center">
          {editingMessageId && (
            <button
              type="button"
              onClick={() => { setEditingMessageId(null); setInputText(''); }}
              className="p-2 text-red-400 hover:text-red-500 bg-red-50 rounded-xl transition-colors"
              title="Cancel Edit"
            >
              <FiX size={18} />
            </button>
          )}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={editingMessageId ? "Edit your message..." : "Type a message..."}
            className="flex-1 input bg-gray-50 border-transparent focus:bg-white transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="btn-primary w-12 h-12 !p-0 flex items-center justify-center rounded-xl disabled:opacity-50"
          >
            <FiSend size={18} className="ml-1" />
          </button>
        </form>

      </motion.div>
    </div>
  )
}

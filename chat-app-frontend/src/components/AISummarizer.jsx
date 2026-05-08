import React, { useState, useRef, useEffect } from "react";
import { MdClose, MdSend, MdRemove } from "react-icons/md";
import toast from "react-hot-toast";

const AISummarizer = ({ isOpen, onClose, chatText }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const inputFieldRef = useRef(null);
  const [initialSummaryLoaded, setInitialSummaryLoaded] = useState(false);
  
  // Drag functionality
  const [position, setPosition] = useState({ x: 24, y: 96 }); // Default position (right-6, bottom-24)
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial summary when component opens
  useEffect(() => {
    if (isOpen && chatText && !initialSummaryLoaded && messages.length === 0) {
      loadInitialSummary();
      setInitialSummaryLoaded(true);
    }
  }, [isOpen, chatText]);

  // Reset when component closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInitialSummaryLoaded(false);
    }
  }, [isOpen]);

  // Drag functionality
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep widget within viewport bounds
      const maxX = window.innerWidth - 320; // widget width
      const maxY = window.innerHeight - 384; // widget height
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // Prevent text selection during drag
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const loadInitialSummary = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("https://mychat-2-vb16.onrender.com/api/summarize-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatText }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages([
          {
            type: "ai",
            content: `**Chat Summary:**\n\n${data.summary}`,
            timestamp: new Date(),
          },
        ]);
      } else {
        toast.error("Failed to load summary");
      }
    } catch (error) {
      console.error("Error loading summary:", error);
      toast.error("Error connecting to AI service");
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage = {
      type: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("https://mychat-2-vb16.onrender.com/api/chat-with-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          chatContext: chatText,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content: data.response,
            timestamp: new Date(),
          },
        ]);
      } else {
        toast.error("Failed to get AI response");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error communicating with AI service");
    } finally {
      setIsLoading(false);
      // Focus input field after message is sent
      setTimeout(() => {
        inputFieldRef.current?.focus();
      }, 100);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed w-80 h-96 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-white/20 flex flex-col z-40 overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Header */}
      <div 
        className="bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 flex items-center justify-between flex-shrink-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="text-white font-semibold text-sm">Chat Summarizer AI</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:bg-white/20 p-1 rounded transition"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            <MdRemove size={16} />
          </button>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-1 rounded transition"
            title="Close"
          >
            <MdClose size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center text-gray-400">
                <p className="text-xs">
                  Loading summary... Ask anything about the chat!
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.type === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`rounded-lg px-3 py-2 max-w-xs text-sm break-words ${
                      message.type === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-white/10 px-3 py-2 flex-shrink-0 bg-slate-800">
            <div className="flex gap-2 items-center">
              <input
                ref={inputFieldRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isLoading) {
                    sendMessage();
                  }
                }}
                placeholder="Ask about the chat..."
                className="flex-1 bg-slate-700 text-white text-xs px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-gray-400"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 text-white p-1 rounded-lg transition"
              >
                <MdSend size={18} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Minimized State */}
      {isMinimized && (
        <div
          className="flex-1 flex items-center justify-center cursor-pointer hover:bg-white/5 transition"
          onClick={() => setIsMinimized(false)}
        >
          <p className="text-gray-400 text-xs">Click to expand</p>
        </div>
      )}
    </div>
  );
};

export default AISummarizer;

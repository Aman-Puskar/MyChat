import React, { use, useEffect, useRef, useState } from "react";
import { MdAttachFile, MdSend } from "react-icons/md";
import useChatContext from "../context/ChatContext";
import { useNavigate } from "react-router";
import { baseURL } from "../configRoutes/axiosHelper";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";
import toast from "react-hot-toast";
import { getRoomMessages } from "../services/RoomService";
// import { getTimeAgo } from "../configRoutes/timeAgoConfig";
import CryptoJS from "crypto-js";
import { Client } from "@stomp/stompjs";
import EmojiPicker from "emoji-picker-react";
import { httpClient } from "../configRoutes/axiosHelper";
import { getCurrentTimeAMPM } from "../configRoutes/timeAgoConfig";
import AISummarizer from "./AISummarizer";
import "./ChatPage.css";

const ChatPage = () => {
  //show online status
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  // const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggingOut = useRef(false);

  //typing indication
  const [isTyping, setIsTyping] = useState(false); // you are typing
  const [typingUser, setTypingUser] = useState(null); // who else is typing
  const typingTimeoutRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef();
  const fileInputRef = useRef('');
const [file, setFile] = useState(null);
const [receivedFile, setReceivedFile] = useState(null);
const [showAiHint, setShowAiHint] = useState(false);
const [showCopyOption, setShowCopyOption] = useState(false);
const [showAISummarizer, setShowAISummarizer] = useState(false);
const [showMentions, setShowMentions] = useState(false);
const [mentionSuggestions, setMentionSuggestions] = useState([]);
const [mentionQuery, setMentionQuery] = useState('');
const mentionsRef = useRef(null);


  const navigate = useNavigate();
  const {
    roomId,
    actualRoom,
    currentUser,
    connected,
    setRoomId,
    setCurrentUser,
    setConnected,
  } = useChatContext();
  // console.log(currentUser);

  //use effect -> whenever something is changes it will redirect to the home page that is form page
 useEffect(() => {
  if (!connected || !currentUser || !roomId) {
    navigate("/", { replace: true });
  }
}, []);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatBoxRef = useRef(null);
  const [stompClient, setStompClient] = useState(null);
  const onlineList = useRef(null);

  //scroll the online list
    useEffect(() => {
    if (onlineList.current) {
      onlineList.current.scrollTo({
        top: onlineList.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [onlineUsers]);

  useEffect(() => {
    const showHintTimer = window.setTimeout(() => {
      setShowAiHint(true);
    }, 10000);

    const hideHintTimer = window.setTimeout(() => {
      setShowAiHint(false);
    }, 18000);

    return () => {
      window.clearTimeout(showHintTimer);
      window.clearTimeout(hideHintTimer);
    };
  }, []);

  //scrol the main message container
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTo({
        top: chatBoxRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  //getting messages from room
  useEffect(() => {
    async function loadRoomMessages() {
      try {
        const message = await getRoomMessages(roomId);
        console.log(message);
        const decryptedMessages = message.map((msg) => ({
          ...msg,
          content: decryptMessage(msg.content),
          sender: decryptMessage(msg.sender),
        }));
        setMessages(decryptedMessages);
      } catch (error) {}
    }
    if (connected) {
      loadRoomMessages();
    }
  }, []);

  //encryption
  const SECRET_KEY = "secretKey_" + roomId;
  function encryptMessage(message) {
    return CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
  }

  //decription
  function decryptMessage(encryptedText) {
    const bytes = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  //stomp client initialization and subscription
  useEffect(() => {
    if (!connected) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${baseURL}/chat`),
      reconnectDelay: 5000,
      debug: (str) => console.log("[STOMP]", str),
      onConnect: () => {
        setStompClient({
          send: (destination, headers, body) => {
            client.publish({ destination, headers, body });
          },
        });
        toast.success("You’re good to go!");

        // Subscribe to room messages
        client.subscribe(`/topic/room/${roomId}`, (message) => {
          const newMessage = JSON.parse(message.body);
          newMessage.content = decryptMessage(newMessage.content);
          newMessage.sender = decryptMessage(newMessage.sender);
          setMessages((prev) => [...prev, newMessage]);
        });

        // Typing indicator
        client.subscribe(`/topic/typing/${roomId}`, (message) => {
          const { sender } = JSON.parse(message.body);
          if (sender !== currentUser) {
            setTypingUser(sender);
          }
        });

        client.subscribe(`/topic/stopTyping/${roomId}`, (message) => {
          const { sender } = JSON.parse(message.body);
          if (sender !== currentUser) {
            setTypingUser(null);
          }
        });

        //isonline status
        client.subscribe(`/topic/isOnline/${roomId}`, (message) => {
          const { sender, type } = JSON.parse(message.body);
          if (sender !== currentUser) {
            setOnlineUsers((prev) => new Set([...prev, sender]));
            if (type === "request") {
              toast.success(`${sender} joined the room`);
            }

            // Only reply back if this was a fresh request
            if (type === "request") {
              client.publish({
                destination: `/app/isOnline/${roomId}`,
                body: JSON.stringify({ sender: currentUser, type: "ack" }),
              });
            }
          }
        });

        //user offline
        client.subscribe(`/topic/isOffline/${roomId}`, (message) => {
          const { sender } = JSON.parse(message.body);
          if (sender !== currentUser) {
            setOnlineUsers((prev) => {
              const updated = new Set(prev);
              updated.delete(sender);
              return updated;
            });
            toast.error(`${sender} left the room`);
          }
        });

        //handling comming files
        client.subscribe(`/topic/sendFile/${roomId}`, (message) => {
      const { sender, fileName,fileUrl, fileType, fileData } = JSON.parse(message.body);
        const fileMessage = {
                sender,
                content: "", 
                fileUrl,
                fileName,
                fileType,
                timeStamp: Date.now(),
                isFile: true,
              };

              setMessages((prev) => [...prev, fileMessage]);
                    })



        setTimeout(() => {
          client.publish({
            destination: `/app/isOnline/${roomId}`,
            body: JSON.stringify({ sender: currentUser, type: "request" }),
          });
        }, 800);
      },
      onStompError: (frame) => {
        console.error("STOMP Error:", frame.headers["message"]);
        console.error("Details:", frame.body);
        toast.error("STOMP connection error");
      },
      onWebSocketError: (event) => {
        console.error("WebSocket Error:", event);
        toast.error("WebSocket connection failed");
      },
    });
    client.activate(); // Start the connection

    return () => {
      // Cleanup on unmount or roomId change
      if (client.connected) {
        client.deactivate();
      }
    };
  }, [roomId, connected]);



  //handling input messages
  const sendMessage = async () => {
    if (stompClient && connected && input.trim().length > 0) {
      // Process mentions - convert @username to **@username** for bold display
      let processedMessage = input;
      [...onlineUsers].forEach((user) => {
        const mentionPattern = new RegExp(`@${user}\\b`, 'gi');
        processedMessage = processedMessage.replace(mentionPattern, `**@${user}**`);
      });
    
    const encryptedContent = encryptMessage(processedMessage);
    const encryptedSender = encryptMessage(currentUser);
    const message = {
      content: encryptedContent,
      sender: encryptedSender,
      roomId: roomId,
      timeNow : getCurrentTimeAMPM(),
    }
    stompClient.send(`/app/sendMessage/${roomId}`, {}, JSON.stringify(message));
    setInput("");
  } 

if (file != null) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await httpClient.post("/api/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const fileUrl = response.data.fileUrl;

    const filePayload = {
      fileName: file.name,
      fileType: file.type,
      sender: currentUser,
      fileUrl: fileUrl,
      roomId: roomId,
    };

    stompClient.send(`/app/sendFile/${roomId}`, {}, JSON.stringify(filePayload));
    setFile(null);
  } catch (error) {
    console.error("File upload failed:", error);
  }
}
};

  //handle logout
  function handleLogOut() {
    isLoggingOut.current = true;
    // Close AI Summarizer and clear messages
    setShowAISummarizer(false);
    // Notify others you're offline
    stompClient.send(
      `/app/isOffline/${roomId}`,
      {},
      JSON.stringify({ sender: currentUser })
    );

    setTimeout(() => {
      setConnected(false);
      navigate("/");
      toast.success(`User ${currentUser} logout successfully!`);
    }, 500);
  }
//when page is reloaded or close 
useEffect(() => {
  const handleUnload = () => {
    if (stompClient && stompClient.send && currentUser && roomId) {
      try {
        stompClient.send(
          `/app/isOffline/${roomId}`,
          {},
          JSON.stringify({ sender: currentUser })
        );
      } catch (e) {
        console.warn("Unload offline signal failed", e);
      }
    }
  };

  window.addEventListener("beforeunload", handleUnload);

  return () => {
    window.removeEventListener("beforeunload", handleUnload);
  };
}, [stompClient, currentUser, roomId]);


  //emoji picker and mentions
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
      if (
        mentionsRef.current &&
        !mentionsRef.current.contains(event.target)
      ) {
        setShowMentions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);



  //handling file send

const handleFileButtonClick = () => {
   if (fileInputRef.current) {
    fileInputRef.current.value = ""; //  clear previous selection
    fileInputRef.current.click();    //  open file picker
  }
};

const handleFileChange = (e) => {
  const fileExist = e.target.files[0];
  setFile(fileExist);
  console.log("Selected file:", fileExist);
};

const getChatTextForCopy = () => {
  return messages
    .map((message) => {
      const time = message.isFile ? getCurrentTimeAMPM() : message.timeStamp;
      if (message.isFile) {
        return `[${message.sender}] (${time}): [file] ${message.fileName} ${message.fileUrl}`;
      }
      return `[${message.sender}] (${time}): ${message.content}`;
    })
    .join("\n");
};

const openAIPage = () => {
  setShowCopyOption(true);
  setShowAiHint(false);
};

const handleCopyAndOpenAI = async () => {
  const chatText = getChatTextForCopy();
  try {
    await navigator.clipboard.writeText(chatText);
    toast.success("Chat copied successfully!");
  } catch (error) {
    console.error("Clipboard copy failed", error);
    toast.error("Unable to copy chat");
  }
  setShowCopyOption(false);
  setShowAISummarizer(true);
};

const handleOpenAIWithoutCopy = () => {
  setShowCopyOption(false);
  setShowAISummarizer(true);
};

const handleCutOption = () => {
  setShowCopyOption(false);
};

// Helper function to render text with bold mentions
const renderMessageWithMentions = (text) => {
  const parts = text.split(/(\*\*@[^\*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**@') && part.endsWith('**')) {
      return (
        <span key={index} className="font-bold text-yellow-300">
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

  return (
    <div>
      <header className="z-20 fixed w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 py-5 flex justify-around items-center shadow-md">
       

        <div>
          <h1 className="text-white font-semibold text-sm sm:text-base md:text-lg">
            <span className="text-gray-400">Chat as</span> {currentUser}
          </h1>
        </div>

       <div className="flex gap-2"> 
        <div className="flex flex-col justify-center items-center text-sm sm:text-base text-gray-300">
           <p className="text-xs text-gray-500">Online</p>
           <div className="text-green-400 font-semibold text-base">
             +{onlineUsers.size}
           </div>
        </div>
 
      <div className={`w-28 h-10 flex items-center justify-center ${onlineUsers.size == 0 ? "border-0" : "border border-green-500/40"} rounded-lg px-2 py-1 bg-gray-800/50`}>
        {onlineUsers.size === 0 ? (
          <p className="text-red-500 text-xs sm:text-sm font-semibold -m-4">None Online</p>
        ) : (
          <div ref={onlineList} className="overflow-y-auto h-full scrollbar-thin">
            {[...onlineUsers].map((user) => (
           <div
             key={user}
            className="flex items-center gap-1 text-xs text-green-400"
          >
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
              <span className="truncate">{user}</span>
         </div>
        ))}
      </div>
      )}
  
</div>
</div>
 
        <div className="relative flex items-center gap-3">
          <button
            type="button"
            title="AI help"
            onClick={openAIPage}
            className="ai-button-animated flex items-center justify-center p-2 rounded-full transition duration-150 active:scale-95"
          >
            <span className="text-lg">✨</span>
          </button>
          {showAiHint && (
            <div className="absolute top-full right-0 mt-3 w-56 rounded-xl border border-blue-400/50 bg-gradient-to-br from-blue-900/95 via-sky-900/95 to-cyan-900/95 px-3 py-2 text-left text-xs text-white shadow-xl shadow-blue-500/40 backdrop-blur-xl transition duration-500">
              <p className="font-semibold text-blue-200">✨ Ask AI to summarize</p>
              <p className="text-blue-300/80 text-xs mt-1">Tap to get AI help with your chat analysis.</p>
            </div>
          )}
          {showCopyOption && (
            <div className="absolute top-full right-0 mt-2 w-60 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-left text-xs text-white shadow-lg backdrop-blur-xl transition duration-500 z-20">
              <p className="font-semibold text-cyan-300">Copy chat text?</p>
              <p className="text-gray-400 text-xs mt-1">Choose an option below.</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyAndOpenAI}
                  className="flex-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-500 transition duration-150"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={handleOpenAIWithoutCopy}
                  className="flex-1 rounded-md bg-gray-700 border border-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-600 transition duration-150"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleCutOption}
                  className="flex-1 rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500 transition duration-150"
                >
                  Cut
                </button>
              </div>
            </div>
          )}
          <button
            onClick={handleLogOut}
            className="bg-red-600 hover:bg-red-700 px-3 py-2 text-xs sm:text-sm text-white rounded-lg shadow-md active:scale-95 transition duration-150 font-semibold"
          >
            Leave
          </button>
        </div>
      </header>

      <main
        ref={chatBoxRef}
        className='pt-26 pb-[72px] border w-full md:w-2/3 mx-auto 
             bg-[url("/background_images/chat-bg-image2.jpg")] 
             bg-cover bg-center bg-no-repeat h-screen 
             overflow-y-auto px-3 md:px-2 flex flex-col' 
      >
  
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.sender === currentUser ? "justify-end" : "justify-start"
            } mt-2 mb-1 px-2`}
          >
            <div
              className={`flex gap-2 max-w-xs sm:max-w-md ${
                message.sender === currentUser ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <img
                className="h-8 w-8 rounded-full flex-shrink-0 mt-0.5"
                src={`https://robohash.org/${message.sender}?set=set2`}
                alt={message.sender}
              />
              <div className={`flex flex-col ${message.sender === currentUser ? "items-end" : "items-start"}`}>
                {message.sender !== currentUser && (
                  <p className="text-xs text-gray-400 mb-0.5 font-semibold">
                    {message.sender}
                  </p>
                )}
                <div
                  className={`rounded-2xl px-3 py-2 ${
                    message.sender === currentUser 
                      ? "bg-blue-600 text-white rounded-br-none" 
                      : "bg-gray-700 text-gray-100 rounded-bl-none"
                  }`}
                >
                  {message.isFile ? (
                    message.fileType?.startsWith("image/") ? (
                      <img
                        controls
                        src={message.fileUrl}
                        alt={message.fileName}
                        className="max-w-full sm:max-w-xs rounded mt-1"
                      />
                    ) : message.fileType?.startsWith("audio/") ? (
                      <audio controls className="z-0 max-w-full sm:max-w-xs rounded mt-1">
                        <source src={message.fileUrl} type={message.fileType} />
                        Your browser does not support the audio element.
                      </audio>
                    ) : message.fileType?.startsWith("video/") ? (
                      <video controls className="z-0 max-w-full sm:max-w-xs rounded mt-1">
                        <source src={message.fileUrl} type={message.fileType} />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <a
                        href={message.fileUrl}
                        download={message.fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-300 underline break-all max-w-full sm:max-w-xs text-sm"
                      >
                        📎 {message.fileName}
                      </a>
                    )
                  ) : (
                    <p className="text-sm break-words">{renderMessageWithMentions(message.content)}</p>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${
                  message.sender === currentUser ? "text-blue-300" : "text-gray-500"
                }`}>
                  {message.isFile ? getCurrentTimeAMPM() : message.timeStamp}
                </p>
              </div>
            </div>
          </div>
        ))}


       


        {typingUser && (
          <div className="mt-2 text-lg italic text-gray-100 animate-bounce">
            {typingUser} is typing...
          </div>
        )}
      </main>

      <div className="fixed bottom-0 w-full px-6">
        <div className=" relative w-full md:w-2/3 flex-wrap  mx-auto flex items-center gap-2 bg-gray-900 px-3 py-3  rounded-full h-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              const value = e.target.value;
              setInput(value);

              // Handle mentions with @
              const lastAtIndex = value.lastIndexOf('@');
              if (lastAtIndex !== -1) {
                const textAfterAt = value.substring(lastAtIndex + 1);
                // Check if @ is followed by space (means mention has ended)
                if (textAfterAt.includes(' ')) {
                  setShowMentions(false);
                } else {
                  // Show all users (except current user) when @ is typed, filter as user types
                  let filtered = [...onlineUsers].filter(user => user !== currentUser);
                  if (textAfterAt.length > 0) {
                    filtered = filtered.filter((user) =>
                      user.toLowerCase().includes(textAfterAt.toLowerCase())
                    );
                  }
                  setMentionSuggestions(filtered);
                  setShowMentions(filtered.length > 0);
                }
              } else {
                setShowMentions(false);
              }

              if (!stompClient) return;

              if (!isTyping) {
                stompClient.send(
                  `/app/typing/${roomId}`,
                  {},
                  JSON.stringify({ sender: currentUser })
                );
                setIsTyping(true);
              }

              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }

              typingTimeoutRef.current = setTimeout(() => {
                stompClient.send(
                  `/app/stopTyping/${roomId}`,
                  {},
                  JSON.stringify({ sender: currentUser })
                );
                setIsTyping(false);
              }, 3000);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setShowMentions(false);
                sendMessage();
              }
            }}
            placeholder="Type @ to mention... Your message..."
            className="flex-1 px-3 py-2 min-w-0 rounded-full bg-gray-700 text-gray-200 text-sm focus:outline-none"
          />

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-20 right-10 z-50"
            >
              <EmojiPicker
                onEmojiClick={(emojiData) =>
                  setInput((prev) => prev + emojiData.emoji)
                }
                theme="dark"
              />
            </div>
          )}

          {/* Mentions Dropdown */}
          {showMentions && mentionSuggestions.length > 0 && (
            <div
              ref={mentionsRef}
              className="absolute bottom-16 left-0 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto"
            >
              {mentionSuggestions.map((user) => (
                <button
                  key={user}
                  onClick={() => {
                    const lastAtIndex = input.lastIndexOf('@');
                    const beforeAt = input.substring(0, lastAtIndex);
                    const newInput = beforeAt + '@' + user + ' ';
                    setInput(newInput);
                    setShowMentions(false);
                    setMentionSuggestions([]);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2 border-b border-gray-700 last:border-b-0 transition duration-100"
                >
                  <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  <span>{user}</span>
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
          
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="bg-yellow-300 p-2 w-9 h-9 flex items-center justify-center rounded-full hover:bg-yellow-600 text-lg md:text-xl
                            active:bg-yellow-800 active:scale-95 transition duration-150"
            >
              😊
            </button>


            <button
             onClick={handleFileButtonClick}
             className={`p-2 w-9 h-9  ${file != null ? "bg-green-600":"bg-fuchsia-500"} flex items-center justify-center rounded-full hover:bg-fuchsia-800 text-white active:scale-95 transition duration-150`}
            >
            <MdAttachFile size={22} className="rotate-45" />
          </button>

          <input
               type="file"
               ref={fileInputRef}   
               onChange={handleFileChange}
               className="hidden"
              />
          {file && (
             <div
             className="absolute bottom-17 right-0 z-50 flex flex-col gap-1 
               justify-center items-center bg-gray-300 border border-gray-400 
               px-3 py-2 rounded shadow max-w-[70vw] md:max-w-xs animate-bounce-once"
            >
            <div className="text-black text-xs max-w-[200px] break-words overflow-hidden whitespace-normal">
                  {file.name}
            </div>
            <button
              onClick={() => {setFile(null)
                if (fileInputRef.current) {
                     fileInputRef.current.value = ''; 
                    }
              }
                
              }
              className="bg-red-700 h-7  text-white text-xs px-2 py-0.5 rounded hover:bg-red-800 active:scale-95 transition duration-150"
            >
              Cancel
            </button>
          </div>
        )}



            <button
              onClick={sendMessage}
              className="bg-blue-400 p-2 w-9 h-9 flex items-center justify-center rounded-full hover:bg-blue-700 active:bg-blue-900 active:scale-95 transition duration-150"
            >
              <MdSend size={20} />
            </button>
          </div>
        </div>
      </div>

      <AISummarizer 
        isOpen={showAISummarizer}
        onClose={() => setShowAISummarizer(false)}
        chatText={getChatTextForCopy()}
      />
    </div>
  );
};

export default ChatPage;

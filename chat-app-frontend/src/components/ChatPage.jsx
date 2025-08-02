import React, { use, useEffect, useRef, useState } from "react";
import { MdAttachFile, MdSend } from "react-icons/md";
import useChatContext from "../context/ChatContext";
import { useNavigate } from "react-router";
import { baseURL } from "../configRoutes/axiosHelper";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";
import toast from "react-hot-toast";
import { getRoomMessages } from "../services/RoomService";
import { getTimeAgo } from "../configRoutes/timeAgoConfig";
import CryptoJS from "crypto-js";
import { Client } from "@stomp/stompjs";
import EmojiPicker from "emoji-picker-react";

const ChatPage = () => {
  //show online status
  const [isOnline, setIsOnline] = useState(false);
  const [onlineUser, setOnlineUser] = useState(null);
  // const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggingOut = useRef(false);

  //typing indication
  const [isTyping, setIsTyping] = useState(false); // you are typing
  const [typingUser, setTypingUser] = useState(null); // who else is typing
  const typingTimeoutRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef();

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
    if (!connected) {
      navigate("/");
      // handleLogOut();
    }
  }, [connected, roomId, currentUser]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatBoxRef = useRef(null);
  const [stompClient, setStompClient] = useState(null);

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
        toast.success("Connected to STOMP");

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
            setOnlineUser(sender);

            // Only reply back if this was a fresh request
            if (type === "request") {
              client.publish({
                destination: `/app/isOnline/${roomId}`,
                body: JSON.stringify({ sender: currentUser, type: "ack" }),
              });
            }
          }
        });

        client.subscribe(`/topic/isOffline/${roomId}`, (message) => {
          const { sender } = JSON.parse(message.body);
          if (sender !== currentUser) {
            setOnlineUser(null);
          }
        });
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
  const sendMessage = () => {
    if (stompClient && connected && input.trim()) {
      // console.log(input);
    }
    const encryptedContent = encryptMessage(input);
    const encryptedSender = encryptMessage(currentUser);
    const message = {
      content: encryptedContent,
      sender: encryptedSender,
      roomId: roomId,
    };
    stompClient.send(`/app/sendMessage/${roomId}`, {}, JSON.stringify(message));
    setInput("");
  };

  //handle logout
  function handleLogOut() {
    isLoggingOut.current = true;
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
  //emoji picker
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div>
      <header className="border-gray-400 fixed w-full bg-gray-900 py-5 flex justify-around rounded shadow items-center">
        {/* <div >
                <h1 className='text-amber-50'>
                    Room : <span>{actualRoom}</span>
                </h1>
            </div> */}

        <div>
          <h1 className="text-amber-50">
            User : <span>{currentUser}</span>
          </h1>
        </div>

        {onlineUser && (
          <div className="text-sm font-bold">
            <p
              className="bg-gradient-to-r from-green-500 to-green-500 
                   bg-clip-text text-transparent 
                   drop-shadow-[0_0_8px_rgba(34,197,94,0.9)] 
                   tracking-wide"
            >
              {onlineUser} online
            </p>
          </div>
        )}

        {/* <div>
                <h1 className='text-amber-50'>
                    User : <span>{currentUser}</span>
                </h1>
            </div> */}

        <div>
          <button
            onClick={handleLogOut}
            className="bg-red-500 hover:bg-red-800 px-3 py-2 rounded-xl"
          >
            Leave Room
          </button>
        </div>
      </header>

      <main
        ref={chatBoxRef}
        className='pt-20 pb-[72px] border w-full md:w-2/3 mx-auto 
             bg-[url("/background_images/chat-bg-image2.jpg")] 
             bg-cover bg-center bg-no-repeat h-screen 
             overflow-y-auto px-3 md:px-7 flex flex-col'
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.sender === currentUser ? "justify-end" : "justify-start"
            } mt-2`}
          >
            <div
              className={`'mt-3  rounded text-lime-50 ${
                message.sender === currentUser ? "bg-purple-600" : "bg-gray-600"
              }`}
            >
              <div className="flex flex-row gap-2">
                <img
                  className="h-10 w-10 p-1"
                  src={`https://robohash.org/${message.sender}?set=set2`}
                  alt=""
                />
                <div className="flex flex-col px-1">
                  <p className="font-bold text-sm">{message.sender}</p>
                  <p>{message.content}</p>
                  <p className="text-xs text-white">
                    {getTimeAgo(message.timeStamp)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {typingUser && (
          <div className="mt-2 text-lg italic text-gray-100">
            {typingUser} is typing...
          </div>
        )}
      </main>

      <div className="fixed bottom-0 w-full px-2">
        <div className="w-full md:w-2/3 mx-auto flex items-center gap-2 bg-gray-900 px-3 py-3 rounded-full h-16">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);

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
                sendMessage();
              }
            }}
            placeholder="Your message..."
            className="flex-1 px-3 py-2 rounded-full bg-gray-700 text-gray-200 text-sm focus:outline-none"
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="bg-yellow-300 p-2 w-10 h-10 flex items-center justify-center rounded-full hover:bg-yellow-600 text-lg md:text-xl"
            >
              😊
            </button>

            {/* <button className='bg-green-400 p-2 w-10 h-10 flex items-center justify-center rounded-full hover:bg-green-700'>
        <MdAttachFile size={20} />
      </button> */}

            <button
              onClick={sendMessage}
              className="bg-blue-400 p-2 w-10 h-10 flex items-center justify-center rounded-full hover:bg-blue-700"
            >
              <MdSend size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

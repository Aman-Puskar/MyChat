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
import { httpClient } from "../configRoutes/axiosHelper";
import { getCurrentTimeAMPM } from "../configRoutes/timeAgoConfig";

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
            // setOnlineUser(sender);
              setOnlineUsers((prev) => new Set([...prev, sender]));


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
      // console.log(input);
    
    const encryptedContent = encryptMessage(input);
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


  return (
    <div>
      <header className=" z-20 border-gray-400 fixed w-full bg-gray-900 py-7 flex justify-around rounded shadow items-center">
       

        <div>
          <h1 className="text-amber-50 text-sm sm:text-base md:text-lg lg:text-xl">
            User : <span>{currentUser}</span>
          </h1>
        </div>

       <div className="flex gap-1.5"> 
        <div className="flex justify-center items-center text-sm sm:text-base md:text-lg lg:text-xl text-amber-50">
           <p>Users Online:</p>
        </div>
 
      <div className={`w-32 h-12 ${onlineUsers.size == 0 ? "border-0" : "border"}  border-green-500 rounded-md px-2 py-1`}>
        {onlineUsers.size === 0 ? (
          <p className="text-red-700 py-2 text-sm sm:text-base md:text-lg lg:text-xl">None Online</p>
        ) : (
          <div ref={onlineList} className="overflow-y-auto h-full scrollbar-thin">
            {[...onlineUsers].map((user) => (
           <div
             key={user}
            className="flex items-center gap-1 text-sm text-green-400 truncate"
          >
          <div className="w-2 h-2 rounded-full bg-green-400" />
              {user}
         </div>
        ))}
      </div>
      )}
  
</div>
</div>
 
        <div>
          <button
            onClick={handleLogOut}
            className="bg-red-500 hover:bg-red-800 px-3 py-2 text-sm sm:text-base md:text-lg lg:text-xl text-amber-50 rounded-xl active:bg-red-700 active:scale-95 transition duration-150"
          >
            Leave Room
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
            } mt-2`}
          >
            <div
              className={`'mt-2  rounded text-lime-50 ${
                message.sender === currentUser ? "bg-purple-600" : "bg-gray-600"
              }  max-w-[80vw] sm:max-w-md break-words p-2`}
            >
              <div className="flex flex-row gap-2">
                <img
                  className="h-10 w-10 p-1"
                  src={`https://robohash.org/${message.sender}?set=set2`}
                  alt=""
                />
                <div className="flex flex-col px-1">
                <p className="font-bold text-sm">{message.sender}</p>
                 {message.isFile ? (
                  message.fileType?.startsWith("image/") ? (
                <img
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
                    className="text-blue-300 underline break-all max-w-full sm:max-w-xs rounded mt-1"
                  >
                    📎 {message.fileName}
                  </a>
                )
              ) : (
                <p className="break-words break-all overflow-hidden text-xs">{message.content}</p>
              )}
                  <div className="flex justify-end">
                  <p className="text-xs text-white items-end">
                    {message.isFile ? getCurrentTimeAMPM() : message.timeStamp}
                  </p>
                  </div>
                </div>
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
    </div>
  );
};

export default ChatPage;

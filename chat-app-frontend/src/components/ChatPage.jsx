import React, { use, useEffect, useRef, useState } from 'react'
import { MdAttachFile, MdSend } from 'react-icons/md'
import useChatContext from '../context/ChatContext';
import { useNavigate } from 'react-router';
import {baseURL} from '../configRoutes/axiosHelper'
import SockJS from 'sockjs-client'
import { Stomp } from '@stomp/stompjs'
import toast from 'react-hot-toast'
import {getRoomMessages}  from '../services/RoomService';
import { getTimeAgo } from '../configRoutes/timeAgoConfig';
import CryptoJS from 'crypto-js';
import { Client } from '@stomp/stompjs';
import EmojiPicker from 'emoji-picker-react';


const ChatPage = () => {


    //typing indication
    const [isTyping, setIsTyping] = useState(false); // you are typing
    const [typingUser, setTypingUser] = useState(null); // who else is typing
    const typingTimeoutRef = useRef(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef();



    const navigate = useNavigate();
    const{roomId,actualRoom, currentUser, connected,setRoomId, setCurrentUser, setConnected} = useChatContext();
    // console.log(currentUser);
    
    //use effect -> whenever something is changes it will redirect to the home page that is form page 
    useEffect(() => {
        if(!connected) {
            navigate('/');
        }
    }, [connected, roomId, currentUser]);
    
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const inputRef = useRef(null);
    const chatBoxRef = useRef(null);
    const [stompClient, setStompClient] = useState(null);


    //scrol the main message container
    useEffect(() => {
    if (chatBoxRef.current) {
        chatBoxRef.current.scrollTo({
            top: chatBoxRef.current.scrollHeight,
            behavior: 'smooth',
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
                        sender : decryptMessage(msg.sender),
            }));
                setMessages(decryptedMessages);
                
            } catch (error) {
                
            }
        }
        if(connected){
            loadRoomMessages();
        }
    },[]);



    
    
    //encryption 
    const SECRET_KEY = "secretKey_"+roomId;
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
        debug: (str) => console.log('[STOMP]', str), 
        onConnect: () => {
             setStompClient({
        send: (destination, headers, body) => {
            client.publish({ destination, headers, body });
        }
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
        },
        onStompError: (frame) => {
            console.error("STOMP Error:", frame.headers['message']);
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
        if(stompClient && connected && input.trim()) {
            // console.log(input);
            
        }
        const encryptedContent = encryptMessage(input);
        const encryptedSender = encryptMessage(currentUser);
        const message = {
            content : encryptedContent,
            sender : encryptedSender,
            roomId : roomId
        }
        stompClient.send(`/app/sendMessage/${roomId}`, {}, JSON.stringify(message));
        setInput("");
    }

    //handle logout
    function handleLogOut() {
        setConnected(false);
        // setRoomId("");
        // setCurrentUser("");
        navigate("/")
        toast.success(` User ${currentUser} logout successfully !!`);
    }

    useEffect(() => {
  function handleClickOutside(event) {
    if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
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
        <header className='border-gray-400 fixed w-full bg-gray-800 py-5 flex justify-around rounded shadow items-center'>
            <div >
                <h1>
                    Room : <span>{actualRoom}</span>
                </h1>
            </div>

            <div>
                <h1>
                    User : <span>{currentUser}</span>
                </h1>
            </div>

            <div>
                <button
                onClick={handleLogOut}
                className='bg-red-500 hover:bg-red-800 px-3 py-2 rounded-xl'>Leave Room</button>
            </div>
        </header>



    <main ref={chatBoxRef} className='py-20 border w-full md:w-2/3 mx-auto bg-gray-500 h-[calc(100vh-100px)] overflow-y-auto px-3 md:px-7 flex flex-col'>
       {
        messages.map((message, index) => (
           <div key={index} className={`flex ${message.sender === currentUser ? "justify-end" : "justify-start"} mt-2`}>
             <div className={`'mt-3  rounded text-gray-900 ${message.sender === currentUser ? "bg-gray-100" : "bg-green-200"}`} >
                <div className='flex flex-row gap-2'>
                    <img className='h-10 w-10 p-1 ' src={`https://ui-avatars.com/api/?name=${message.sender}&background=random`} alt="" />
                    <div className='flex flex-col gap-2 px-1'>
                    <p className='font-bold text-sm'>{message.sender}</p>
                    <p>{message.content}</p>
                    <p className='text-xs text-gray-950'>{getTimeAgo(message.timeStamp)}</p>
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


        <div className='fixed bottom-2  w-full h-17'>
            <div className='w-full md:w-2/3 mx-auto flex flex-wrap sm:flex-nowrap gap-2 items-center bg-gray-800 px-3 py-2 rounded-full'>
                <input
                    onKeyDown={(e) => {
                    if(e.key == "Enter") {
                        sendMessage();
                    }
                }}  
                 value={input}
                onChange={(e) => {
                    setInput(e.target.value);

                    if (!stompClient) return;

                    if (!isTyping) {
                      stompClient.send(`/app/typing/${roomId}`, {}, JSON.stringify({ sender: currentUser }));
                      setIsTyping(true);
                    }

                    if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                    }

                     typingTimeoutRef.current = setTimeout(() => {
                     stompClient.send(`/app/stopTyping/${roomId}`, {}, JSON.stringify({ sender: currentUser }));
                     setIsTyping(false);
                        }, 3000);
                    }}
                 type="text"
                 placeholder='Your message...'
                 className='h-full px-2 py-2 rounded-full w-full bg-gray-700 text-gray-200 focus:outline-none'
                />
                {showEmojiPicker && (
                    
                     <div
                     ref={emojiPickerRef}
                      className="absolute bottom-16 right-20 z-50">
                     <EmojiPicker
                    onEmojiClick={(emojiData) => setInput((prev) => prev + emojiData.emoji)}
                    theme="dark"
                     />
                    </div>
                )}

                

                <div className='flex gap-2'>

                     <button
                         onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                         className='bg-yellow-300 py-2 px-3 h-13 w-13 flex justify-center items-center rounded-full hover:bg-yellow-600 text-xl'
                        >
                         😊
                        </button>

                 <button className='bg-green-400 py-2 px-3 h-13 w-13 flex justify-center items-center rounded-full hover:bg-green-700'>
                    <MdAttachFile size={30}/>
                </button>

                <button 
                 onClick={sendMessage}
                 className='bg-blue-400 py-2 px-3 h-13 w-13 flex justify-center items-center rounded-full  hover:bg-blue-700'>
                    <MdSend size={30}/>
                </button>
               </div>
            </div>
        </div>
    </div>
  )
}

export default ChatPage
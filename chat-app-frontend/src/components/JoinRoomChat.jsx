import React, { useState } from 'react'
import chatIcon from "../assets/chat.png"
import toast from 'react-hot-toast';
import { createRoom as createRoomApi, joinRoomChatApi } from '../services/RoomService';
import useChatContext from '../context/ChatContext';
import { useNavigate } from 'react-router';
import CryptoJS from 'crypto-js';

const JoinRoomChat = () => {

const SECRET_KEY = "yourSuperSecretKey";

function encryptRoomId(roomId) {
  return CryptoJS.SHA256(roomId).toString();
}

function decryptRoomId(cipher) {
  const bytes = CryptoJS.AES.decrypt(cipher, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

    //navigator to chat page
    const navigate = useNavigate()

  //input details
    const [details, setDetails] = useState({
      roomId: "",
      userName: "",
    });

    //taking values from ChatContext from useChatContext;
    const{roomId, actualRoom, currentUser, connected, setRoomId, setCurrentUser, setConnected, setActualRoom} = useChatContext();

//handing input details
    function handleFormInputChange(event) {
      setDetails({...details,
        [event.target.name] : event.target.value},
      )
    };
//validating input details  
function validation() {
  if(details.userName === "" && details.roomId === "") {
    toast.error(" Please enter input fields!");
    return false;
  } else if(details.userName === "") {
    toast.error("Please enter username");
     return false;
  } else if(details.roomId === "") {
    toast.error("Please enter room id");
    return  false;
  }
  return true;
}


//joining the room chat
  async function joinRoomChat() {
      if(validation()) {
        //make them join the room chat
        try {
          setActualRoom(details.roomId);
           const encryptedRoomId = encryptRoomId(details.roomId);
           const response = await joinRoomChatApi(encryptedRoomId);
            setRoomId(encryptedRoomId);
            setCurrentUser(details.userName); 
            setConnected(true);   
            toast.success("Room joined successfully !!");
            navigate('/chat');

        } catch(error) {
          console.log(error.response?.data);
          toast.error("Room not found !");
        }       
      }
    }


    //creating the new room
   async function createRoom() {
      if(validation()) {
        //create room
        //call api to create room from the backed
        try{
          //from roomservice
            setActualRoom(details.roomId);
            const encryptedRoomId = encryptRoomId(details.roomId);
            const response = await createRoomApi(encryptedRoomId);            
            toast.success("Room created successfully !");
            console.log(response);
            setRoomId(encryptedRoomId);
            setCurrentUser(details.userName); 
            setConnected(true);           

          // navigate to the chat page afte setting the values 
            navigate('/chat');
            // joinRoomChat();
        } catch(error) {
          console.log(error.response?.data);
          console.log("Error in creating room");
          toast.error("Room already exists !");
        }
      }
    }


  return (
    <div className='min-h-screen flex justify-center items-center '>
        <div className='p-10 w-full flex flex-col gap-4 max-w-md rounded-xl text-white
                bg-white/10 md:backdrop-blur-md border border-white/30 
                '>

        <h1 className='text-6xl text-amber-50 font-semibold text-center'>
            Talk Circuit
          </h1>
        <div >
          <img src={chatIcon} className='mx-auto w-28' alt="chat icon" />
        </div>

          <h1 className='text-2xl text-amber-50 font-semibold text-center'>
            Join Room / Create Room
          </h1>

          {/*input for user name */}
          <div className='mt-1.5'>
            <label htmlFor="name" className='block font-medium'>
              Your Name
            </label>
            <input 
              onChange={handleFormInputChange}
              value={details.userName}
              type='text'
              id='name'
              name='userName'
              placeholder='Enter your name'
              className='w-full bg-white/20 text-white  placeholder-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400'
            />
          </div>

        { /*room id */}
         <div>
            <label htmlFor="name" className='block font-medium'>
              Room ID / New Room ID
            </label>
            <input 
              onChange={handleFormInputChange}
              value={details.roomId}
              name="roomId"
              placeholder='Enter room id'
              type='text'
              id='name'
              className='w-full bg-white/20 text-white placeholder-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400'
            />
          </div>

        <div className='flex justify-center gap-8 mt-5'>
          <button onClick={joinRoomChat} className='px-3 py-2 text-amber-50 bg-blue-500 rounded hover:bg-blue-800 hover:text-gray-50'  >Join Room</button>
          <button onClick={createRoom} className='px-3 py-2 text-amber-50 bg-emerald-400 rounded hover:bg-emerald-700 hover:text-gray-50' >Create Room</button>
        </div>


        </div>
    </div>
  )
}

export default JoinRoomChat;
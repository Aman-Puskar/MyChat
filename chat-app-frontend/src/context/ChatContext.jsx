import { createContext, useContext, useState } from "react";

const ChatContext = createContext();

export const ChatProvider = ({children}) => {
    const[roomId, setRoomId] = useState('');
    const[currentUser, setCurrentUser] = useState('');
    const[connected, setConnected] = useState(false);
    const[actualRoom, setActualRoom] = useState('');
    return (
        <ChatContext.Provider
            value={{actualRoom, roomId, currentUser, connected, setRoomId, setCurrentUser, setConnected, setActualRoom}}
        >
            {children}
        </ChatContext.Provider>
    );
};

const useChatContext = () => useContext(ChatContext);
export default useChatContext;
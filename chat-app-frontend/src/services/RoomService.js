import { httpClient } from "../configRoutes/axiosHelper"

//for creating room
export const createRoom = async (roomDetails) => {
    const response = await httpClient.post('/api/v1/rooms', roomDetails, {
         headers: { 'Content-Type': 'text/plain' }
    });
    return response.data;
}


//for joining the chat room
export const joinRoomChatApi = async (roomId) => {
    const response = await httpClient.get(`/api/v1/rooms/${roomId}`);
    return response.data;
}

//getting messages form the room
export const  getRoomMessages = async (roomId) =>{
    const response = await httpClient.get(`/api/v1/rooms/${roomId}/message`);
    return response.data;
}
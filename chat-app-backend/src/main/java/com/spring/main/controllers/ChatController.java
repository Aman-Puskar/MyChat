package com.spring.main.controllers;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestBody;

import com.spring.main.entities.Message;
import com.spring.main.entities.Room;
import com.spring.main.playload.Messagerequest;
import com.spring.main.repositories.RoomRepository;

@Controller

public class ChatController {

    @Autowired
    private RoomRepository roomRepository;

    @MessageMapping("/sendMessage/{roomId}") // app/sendMessage/{roomId}
    @SendTo("/topic/room/{roomId}") // client subscribe -->send message to the clients who have subscribed this
                                    // topic
    public Message sendMessage(
            @DestinationVariable String roomId,
            @RequestBody Messagerequest request) {

        Room room = roomRepository.findByRoomId(roomId);
        Message message = new Message();
        message.setSender(request.getSender());
        message.setContent(request.getContent());
        message.setTimeStamp(request.getTimeNow());

        if (room != null) {
            room.getMessage().add(message);
            roomRepository.save(room);
        } else {
            throw new RuntimeException("room not found !!");
        }
        return message;
    }

    // handling the typing indication

    // when typing
    @MessageMapping("/typing/{roomId}")
    @SendTo("/topic/typing/{roomId}")
    public Map<String, String> handleTyping(
            @DestinationVariable String roomId,
            @Payload Map<String, String> payload) {
        // payload = { "sender": "Aman" }
        return payload;
    }

    // when stop typing
    @MessageMapping("/stopTyping/{roomId}")
    @SendTo("/topic/stopTyping/{roomId}")
    public Map<String, String> handleStopTyping(
            @DestinationVariable String roomId,
            @Payload Map<String, String> payload) {
        // payload = { "sender": "Aman" }
        return payload;
    }

    // online status
    @MessageMapping("/isOnline/{roomId}")
    @SendTo("/topic/isOnline/{roomId}")
    public Map<String, String> handleOnlineStatus(
            @DestinationVariable String roomId,
            @Payload Map<String, String> payload) {
        return payload;
    }

    // offline status
    @MessageMapping("/isOffline/{roomId}")
    @SendTo("/topic/isOffline/{roomId}")
    public Map<String, String> handleOfflineStatus(
            @DestinationVariable String roomId,
            @Payload Map<String, String> payload) {
        return payload;
    }

    @MessageMapping("/sendFile/{roomId}")
    @SendTo("/topic/sendFile/{roomId}")
    public Map<String, String> handleFileMessage(
            @DestinationVariable String roomId,
            @Payload Map<String, String> payload) {

        // payload contains keys like "sender", "fileUrl", "fileName"

        return payload;
    }

}

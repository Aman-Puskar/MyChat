package com.spring.main.controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.spring.main.entities.Message;
import com.spring.main.entities.Room;
import com.spring.main.repositories.RoomRepository;

@RestController
@RequestMapping("/api/v1/rooms")
@CrossOrigin("https://mychat-theta-seven.vercel.app/")
public class RoomController {

    @Autowired
    private RoomRepository roomRepository;

    // create room
    @PostMapping
    public ResponseEntity<?> createRoom(@RequestBody String roomId) {
        // roomId = roomId.replaceAll("^\"|\"$", "");

        // check if room id exists or not
        if (roomRepository.findByRoomId(roomId) != null) {
            // room is there already
            return ResponseEntity.badRequest().body("Room exists already!");
        }
        // create new room
        Room room = new Room();
        room.setRoomId(roomId);
        roomRepository.save(room);
        return ResponseEntity.status(HttpStatus.CREATED).body(room);
    }

    // getting the room -->join the room
    @GetMapping("/{roomId}")
    public ResponseEntity<?> joinRoom(@PathVariable String roomId) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            return ResponseEntity.badRequest().body("Room not found!!");
        }
        return ResponseEntity.ok(room);
    }

    // getting the messages of the room
    @GetMapping("/{roomId}/message")
    public ResponseEntity<List<Message>> getMessage(
            @PathVariable String roomId,
            @RequestParam(value = "page", defaultValue = "0", required = false) int page,
            @RequestParam(value = "size", defaultValue = "20", required = false) int size)

    {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            return ResponseEntity.badRequest().build();
        }

        // get messages
        List<Message> messages = room.getMessage();

        int start = Math.max(0, messages.size() - (page + 1) * size);
        int end = Math.min(messages.size(), start + size);
        List<Message> paginatedMessages = messages.subList(start, end);

        return ResponseEntity.ok(paginatedMessages);
    }

}

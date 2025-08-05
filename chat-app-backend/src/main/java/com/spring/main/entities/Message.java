package com.spring.main.entities;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    private String sender;
    private String content;
    private String timeStamp;

    // public Message(String sender, String content, String timeNow) {
    // this.sender = sender;
    // this.content = content;
    // this.timeStamp = timeNow;
    // }
}

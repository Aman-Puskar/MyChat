package com.spring.main.playload;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class Messagerequest {
    private String content;
    private String sender;
    private String roomId;
    private LocalDateTime timeNow;
}

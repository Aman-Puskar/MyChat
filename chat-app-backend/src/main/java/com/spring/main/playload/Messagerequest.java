package com.spring.main.playload;

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
    private String timeNow;
}

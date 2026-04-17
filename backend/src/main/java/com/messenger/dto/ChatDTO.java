package com.messenger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@AllArgsConstructor
@Builder
public class ChatDTO {
    private String id;
    private String name;
    private String type;
    private String lastMessage;
    private String lastMessageTime;
    private UserDTO otherUser;
}

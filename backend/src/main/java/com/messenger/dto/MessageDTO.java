package com.messenger.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class MessageDTO {
    private UUID chatId;
    private String content;
    private String senderUsername;
}

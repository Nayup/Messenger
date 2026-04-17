package com.messenger.entity;

import lombok.*;
import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatParticipantId implements Serializable {
    private UUID chat;
    private UUID user;
}

package com.messenger.entity;

import lombok.*;
import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageReadId implements Serializable {
    private UUID message;
    private UUID user;
}

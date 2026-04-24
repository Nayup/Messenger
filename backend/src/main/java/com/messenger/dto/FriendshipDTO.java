package com.messenger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@AllArgsConstructor
@Builder
public class FriendshipDTO {
    private String id;          // friendship ID
    private String status;      // PENDING, ACCEPTED, REJECTED
    private UserDTO user;       // the other user (not the current user)
    private String createdAt;
    private boolean isRequester; // true if current user sent the request
}

package com.messenger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

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
    // Group chat fields
    private List<MemberDTO> members;
    private int memberCount;
    private String avatarUrl;

    @Data
    @AllArgsConstructor
    @Builder
    public static class MemberDTO {
        private String id;
        private String username;
        private String email;
        private String avatarUrl;
        private String role; // ADMIN, MEMBER
    }
}

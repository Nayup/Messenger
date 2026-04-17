package com.messenger.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_participants")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(ChatParticipantId.class)
public class ChatParticipant {
    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_id")
    private Chat chat;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "joined_at", insertable = false, updatable = false)
    private LocalDateTime joinedAt;

    @Column(length = 20)
    private String role; // ADMIN, MEMBER

    @PrePersist
    protected void onCreate() {
        if (joinedAt == null) { joinedAt = LocalDateTime.now(); }
        if (role == null) { role = "MEMBER"; }
    }
}

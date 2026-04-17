package com.messenger.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "message_reads")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(MessageReadId.class)
public class MessageRead {
    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id")
    private Message message;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "read_at", insertable = false, updatable = false)
    private LocalDateTime readAt;

    @PrePersist
    protected void onCreate() {
        if (readAt == null) { readAt = LocalDateTime.now(); }
    }
}

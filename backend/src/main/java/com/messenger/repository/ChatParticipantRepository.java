package com.messenger.repository;

import com.messenger.entity.ChatParticipant;
import com.messenger.entity.ChatParticipantId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface ChatParticipantRepository extends JpaRepository<ChatParticipant, ChatParticipantId> {
    List<ChatParticipant> findByUserId(UUID userId);
    List<ChatParticipant> findByChatId(UUID chatId);

    @Query("SELECT cp FROM ChatParticipant cp WHERE cp.chat.id IN " +
           "(SELECT cp2.chat.id FROM ChatParticipant cp2 WHERE cp2.user.id = :userId1) " +
           "AND cp.user.id = :userId2 AND cp.chat.type = 'PRIVATE'")
    List<ChatParticipant> findPrivateChatBetween(@Param("userId1") UUID userId1, @Param("userId2") UUID userId2);
}


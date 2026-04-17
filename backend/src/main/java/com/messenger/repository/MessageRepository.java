package com.messenger.repository;

import com.messenger.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {
    // Sắp xếp tin nhắn theo sent_at, NULL được đẩy lên đầu (tin nhắn cũ nhất)
    @Query("SELECT m FROM Message m WHERE m.chat.id = :chatId ORDER BY m.sentAt ASC NULLS FIRST")
    List<Message> findByChatIdOrderBySentAtAsc(UUID chatId);

    // Lấy tin nhắn cuối cùng — dùng native query để ORDER BY id DESC (đúng thứ tự insert)
    @Query(value = "SELECT * FROM messages WHERE chat_id = :chatId ORDER BY id DESC LIMIT 1", nativeQuery = true)
    Optional<Message> findFirstByChatIdOrderBySentAtDesc(UUID chatId);

    // Fix data cũ: set sent_at = NOW() cho message nào bị NULL
    @Modifying
    @Query(value = "UPDATE messages SET sent_at = NOW() WHERE sent_at IS NULL", nativeQuery = true)
    int fixNullSentAt();
}

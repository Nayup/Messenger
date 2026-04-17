package com.messenger.repository;

import com.messenger.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findByChatIdOrderBySentAtAsc(UUID chatId);
    Optional<Message> findFirstByChatIdOrderBySentAtDesc(UUID chatId);
}


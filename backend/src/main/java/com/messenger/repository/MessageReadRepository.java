package com.messenger.repository;

import com.messenger.entity.MessageRead;
import com.messenger.entity.MessageReadId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageReadRepository extends JpaRepository<MessageRead, MessageReadId> {
}

package com.messenger.repository;

import com.messenger.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface AttachmentRepository extends JpaRepository<Attachment, UUID> {
}

package com.messenger.config;

import com.messenger.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataMigrationRunner implements CommandLineRunner {

    private final MessageRepository messageRepository;

    @Override
    @Transactional
    public void run(String... args) {
        // Fix messages cũ có sent_at = NULL (do bug insertable = false trước đó)
        int updated = messageRepository.fixNullSentAt();
        if (updated > 0) {
            log.info("✅ Fixed {} messages with NULL sent_at", updated);
        }
    }
}

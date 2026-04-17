package com.messenger.service;

import com.messenger.dto.MessageDTO;
import com.messenger.entity.ChatParticipant;
import com.messenger.entity.Message;
import com.messenger.entity.User;
import com.messenger.entity.Chat;
import com.messenger.repository.ChatParticipantRepository;
import com.messenger.repository.MessageRepository;
import com.messenger.repository.UserRepository;
import com.messenger.repository.ChatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ChatRepository chatRepository;
    private final ChatParticipantRepository participantRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Message saveAndBroadcast(MessageDTO dto) {
        User sender = userRepository.findByUsername(dto.getSenderUsername()).orElseThrow();
        Chat chat = chatRepository.findById(UUID.fromString(dto.getChatId().toString())).orElseThrow();

        Message message = Message.builder()
                .chat(chat)
                .sender(sender)
                .content(dto.getContent())
                .messageType("TEXT")
                .build();

        Message saved = messageRepository.save(message);

        // Broadcast to chat topic (for users already subscribed)
        messagingTemplate.convertAndSend("/topic/chat/" + dto.getChatId(), saved);

        // Notify each participant via their personal topic (for new chat discovery)
        List<ChatParticipant> participants = participantRepository.findByChatId(chat.getId());
        for (ChatParticipant cp : participants) {
            String username = cp.getUser().getUsername();
            messagingTemplate.convertAndSend("/topic/user/" + username, Map.of(
                    "type", "NEW_MESSAGE",
                    "chatId", dto.getChatId().toString(),
                    "content", dto.getContent(),
                    "senderUsername", dto.getSenderUsername()
            ));
        }

        return saved;
    }

    public List<Message> getMessages(UUID chatId) {
        return messageRepository.findByChatIdOrderBySentAtAsc(chatId);
    }
}

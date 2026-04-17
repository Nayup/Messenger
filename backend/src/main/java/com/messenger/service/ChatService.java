package com.messenger.service;

import com.messenger.dto.ChatDTO;
import com.messenger.dto.UserDTO;
import com.messenger.entity.Chat;
import com.messenger.entity.ChatParticipant;
import com.messenger.entity.Message;
import com.messenger.entity.User;
import com.messenger.repository.ChatRepository;
import com.messenger.repository.ChatParticipantRepository;
import com.messenger.repository.MessageRepository;
import com.messenger.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRepository chatRepository;
    private final ChatParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;

    public Chat createPrivateChat(String user1, String user2) {
        User u1 = userRepository.findByUsername(user1).orElseThrow();
        User u2 = userRepository.findByUsername(user2).orElseThrow();

        // Kiểm tra chat đã tồn tại chưa
        Optional<Chat> existing = findExistingPrivateChat(u1.getId(), u2.getId());
        if (existing.isPresent()) {
            return existing.get();
        }

        Chat chat = Chat.builder().type("PRIVATE").build();
        chat = chatRepository.save(chat);

        participantRepository.save(ChatParticipant.builder().chat(chat).user(u1).build());
        participantRepository.save(ChatParticipant.builder().chat(chat).user(u2).build());

        return chat;
    }

    public Optional<Chat> findExistingPrivateChat(UUID userId1, UUID userId2) {
        List<ChatParticipant> results = participantRepository.findPrivateChatBetween(userId1, userId2);
        if (!results.isEmpty()) {
            return Optional.of(results.get(0).getChat());
        }
        return Optional.empty();
    }

    public List<ChatDTO> getChatsForUser(String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        List<ChatParticipant> participations = participantRepository.findByUserId(user.getId());

        List<ChatDTO> chatDTOs = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
        java.time.ZoneId utcZone = java.time.ZoneId.of("UTC");
        java.time.ZoneId vnZone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");

        for (ChatParticipant cp : participations) {
            Chat chat = cp.getChat();

            // Tìm người chat cùng (other participant)
            List<ChatParticipant> allParticipants = participantRepository.findByChatId(chat.getId());
            UserDTO otherUser = null;
            for (ChatParticipant p : allParticipants) {
                if (!p.getUser().getId().equals(user.getId())) {
                    otherUser = UserDTO.builder()
                            .id(p.getUser().getId().toString())
                            .username(p.getUser().getUsername())
                            .email(p.getUser().getEmail())
                            .avatarUrl(p.getUser().getAvatarUrl())
                            .build();
                    break;
                }
            }

            // Lấy tin nhắn cuối cùng
            Optional<Message> lastMsg = messageRepository.findFirstByChatIdOrderBySentAtDesc(chat.getId());

            String chatName = chat.getName();
            if ("PRIVATE".equals(chat.getType()) && otherUser != null) {
                chatName = otherUser.getUsername();
            }

            chatDTOs.add(ChatDTO.builder()
                    .id(chat.getId().toString())
                    .name(chatName)
                    .type(chat.getType())
                    .lastMessage(lastMsg.map(Message::getContent).orElse(""))
                    .lastMessageTime(lastMsg.map(m -> {
                        if (m.getSentAt() == null) return "";
                        return m.getSentAt()
                            .atZone(utcZone)
                            .withZoneSameInstant(vnZone)
                            .format(formatter);
                    }).orElse(""))
                    .otherUser(otherUser)
                    .build());
        }

        return chatDTOs;
    }
}

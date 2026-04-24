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
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRepository chatRepository;
    private final ChatParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // ==================== PRIVATE CHAT ====================

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

    // ==================== GROUP CHAT ====================

    @Transactional
    public ChatDTO createGroupChat(String creatorUsername, String groupName, List<String> memberUsernames) {
        User creator = userRepository.findByUsername(creatorUsername).orElseThrow(
                () -> new RuntimeException("User not found: " + creatorUsername));

        // Tạo group chat
        Chat chat = Chat.builder()
                .type("GROUP")
                .name(groupName)
                .createdBy(creator)
                .build();
        chat = chatRepository.save(chat);

        // Thêm creator là ADMIN
        participantRepository.save(ChatParticipant.builder()
                .chat(chat).user(creator).role("ADMIN").build());

        // Thêm các thành viên
        List<String> addedMembers = new ArrayList<>();
        addedMembers.add(creator.getUsername());
        for (String username : memberUsernames) {
            if (username.equals(creatorUsername)) continue;
            User member = userRepository.findByUsername(username).orElse(null);
            if (member != null) {
                participantRepository.save(ChatParticipant.builder()
                        .chat(chat).user(member).role("MEMBER").build());
                addedMembers.add(member.getUsername());
            }
        }

        // Tạo system message thông báo tạo nhóm
        saveSystemMessage(chat, creator, creator.getUsername() + " đã tạo nhóm \"" + groupName + "\"");

        // Notify tất cả thành viên
        notifyGroupEvent(chat.getId(), addedMembers, "GROUP_CREATED", groupName);

        return toChatDTO(chat, creator);
    }

    @Transactional
    public ChatDTO renameGroup(UUID chatId, String username, String newName) {
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Chat not found"));
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!"GROUP".equals(chat.getType())) {
            throw new RuntimeException("Only group chats can be renamed");
        }

        // Kiểm tra user là thành viên
        participantRepository.findByChatIdAndUserId(chatId, user.getId())
                .orElseThrow(() -> new RuntimeException("You are not a member of this group"));

        String oldName = chat.getName();
        chat.setName(newName);
        chatRepository.save(chat);

        // System message
        saveSystemMessage(chat, user, user.getUsername() + " đã đổi tên nhóm thành \"" + newName + "\"");

        // Notify
        List<String> memberNames = getMemberUsernames(chatId);
        notifyGroupEvent(chatId, memberNames, "GROUP_RENAMED", newName);

        return toChatDTO(chat, user);
    }

    @Transactional
    public ChatDTO addMembers(UUID chatId, String requesterUsername, List<String> newMemberUsernames) {
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Chat not found"));
        User requester = userRepository.findByUsername(requesterUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!"GROUP".equals(chat.getType())) {
            throw new RuntimeException("Cannot add members to a private chat");
        }

        // Kiểm tra requester là thành viên
        participantRepository.findByChatIdAndUserId(chatId, requester.getId())
                .orElseThrow(() -> new RuntimeException("You are not a member of this group"));

        List<String> addedNames = new ArrayList<>();
        for (String username : newMemberUsernames) {
            User member = userRepository.findByUsername(username).orElse(null);
            if (member == null) continue;

            // Kiểm tra đã là thành viên chưa
            Optional<ChatParticipant> existing = participantRepository.findByChatIdAndUserId(chatId, member.getId());
            if (existing.isPresent()) continue;

            participantRepository.save(ChatParticipant.builder()
                    .chat(chat).user(member).role("MEMBER").build());
            addedNames.add(member.getUsername());
        }

        if (!addedNames.isEmpty()) {
            String names = String.join(", ", addedNames);
            saveSystemMessage(chat, requester, requester.getUsername() + " đã thêm " + names + " vào nhóm");

            // Notify tất cả thành viên (bao gồm người mới)
            List<String> allMemberNames = getMemberUsernames(chatId);
            notifyGroupEvent(chatId, allMemberNames, "MEMBERS_ADDED", names);
        }

        return toChatDTO(chat, requester);
    }

    @Transactional
    public ChatDTO removeMember(UUID chatId, String adminUsername, UUID targetUserId) {
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Chat not found"));
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!"GROUP".equals(chat.getType())) {
            throw new RuntimeException("Cannot remove members from a private chat");
        }

        // Kiểm tra quyền admin
        ChatParticipant adminParticipant = participantRepository.findByChatIdAndUserId(chatId, admin.getId())
                .orElseThrow(() -> new RuntimeException("You are not a member of this group"));
        if (!"ADMIN".equals(adminParticipant.getRole())) {
            throw new RuntimeException("Only admins can remove members");
        }

        // Không cho xóa chính mình qua endpoint này
        if (admin.getId().equals(targetUserId)) {
            throw new RuntimeException("Use leave endpoint to leave the group");
        }

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        participantRepository.deleteByChatIdAndUserId(chatId, targetUserId);

        saveSystemMessage(chat, admin, admin.getUsername() + " đã xóa " + targetUser.getUsername() + " khỏi nhóm");

        // Notify remaining members + removed user
        List<String> allMemberNames = getMemberUsernames(chatId);
        allMemberNames.add(targetUser.getUsername());
        notifyGroupEvent(chatId, allMemberNames, "MEMBER_REMOVED", targetUser.getUsername());

        return toChatDTO(chat, admin);
    }

    @Transactional
    public void leaveGroup(UUID chatId, String username) {
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Chat not found"));
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!"GROUP".equals(chat.getType())) {
            throw new RuntimeException("Cannot leave a private chat");
        }

        ChatParticipant participant = participantRepository.findByChatIdAndUserId(chatId, user.getId())
                .orElseThrow(() -> new RuntimeException("You are not a member of this group"));

        boolean wasAdmin = "ADMIN".equals(participant.getRole());

        participantRepository.deleteByChatIdAndUserId(chatId, user.getId());

        // Nếu admin rời → chuyển admin cho người tiếp theo
        if (wasAdmin) {
            List<ChatParticipant> remaining = participantRepository.findByChatId(chatId);
            if (!remaining.isEmpty()) {
                ChatParticipant newAdmin = remaining.get(0);
                newAdmin.setRole("ADMIN");
                participantRepository.save(newAdmin);
            }
        }

        // Kiểm tra còn thành viên không
        long remainingCount = participantRepository.countByChatId(chatId);
        if (remainingCount == 0) {
            // Xóa chat nếu không còn ai
            chatRepository.delete(chat);
            return;
        }

        saveSystemMessage(chat, user, user.getUsername() + " đã rời nhóm");

        // Notify remaining members
        List<String> memberNames = getMemberUsernames(chatId);
        memberNames.add(username); // Notify cả người rời
        notifyGroupEvent(chatId, memberNames, "MEMBER_LEFT", username);
    }

    public List<ChatDTO.MemberDTO> getMembers(UUID chatId) {
        List<ChatParticipant> participants = participantRepository.findByChatId(chatId);
        return participants.stream()
                .map(cp -> ChatDTO.MemberDTO.builder()
                        .id(cp.getUser().getId().toString())
                        .username(cp.getUser().getUsername())
                        .email(cp.getUser().getEmail())
                        .avatarUrl(cp.getUser().getAvatarUrl())
                        .role(cp.getRole())
                        .build())
                .collect(Collectors.toList());
    }

    // ==================== GET CHATS ====================

    public List<ChatDTO> getChatsForUser(String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        List<ChatParticipant> participations = participantRepository.findByUserId(user.getId());

        List<ChatDTO> chatDTOs = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");

        for (ChatParticipant cp : participations) {
            Chat chat = cp.getChat();

            List<ChatParticipant> allParticipants = participantRepository.findByChatId(chat.getId());

            // Tin nhắn cuối cùng
            Optional<Message> lastMsg = messageRepository.findFirstByChatIdOrderBySentAtDesc(chat.getId());

            String chatName = chat.getName();
            UserDTO otherUser = null;
            List<ChatDTO.MemberDTO> members = null;
            int memberCount = allParticipants.size();

            if ("PRIVATE".equals(chat.getType())) {
                // Private chat → tìm người chatcùng
                for (ChatParticipant p : allParticipants) {
                    if (!p.getUser().getId().equals(user.getId())) {
                        otherUser = UserDTO.builder()
                                .id(p.getUser().getId().toString())
                                .username(p.getUser().getUsername())
                                .email(p.getUser().getEmail())
                                .avatarUrl(p.getUser().getAvatarUrl())
                                .build();
                        chatName = otherUser.getUsername();
                        break;
                    }
                }
            } else {
                // Group chat → return members
                members = allParticipants.stream()
                        .map(p -> ChatDTO.MemberDTO.builder()
                                .id(p.getUser().getId().toString())
                                .username(p.getUser().getUsername())
                                .email(p.getUser().getEmail())
                                .avatarUrl(p.getUser().getAvatarUrl())
                                .role(p.getRole())
                                .build())
                        .collect(Collectors.toList());
            }

            chatDTOs.add(ChatDTO.builder()
                    .id(chat.getId().toString())
                    .name(chatName)
                    .type(chat.getType())
                    .lastMessage(lastMsg.map(Message::getContent).orElse(""))
                    .lastMessageTime(lastMsg.map(m -> {
                        if (m.getSentAt() == null) return "";
                        return m.getSentAt().format(formatter);
                    }).orElse(""))
                    .otherUser(otherUser)
                    .members(members)
                    .memberCount(memberCount)
                    .build());
        }

        // Sắp xếp: chat có tin nhắn mới nhất lên đầu
        chatDTOs.sort((a, b) -> {
            String timeA = a.getLastMessageTime();
            String timeB = b.getLastMessageTime();
            if (timeA == null || timeA.isEmpty()) return 1;
            if (timeB == null || timeB.isEmpty()) return -1;
            return timeB.compareTo(timeA);
        });

        return chatDTOs;
    }

    // ==================== HELPERS ====================

    private ChatDTO toChatDTO(Chat chat, User requestingUser) {
        List<ChatParticipant> allParticipants = participantRepository.findByChatId(chat.getId());
        Optional<Message> lastMsg = messageRepository.findFirstByChatIdOrderBySentAtDesc(chat.getId());

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");

        List<ChatDTO.MemberDTO> members = allParticipants.stream()
                .map(p -> ChatDTO.MemberDTO.builder()
                        .id(p.getUser().getId().toString())
                        .username(p.getUser().getUsername())
                        .email(p.getUser().getEmail())
                        .avatarUrl(p.getUser().getAvatarUrl())
                        .role(p.getRole())
                        .build())
                .collect(Collectors.toList());

        return ChatDTO.builder()
                .id(chat.getId().toString())
                .name(chat.getName())
                .type(chat.getType())
                .lastMessage(lastMsg.map(Message::getContent).orElse(""))
                .lastMessageTime(lastMsg.map(m -> {
                    if (m.getSentAt() == null) return "";
                    return m.getSentAt().format(formatter);
                }).orElse(""))
                .members(members)
                .memberCount(allParticipants.size())
                .build();
    }

    private void saveSystemMessage(Chat chat, User actor, String content) {
        Message systemMsg = Message.builder()
                .chat(chat)
                .sender(actor)
                .content(content)
                .messageType("SYSTEM")
                .build();
        messageRepository.save(systemMsg);

        // Broadcast qua WebSocket
        messagingTemplate.convertAndSend("/topic/chat/" + chat.getId(), systemMsg);
    }

    private List<String> getMemberUsernames(UUID chatId) {
        return participantRepository.findByChatId(chatId).stream()
                .map(cp -> cp.getUser().getUsername())
                .collect(Collectors.toList());
    }

    private void notifyGroupEvent(UUID chatId, List<String> usernames, String eventType, String detail) {
        for (String username : usernames) {
            messagingTemplate.convertAndSend("/topic/user/" + username, Map.of(
                    "type", eventType,
                    "chatId", chatId.toString(),
                    "detail", detail
            ));
        }
    }
}

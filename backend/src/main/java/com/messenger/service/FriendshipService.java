package com.messenger.service;

import com.messenger.dto.FriendshipDTO;
import com.messenger.dto.UserDTO;
import com.messenger.entity.Friendship;
import com.messenger.entity.User;
import com.messenger.repository.FriendshipRepository;
import com.messenger.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @Transactional
    public FriendshipDTO sendRequest(String requesterUsername, UUID receiverId) {
        User requester = userRepository.findByUsername(requesterUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        if (requester.getId().equals(receiverId)) {
            throw new RuntimeException("Không thể kết bạn với chính mình");
        }

        // Kiểm tra đã có friendship chưa
        Optional<Friendship> existing = friendshipRepository.findBetweenUsers(requester.getId(), receiverId);
        if (existing.isPresent()) {
            Friendship f = existing.get();
            if ("ACCEPTED".equals(f.getStatus())) {
                throw new RuntimeException("Đã là bạn bè");
            }
            if ("PENDING".equals(f.getStatus())) {
                // Nếu người nhận gửi lại → auto accept
                if (f.getReceiver().getId().equals(requester.getId())) {
                    f.setStatus("ACCEPTED");
                    friendshipRepository.save(f);
                    notifyUser(receiver.getUsername(), "FRIEND_ACCEPTED", requester);
                    notifyUser(requester.getUsername(), "FRIEND_ACCEPTED", receiver);
                    return toDTO(f, requester);
                }
                throw new RuntimeException("Đã gửi lời mời kết bạn");
            }
            if ("REJECTED".equals(f.getStatus())) {
                // Cho phép gửi lại sau khi bị từ chối
                f.setStatus("PENDING");
                f.setRequester(requester);
                f.setReceiver(receiver);
                friendshipRepository.save(f);
                notifyUser(receiver.getUsername(), "FRIEND_REQUEST", requester);
                return toDTO(f, requester);
            }
        }

        Friendship friendship = Friendship.builder()
                .requester(requester)
                .receiver(receiver)
                .status("PENDING")
                .build();
        friendship = friendshipRepository.save(friendship);

        // Notify receiver
        notifyUser(receiver.getUsername(), "FRIEND_REQUEST", requester);

        return toDTO(friendship, requester);
    }

    @Transactional
    public FriendshipDTO acceptRequest(UUID friendshipId, String username) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new RuntimeException("Friend request not found"));
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Chỉ receiver mới có quyền accept
        if (!friendship.getReceiver().getId().equals(user.getId())) {
            throw new RuntimeException("Bạn không có quyền chấp nhận lời mời này");
        }
        if (!"PENDING".equals(friendship.getStatus())) {
            throw new RuntimeException("Lời mời không ở trạng thái chờ");
        }

        friendship.setStatus("ACCEPTED");
        friendshipRepository.save(friendship);

        // Notify requester
        notifyUser(friendship.getRequester().getUsername(), "FRIEND_ACCEPTED", user);

        return toDTO(friendship, user);
    }

    @Transactional
    public void rejectRequest(UUID friendshipId, String username) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new RuntimeException("Friend request not found"));
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!friendship.getReceiver().getId().equals(user.getId())) {
            throw new RuntimeException("Bạn không có quyền từ chối lời mời này");
        }
        if (!"PENDING".equals(friendship.getStatus())) {
            throw new RuntimeException("Lời mời không ở trạng thái chờ");
        }

        friendship.setStatus("REJECTED");
        friendshipRepository.save(friendship);
    }

    @Transactional
    public void unfriend(String username, UUID otherUserId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Friendship friendship = friendshipRepository.findBetweenUsers(user.getId(), otherUserId)
                .orElseThrow(() -> new RuntimeException("Không phải bạn bè"));

        if (!"ACCEPTED".equals(friendship.getStatus())) {
            throw new RuntimeException("Không phải bạn bè");
        }

        friendshipRepository.delete(friendship);

        // Notify other user
        User otherUser = userRepository.findById(otherUserId).orElse(null);
        if (otherUser != null) {
            notifyUser(otherUser.getUsername(), "FRIEND_REMOVED", user);
        }
    }

    public List<FriendshipDTO> getFriends(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return friendshipRepository.findAcceptedFriendships(user.getId()).stream()
                .map(f -> toDTO(f, user))
                .collect(Collectors.toList());
    }

    public List<FriendshipDTO> getPendingRequests(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return friendshipRepository.findPendingRequestsForUser(user.getId()).stream()
                .map(f -> toDTO(f, user))
                .collect(Collectors.toList());
    }

    public long getPendingCount(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return friendshipRepository.countPendingRequests(user.getId());
    }

    public String getStatus(String username, UUID otherUserId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Optional<Friendship> friendship = friendshipRepository.findBetweenUsers(user.getId(), otherUserId);
        if (friendship.isEmpty()) return "NONE";

        Friendship f = friendship.get();
        if ("ACCEPTED".equals(f.getStatus())) return "FRIENDS";
        if ("PENDING".equals(f.getStatus())) {
            if (f.getRequester().getId().equals(user.getId())) return "SENT";
            return "RECEIVED";
        }
        return "NONE"; // REJECTED → treat as no relationship
    }

    // ==================== HELPERS ====================

    private FriendshipDTO toDTO(Friendship f, User currentUser) {
        User otherUser = f.getRequester().getId().equals(currentUser.getId())
                ? f.getReceiver()
                : f.getRequester();

        return FriendshipDTO.builder()
                .id(f.getId().toString())
                .status(f.getStatus())
                .user(UserDTO.builder()
                        .id(otherUser.getId().toString())
                        .username(otherUser.getUsername())
                        .email(otherUser.getEmail())
                        .avatarUrl(otherUser.getAvatarUrl())
                        .build())
                .createdAt(f.getCreatedAt() != null ? f.getCreatedAt().format(FORMATTER) : "")
                .isRequester(f.getRequester().getId().equals(currentUser.getId()))
                .build();
    }

    private void notifyUser(String username, String eventType, User aboutUser) {
        messagingTemplate.convertAndSend("/topic/user/" + username, Map.of(
                "type", eventType,
                "userId", aboutUser.getId().toString(),
                "username", aboutUser.getUsername()
        ));
    }
}

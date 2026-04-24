package com.messenger.controller;

import com.messenger.dto.FriendshipDTO;
import com.messenger.service.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/friends")
@RequiredArgsConstructor
public class FriendshipController {

    private final FriendshipService friendshipService;

    // Gửi lời mời kết bạn
    @PostMapping("/request/{userId}")
    public ResponseEntity<?> sendRequest(@PathVariable UUID userId, Principal principal) {
        try {
            FriendshipDTO dto = friendshipService.sendRequest(principal.getName(), userId);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Chấp nhận lời mời
    @PostMapping("/accept/{friendshipId}")
    public ResponseEntity<?> acceptRequest(@PathVariable UUID friendshipId, Principal principal) {
        try {
            FriendshipDTO dto = friendshipService.acceptRequest(friendshipId, principal.getName());
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Từ chối lời mời
    @PostMapping("/reject/{friendshipId}")
    public ResponseEntity<?> rejectRequest(@PathVariable UUID friendshipId, Principal principal) {
        try {
            friendshipService.rejectRequest(friendshipId, principal.getName());
            return ResponseEntity.ok(Map.of("message", "Đã từ chối"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Hủy kết bạn
    @DeleteMapping("/{userId}")
    public ResponseEntity<?> unfriend(@PathVariable UUID userId, Principal principal) {
        try {
            friendshipService.unfriend(principal.getName(), userId);
            return ResponseEntity.ok(Map.of("message", "Đã hủy kết bạn"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Danh sách bạn bè
    @GetMapping
    public List<FriendshipDTO> getFriends(Principal principal) {
        return friendshipService.getFriends(principal.getName());
    }

    // Lời mời đang chờ (nhận được)
    @GetMapping("/requests")
    public List<FriendshipDTO> getPendingRequests(Principal principal) {
        return friendshipService.getPendingRequests(principal.getName());
    }

    // Số lời mời đang chờ
    @GetMapping("/requests/count")
    public Map<String, Long> getPendingCount(Principal principal) {
        return Map.of("count", friendshipService.getPendingCount(principal.getName()));
    }

    // Trạng thái friendship với 1 user
    @GetMapping("/status/{userId}")
    public Map<String, String> getStatus(@PathVariable UUID userId, Principal principal) {
        return Map.of("status", friendshipService.getStatus(principal.getName(), userId));
    }
}

package com.messenger.controller;

import com.messenger.dto.AddMembersRequest;
import com.messenger.dto.ChatDTO;
import com.messenger.dto.CreateGroupRequest;
import com.messenger.dto.RenameGroupRequest;
import com.messenger.entity.Chat;
import com.messenger.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/chats")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    // ==================== EXISTING ====================

    @GetMapping
    public List<ChatDTO> getMyChats(Principal principal) {
        return chatService.getChatsForUser(principal.getName());
    }

    @PostMapping("/private")
    public Chat createPrivateChat(@RequestBody Map<String, String> body, Principal principal) {
        String otherUsername = body.get("otherUsername");
        return chatService.createPrivateChat(principal.getName(), otherUsername);
    }

    // ==================== GROUP CHAT ====================

    @PostMapping("/group")
    public ResponseEntity<?> createGroupChat(@RequestBody CreateGroupRequest request, Principal principal) {
        try {
            if (request.getGroupName() == null || request.getGroupName().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Tên nhóm không được để trống"));
            }
            if (request.getMemberUsernames() == null || request.getMemberUsernames().size() < 2) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Nhóm cần ít nhất 2 thành viên khác"));
            }
            ChatDTO chat = chatService.createGroupChat(
                    principal.getName(),
                    request.getGroupName().trim(),
                    request.getMemberUsernames()
            );
            return ResponseEntity.ok(chat);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{chatId}/name")
    public ResponseEntity<?> renameGroup(
            @PathVariable UUID chatId,
            @RequestBody RenameGroupRequest request,
            Principal principal) {
        try {
            if (request.getNewName() == null || request.getNewName().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Tên nhóm không được để trống"));
            }
            ChatDTO chat = chatService.renameGroup(chatId, principal.getName(), request.getNewName().trim());
            return ResponseEntity.ok(chat);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{chatId}/members")
    public ResponseEntity<?> addMembers(
            @PathVariable UUID chatId,
            @RequestBody AddMembersRequest request,
            Principal principal) {
        try {
            if (request.getUsernames() == null || request.getUsernames().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Danh sách thành viên không được trống"));
            }
            ChatDTO chat = chatService.addMembers(chatId, principal.getName(), request.getUsernames());
            return ResponseEntity.ok(chat);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{chatId}/members/{userId}")
    public ResponseEntity<?> removeMember(
            @PathVariable UUID chatId,
            @PathVariable UUID userId,
            Principal principal) {
        try {
            ChatDTO chat = chatService.removeMember(chatId, principal.getName(), userId);
            return ResponseEntity.ok(chat);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{chatId}/leave")
    public ResponseEntity<?> leaveGroup(
            @PathVariable UUID chatId,
            Principal principal) {
        try {
            chatService.leaveGroup(chatId, principal.getName());
            return ResponseEntity.ok(Map.of("message", "Đã rời nhóm"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{chatId}/members")
    public ResponseEntity<?> getMembers(@PathVariable UUID chatId) {
        try {
            List<ChatDTO.MemberDTO> members = chatService.getMembers(chatId);
            return ResponseEntity.ok(members);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}

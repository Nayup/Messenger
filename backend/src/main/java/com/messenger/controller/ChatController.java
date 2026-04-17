package com.messenger.controller;

import com.messenger.dto.ChatDTO;
import com.messenger.entity.Chat;
import com.messenger.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chats")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping
    public List<ChatDTO> getMyChats(Principal principal) {
        return chatService.getChatsForUser(principal.getName());
    }

    @PostMapping("/private")
    public Chat createPrivateChat(@RequestBody Map<String, String> body, Principal principal) {
        String otherUsername = body.get("otherUsername");
        return chatService.createPrivateChat(principal.getName(), otherUsername);
    }
}

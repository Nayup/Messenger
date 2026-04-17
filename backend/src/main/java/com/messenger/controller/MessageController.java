package com.messenger.controller;

import com.messenger.dto.MessageDTO;
import com.messenger.entity.Message;
import com.messenger.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload MessageDTO message) {
        messageService.saveAndBroadcast(message);
    }

    @GetMapping("/api/chats/{chatId}/messages")
    public List<Message> getMessages(@PathVariable UUID chatId) {
        return messageService.getMessages(chatId);
    }
}

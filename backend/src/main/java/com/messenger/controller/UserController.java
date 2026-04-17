package com.messenger.controller;

import com.messenger.dto.UserDTO;
import com.messenger.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public List<UserDTO> getAllUsers(Principal principal) {
        return userService.getAllUsersExcept(principal.getName());
    }

    @GetMapping("/search")
    public List<UserDTO> searchUsers(@RequestParam String q) {
        return userService.searchUsers(q);
    }
}

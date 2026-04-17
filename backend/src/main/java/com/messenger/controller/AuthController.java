package com.messenger.controller;

import com.messenger.dto.AuthRequest;
import com.messenger.dto.AuthResponse;
import com.messenger.entity.User;
import com.messenger.service.UserService;
import com.messenger.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest req) {
        // Kiểm tra username đã tồn tại
        if (userService.findByUsername(req.getUsername()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(java.util.Map.of("error", "Username đã tồn tại"));
        }

        User user = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .passwordHash(req.getPassword())
                .build();

        User saved = userService.register(user);
        String token = jwtUtil.generateToken(saved.getUsername());

        return ResponseEntity.ok(new AuthResponse(token, saved.getUsername(), saved.getId().toString()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest req) {
        User user = userService.findByUsername(req.getUsername())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(java.util.Map.of("error", "Tài khoản không tồn tại"));
        }

        if (!userService.authenticate(req.getUsername(), req.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(java.util.Map.of("error", "Sai mật khẩu"));
        }

        String token = jwtUtil.generateToken(user.getUsername());
        return ResponseEntity.ok(new AuthResponse(token, user.getUsername(), user.getId().toString()));
    }
}

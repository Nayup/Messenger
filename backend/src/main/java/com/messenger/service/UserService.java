package com.messenger.service;

import com.messenger.dto.UserDTO;
import com.messenger.entity.User;
import com.messenger.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User register(User user) {
        user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
        return userRepository.save(user);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public boolean authenticate(String username, String rawPassword) {
        Optional<User> user = userRepository.findByUsername(username);
        return user.isPresent() && passwordEncoder.matches(rawPassword, user.get().getPasswordHash());
    }

    public List<UserDTO> getAllUsersExcept(String username) {
        return userRepository.findByUsernameNot(username).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<UserDTO> searchUsers(String keyword) {
        return userRepository.findByUsernameContainingIgnoreCase(keyword).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public UserDTO toDTO(User user) {
        return UserDTO.builder()
                .id(user.getId().toString())
                .username(user.getUsername())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }
}

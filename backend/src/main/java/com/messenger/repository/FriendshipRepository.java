package com.messenger.repository;

import com.messenger.entity.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FriendshipRepository extends JpaRepository<Friendship, UUID> {

    // Tìm friendship giữa 2 user (cả 2 chiều)
    @Query("SELECT f FROM Friendship f WHERE " +
           "(f.requester.id = :userId1 AND f.receiver.id = :userId2) OR " +
           "(f.requester.id = :userId2 AND f.receiver.id = :userId1)")
    Optional<Friendship> findBetweenUsers(@Param("userId1") UUID userId1, @Param("userId2") UUID userId2);

    // Lời mời đang chờ MÀ user nhận được
    @Query("SELECT f FROM Friendship f WHERE f.receiver.id = :userId AND f.status = 'PENDING' ORDER BY f.createdAt DESC")
    List<Friendship> findPendingRequestsForUser(@Param("userId") UUID userId);

    // Lời mời đang chờ MÀ user đã gửi
    @Query("SELECT f FROM Friendship f WHERE f.requester.id = :userId AND f.status = 'PENDING' ORDER BY f.createdAt DESC")
    List<Friendship> findPendingSentByUser(@Param("userId") UUID userId);

    // Danh sách bạn bè (ACCEPTED)
    @Query("SELECT f FROM Friendship f WHERE " +
           "(f.requester.id = :userId OR f.receiver.id = :userId) AND f.status = 'ACCEPTED' " +
           "ORDER BY f.updatedAt DESC")
    List<Friendship> findAcceptedFriendships(@Param("userId") UUID userId);

    // Đếm lời mời đang chờ
    @Query("SELECT COUNT(f) FROM Friendship f WHERE f.receiver.id = :userId AND f.status = 'PENDING'")
    long countPendingRequests(@Param("userId") UUID userId);
}

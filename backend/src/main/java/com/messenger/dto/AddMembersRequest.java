package com.messenger.dto;

import lombok.Data;
import java.util.List;

@Data
public class AddMembersRequest {
    private List<String> usernames;
}

package com.danphe.emr.controller;

import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.model.TeamChatMessage;
import com.danphe.emr.security.SecurityUtil;
import com.danphe.emr.service.TeamChatService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/TeamChat")
@RequiredArgsConstructor
public class TeamChatController {

    private final TeamChatService teamChatService;

    @GetMapping("/Channels")
    public ResponseEntity<?> getChannels() {
        return ResponseEntity.ok(DanpheHttpResponse.ok(teamChatService.getAvailableChannels()));
    }

    @GetMapping("/Messages")
    public ResponseEntity<?> getMessages(@RequestParam(required = false, defaultValue = "general") String channel) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.status(401).body(DanpheHttpResponse.error("Hospital ID not found in session"));
        }
        List<TeamChatMessage> messages = teamChatService.getMessages(hospitalId, channel);
        return ResponseEntity.ok(DanpheHttpResponse.ok(messages));
    }

    @PostMapping("/Messages")
    public ResponseEntity<?> postMessage(@RequestBody MessageRequest request) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.status(401).body(DanpheHttpResponse.error("Hospital ID not found in session"));
        }
        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(DanpheHttpResponse.error("Message cannot be empty"));
        }

        try {
            TeamChatMessage saved = teamChatService.postMessage(
                    hospitalId,
                    request.getChannel(),
                    request.getMessage(),
                    request.getIsUrgent()
            );
            return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(DanpheHttpResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/Purge")
    public ResponseEntity<?> manualPurge() {
        int purged = teamChatService.purgeExpiredMessages();
        return ResponseEntity.ok(DanpheHttpResponse.ok(Map.of("purgedCount", purged, "message", "Expired messages older than 7 days purged successfully")));
    }

    @Data
    public static class MessageRequest {
        private String channel;
        private String message;
        private Boolean isUrgent;
    }
}

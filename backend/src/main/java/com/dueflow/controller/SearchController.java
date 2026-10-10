package com.dueflow.controller;

import com.dueflow.dto.SearchResponseDto;
import com.dueflow.security.SecurityUtils;
import com.dueflow.service.SearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public ResponseEntity<SearchResponseDto> search(@RequestParam(value = "q", defaultValue = "") String query) {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(searchService.globalSearch(userId, query));
    }
}

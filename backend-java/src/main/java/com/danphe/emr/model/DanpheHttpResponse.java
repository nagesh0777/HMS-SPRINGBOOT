package com.danphe.emr.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class DanpheHttpResponse<T> {

    @JsonProperty("Status")
    private String status;

    @JsonProperty("Results")
    private T results;

    @JsonProperty("ErrorMessage")
    private String errorMessage;

    public DanpheHttpResponse() {
        this.status = "OK";
    }

    public static <T> DanpheHttpResponse<T> ok(T results) {
        DanpheHttpResponse<T> response = new DanpheHttpResponse<>();
        response.setResults(results);
        response.setStatus("OK");
        return response;
    }

    public static <T> DanpheHttpResponse<T> error(String message) {
        DanpheHttpResponse<T> response = new DanpheHttpResponse<>();
        response.setStatus("Failed");
        response.setErrorMessage(message);
        return response;
    }
}

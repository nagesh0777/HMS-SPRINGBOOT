package com.danphe.emr.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import java.io.IOException;

@Component
public class RequestLoggingFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        System.out.println("DEBUG: Incoming Request: " + req.getMethod() + " " + req.getRequestURI());

        chain.doFilter(request, response);

        System.out.println("DEBUG: Outgoing Response: " + res.getStatus() + " for " + req.getRequestURI());
    }
}

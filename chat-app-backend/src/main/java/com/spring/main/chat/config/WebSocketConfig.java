package com.spring.main.chat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(final StompEndpointRegistry registry) {
        // here connnection will going to be established
        registry.addEndpoint("/chat")
                .setAllowedOriginPatterns(
                        "https://talk-circuit.vercel.app", "http://localhost:5173")
                .withSockJS();
        // .setClientLibraryUrl("https://cdn.jsdelivr.net/sockjs/1/sockjs.min.js")
        // .setStreamBytesLimit(6 * 1024 * 1024) // Optional, helps for SockJS
        // .setSessionCookieNeeded(false);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");

        // /app/chat
        // server side: @MessagingMapping("/chat")
        config.setApplicationDestinationPrefixes("/app");

    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registry) {
        registry.setMessageSizeLimit(6 * 1024 * 1024);
        registry.setSendBufferSizeLimit(6 * 1024 * 1024);
        registry.setSendTimeLimit(60 * 1000);
    }

}

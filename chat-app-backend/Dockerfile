# Use official Maven + Java 17 image to build the app
FROM maven:3.9.6-eclipse-temurin-17 AS builder

# Set working directory
WORKDIR /app

# Copy project files and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy full source and build the app
COPY src ./src
RUN mvn clean package -DskipTests

# Use a slim Java 17 image to run the app
FROM eclipse-temurin:17-jdk-alpine

# Set working directory
WORKDIR /app

# Copy the built jar from builder
COPY --from=builder /app/target/chat-app-backend-0.0.1-SNAPSHOT.jar app.jar

# Set the entrypoint to run your jar
ENTRYPOINT ["java", "-jar", "app.jar"]

# Expose the port Spring Boot runs on
EXPOSE 8080

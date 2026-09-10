# Build stage — eclipse-temurin:21 (slim) supports linux/arm64
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom and download dependencies (cache layer)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN mvn clean package -DskipTests -B

# Run stage — eclipse-temurin:21-jre supports linux/arm64
FROM eclipse-temurin:21-jre
WORKDIR /app

# Create a non-root user for security
RUN groupadd -r spring && useradd -r -g spring spring

# Create uploads directory and grant ownership permissions
RUN mkdir -p /app/uploads && chown -R spring:spring /app/uploads /app

# USER spring:spring

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# Use optimized JVM flags for container environments
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

# Multi-stage build for DueFlow Java 21 Backend
FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /workspace

# Copy POM and source code
COPY pom.xml .
COPY src src

# Package production executable JAR without running tests (tests run in CI/pre-deploy)
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as non-root user for container security
RUN addgroup -S dueflow && adduser -S dueflow -G dueflow
USER dueflow:dueflow

# Copy repackaged spring-boot fat jar
COPY --from=build /workspace/target/dueflow-backend-1.0.0.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-Dserver.port=${PORT}", "-jar", "app.jar"]

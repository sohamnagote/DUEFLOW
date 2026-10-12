# Multi-stage build for DueFlow Java 21 Spring Boot Backend
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependency download
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Copy source code and build production fat jar
COPY src ./src
RUN mvn clean package -DskipTests -B

# Runtime stage: Lightweight Java 21 JRE
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy repackaged Spring Boot fat jar
COPY --from=build /app/target/dueflow-backend-*.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]

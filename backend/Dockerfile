# Build stage: Maven with Eclipse Temurin Java 21
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependency download
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Copy source and build jar
COPY src ./src
RUN mvn clean package -DskipTests -B

# Runtime stage: Lightweight Java 21 JRE
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]

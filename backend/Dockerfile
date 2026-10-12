# Multi-stage build for DueFlow Java 21 Backend
FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /workspace

# Copy build files regardless of whether build context is repo root or ./backend
COPY . .

# Build executable Spring Boot jar
RUN if [ -f pom.xml ]; then \
      mvn clean package -DskipTests; \
    elif [ -f backend/pom.xml ]; then \
      cd backend && mvn clean package -DskipTests && mkdir -p /workspace/target && cp target/*.jar /workspace/target/; \
    else \
      echo "Error: pom.xml not found" && exit 1; \
    fi

# Runtime stage: Lightweight Java 21 JRE
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as non-root user for container security
RUN addgroup -S dueflow && adduser -S dueflow -G dueflow

# Copy repackaged Spring Boot fat jar with non-root ownership
COPY --from=build --chown=dueflow:dueflow /workspace/target/*.jar app.jar

USER dueflow:dueflow

ENV PORT=8080
EXPOSE 8080 10000

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]

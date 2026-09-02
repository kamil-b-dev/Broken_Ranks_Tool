FROM node:22-alpine AS frontend-build
WORKDIR /workspace/frontend
COPY Broken_Ranks_Tool_Frontend/package.json Broken_Ranks_Tool_Frontend/package-lock.json ./
RUN npm ci
COPY Broken_Ranks_Tool_Frontend/ ./
RUN npm run build

FROM maven:3.9.12-eclipse-temurin-21 AS backend-build
WORKDIR /workspace/backend
COPY Broken_Ranks_Tool_Backend/pom.xml ./
RUN mvn -B dependency:go-offline
COPY Broken_Ranks_Tool_Backend/src ./src
COPY --from=frontend-build /workspace/frontend/dist ./src/main/resources/static
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app --home-dir /app app \
    && mkdir -p /app/data && chown -R app:app /app
COPY --from=backend-build --chown=app:app /workspace/backend/target/Broken_Ranks_Tool_Backend-*.jar /app/application.jar
COPY --chown=app:app Broken_Ranks_Tool_Backend/broken_ranks.db /app/data/broken_ranks.db
USER app
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/application.jar"]

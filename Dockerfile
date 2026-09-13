FROM node:26-alpine AS frontend-build
WORKDIR /workspace/frontend
COPY Broken_Ranks_Tool_Frontend/package.json Broken_Ranks_Tool_Frontend/package-lock.json ./
RUN npm ci
COPY Broken_Ranks_Tool_Frontend/ ./
RUN npm run build && npm run check:bundle-size

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
    && mkdir -p /app/data
COPY --from=backend-build --chown=root:root /workspace/backend/target/Broken_Ranks_Tool_Backend-*.jar /app/application.jar
COPY --chown=root:root Broken_Ranks_Tool_Backend/database/catalog/broken_ranks.db /app/data/broken_ranks.db
RUN chmod 0555 /app /app/data \
    && chmod 0444 /app/application.jar /app/data/broken_ranks.db
USER app
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/application.jar"]

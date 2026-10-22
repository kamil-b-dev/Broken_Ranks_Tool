FROM node:22-alpine AS frontend-build
WORKDIR /workspace/frontend
COPY Broken_Ranks_Tool_Frontend/package.json Broken_Ranks_Tool_Frontend/package-lock.json ./
RUN npm ci
COPY Broken_Ranks_Tool_Frontend/ ./
RUN npm run build && npm run check:bundle-size

FROM eclipse-temurin:21-jdk-alpine AS backend-build
RUN apk add --no-cache unzip
WORKDIR /workspace/backend
COPY Broken_Ranks_Tool_Backend/pom.xml ./
COPY Broken_Ranks_Tool_Backend/mvnw ./
COPY Broken_Ranks_Tool_Backend/.mvn ./.mvn
RUN chmod +x mvnw && ./mvnw -B dependency:go-offline
COPY Broken_Ranks_Tool_Backend/src ./src
COPY --from=frontend-build /workspace/frontend/dist ./src/main/resources/static
RUN ./mvnw -B -DskipTests package

FROM eclipse-temurin:21-jre-jammy@sha256:e9aaf73145bbd1f9f6ec7f6867dd75a44f34b1a6c32a813504bf4129be2d09d7 AS runtime
WORKDIR /app
RUN apt-get update \
    && apt-get install --only-upgrade --no-install-recommends -y libssl3 openssl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app && useradd --system --gid app --home-dir /app app \
    && mkdir -p /app/data
COPY --from=backend-build --chown=root:root /workspace/backend/target/Broken_Ranks_Tool_Backend-*.jar /app/application.jar
COPY --chown=root:root Broken_Ranks_Tool_Backend/database/catalog/broken_ranks.db /app/data/broken_ranks.db
RUN chmod 0555 /app /app/data \
    && chmod 0444 /app/application.jar /app/data/broken_ranks.db
USER app
ENV SPRING_PROFILES_ACTIVE=prod
ENV JAVA_TOOL_OPTIONS="-Xms128m -Xmx2g -XX:MaxMetaspaceSize=256m -XX:+UseG1GC"
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+ExitOnOutOfMemoryError", "-jar", "/app/application.jar"]

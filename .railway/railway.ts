import { defineRailway, github, project, service } from "railway/iac";

export default defineRailway(() => {
    const application = service("broken-ranks-tool", {
        source: github("kamil-b-dev/Broken_Ranks_Tool", { branch: "master" }),
        healthcheck: "/actuator/health/readiness",
        replicas: { "europe-west4-drams3a": 1 },
        env: {
            SPRING_PROFILES_ACTIVE: "prod",
            JAVA_TOOL_OPTIONS:
                "-Xms128m -Xmx640m -XX:MaxMetaspaceSize=128m -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError",
            OPTIMIZER_MAX_CONCURRENT_RUNS: "1",
            OPTIMIZER_CLIENT_REQUESTS_PER_MINUTE: "3",
            OPTIMIZER_GLOBAL_REQUESTS_PER_MINUTE: "12",
            CALCULATOR_CLIENT_REQUESTS_PER_MINUTE: "120",
            CALCULATOR_GLOBAL_REQUESTS_PER_MINUTE: "600",
            ABUSE_PROTECTION_MAX_REQUEST_BYTES: "262144",
        },
    });

    return project("Broken Ranks Tool", { resources: [application] });
});

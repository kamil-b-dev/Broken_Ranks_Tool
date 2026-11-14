import { defineRailway, github, project, service } from "railway/iac";

export default defineRailway(() => {
    const application = service("broken-ranks-tool", {
        source: github("kamil-b-dev/Broken_Ranks_Tool", { branch: "master" }),
        healthcheck: "/actuator/health/readiness",
        replicas: { "europe-west4-drams3a": 1 },
        env: {
            SPRING_PROFILES_ACTIVE: "prod",
            JAVA_TOOL_OPTIONS:
                "-Xms128m -Xmx2g -XX:MaxMetaspaceSize=256m -XX:+UseG1GC -XX:G1PeriodicGCInterval=60000 -XX:+G1PeriodicGCInvokesConcurrent -XX:+ExitOnOutOfMemoryError",
            OPTIMIZER_MAX_CONCURRENT_RUNS: "1",
            // This service is reachable exclusively through Railway's HTTP/HTTPS edge.
            TRUST_RAILWAY_CLIENT_IP: "true",
            OPTIMIZER_INGRESS_CLIENT_REQUESTS_PER_MINUTE: "60",
            OPTIMIZER_INGRESS_GLOBAL_REQUESTS_PER_MINUTE: "600",
            OPTIMIZER_CLIENT_REQUESTS_PER_MINUTE: "5",
            OPTIMIZER_GLOBAL_REQUESTS_PER_MINUTE: "20",
            CALCULATOR_CLIENT_REQUESTS_PER_MINUTE: "120",
            CALCULATOR_GLOBAL_REQUESTS_PER_MINUTE: "600",
            CONTROL_CLIENT_REQUESTS_PER_MINUTE: "30",
            CONTROL_GLOBAL_REQUESTS_PER_MINUTE: "300",
            PUBLIC_DATA_CLIENT_REQUESTS_PER_MINUTE: "300",
            PUBLIC_DATA_GLOBAL_REQUESTS_PER_MINUTE: "3000",
            ABUSE_PROTECTION_MAX_REQUEST_BYTES: "262144",
            REQUEST_BODY_TIMEOUT: "15s",
            REQUEST_BODY_MAX_PENDING_REQUESTS: "8",
            REQUEST_BODY_MAX_PENDING_PER_CLIENT: "2",
        },
    });

    return project("Broken Ranks Tool", { resources: [application] });
});

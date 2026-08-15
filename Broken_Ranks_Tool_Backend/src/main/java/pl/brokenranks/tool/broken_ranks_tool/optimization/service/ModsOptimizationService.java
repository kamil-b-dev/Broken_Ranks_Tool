package pl.brokenranks.tool.broken_ranks_tool.optimization.service;

import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;

public interface ModsOptimizationService {
    /**
     * Optimizes equipment modifications according to user priorities and constraints.
     * @param request Baseline equipment, priorities, targets, and locks.
     * @return Optimized setup with a result summary and optional suggestions.
     */
    OptimizationResponse optimize(OptimizationRequest request);
}

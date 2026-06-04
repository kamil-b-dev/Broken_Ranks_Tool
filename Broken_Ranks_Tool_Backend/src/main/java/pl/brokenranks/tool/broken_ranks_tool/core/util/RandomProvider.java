package pl.brokenranks.tool.broken_ranks_tool.core.util;

public interface RandomProvider {
    int nextInt(int bound);
    double nextDouble();
}
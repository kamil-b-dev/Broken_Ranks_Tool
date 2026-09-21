package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import java.util.Objects;

/** Identifies a build element that may be changed at most once in an advisor plan. */
sealed interface AdvisorChangeKey {
    String slot();

    record Stars(String slot) implements AdvisorChangeKey {
        public Stars {
            Objects.requireNonNull(slot, "slot");
        }
    }

    record Item(String slot) implements AdvisorChangeKey {
        public Item {
            Objects.requireNonNull(slot, "slot");
        }
    }

    record Drif(String slot, int index) implements AdvisorChangeKey {
        public Drif {
            Objects.requireNonNull(slot, "slot");
            if (index < 0) throw new IllegalArgumentException("Drif index cannot be negative");
        }
    }
}

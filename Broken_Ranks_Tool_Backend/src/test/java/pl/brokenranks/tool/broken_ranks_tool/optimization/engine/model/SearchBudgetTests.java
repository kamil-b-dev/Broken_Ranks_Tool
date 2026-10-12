package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class SearchBudgetTests {
    @Test
    void reportsInitialConsumedAndRemainingWithoutOverconsumption() {
        SearchBudget budget = new SearchBudget(2);
        assertEquals(2, budget.initial());
        assertEquals(0, budget.consumed());
        assertFalse(budget.exhausted());
        assertTrue(budget.tryConsume());
        assertEquals(1, budget.remaining());
        assertTrue(budget.tryConsume());
        assertFalse(budget.tryConsume());
        assertEquals(2, budget.consumed());
        assertEquals(0, budget.remaining());
        assertTrue(budget.exhausted());
    }

    @Test
    void negativeOrZeroBudgetIsEmpty() {
        for (int initial : new int[] {-1, 0}) {
            SearchBudget budget = new SearchBudget(initial);
            assertEquals(0, budget.initial());
            assertEquals(0, budget.consumed());
            assertFalse(budget.tryConsume());
        }
    }
}

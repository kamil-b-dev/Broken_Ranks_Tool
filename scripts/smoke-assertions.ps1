function Assert-SmokeOptimizationResult {
    param([object]$Result, [object]$OriginalSlots)

    if ($null -eq $Result.summary -or $Result.summary.success -ne $true) {
        throw "Optimization failed: $($Result.summary.message)"
    }
    if ($null -eq $Result.optimizedSetup.slots -or $Result.summary.drifsPlaced -lt 1) {
        throw "Optimization did not return a populated build."
    }
    $placed = 0
    foreach ($entry in $OriginalSlots.GetEnumerator()) {
        $slot = $Result.optimizedSetup.slots.($entry.Key)
        if ($null -eq $slot -or $slot.itemId -ne $entry.Value.itemId -or $slot.itemStars -ne $entry.Value.itemStars) {
            throw "Optimization changed or omitted item context in slot $($entry.Key)."
        }
        $placed += @($slot.drifIds | Where-Object { $null -ne $_ }).Count
    }
    if ($placed -lt 1 -or $placed -ne $Result.summary.drifsPlaced) {
        throw "Optimization returned no drifs or an inconsistent placement count."
    }
    if ($null -eq $Result.calculationResult.stats) {
        throw "Optimization did not include calculator statistics."
    }
}

function Assert-SmokeCalculationParity {
    param([object]$Expected, [object]$Actual)

    $expectedStats = @($Expected.stats.PSObject.Properties)
    $actualStats = @($Actual.stats.PSObject.Properties)
    if ($expectedStats.Count -eq 0 -or $expectedStats.Count -ne $actualStats.Count) {
        throw "Optimizer and calculator statistics have different keys."
    }
    foreach ($stat in $expectedStats) {
        $actualProperty = $Actual.stats.PSObject.Properties[$stat.Name]
        if ($null -eq $actualProperty -or $actualProperty.Value -cne $stat.Value) {
            throw "Optimizer and calculator disagree on statistic $($stat.Name)."
        }
    }
}

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/smoke-assertions.ps1"

function Assert-Rejected {
    param([scriptblock]$Operation)
    $rejected = $false
    try { & $Operation } catch { $rejected = $true }
    if (-not $rejected) { throw "Invalid smoke result was accepted." }
}

$legacyHtml = '<title>Broken Ranks Tool</title><div id="root"></div><script type="module" src="/assets/app.js"></script>'
$prerenderedHtml = '<title>Broken Ranks Tool - kalkulator</title><div id="root"><main><h1>Broken Ranks Tool</h1></main></div><script type="module" src="/assets/app.js"></script>'
Assert-SmokeFrontendHtml 200 $legacyHtml
Assert-SmokeFrontendHtml 200 $prerenderedHtml
Assert-Rejected { Assert-SmokeFrontendHtml 503 $prerenderedHtml }
Assert-Rejected { Assert-SmokeFrontendHtml 200 '<title>Broken Ranks Tool</title><p>Proxy error</p>' }
Assert-Rejected { Assert-SmokeFrontendHtml 200 '<title>Other app</title><div id="root"></div><script type="module"></script>' }
Assert-Rejected { Assert-SmokeFrontendHtml 200 '<title>Broken Ranks Tool</title><div id="root"></div>' }

$slots = @{ helmet = @{ itemId = 1; itemStars = 5 } }
$result = '{"summary":{"success":true,"drifsPlaced":1},"optimizedSetup":{"slots":{"helmet":{"itemId":1,"itemStars":5,"drifIds":[1]}}},"calculationResult":{"stats":{"Krytyk":"5%"}}}' | ConvertFrom-Json
Assert-SmokeOptimizationResult $result $slots
Assert-SmokeCalculationParity $result.calculationResult $result.calculationResult

$result.summary.success = $false
Assert-Rejected { Assert-SmokeOptimizationResult $result $slots }
$result.summary.success = $true
$result.optimizedSetup.slots.helmet.itemId = 2
Assert-Rejected { Assert-SmokeOptimizationResult $result $slots }
$result.optimizedSetup.slots.helmet.itemId = 1
$result.optimizedSetup.slots.helmet.drifIds = @()
Assert-Rejected { Assert-SmokeOptimizationResult $result $slots }
$result.optimizedSetup.slots.helmet.drifIds = @(1)
$result.optimizedSetup.slots = $null
Assert-Rejected { Assert-SmokeOptimizationResult $result $slots }
Assert-Rejected { Assert-SmokeCalculationParity $result.calculationResult ('{"stats":{"Krytyk":"6%"}}' | ConvertFrom-Json) }
Assert-Rejected { Assert-SmokeCalculationParity $result.calculationResult ('{"stats":{}}' | ConvertFrom-Json) }
Write-Host "Smoke assertion tests passed (legacy and prerendered HTML, invalid pages and optimization/calculator checks)."

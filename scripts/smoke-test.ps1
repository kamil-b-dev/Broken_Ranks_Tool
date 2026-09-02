param(
    [string]$ImageName = "broken-ranks-tool:smoke",
    [int]$Port = 18080
)

$ErrorActionPreference = "Stop"
$containerName = "broken-ranks-smoke-$PID"
$baseUrl = "http://127.0.0.1:$Port"

function Wait-ForReadiness {
    for ($attempt = 0; $attempt -lt 90; $attempt++) {
        try {
            $health = Invoke-RestMethod "$baseUrl/actuator/health/readiness" -TimeoutSec 2
            if ($health.status -eq "UP") { return }
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    throw "Application did not become ready within 90 seconds."
}

function New-FullOptimizationRequest {
    param([object]$InitialData)

    $definitions = [ordered]@{
        helmet = @("HELMET")
        armor = @("ARMOR")
        cape = @("CAPE")
        legs = @("LEGS")
        boots = @("BOOTS")
        gloves = @("GLOVES")
        belt = @("BELT")
        weapon = @("WEAPON_1H", "WEAPON_2H", "WEAPON_RANGED", "RANGED_WEAPON", "RANGED")
        shield = @("SHIELD", "OFF_HAND")
        ring1 = @("RING")
        ring2 = @("RING")
        necklace = @("NECKLACE")
    }
    $slots = [ordered]@{}
    foreach ($definition in $definitions.GetEnumerator()) {
        $item = $InitialData.items |
            Where-Object { $definition.Value -contains $_.category } |
            Sort-Object capacity -Descending |
            Select-Object -First 1
        if ($null -ne $item) {
            $slots[$definition.Key] = [ordered]@{
                itemId = $item.id
                itemStars = 5
                orbIds = @()
                orbLevels = @()
                drifIds = @()
                drifLevels = @{}
            }
        }
    }

    $bonusNames = @($InitialData.gameRules.bonusTranslations.PSObject.Properties.Name | Select-Object -First 5)
    $priorities = [ordered]@{}
    $targetQuantities = [ordered]@{}
    $weight = 30
    foreach ($bonusName in $bonusNames) {
        $priorities[$bonusName] = $weight
        $targetQuantities[$bonusName] = @{ min = 0; max = 12 }
        $weight -= 4
    }

    return [ordered]@{
        originalSlots = $slots
        priorities = $priorities
        targetQuantities = $targetQuantities
        lockedSlots = @()
        lockedDrifs = @{}
        forceCapBonuses = @()
        forcedPercentageTargets = @{}
        maximizeBonuses = @()
        forceMaximizationByDrifBonus = $false
        generateVariants = $true
        maxVariantLossPercent = 5
    }
}

try {
    docker build --tag $ImageName .
    if ($LASTEXITCODE -ne 0) { throw "Docker image build failed." }

    docker run --detach --name $containerName --memory 1g --cpus 1 `
        --env "JAVA_TOOL_OPTIONS=-Xms128m -Xmx640m -XX:MaxMetaspaceSize=128m -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError" `
        --publish "${Port}:8080" $ImageName | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Docker container did not start." }

    Wait-ForReadiness
    $home = Invoke-WebRequest "$baseUrl/" -TimeoutSec 5
    if ($home.StatusCode -ne 200 -or $home.Content -notmatch '<div id="root"></div>') {
        throw "Frontend smoke check failed."
    }

    $initialData = Invoke-RestMethod "$baseUrl/api/initial-data" -TimeoutSec 15
    if ($initialData.items.Count -eq 0 -or $initialData.drifs.Count -eq 0) {
        throw "Initial data smoke check failed."
    }

    $payload = New-FullOptimizationRequest $initialData | ConvertTo-Json -Depth 8 -Compress
    $firstRun = Start-Job -ScriptBlock {
        param($Url, $Body)
        Invoke-RestMethod "$Url/api/optimizer/drifs" -Method Post -ContentType "application/json" -Body $Body -TimeoutSec 60
    } -ArgumentList $baseUrl, $payload

    $activeObserved = $false
    for ($attempt = 0; $attempt -lt 100 -and $firstRun.State -eq "Running"; $attempt++) {
        try {
            $metric = Invoke-RestMethod "$baseUrl/actuator/metrics/optimizer.active" -TimeoutSec 2
            if ($metric.measurements[0].value -ge 1) {
                $activeObserved = $true
                break
            }
        } catch {}
        Start-Sleep -Milliseconds 50
    }
    if (-not $activeObserved) { throw "Optimizer activity metric was not observed." }

    try {
        Invoke-RestMethod "$baseUrl/api/optimizer/drifs" -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 10
        throw "Overlapping optimization was not rejected."
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 429) { throw }
    }

    $result = Receive-Job -Job $firstRun -Wait -AutoRemoveJob
    if ($null -eq $result.summary) { throw "Optimization response is incomplete." }
    Write-Host "Deployment smoke test passed."
} finally {
    docker rm --force $containerName 2>$null | Out-Null
}

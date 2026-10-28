#requires -Version 7.0
param(
    [string]$JavaHome = $env:JAVA_HOME,
    [ValidateRange(1, 20)][int]$Repetitions = 3,
    [ValidateRange(65, 1800)][int]$IdleSeconds = 600,
    [int]$Port = 18081,
    [string]$OutputDirectory = "$PSScriptRoot/../tmp/hosting-resources"
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/smoke-assertions.ps1"
$repoRoot = Split-Path $PSScriptRoot -Parent
$backend = Join-Path $repoRoot "Broken_Ranks_Tool_Backend"
$jar = Join-Path $backend "target/Broken_Ranks_Tool_Backend-0.0.1-SNAPSHOT.jar"
$database = (Join-Path $backend "database/catalog/broken_ranks.db").Replace('\', '/')
$java = if ($JavaHome) { Join-Path $JavaHome "bin/java.exe" } else { (Get-Command java).Source }
if (-not (Test-Path $jar)) { throw "Package the backend before measuring: ./mvnw.cmd -DskipTests package" }
New-Item -ItemType Directory -Force $OutputDirectory | Out-Null
$OutputDirectory = (Resolve-Path $OutputDirectory).Path
$build = Get-Content "$backend/src/test/resources/optimization/archer-12-12-build.json" -Raw | ConvertFrom-Json -AsHashtable
$request = @{
    originalSlots = $build.build.requestData.slots
    characterStats = $build.build.requestData.characterStats
    configurationMode = "SIMPLE"
    simpleProfile = "ARCHER"
    simpleOptions = @{
        damageDrifs = 12
        accuracyDrifs = 12
        percentageDamageReduction = $true
        damageReductionChance = $true
    }
    generateVariants = $true
}
$payload = $request | ConvertTo-Json -Depth 30 -Compress
$baseUrl = "http://127.0.0.1:$Port"
$referenceResult = $null
$summaries = @()

function ConvertTo-CanonicalValue($Value) {
    if ($Value -is [System.Collections.IDictionary]) {
        $sorted = [ordered]@{}
        foreach ($key in ($Value.Keys | Sort-Object)) { $sorted[$key] = ConvertTo-CanonicalValue $Value[$key] }
        return $sorted
    }
    if ($Value -is [pscustomobject]) {
        $sorted = [ordered]@{}
        foreach ($property in ($Value.PSObject.Properties | Sort-Object Name)) {
            $sorted[$property.Name] = if ($property.Name -eq "orbBonusTypes") { @($property.Value | Sort-Object) } else { ConvertTo-CanonicalValue $property.Value }
        }
        return $sorted
    }
    if ($Value -is [System.Collections.IEnumerable] -and $Value -isnot [string]) {
        return ,@($Value | ForEach-Object { ConvertTo-CanonicalValue $_ })
    }
    return $Value
}

function Get-ProcessSample($Process, $Phase, $Started) {
    $Process.Refresh()
    if ($Process.HasExited) { throw "Measured JVM exited unexpectedly." }
    [pscustomobject]@{
        phase = $Phase
        elapsedSeconds = [math]::Round(([datetime]::UtcNow - $Started).TotalSeconds, 3)
        workingSetMiB = [math]::Round($Process.WorkingSet64 / 1MB, 3)
        privateMiB = [math]::Round($Process.PrivateMemorySize64 / 1MB, 3)
        cpuSeconds = $Process.TotalProcessorTime.TotalSeconds
    }
}

function Invoke-VerifiedOptimization {
    $result = Invoke-RestMethod "$baseUrl/api/optimizer/drifs" -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 180
    if ($result.summary.outcome -notin @("VALID_BUILD", "VALID_BUILD_SOFT_TARGETS_UNMET") -or $result.summary.drifsPlaced -lt 1) {
        throw "Optimization returned no valid build: $($result.summary.message)"
    }
    foreach ($entry in $request.originalSlots.GetEnumerator()) {
        $slot = $result.optimizedSetup.slots.($entry.Key)
        if ($null -eq $slot -or $slot.itemId -ne $entry.Value.itemId -or $slot.itemStars -ne $entry.Value.itemStars) {
            throw "Optimization changed item context in slot $($entry.Key)."
        }
    }
    $calculated = Invoke-RestMethod "$baseUrl/api/calculator/calculate" -Method Post -ContentType "application/json" -Body ($result.optimizedSetup | ConvertTo-Json -Depth 30 -Compress) -TimeoutSec 30
    Assert-SmokeCalculationParity $result.calculationResult $calculated
    foreach ($variant in $result.summary.nextVariants) {
        $variantCalculated = Invoke-RestMethod "$baseUrl/api/calculator/calculate" -Method Post -ContentType "application/json" -Body ($variant.setup | ConvertTo-Json -Depth 30 -Compress) -TimeoutSec 30
        Assert-SmokeCalculationParity $variant.calculationResult $variantCalculated
    }
    # Compare deterministic output, excluding timing and search diagnostics.
    $comparable = ConvertTo-CanonicalValue @{
        setup = $result.optimizedSetup
        calculation = $result.calculationResult
        variants = @($result.summary.nextVariants | ForEach-Object { @{ setup = $_.setup; calculation = $_.calculationResult } })
    } | ConvertTo-Json -Depth 50 -Compress
    if ($null -eq $script:referenceResult) { $script:referenceResult = $comparable }
    elseif ($comparable -cne $script:referenceResult) { throw "Runtime configurations returned different builds, statistics or variants." }
    $result
}

foreach ($mode in @("baseline", "optimized")) {
    $directory = Join-Path $OutputDirectory $mode
    New-Item -ItemType Directory -Force $directory | Out-Null
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new($java)
    $startInfo.WorkingDirectory = $directory
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    foreach ($name in @("JAVA_TOOL_OPTIONS", "JDK_JAVA_OPTIONS", "_JAVA_OPTIONS")) { $startInfo.Environment.Remove($name) | Out-Null }
    $arguments = @(
        "-Xms128m", "-Xmx2g", "-XX:MaxMetaspaceSize=256m", "-XX:+UseG1GC", "-XX:+ExitOnOutOfMemoryError",
        "-XX:+G1PeriodicGCInvokesConcurrent", "-Xlog:gc*:file=gc.log:time,uptime,level,tags",
        "-XX:G1PeriodicGCInterval=$(if ($mode -eq 'optimized') { 60000 } else { 0 })",
        "-jar", $jar, "--spring.profiles.active=prod", "--server.address=127.0.0.1", "--server.port=$Port",
        "--spring.datasource.url=jdbc:sqlite:file:${database}?mode=ro",
        "--spring.datasource.hikari.minimum-idle=$(if ($mode -eq 'optimized') { 1 } else { 10 })",
        "--spring.datasource.hikari.maximum-pool-size=10",
        "--spring.datasource.hikari.idle-timeout=60000",
        "--abuse-protection.optimizer.client-requests-per-minute=600", "--abuse-protection.optimizer.global-requests-per-minute=600"
    )
    foreach ($argument in $arguments) { $startInfo.ArgumentList.Add($argument) }
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    $started = [datetime]::UtcNow
    $samples = [System.Collections.Generic.List[object]]::new()
    try {
        $process.Start() | Out-Null
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        $ready = $false
        for ($attempt = 0; $attempt -lt 90; $attempt++) {
            if ($process.HasExited) { throw "JVM failed to start; inspect $directory/stderr.log." }
            try {
                $health = Invoke-RestMethod "$baseUrl/actuator/health/readiness" -TimeoutSec 2
                if ($health.status -eq "UP") { $ready = $true; break }
            } catch { }
            Start-Sleep -Seconds 1
        }
        if (-not $ready) { throw "JVM did not become ready." }
        Invoke-RestMethod "$baseUrl/api/initial-data" -TimeoutSec 30 | Out-Null
        Invoke-VerifiedOptimization | Out-Null
        $samples.Add((Get-ProcessSample $process "warm" $started))
        $durations = @()
        $cpuBefore = $process.TotalProcessorTime.TotalSeconds
        for ($iteration = 0; $iteration -lt $Repetitions; $iteration++) {
            $timer = [System.Diagnostics.Stopwatch]::StartNew()
            Invoke-VerifiedOptimization | Out-Null
            $durations += $timer.Elapsed.TotalSeconds
        }
        $afterWork = Get-ProcessSample $process "after-work" $started
        $samples.Add($afterWork)
        Write-Host "$mode finished workload; measuring $IdleSeconds seconds of idle memory."
        $idleStarted = [datetime]::UtcNow
        do {
            Start-Sleep -Seconds 5
            $samples.Add((Get-ProcessSample $process "idle" $started))
        } while (([datetime]::UtcNow - $idleStarted).TotalSeconds -lt $IdleSeconds)
        $afterIdle = $samples[$samples.Count - 1]
        # Confirm that shrinking an idle heap does not break the next request.
        $resumeTimer = [System.Diagnostics.Stopwatch]::StartNew()
        Invoke-VerifiedOptimization | Out-Null
        $summaries += [pscustomobject]@{
            mode = $mode
            requestSeconds = $durations
            workloadCpuSeconds = $afterWork.cpuSeconds - $cpuBefore
            idleCpuSeconds = $afterIdle.cpuSeconds - $afterWork.cpuSeconds
            afterWork = $afterWork
            afterIdle = $afterIdle
            resumedRequestSeconds = $resumeTimer.Elapsed.TotalSeconds
        }
    } finally {
        if ($process.Id -and -not $process.HasExited) { $process.Kill(); $process.WaitForExit() }
        if ($stdout) { [System.IO.File]::WriteAllText("$directory/stdout.log", $stdout.GetAwaiter().GetResult()) }
        if ($stderr) { [System.IO.File]::WriteAllText("$directory/stderr.log", $stderr.GetAwaiter().GetResult()) }
        $samples | Export-Csv "$directory/samples.csv" -NoTypeInformation
        $process.Dispose()
    }
}
$summaries | ConvertTo-Json -Depth 10 | Set-Content "$OutputDirectory/summary.json"
Write-Host "Identical builds, statistics and variants in all requests. Results: $OutputDirectory/summary.json"
$summaries | Format-Table mode, workloadCpuSeconds, idleCpuSeconds, resumedRequestSeconds

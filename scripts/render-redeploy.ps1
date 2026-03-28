param(
    [string]$ServiceName = "gameedu-app",
    [switch]$ClearCache,
    [switch]$Wait,
    [int]$PollSeconds = 10,
    [switch]$NoTrigger
)

$ErrorActionPreference = "Stop"

function Get-RenderToken {
    $sessionToken = $env:RENDER_API_KEY
    if (-not [string]::IsNullOrWhiteSpace($sessionToken)) {
        return $sessionToken
    }

    $userToken = [Environment]::GetEnvironmentVariable("RENDER_API_KEY", "User")
    if (-not [string]::IsNullOrWhiteSpace($userToken)) {
        return $userToken
    }

    return $null
}

function Get-ApiRows($response) {
    if ($response -is [System.Array]) {
        return $response
    }
    if ($response.value) {
        return $response.value
    }
    return @()
}

function Get-DeployObject($response) {
    if ($null -eq $response) {
        return $null
    }
    if ($response.deploy) {
        return $response.deploy
    }
    return $response
}

$token = Get-RenderToken
if (-not $token) {
    Write-Host "RENDER_API_KEY not found (Session/User)." -ForegroundColor Red
    Write-Host "Set with: setx RENDER_API_KEY ""rpa_xxx""" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    Authorization = "Bearer $token"
    Accept = "application/json"
}

try {
    $servicesResponse = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services?limit=50" -Headers $headers
} catch {
    Write-Host "Failed to call Render API /services." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor DarkGray
    exit 1
}

$serviceRows = Get-ApiRows $servicesResponse
$services = $serviceRows | ForEach-Object { $_.service } | Where-Object { $_ -ne $null }
$service = $services | Where-Object { $_.name -eq $ServiceName } | Select-Object -First 1

if (-not $service) {
    Write-Host "Service not found: $ServiceName" -ForegroundColor Red
    Write-Host "Available services:" -ForegroundColor Yellow
    $services | ForEach-Object { Write-Host "- $($_.name) ($($_.id))" }
    exit 1
}

Write-Host "Service: $($service.name)" -ForegroundColor Cyan
Write-Host "ID: $($service.id)"
Write-Host "Branch: $($service.branch)"
Write-Host "Dashboard: $($service.dashboardUrl)"

if ($NoTrigger) {
    Write-Host ""
    Write-Host "No trigger mode enabled. Exiting without creating deploy." -ForegroundColor Yellow
    exit 0
}

$payload = @{}
if ($ClearCache) {
    $payload.clearCache = "clear"
}

try {
    $deployResponse = if ($payload.Count -gt 0) {
        Invoke-RestMethod -Method Post -Uri "https://api.render.com/v1/services/$($service.id)/deploys" -Headers $headers -ContentType "application/json" -Body ($payload | ConvertTo-Json)
    } else {
        Invoke-RestMethod -Method Post -Uri "https://api.render.com/v1/services/$($service.id)/deploys" -Headers $headers
    }
} catch {
    Write-Host "Failed to trigger deploy." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor DarkGray
    exit 1
}

$deploy = Get-DeployObject $deployResponse
if (-not $deploy -or -not $deploy.id) {
    Write-Host "Deploy triggered, but response did not include deploy id." -ForegroundColor Yellow
    Write-Output ($deployResponse | ConvertTo-Json -Depth 8)
    exit 0
}

Write-Host ""
Write-Host "Deploy triggered successfully." -ForegroundColor Green
Write-Host "Deploy ID: $($deploy.id)"
Write-Host "Status: $($deploy.status)"

if (-not $Wait) {
    exit 0
}

Write-Host ""
Write-Host "Waiting for deploy to finish..." -ForegroundColor Cyan
$terminalStatuses = @("live", "build_failed", "update_failed", "canceled", "deactivated")

while ($true) {
    Start-Sleep -Seconds $PollSeconds
    try {
        $current = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services/$($service.id)/deploys/$($deploy.id)" -Headers $headers
    } catch {
        Write-Host "Failed to poll deploy status." -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor DarkGray
        exit 1
    }

    $currentDeploy = Get-DeployObject $current
    $status = $currentDeploy.status
    $updatedAt = $currentDeploy.updatedAt
    Write-Host ("- status: {0} | updatedAt: {1}" -f $status, $updatedAt)

    if ($terminalStatuses -contains $status) {
        Write-Host ""
        if ($status -eq "live") {
            Write-Host "Deploy is LIVE." -ForegroundColor Green
            exit 0
        }
        Write-Host "Deploy finished with status: $status" -ForegroundColor Yellow
        exit 2
    }
}

param(
    [string]$ServiceName = "gameedu-app",
    [int]$DeployLimit = 3
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

function Format-Date([string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) {
        return "-"
    }

    try {
        return ([DateTime]::Parse($value).ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss"))
    } catch {
        return $value
    }
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

$serviceRows = @()
if ($servicesResponse -is [System.Array]) {
    $serviceRows = $servicesResponse
} elseif ($servicesResponse.value) {
    $serviceRows = $servicesResponse.value
}

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
Write-Host "URL: $($service.serviceDetails.url)"
Write-Host "Dashboard: $($service.dashboardUrl)"
Write-Host ""

try {
    $deploysResponse = Invoke-RestMethod -Method Get -Uri "https://api.render.com/v1/services/$($service.id)/deploys?limit=$DeployLimit" -Headers $headers
} catch {
    Write-Host "Failed to fetch deploys for service $($service.id)." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor DarkGray
    exit 1
}

$deployRows = @()
if ($deploysResponse -is [System.Array]) {
    $deployRows = $deploysResponse
} elseif ($deploysResponse.value) {
    $deployRows = $deploysResponse.value
}

$deployItems = $deployRows | ForEach-Object { $_.deploy } | Where-Object { $_ -ne $null }

if ($deployItems.Count -eq 0) {
    Write-Host "No deploy history found." -ForegroundColor Yellow
    exit 0
}

Write-Host "Latest deploys:" -ForegroundColor Cyan
$deployItems | ForEach-Object {
    $commitId = if ($_.commit.id) { $_.commit.id.Substring(0, [Math]::Min(7, $_.commit.id.Length)) } else { "-" }
    Write-Host ("- {0} | commit {1} | started {2} | finished {3}" -f $_.status, $commitId, (Format-Date $_.startedAt), (Format-Date $_.finishedAt))
    if ($_.commit.message) {
        Write-Host ("  message: {0}" -f $_.commit.message) -ForegroundColor DarkGray
    }
}

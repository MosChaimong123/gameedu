# ปลดล็อก Prisma query engine บน Windows แล้วรัน prisma generate
# สาเหตุ EPERM: ไฟล์ query_engine-windows.dll.node ถูกล็อกโดย Node ที่โหลด @prisma/client อยู่
$ErrorActionPreference = "Continue"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Write-Host "Project: $ProjectRoot"

# จับเฉพาะ Node ที่รัน run-server.cjs (dev/start ของโปรเจกต์นี้) — ไม่แตะ Cursor/เครื่องมืออื่น
$candidates = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
if ($candidates) {
    foreach ($p in $candidates) {
        $cmd = $p.CommandLine
        if (-not $cmd) { continue }
        if ($cmd -like "*run-server.cjs*") {
            try {
                Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
                Write-Host "Stopped Node PID $($p.ProcessId)"
            } catch {
                Write-Warning "Could not stop PID $($p.ProcessId): $_"
            }
        }
    }
}

Start-Sleep -Seconds 1

$clientDir = Join-Path $ProjectRoot "node_modules\.prisma\client"
if (Test-Path $clientDir) {
    Get-ChildItem -Path $clientDir -Filter "query_engine-windows.dll.node.tmp*" -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue
    $dll = Join-Path $clientDir "query_engine-windows.dll.node"
    if (Test-Path $dll) {
        try {
            Remove-Item $dll -Force -ErrorAction Stop
            Write-Host "Removed locked engine (if it was free)."
        } catch {
            Write-Warning "Engine DLL still locked. Close other terminals/IDE tasks using this repo, then run this script again."
        }
    }
}

Set-Location $ProjectRoot
npx prisma generate
exit $LASTEXITCODE

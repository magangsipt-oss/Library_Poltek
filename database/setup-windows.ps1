$ErrorActionPreference = 'Stop'

$serviceName = 'postgresql-x64-18'
$psqlPath = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
$hbaPath = 'C:\Program Files\PostgreSQL\18\data\pg_hba.conf'
$databaseName = 'db_perpustakaan'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendEnvPath = Join-Path $projectRoot 'backend\.env'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Jalankan skrip ini dari PowerShell yang dibuka dengan Run as administrator.'
}
if (-not (Test-Path $psqlPath)) {
  throw "psql.exe tidak ditemukan: $psqlPath"
}
if (-not (Test-Path $hbaPath)) {
  throw "pg_hba.conf tidak ditemukan: $hbaPath"
}

$password = Read-Host 'Masukkan password baru untuk user PostgreSQL postgres' -AsSecureString
$confirmation = Read-Host 'Masukkan ulang password baru' -AsSecureString

function ConvertTo-PlainText {
  param([Security.SecureString]$Value)

  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

$plainPassword = ConvertTo-PlainText $password
$confirmationText = ConvertTo-PlainText $confirmation
if ([string]::IsNullOrWhiteSpace($plainPassword) -or $plainPassword -ne $confirmationText) {
  throw 'Password kosong atau kedua password tidak sama.'
}
if ($plainPassword -match '[\r\n\0]') {
  throw 'Password tidak boleh berisi baris baru atau karakter null.'
}

function Restart-Postgres {
  Restart-Service -Name $serviceName -Force
  $service = Get-Service -Name $serviceName
  $service.WaitForStatus(
    [System.ServiceProcess.ServiceControllerStatus]::Running,
    [TimeSpan]::FromSeconds(30)
  )
}

function Invoke-PsqlWithInput {
  param([string]$Sql)

  $startInfo = New-Object Diagnostics.ProcessStartInfo
  $startInfo.FileName = $psqlPath
  $startInfo.Arguments = '-h 127.0.0.1 -U postgres -d postgres -w -v ON_ERROR_STOP=1 -q -f -'
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardInput = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true

  $process = New-Object Diagnostics.Process
  $process.StartInfo = $startInfo
  [void]$process.Start()
  $process.StandardInput.WriteLine($Sql)
  $process.StandardInput.Close()
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  if ($process.ExitCode -ne 0) {
    throw "Perintah PostgreSQL gagal: $stderr"
  }
  if ($stdout) {
    Write-Output $stdout.Trim()
  }
}

$originalHba = [IO.File]::ReadAllBytes($hbaPath)
$hbaText = [Text.Encoding]::UTF8.GetString($originalHba)
$temporaryRule = "host postgres postgres 127.0.0.1/32 trust`r`n"
$resetCompleted = $false
$temporaryConfigWritten = $false

try {
  [IO.File]::WriteAllText(
    $hbaPath,
    $temporaryRule + $hbaText,
    [Text.UTF8Encoding]::new($false)
  )
  $temporaryConfigWritten = $true
  Restart-Postgres

  $passwordHex = [BitConverter]::ToString([Text.Encoding]::UTF8.GetBytes($plainPassword)).Replace('-', '')
  $resetSql = "DO `$`$ BEGIN EXECUTE format('ALTER ROLE postgres WITH PASSWORD %L', convert_from(decode('$passwordHex', 'hex'), 'UTF8')); END `$`$;"
  Invoke-PsqlWithInput $resetSql
  $resetCompleted = $true
}
finally {
  if ($temporaryConfigWritten) {
    [IO.File]::WriteAllBytes($hbaPath, $originalHba)
    Restart-Postgres
  }
}

if (-not $resetCompleted) {
  throw 'Password PostgreSQL tidak berhasil diatur.'
}

$env:PGPASSWORD = $plainPassword
try {
  & $psqlPath -h 127.0.0.1 -U postgres -d postgres -w -v ON_ERROR_STOP=1 `
    -f (Join-Path $PSScriptRoot 'setup.sql')
  if ($LASTEXITCODE -ne 0) {
    throw 'Pembuatan database dan tabel gagal.'
  }
}
finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

$escapedPassword = $plainPassword.Replace('\', '\\').Replace('"', '\"')
$envContent = @"
PORT=3000
CORS_ORIGIN=http://localhost:3000
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=$databaseName
PGUSER=postgres
PGPASSWORD="$escapedPassword"
PGSSLMODE=disable
"@
[IO.File]::WriteAllText($backendEnvPath, $envContent, [Text.UTF8Encoding]::new($false))

Write-Output "Database $databaseName berhasil disiapkan."
Write-Output 'Konfigurasi koneksi backend berhasil dibuat di backend/.env.'

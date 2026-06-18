# 🚀 PowerShell Hidden Launch Script
$StartInfo = New-Object System.Diagnostics.ProcessStartInfo
$StartInfo.FileName = "cmd.exe"
$StartInfo.Arguments = "/c C:\visitor_management\start.bat"

# 🕶️ WindowStyle-ah Hidden-ah mathuroam (Black screen munnadi varathu)
$StartInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
$StartInfo.CreateNoWindow = $true

# Start the services
[System.Diagnostics.Process]::Start($StartInfo)
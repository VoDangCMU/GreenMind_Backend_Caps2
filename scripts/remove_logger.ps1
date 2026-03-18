
# Script to remove all logger-related lines from TypeScript files
# Handles: logger.*(, const logger = getLogger(), this.logger.*

$files = Get-ChildItem -Path "src" -Recurse -Filter "*.ts" | Where-Object { $_.FullName -notmatch "node_modules" }

foreach ($file in $files) {
    $lines = Get-Content $file.FullName
    $result = [System.Collections.Generic.List[string]]::new()
    $skipDepth = 0
    $braceCount = 0
    $inLoggerCall = $false

    foreach ($line in $lines) {
        # Detect start of a logger statement
        $isLoggerLine = $line -match '^\s*(const logger\s*=\s*getLogger\(\)|logger\.(info|warn|error|debug|logHTTPRequest|logDBOperation|createSpan)\(|this\.logger\.(info|warn|error|debug)\()'

        if ($isLoggerLine -and -not $inLoggerCall) {
            # Count open and close braces in this line
            $opens = ([regex]::Matches($line, '\(')).Count
            $closes = ([regex]::Matches($line, '\)')).Count
            if ($opens -gt $closes) {
                # Multi-line call
                $inLoggerCall = $true
                $braceCount = $opens - $closes
            }
            # Skip this line (both single-line and start of multi-line)
            continue
        }

        if ($inLoggerCall) {
            # Count parens to find end of call
            $opens = ([regex]::Matches($line, '\(')).Count
            $closes = ([regex]::Matches($line, '\)')).Count
            $braceCount = $braceCount + $opens - $closes
            if ($braceCount -le 0) {
                $inLoggerCall = $false
            }
            # Skip this line (it's part of the logger call)
            continue
        }

        $result.Add($line)
    }

    $newContent = $result -join "`r`n"
    Set-Content $file.FullName $newContent -NoNewline
    Write-Host "Processed: $($file.Name)"
}

Write-Host "Done!"

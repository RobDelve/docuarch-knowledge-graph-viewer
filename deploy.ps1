# DocuArch Knowledge Graph Viewer - Enterprise Deployment Script
# PowerShell deployment script for Windows enterprise environments

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "development",

    [Parameter(Mandatory=$false)]
    [string]$Port = "3000",

    [Parameter(Mandatory=$false)]
    [switch]$Docker,

    [Parameter(Mandatory=$false)]
    [switch]$Production,

    [Parameter(Mandatory=$false)]
    [switch]$SSL,

    [Parameter(Mandatory=$false)]
    [string]$CertPath,

    [Parameter(Mandatory=$false)]
    [string]$KeyPath,

    [Parameter(Mandatory=$false)]
    [switch]$Clean,

    [Parameter(Mandatory=$false)]
    [switch]$HealthCheck
)

# Script configuration
$ErrorActionPreference = "Stop"
$AppName = "DocuArch Knowledge Graph Viewer"
$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$LogFile = "$AppDir\deployment.log"
$BuildDir = "$AppDir\build"
$NodeModulesDir = "$AppDir\node_modules"

# Logging function
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    Write-Host $LogMessage
    Add-Content -Path $LogFile -Value $LogMessage
}

# Prerequisites check
function Test-Prerequisites {
    Write-Log "Checking prerequisites..."

    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Log "Node.js version: $nodeVersion"

        $npmVersion = npm --version
        Write-Log "npm version: $npmVersion"
    }
    catch {
        Write-Log "Node.js not found. Please install Node.js 16+ and npm." "ERROR"
        exit 1
    }

    # Check Docker if required
    if ($Docker) {
        try {
            $dockerVersion = docker --version
            Write-Log "Docker version: $dockerVersion"

            $dockerComposeVersion = docker-compose --version
            Write-Log "Docker Compose version: $dockerComposeVersion"
        }
        catch {
            Write-Log "Docker not found. Please install Docker Desktop." "ERROR"
            exit 1
        }
    }

    # Check PowerShell version
    $psVersion = $PSVersionTable.PSVersion
    if ($psVersion.Major -lt 5) {
        Write-Log "PowerShell 5.0+ required. Current version: $psVersion" "ERROR"
        exit 1
    }

    Write-Log "Prerequisites check completed successfully."
}

# Clean previous builds
function Invoke-CleanBuild {
    Write-Log "Cleaning previous builds..."

    if (Test-Path $BuildDir) {
        Remove-Item -Path $BuildDir -Recurse -Force
        Write-Log "Removed build directory."
    }

    if ($Clean -and (Test-Path $NodeModulesDir)) {
        Remove-Item -Path $NodeModulesDir -Recurse -Force
        Write-Log "Removed node_modules directory."
    }
}

# Install dependencies
function Install-Dependencies {
    Write-Log "Installing dependencies..."

    Push-Location $AppDir
    try {
        npm ci --silent
        Write-Log "Dependencies installed successfully."
    }
    catch {
        Write-Log "Failed to install dependencies: $_" "ERROR"
        exit 1
    }
    finally {
        Pop-Location
    }
}

# Build application
function Build-Application {
    Write-Log "Building application for $Environment environment..."

    Push-Location $AppDir
    try {
        # Set environment variables
        $env:REACT_APP_ENVIRONMENT = $Environment
        $env:REACT_APP_BUILD_DATE = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")

        if ($Production) {
            $env:NODE_ENV = "production"
            npm run build
        } else {
            npm run build
        }

        Write-Log "Application built successfully."
    }
    catch {
        Write-Log "Build failed: $_" "ERROR"
        exit 1
    }
    finally {
        Pop-Location
    }
}

# Deploy with Docker
function Deploy-Docker {
    Write-Log "Deploying with Docker..."

    Push-Location $AppDir
    try {
        # Build Docker image
        docker build -t docuarch-viewer:latest .
        Write-Log "Docker image built successfully."

        # Stop existing container
        docker stop docuarch-knowledge-graph-viewer -ErrorAction SilentlyContinue
        docker rm docuarch-knowledge-graph-viewer -ErrorAction SilentlyContinue

        # Run container
        if ($SSL) {
            docker-compose --profile ssl up -d
        } else {
            docker-compose up -d
        }

        Write-Log "Docker container started successfully."
    }
    catch {
        Write-Log "Docker deployment failed: $_" "ERROR"
        exit 1
    }
    finally {
        Pop-Location
    }
}

# Deploy locally
function Deploy-Local {
    Write-Log "Deploying locally on port $Port..."

    Push-Location $AppDir
    try {
        # Set environment variables
        $env:PORT = $Port
        if ($SSL -and $CertPath -and $KeyPath) {
            $env:HTTPS = "true"
            $env:SSL_CRT_FILE = $CertPath
            $env:SSL_KEY_FILE = $KeyPath
        }

        if ($Production) {
            # Serve built files
            npx serve -s build -l $Port
        } else {
            # Development server
            npm start
        }
    }
    catch {
        Write-Log "Local deployment failed: $_" "ERROR"
        exit 1
    }
    finally {
        Pop-Location
    }
}

# Health check
function Test-ApplicationHealth {
    Write-Log "Performing health check..."

    $baseUrl = if ($SSL) { "https://localhost" } else { "http://localhost" }
    $healthUrl = "${baseUrl}:$Port"

    $maxRetries = 30
    $retryCount = 0

    do {
        try {
            $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Log "Health check passed. Application is running at $healthUrl"
                return $true
            }
        }
        catch {
            Write-Log "Health check attempt $($retryCount + 1) failed. Retrying in 2 seconds..." "WARN"
            Start-Sleep -Seconds 2
        }
        $retryCount++
    } while ($retryCount -lt $maxRetries)

    Write-Log "Health check failed after $maxRetries attempts." "ERROR"
    return $false
}

# Create sample data directory
function Initialize-SampleData {
    Write-Log "Setting up sample data..."

    $dataDir = "$AppDir\public\data"
    if (-not (Test-Path $dataDir)) {
        New-Item -Path $dataDir -ItemType Directory -Force
    }

    # Create sample knowledge graph data
    $sampleData = @{
        nodes = @(
            @{ id = "sample-1"; label = "Sample Node 1"; type = "ApplicationComponent"; group = "Application" }
            @{ id = "sample-2"; label = "Sample Node 2"; type = "ApplicationService"; group = "Application" }
            @{ id = "sample-3"; label = "Sample Node 3"; type = "Node"; group = "Technology" }
        )
        edges = @(
            @{ from = "sample-1"; to = "sample-2"; label = "uses" }
            @{ from = "sample-2"; to = "sample-3"; label = "deployed on" }
        )
    }

    $sampleData | ConvertTo-Json -Depth 10 | Out-File "$dataDir\sample.json" -Encoding UTF8
    Write-Log "Sample data created at $dataDir\sample.json"
}

# Main deployment logic
function Start-Deployment {
    Write-Log "Starting deployment of $AppName..."
    Write-Log "Environment: $Environment"
    Write-Log "Port: $Port"
    Write-Log "Docker: $($Docker.ToString())"
    Write-Log "Production: $($Production.ToString())"
    Write-Log "SSL: $($SSL.ToString())"

    Test-Prerequisites
    Invoke-CleanBuild
    Install-Dependencies
    Initialize-SampleData
    Build-Application

    if ($Docker) {
        Deploy-Docker
        if ($HealthCheck) {
            Start-Sleep -Seconds 10  # Wait for container to start
            $Port = "8080"  # Docker compose maps to 8080
            Test-ApplicationHealth
        }
    } else {
        if ($HealthCheck) {
            # Start application in background and test
            $job = Start-Job -ScriptBlock {
                param($AppDir, $Port, $Production)
                Set-Location $AppDir
                if ($Production) {
                    npx serve -s build -l $Port
                } else {
                    npm start
                }
            } -ArgumentList $AppDir, $Port, $Production

            Start-Sleep -Seconds 15
            $healthResult = Test-ApplicationHealth

            Stop-Job $job
            Remove-Job $job

            if (-not $healthResult) {
                exit 1
            }
        } else {
            Deploy-Local
        }
    }

    Write-Log "Deployment completed successfully!"
}

# Error handling
trap {
    Write-Log "Deployment failed with error: $_" "ERROR"
    exit 1
}

# Execute deployment
try {
    Start-Deployment
}
catch {
    Write-Log "Unexpected error during deployment: $_" "ERROR"
    exit 1
}
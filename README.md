# DocuArch Knowledge Graph Viewer - Enterprise Deployment Guide

This comprehensive deployment guide provides multiple deployment options for enterprise environments, including Windows-based infrastructure.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Local Development](#local-development)
4. [Production Deployment](#production-deployment)
5. [Docker Deployment](#docker-deployment)
6. [Enterprise Configuration](#enterprise-configuration)
7. [Security Considerations](#security-considerations)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: Version 16.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **PowerShell**: Version 5.0+ (Windows environments)
- **Docker**: Latest version (for containerized deployment)
- **Memory**: Minimum 2GB RAM, 4GB recommended
- **Storage**: 500MB for application, additional for data files

### Windows Enterprise Environment

- Windows Server 2016/2019/2022 or Windows 10/11
- .NET Framework 4.7.2+ (for some npm modules)
- Visual C++ Redistributable (for native modules)
- IIS 10+ (optional, for advanced hosting scenarios)

### Network Requirements

- Inbound ports: 3000 (development), 8080 (Docker), 443/80 (production)
- Outbound internet access for npm package installation
- Internal network access for OneStream XF integration endpoints

## Quick Start

### Option 1: PowerShell Deployment Script (Recommended for Windows)

```powershell
# Clone or extract the application
cd C:\Apps\DocuArch-Viewer

# Development deployment
.\deploy.ps1 -Environment development -Port 3000

# Production deployment
.\deploy.ps1 -Environment production -Port 8080 -Production

# Docker deployment with SSL
.\deploy.ps1 -Docker -SSL -Environment production
```

### Option 2: Manual Installation

```powershell
# Install dependencies
npm install

# Development server
npm start

# Production build and serve
npm run build
npm run serve
```

## Local Development

### Development Server

```powershell
# Start development server with hot reload
npm start

# Custom port
$env:PORT = "4000"
npm start

# With SSL (requires certificates)
$env:HTTPS = "true"
$env:SSL_CRT_FILE = "path\to\cert.crt"
$env:SSL_KEY_FILE = "path\to\private.key"
npm start
```

### Environment Configuration

Create a `.env.local` file for local overrides:

```bash
REACT_APP_ENVIRONMENT=development
REACT_APP_API_BASE_URL=https://your-onestream-server.company.com
REACT_APP_ENABLE_PERFORMANCE_MONITORING=true
PORT=3000
HTTPS=false
```

## Production Deployment

### Build Process

```powershell
# Set production environment
$env:NODE_ENV = "production"
$env:REACT_APP_ENVIRONMENT = "production"

# Create optimized build
npm run build

# Serve with static file server
npx serve -s build -l 8080
```

### IIS Deployment (Windows Server)

1. **Install Node.js and IISNode**:

   ```powershell
   # Install via Chocolatey
   choco install nodejs iisnode
   ```

2. **Configure IIS**:

   - Create new site in IIS Manager
   - Point to the `build` folder
   - Configure URL Rewrite for SPA routing

3. **web.config** (place in build folder):
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <configuration>
     <system.webServer>
       <rewrite>
         <rules>
           <rule name="React Routes" stopProcessing="true">
             <match url=".*" />
             <conditions logicalGrouping="MatchAll">
               <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
               <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
             </conditions>
             <action type="Rewrite" url="/index.html" />
           </rule>
         </rules>
       </rewrite>
       <staticContent>
         <mimeMap fileExtension=".json" mimeType="application/json" />
       </staticContent>
     </system.webServer>
   </configuration>
   ```

## Docker Deployment

### Standard Docker Deployment

```powershell
# Build image
docker build -t docuarch-viewer:latest .

# Run container
docker run -d \
  --name docuarch-viewer \
  -p 8080:80 \
  --restart unless-stopped \
  docuarch-viewer:latest
```

### Docker Compose (Recommended)

```powershell
# Start services
docker-compose up -d

# With SSL proxy
docker-compose --profile ssl up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f docuarch-viewer
```

### Docker Swarm (Enterprise Clustering)

```powershell
# Initialize swarm (on manager node)
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml docuarch-stack

# Scale service
docker service scale docuarch-stack_docuarch-viewer=3
```

## Enterprise Configuration

### Active Directory Integration

For enterprise single sign-on (future enhancement):

```javascript
// In App.jsx, add authentication context
const AuthContext = {
  // Configure ADFS/Azure AD integration
  authority: "https://login.microsoftonline.com/your-tenant-id",
  clientId: "your-app-registration-id",
};
```

### Corporate Proxy Configuration

```powershell
# Set npm proxy settings
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Or via environment variables
$env:HTTP_PROXY = "http://proxy.company.com:8080"
$env:HTTPS_PROXY = "http://proxy.company.com:8080"
```

### Custom Data Sources

Place custom knowledge graph JSON files in:

- `public/data/` directory for static files
- Configure API endpoints in `.env` for dynamic data

### OneStream XF Integration

Configure environment variables for OneStream connectivity:

```bash
REACT_APP_ONESTREAM_API_URL=https://onestream-server.company.com/api
REACT_APP_ONESTREAM_AUTH_TYPE=windows
REACT_APP_ENABLE_ONESTREAM_METADATA=true
```

## Security Considerations

### Content Security Policy

The application includes CSP headers in `public/index.html`. Customize for your environment:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' your-cdn.company.com;
  connect-src 'self' https://your-api-endpoints.company.com;
"
/>
```

### SSL/TLS Configuration

1. **Development with SSL**:

   ```powershell
   # Generate self-signed certificate
   New-SelfSignedCertificate -DnsName localhost -CertStoreLocation cert:\LocalMachine\My

   # Export certificate
   $cert = Get-ChildItem -Path cert:\LocalMachine\My | Where-Object {$_.Subject -eq "CN=localhost"}
   Export-Certificate -Cert $cert -FilePath localhost.crt
   ```

2. **Production SSL**:
   - Use corporate CA-signed certificates
   - Configure in nginx.conf or IIS bindings
   - Enable HSTS headers

### Network Security

- Configure Windows Firewall rules
- Use VPN or private networks for sensitive deployments
- Implement IP whitelisting in nginx.conf

## Monitoring & Maintenance

### Health Monitoring

```powershell
# Manual health check
Invoke-WebRequest -Uri "http://localhost:8080/health"

# Automated monitoring script
$healthCheck = {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "$(Get-Date): Application healthy"
        }
    } catch {
        Write-Host "$(Get-Date): Application unhealthy - $_"
        # Add alerting logic here
    }
}

# Schedule health check every 5 minutes
Register-ScheduledJob -Name "DocuArchHealthCheck" -ScriptBlock $healthCheck -Trigger (New-JobTrigger -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration ([TimeSpan]::MaxValue))
```

### Log Management

Logs are available at:

- Application logs: `deployment.log`
- Docker logs: `docker-compose logs`
- nginx logs: `/var/log/nginx/` (in container)
- IIS logs: `%SystemDrive%\inetpub\logs\LogFiles`

### Performance Monitoring

```powershell
# Monitor resource usage
Get-Counter "\Process(node)\% Processor Time"
Get-Counter "\Process(node)\Working Set"

# Docker resource monitoring
docker stats docuarch-knowledge-graph-viewer
```

### Backup Procedures

```powershell
# Backup application and data
$backupDir = "C:\Backups\DocuArch-$(Get-Date -Format 'yyyyMMdd')"
New-Item -Path $backupDir -ItemType Directory

# Copy application files
Copy-Item -Path "C:\Apps\DocuArch-Viewer" -Destination "$backupDir\Application" -Recurse

# Backup custom data files
Copy-Item -Path "C:\Apps\DocuArch-Viewer\public\data" -Destination "$backupDir\Data" -Recurse

# Compress backup
Compress-Archive -Path $backupDir -DestinationPath "$backupDir.zip"
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**:

   ```powershell
   # Find process using port
   netstat -ano | findstr :3000

   # Kill process
   taskkill /PID <PID> /F
   ```

2. **npm Installation Failures**:

   ```powershell
   # Clear npm cache
   npm cache clean --force

   # Delete node_modules and reinstall
   Remove-Item node_modules -Recurse -Force
   npm install
   ```

3. **Docker Build Issues**:

   ```powershell
   # Clear Docker cache
   docker system prune -a

   # Rebuild without cache
   docker build --no-cache -t docuarch-viewer:latest .
   ```

4. **Memory Issues**:
   ```powershell
   # Increase Node.js memory limit
   $env:NODE_OPTIONS = "--max-old-space-size=4096"
   npm run build
   ```

### Performance Optimization

1. **Large Graph Performance**:

   - Limit initial node count
   - Implement node clustering
   - Use data virtualization

2. **Build Optimization**:
   ```powershell
   # Analyze bundle size
   npm install -g webpack-bundle-analyzer
   npx webpack-bundle-analyzer build/static/js/*.js
   ```

### Enterprise Support

For enterprise environments, consider:

- Setting up centralized logging (ELK stack)
- Implementing automated deployment pipelines
- Configuring load balancing for high availability
- Integration with existing monitoring solutions (SCOM, Nagios)

### Contact & Support

For OneStream XF-specific integration questions or enterprise deployment assistance:

- Internal IT Support: [Your IT Contact]
- Application Architecture Team: [Your Architecture Team]
- Vendor Support: [OneStream Support if applicable]

---

_This deployment guide is designed for enterprise Windows environments with OneStream XF integration capabilities. Customize the configurations according to your specific infrastructure requirements and security policies._

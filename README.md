# E-Commerce DevOps Capstone Project

A Node.js/React e-commerce application demonstrating a full DevOps lifecycle on Azure - CI/CD, containerization, Kubernetes orchestration, Infrastructure as Code, security, and monitoring.

## Architecture Overview

```
Developer
    │
    ▼
GitHub (feature → develop → main)
    │
    ▼
Azure DevOps Pipeline
    ├── CI: Build + Test (backend & frontend)
    ├── DockerPush: Build → Trivy Scan → Push to ACR
    ├── DeployStaging: AKS (staging namespace) - auto on develop
    └── DeployProduction: AKS (production namespace) - manual approval gate
          │
          ▼
    Azure Kubernetes Service (AKS)
    ├── frontend pod (nginx) ──proxy /api──► backend pod (Node.js)
    └── LoadBalancer Service (public IP)

Supporting Services:
  Azure Container Registry (ACR)  - stores Docker images
  Azure Key Vault                 - stores pipeline secrets
  Log Analytics Workspace         - aggregates logs
  Application Insights            - APM + live metrics
  Azure Cost Management           - budget alerts
```

## Tech Stack

| Area | Tool |
|------|------|
| Frontend | React 19 + Vite |
| Backend | Node.js + Express |
| CI/CD | Azure DevOps Pipelines |
| Containers | Docker, Docker Compose |
| Registry | Azure Container Registry (ACR) |
| Orchestration | Azure Kubernetes Service (AKS) |
| IaC | Terraform |
| Secrets | Azure Key Vault |
| Monitoring | Azure Monitor, Application Insights, Log Analytics |
| Security | Trivy image scanning, RBAC, non-root containers |

## Repository Structure

```
├── backend/                  # Node.js Express API
│   ├── index.js
│   ├── Dockerfile
│   ├── package.json
│   └── test/
│       └── products.test.js
├── frontend/                 # React + Vite SPA
│   ├── src/
│   │   ├── App.jsx
│   │   └── App.test.jsx
│   ├── nginx.conf            # SPA routing + /api proxy
│   ├── Dockerfile
│   └── package.json
├── infra/
│   └── main.tf               # Terraform: RG, VNet, NSG, ACR, AKS, Key Vault, Log Analytics, App Insights
├── backend.yaml              # Kubernetes Deployment + Service (backend)
├── frontend.yaml             # Kubernetes Deployment + Service (frontend)
├── docker-compose.yaml       # Local development
└── azure-pipelines.yml       # CI/CD pipeline definition
```

## Prerequisites

- Node.js 20+
- Docker Desktop
- Azure CLI (`az login`)
- kubectl
- Terraform 1.5+
- An Azure subscription

## Local Development

```bash
# Clone the repo
git clone https://github.com/vikassingh8/E-commerce.git
cd E-Commerce

# Start all services
docker-compose up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:5000/api/products
```

## Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
yarn install
yarn test
```

## Infrastructure Provisioning

```bash
cd infra
terraform init
terraform plan
terraform apply
```

Resources created: Resource Group, VNet, NSG, ACR, AKS, Key Vault, Log Analytics Workspace, Application Insights.

## CI/CD Pipeline

### Branching Strategy (Git Flow)

```
main          ← production releases, manual approval gate before deploy
  └── develop ← integration branch, auto-deploys to staging
        └── feature/* ← individual feature work, PR required to merge
```

### Pipeline Stages

| Stage | Trigger | What happens |
|-------|---------|-------------|
| CI | All branches | npm test (backend), yarn test + yarn build (frontend) |
| DockerPush | Non-PR pushes | Build images → Trivy scan → Push to ACR |
| DeployStaging | `develop` branch | Deploy to AKS `staging` namespace |
| DeployProduction | `main` branch | Manual approval → Deploy to AKS `production` namespace |

### Azure DevOps Setup

1. Create a service connection named `acr-service-connection` → Azure Container Registry
2. Create a service connection named `aks-service-connection` → AKS cluster
3. Create a Variable Group named `ecommerce-keyvault-secrets` linked to the Key Vault
4. Create Environments `staging` and `production` (add approval check on `production`)

## Secrets Management

All secrets (ACR credentials, connection strings) are stored in **Azure Key Vault** (`ecom-kv-872`) and referenced via the `ecommerce-keyvault-secrets` variable group in the pipeline. No secrets are hardcoded.

## Monitoring

| Service | Purpose |
|---------|---------|
| Application Insights | Request traces, exceptions, live metrics |
| Log Analytics Workspace | Centralized log aggregation from AKS |
| Azure Monitor | Metrics and alert rules |

Access Application Insights from the Azure Portal → `ecommerce-appinsights`.

## Cost Management

A budget alert is configured on resource group `ecommerce-rg`:
- Budget: $50/month
- Alert at 80% ($40) and 100% ($50) spend
- Email notifications to the project owner

## Security

- **Trivy** scans every Docker image for HIGH/CRITICAL CVEs before pushing to ACR - the pipeline fails if vulnerabilities are found
- All containers run as **non-root** users
- AKS uses **SystemAssigned managed identity** with least-privilege ACR pull role
- NSG restricts inbound traffic to ports 80 and 443 only
- Secrets stored in **Azure Key Vault**, never in code or pipeline YAML

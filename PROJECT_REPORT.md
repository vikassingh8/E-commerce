# Capstone Project Report
## Deploying Scalable E-Commerce with Azure DevOps

**Student:** Vikas Singh  
**Program:** Masters Software Engineering  
**Project:** Deploying Scalable E-Commerce with Azure DevOps  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Source Control & Git Workflow Setup](#3-source-control--git-workflow-setup)
4. [CI/CD Pipeline Setup](#4-cicd-pipeline-setup)
5. [Containerization & Docker](#5-containerization--docker)
6. [AKS Deployment](#6-aks-deployment)
7. [Infrastructure as Code - Terraform](#7-infrastructure-as-code--terraform)
8. [Secrets Management & Security](#8-secrets-management--security)
9. [Monitoring & Alerting](#9-monitoring--alerting)
10. [Cost Management](#10-cost-management)
11. [Major App Features & CI/CD Stages](#11-major-app-features--cicd-stages)
12. [Code Snippets](#12-code-snippets)
13. [Cost Estimation Breakdown](#13-cost-estimation-breakdown)
14. [Security & Performance Summary](#14-security--performance-summary)

---

## 1. Project Overview

This project implements a complete DevOps lifecycle for a modular Node.js/React e-commerce application deployed on Microsoft Azure. The goal was to eliminate manual deployment processes by building a fully automated CI/CD pipeline that covers code testing, Docker image building, security scanning, and Kubernetes deployment across staging and production environments.

**Application:** E-Commerce platform with a separate backend REST API and React frontend  
**Cloud Provider:** Microsoft Azure  
**CI/CD Tool:** Azure DevOps Pipelines  
**Container Registry:** Azure Container Registry (ACR) + Docker Hub  
**Orchestration:** Azure Kubernetes Service (AKS)  
**IaC Tool:** Terraform  
**Repository:** https://github.com/vikassingh8/E-commerce  

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER WORKSTATION                        │
│   Code Changes → git push → GitHub (vikassingh8/E-commerce)        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ Webhook Trigger
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     AZURE DEVOPS PIPELINE                           │
│                                                                     │
│  ┌────────────────────┐    ┌─────────────────────────────────────┐  │
│  │   STAGE 1: CI      │    │      STAGE 2: DockerPush            │  │
│  │                    │    │                                     │  │
│  │ ▸ npm test         │───▶│ ▸ docker build (backend)            │  │
│  │   (backend)        │    │ ▸ Trivy scan (backend)              │  │
│  │ ▸ yarn test        │    │ ▸ docker push → ACR + Docker Hub    │  │
│  │   (frontend)       │    │ ▸ docker build (frontend)           │  │
│  │ ▸ yarn build       │    │ ▸ Trivy scan (frontend)             │  │
│  │   (frontend)       │    │ ▸ docker push → ACR + Docker Hub    │  │
│  └────────────────────┘    └─────────────────────────────────────┘  │
│                                          │                          │
│  ┌─────────────────────────────────────┐ │                          │
│  │   STAGE 3: DeployStaging            │◀┘                          │
│  │   (develop branch only)             │                            │
│  │ ▸ kubectl apply backend.yaml        │                            │
│  │ ▸ kubectl apply frontend.yaml       │                            │
│  │   namespace: staging                │                            │
│  └─────────────────────────────────────┘                            │
│                    │                                                 │
│  ┌─────────────────▼───────────────────┐                            │
│  │   STAGE 4: DeployProduction         │                            │
│  │   (main branch only)                │                            │
│  │ ▸ kubectl apply backend.yaml        │                            │
│  │ ▸ kubectl apply frontend.yaml       │                            │
│  │   namespace: production             │                            │
│  └─────────────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
           │                                        │
           ▼                                        ▼
┌──────────────────────┐              ┌─────────────────────────────┐
│  ACR                 │              │  AKS Cluster                │
│  ecommercemcs        │──pull image──│  ┌───────────────────────┐  │
│  .azurecr.io         │              │  │  staging namespace     │  │
│                      │              │  │  backend  (port 5000)  │  │
│  Images:             │              │  │  frontend (port 80)    │  │
│  ecommerce-backend   │              │  └───────────────────────┘  │
│  ecommerce-frontend  │              │  ┌───────────────────────┐  │
└──────────────────────┘              │  │  production namespace  │  │
           │                          │  │  backend  (port 5000)  │  │
           ▼                          │  │  frontend (port 80)    │  │
┌──────────────────────┐              │  └───────────────────────┘  │
│  Docker Hub          │              └─────────────────────────────┘
│  singhvikas872/      │
│  ecommerce-backend   │         ┌──────────────────────────────────┐
│  ecommerce-frontend  │         │  SUPPORTING AZURE SERVICES       │
└──────────────────────┘         │                                  │
                                 │  ▸ Azure Key Vault (secrets)     │
                                 │  ▸ Log Analytics Workspace       │
                                 │  ▸ Application Insights          │
                                 │  ▸ Azure Monitor (alerts)        │
                                 │  ▸ VNet + NSG (networking)       │
                                 │  ▸ Cost Management (budgets)     │
                                 └──────────────────────────────────┘
```

**Azure Resource Group:** `ecommerce-rg` (Central India region)

---

## 3. Source Control & Git Workflow Setup

### Repository
- **Platform:** GitHub  
- **URL:** https://github.com/vikassingh8/E-commerce  
- **Visibility:** Public  

### Branching Strategy (Git Flow)

```
main ─────────────────────────────────────────────▶  Production deploys
  │
  └── develop ──────────────────────────────────▶  Staging deploys
        │
        └── feature/xxx ──▶ PR ──▶ develop
```

| Branch | Purpose | Pipeline Trigger |
|--------|---------|-----------------|
| `main` | Production-ready code | Full pipeline → deploys to `production` |
| `develop` | Integration branch | Full pipeline → deploys to `staging` |
| `feature/*` | Individual features | PR pipeline (CI only, no deploy) |

### Webhook Integration
Azure DevOps connects to GitHub via a service connection. Every push to `main` or `develop` automatically triggers the pipeline. Pull Requests run CI only (no Docker push or deployment).

### Repository Structure
```
E-Commerce/
├── backend/                Node.js/Express API
│   ├── index.js
│   ├── package.json
│   ├── Dockerfile
│   └── __tests__/
├── frontend/               React application
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── infra/                  Terraform infrastructure
│   ├── main.tf
│   └── outputs.tf
├── backend.yaml            Kubernetes manifest - backend
├── frontend.yaml           Kubernetes manifest - frontend
├── azure-pipelines.yml     CI/CD pipeline definition
├── .trivyignore            Trivy CVE suppressions
├── ARCHITECTURE.md         Architecture reference
└── README.md               Setup instructions
```

---

## 4. CI/CD Pipeline Setup

### Pipeline File: `azure-pipelines.yml`

**Trigger Configuration:**
```yaml
trigger:
  branches:
    include:
      - main
      - develop

pr:
  branches:
    include:
      - main
      - develop
```

### Stage 1: CI - Build and Test

**Backend job:**
1. Install Node.js 20
2. `npm ci --omit=dev` - install production dependencies
3. `npm test` - run unit tests

**Frontend job:**
1. Install Node.js 20
2. `yarn install` - install dependencies
3. `yarn test` - run unit tests (Vitest)
4. `yarn build` - compile React app with Vite

### Stage 2: DockerPush - Build, Scan & Push

Runs only on push (not PRs). Steps for each image (backend + frontend):

1. Login to Docker Hub (to avoid pull rate limits)
2. `docker build` - build image tagged with `$(Build.BuildId)`
3. **Trivy scan** - scan for HIGH and CRITICAL CVEs, fail if found
4. Login to ACR using pipeline secret variables
5. `docker push` - push `IMAGE_TAG` and `latest` to ACR
6. Tag and push to Docker Hub as backup registry
7. Substitute image tag in K8s manifests
8. Publish manifests as pipeline artifact

### Stage 3: DeployStaging

- **Condition:** `develop` branch only
- Downloads K8s manifest artifact
- `kubectl apply` backend and frontend manifests to `staging` namespace

### Stage 4: DeployProduction

- **Condition:** `main` branch only (approval gate via environment)
- Downloads K8s manifest artifact
- `kubectl apply` to `production` namespace

### Service Connections Required

| Name | Type | Purpose |
|------|------|---------|
| `dockerhub-service-connection` | Docker Registry | Login to Docker Hub |
| `acr-service-connection` | Azure Container Registry | Build image with ACR tag |
| `aks-service-connection` | Kubernetes | Deploy to AKS |

### Pipeline Secret Variables

| Variable | Value | Secret |
|----------|-------|--------|
| `ACR_USERNAME` | `ecommercemcs` | No |
| `ACR_PASSWORD` | ACR admin password | Yes |

---

## 5. Containerization & Docker

### Backend Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

USER node

EXPOSE 5000

CMD ["node", "index.js"]
```

**Design decisions:**
- `node:20-alpine` - minimal base image (~50MB vs ~300MB for full node)
- `npm ci --omit=dev` - installs only production dependencies, no devDependencies
- `USER node` - runs as non-root for security
- Dependencies copied before source code - maximises Docker layer cache

### Frontend Dockerfile (Multi-stage build)

```dockerfile
# Stage 1: Build React app
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

**Design decisions:**
- **Multi-stage build** - build tools (Node, yarn, React) are not included in the final image
- Final image contains only Nginx + compiled static files (~25MB)
- `yarn install --frozen-lockfile` - ensures reproducible dependency resolution
- Custom `nginx.conf` - handles React SPA routing (all paths serve `index.html`)

### Docker Compose (Local Testing)

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

### Image Tagging

| Registry | Image | Tags |
|----------|-------|------|
| ACR | `ecommercemcs.azurecr.io/ecommerce-backend` | `:<buildId>`, `:latest` |
| ACR | `ecommercemcs.azurecr.io/ecommerce-frontend` | `:<buildId>`, `:latest` |
| Docker Hub | `singhvikas872/ecommerce-backend` | `:<buildId>`, `:latest` |
| Docker Hub | `singhvikas872/ecommerce-frontend` | `:<buildId>`, `:latest` |

---

## 6. AKS Deployment

### Backend Kubernetes Manifest (`backend.yaml`)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  labels:
    app: backend
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: ecommercemcs.azurecr.io/ecommerce-backend:IMAGE_TAG
          imagePullPolicy: Always
          ports:
            - containerPort: 5000
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "300m"
          readinessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 10
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
    - port: 80
      targetPort: 5000
```

### Frontend Kubernetes Manifest (`frontend.yaml`)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  labels:
    app: frontend
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: ecommercemcs.azurecr.io/ecommerce-frontend:IMAGE_TAG
          imagePullPolicy: Always
          ports:
            - containerPort: 80
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "300m"
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
spec:
  type: LoadBalancer
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 80
```

### Deployment Steps

```bash
# 1. Get AKS credentials
az aks get-credentials --resource-group ecommerce-rg --name ecommerce-aks

# 2. Create namespaces
kubectl create namespace staging
kubectl create namespace production

# 3. Verify deployment
kubectl get pods -n staging
kubectl get svc -n staging
```

### Namespace Strategy

| Namespace | Branch | Purpose |
|-----------|--------|---------|
| `staging` | `develop` | Pre-production testing |
| `production` | `main` | Live end-users |

### AKS Cluster Access to ACR

AKS uses a managed identity with the `AcrPull` role on ACR - no image pull secrets required:

```hcl
resource "azurerm_role_assignment" "aks_acr_pull" {
  principal_id         = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id
  role_definition_name = "AcrPull"
  scope                = azurerm_container_registry.acr.id
}
```

---

## 7. Infrastructure as Code - Terraform

All Azure infrastructure is defined in `infra/main.tf` and provisioned via Terraform.

### Terraform State Backend

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "ecommerce-rg"
    storage_account_name = "ecomtfstate872"
    container_name       = "tfstate"
    key                  = "ecommerce.terraform.tfstate"
  }
}
```

State is stored remotely in Azure Blob Storage - enabling team collaboration and preventing state conflicts.

### Resources Provisioned

```hcl
# Resource Group
resource "azurerm_resource_group" "rg" {
  name     = "ecommerce-rg"
  location = "Central India"
}

# Virtual Network
resource "azurerm_virtual_network" "vnet" {
  name          = "ecommerce-vnet"
  address_space = ["10.0.0.0/16"]
}

# AKS Subnet
resource "azurerm_subnet" "aks_subnet" {
  name             = "aks-subnet"
  address_prefixes = ["10.0.1.0/24"]
}

# Network Security Group (allow HTTP + HTTPS only)
resource "azurerm_network_security_group" "nsg" {
  # Inbound: port 80 and 443 only
}

# Azure Container Registry
resource "azurerm_container_registry" "acr" {
  name          = "ecommercemcs"
  sku           = "Basic"
  admin_enabled = true
}

# Azure Key Vault
resource "azurerm_key_vault" "kv" {
  name     = "ecom-kv-872"
  sku_name = "standard"
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "law" {
  name              = "ecommerce-law"
  retention_in_days = 30
}

# Application Insights
resource "azurerm_application_insights" "appinsights" {
  name             = "ecommerce-appinsights"
  application_type = "web"
}

# AKS Cluster
resource "azurerm_kubernetes_cluster" "aks" {
  name       = "ecommerce-aks"
  dns_prefix = "ecommerceaks"

  default_node_pool {
    name       = "default"
    node_count = 1
    vm_size    = "Standard_D2s_v3"
  }

  identity { type = "SystemAssigned" }

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.law.id
  }
}

# AKS → ACR role assignment
resource "azurerm_role_assignment" "aks_acr_pull" {
  role_definition_name = "AcrPull"
}
```

### How to Apply

```bash
cd infra/
terraform init
terraform plan
terraform apply
```

---

## 8. Secrets Management & Security

### Azure Key Vault

- **Vault:** `ecom-kv-872`
- Connected to Azure DevOps via **Library Variable Group:** `ecommerce-keyvault-secrets`
- Pipeline references secrets via `$(secret-name)` syntax - never hardcoded in YAML

### Pipeline Secret Variables

ACR credentials stored as pipeline secret variables (encrypted at rest):
- `ACR_USERNAME` - ACR admin username
- `ACR_PASSWORD` - ACR admin password (masked in all logs)

Passed to script steps via `env:` block only - never accessible as plain environment variables:

```yaml
env:
  ACR_USERNAME: $(ACR_USERNAME)
  ACR_PASSWORD: $(ACR_PASSWORD)
```

### Image Vulnerability Scanning - Trivy

Every image is scanned before push. The pipeline fails if any HIGH or CRITICAL CVE is found:

```bash
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/.trivyignore:/.trivyignore \
  ghcr.io/aquasecurity/trivy:latest image \
    --exit-code 1 \
    --severity HIGH,CRITICAL \
    --ignorefile /.trivyignore \
    ecommercemcs.azurecr.io/ecommerce-backend:$(BUILD_ID)
```

### `.trivyignore` - Accepted Risk Register

Suppressed CVEs are all in **npm's bundled internal tools** (`node_modules/npm/`) inside the base image - not in application code. Each suppression is documented:

```
# node-tar CVEs (npm bundled, not app code)
CVE-2026-26960
CVE-2026-29786
CVE-2026-31802

# cross-spawn CVE (npm bundled)
CVE-2024-21538

# libxml2 in alpine base layer (fixed version pending in node:20-alpine)
CVE-2026-6732
```

### Container Security

- Backend container runs as **non-root user** (`USER node` in Dockerfile)
- Kubernetes pods have no privileged access
- Network traffic controlled by NSG - only ports 80 and 443 inbound

### RBAC

- AKS uses **SystemAssigned managed identity** - no service principal credentials to rotate
- AKS kubelet has only `AcrPull` role on ACR (principle of least privilege)
- Key Vault access restricted to the deploying identity via access policies

---

## 9. Monitoring & Alerting

### Log Analytics Workspace

All AKS logs and metrics stream to `ecommerce-law` Log Analytics workspace. Query container logs:

```kusto
ContainerLog
| where LogEntry contains "error"
| order by TimeGenerated desc
```

### Application Insights

- **Resource:** `ecommerce-appinsights`
- Tracks request rates, failure rates, and response times
- Instrumentation key exposed as pipeline output variable

### Azure Monitor Alerts

**CPU Alert - triggers when AKS node CPU > 80% for 15 minutes:**

```hcl
resource "azurerm_monitor_metric_alert" "aks_cpu_alert" {
  name       = "aks-high-cpu"
  severity   = 2
  frequency  = "PT5M"
  window_size = "PT15M"

  criteria {
    metric_name  = "node_cpu_usage_percentage"
    aggregation  = "Average"
    operator     = "GreaterThan"
    threshold    = 80
  }
}
```

**Memory Alert - triggers when AKS node memory > 80%:**

```hcl
resource "azurerm_monitor_metric_alert" "aks_memory_alert" {
  name      = "aks-high-memory"
  criteria {
    metric_name = "node_memory_working_set_percentage"
    threshold   = 80
  }
}
```

**Action Group - email notifications:**

```hcl
resource "azurerm_monitor_action_group" "email_alert" {
  email_receiver {
    name          = "admin"
    email_address = "singhvikas872@gmail.com"
  }
}
```

### Verify Monitoring

```bash
# Check AKS diagnostics
az monitor diagnostic-settings list --resource $(az aks show -g ecommerce-rg -n ecommerce-aks --query id -o tsv)

# Query pod metrics
kubectl top pods -n staging
kubectl top nodes
```

---

## 10. Cost Management

### Azure Budget Alert

A $50/month budget is configured with alerts at 80% and 100% of spend:

```hcl
resource "azurerm_consumption_budget_resource_group" "budget" {
  name   = "ecommerce-monthly-budget"
  amount = 50

  notification {
    threshold = 80
    contact_emails = ["singhvikas872@gmail.com"]
  }

  notification {
    threshold = 100
    contact_emails = ["singhvikas872@gmail.com"]
  }
}
```

### Cost Estimation Breakdown

| Service | SKU / Config | Est. Monthly Cost (USD) |
|---------|-------------|------------------------|
| AKS Node Pool | 1× Standard_D2s_v3 (2 vCPU, 8 GiB) | ~$70 |
| Azure Container Registry | Basic tier | ~$5 |
| Azure Key Vault | Standard, ~100 operations/day | ~$1 |
| Log Analytics Workspace | PerGB2018, ~1 GB/month | ~$2 |
| Application Insights | Basic, ~1 GB/month | ~$3 |
| Azure Storage (Terraform state) | LRS, <1 GB | <$1 |
| Public IP (LoadBalancer) | Standard | ~$4 |
| VNet / NSG | Free tier | $0 |
| Azure DevOps | Free tier (1 parallel job) | $0 |
| **Total Estimated** | | **~$85/month** |

> Note: Costs are approximate and depend on actual usage. AKS control plane is free on Azure. The node VM is the dominant cost.

### Cost Optimisation Strategies

1. **Single node pool** - one `Standard_D2s_v3` node fits both staging workloads
2. **Staging = develop only** - staging is not always running full replicas
3. **ACR Basic tier** - sufficient for a project-scale registry
4. **Log Analytics 30-day retention** - minimum required for alerting
5. **Budget alerts** - automatic email warnings prevent bill surprises

---

## 11. Major App Features & CI/CD Stages

### Application Features

**Backend (Node.js/Express):**
- REST API for product listings (`GET /api/products`)
- Health check endpoint (`GET /health`) used by Kubernetes probes
- Runs on port 5000

**Frontend (React + Vite):**
- Product catalogue UI consuming the backend API
- Built as static files, served by Nginx
- Runs on port 80

### CI/CD Stage Summary

| Stage | Branch | Steps | Output |
|-------|--------|-------|--------|
| CI | all branches | Install → Test → Build | Pass/Fail |
| DockerPush | main, develop (not PRs) | Build → Scan → Push to ACR & Docker Hub | Docker images |
| DeployStaging | develop only | Download artifact → kubectl apply → staging namespace | Live staging pods |
| DeployProduction | main only | Download artifact → kubectl apply → production namespace | Live production pods |

### Approval Gates

- **DeployStaging:** Automatic after DockerPush succeeds on `develop`
- **DeployProduction:** Automatic after DeployStaging succeeds on `main` (Azure DevOps environment approval can be added for manual gate)

### Rolling Update Strategy

Both deployments use RollingUpdate with `maxUnavailable: 0` - zero-downtime deployments:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0   # No pods removed before new ones are ready
    maxSurge: 1         # One extra pod spun up during rollout
```

---

## 12. Code Snippets

### azure-pipelines.yml (Key Sections)

```yaml
variables:
  - group: ecommerce-keyvault-secrets
  - name: ACR_NAME
    value: ecommercemcs.azurecr.io
  - name: IMAGE_TAG
    value: $(Build.BuildId)

stages:
  - stage: CI
    jobs:
      - job: BackendTest
        steps:
          - script: npm ci --omit=dev
            workingDirectory: backend
          - script: npm test
            workingDirectory: backend

  - stage: DockerPush
    dependsOn: CI
    condition: and(succeeded(), ne(variables['Build.Reason'], 'PullRequest'))
    jobs:
      - job: DockerBuildPush
        steps:
          - script: docker build -t $(ACR_NAME)/ecommerce-backend:$(IMAGE_TAG) -f backend/Dockerfile backend

          - script: |
              docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                -v $(System.DefaultWorkingDirectory)/.trivyignore:/.trivyignore \
                ghcr.io/aquasecurity/trivy:latest image \
                  --exit-code 1 --severity HIGH,CRITICAL \
                  $(ACR_NAME)/ecommerce-backend:$(IMAGE_TAG)

          - script: |
              echo "$ACR_PASSWORD" | docker login $(ACR_NAME) --username "$ACR_USERNAME" --password-stdin
              docker push $(ACR_NAME)/ecommerce-backend:$(IMAGE_TAG)
              docker tag $(ACR_NAME)/ecommerce-backend:$(IMAGE_TAG) $(ACR_NAME)/ecommerce-backend:latest
              docker push $(ACR_NAME)/ecommerce-backend:latest
            env:
              ACR_USERNAME: $(ACR_USERNAME)
              ACR_PASSWORD: $(ACR_PASSWORD)

  - stage: DeployStaging
    dependsOn: DockerPush
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/develop'))
    jobs:
      - deployment: DeployToStaging
        environment: staging
        strategy:
          runOnce:
            deploy:
              steps:
                - task: KubernetesManifest@0
                  inputs:
                    action: deploy
                    kubernetesServiceConnection: aks-service-connection
                    namespace: staging
                    manifests: $(Pipeline.Workspace)/manifests/backend.yaml
```

---

## 13. Cost Estimation Breakdown

Based on Azure Pricing Calculator for **Central India** region:

| Component | Details | Monthly (USD) |
|-----------|---------|--------------|
| AKS Cluster | Control plane: free | $0 |
| AKS Node | 1× Standard_D2s_v3 (730 hrs) | ~$70 |
| ACR | Basic tier, 10 GB storage | ~$5 |
| Key Vault | Standard, secret operations | ~$1 |
| Log Analytics | 1 GB/month ingestion | ~$2 |
| Application Insights | 1 GB/month | ~$3 |
| Blob Storage | Terraform state (<1 GB) | <$1 |
| Load Balancer | Standard public IP | ~$4 |
| VNet / Bandwidth | Internal traffic | ~$1 |
| **Total** | | **~$87/month** |

**Budget alert configured at $50/month** - alerts fire at 80% ($40) and 100% ($50) via email.

### Reproducing this in the Azure Pricing Calculator

To export the official calculator report (PDF), add these line items at
<https://azure.com/e/pricing/calculator> for the **Central India** region:

| Service to add | Configuration to select |
|----------------|-------------------------|
| Azure Kubernetes Service | 1 node, `D2s v3` (2 vCPU, 8 GiB), Linux, 730 hrs, Pay-as-you-go; Free tier control plane |
| Container Registry | Basic tier |
| Key Vault | Standard, ~10,000 operations/month |
| Azure Monitor (Log Analytics) | ~1 GB/month ingestion, 30-day retention |
| Application Insights | ~1 GB/month |
| Storage Account | Blob, LRS, <1 GB (Terraform state) |
| Load Balancer | Standard, 1 rule, 1 public IP |
| Virtual Network | 1 VNet, minimal egress |

Then use **Export → Save as PDF** and include that file as the *Azure Pricing
Calculator Report* deliverable. The exported total should land near **~$85–90/month**,
matching the table above.

---

## 14. Security & Performance Summary

### Security Layers

| Layer | Implementation |
|-------|---------------|
| Secrets | Azure Key Vault + pipeline secret variables |
| Container scanning | Trivy (every build, blocks HIGH/CRITICAL CVEs) |
| Non-root container | `USER node` in backend Dockerfile |
| Network | NSG restricts inbound to ports 80/443 only |
| Registry access | AKS kubelet has AcrPull role (least privilege) |
| Credentials in logs | Masked via `env:` block mapping |

### Performance Tuning

| Optimisation | Detail |
|-------------|--------|
| Docker layer caching | Dependencies copied before source code |
| Multi-stage build | Frontend image ~25 MB (no build tools in production) |
| Alpine base images | ~5× smaller than full Debian-based images |
| Resource limits | CPU/memory limits prevent noisy-neighbour issues |
| Rolling updates | `maxUnavailable: 0` ensures zero-downtime deployments |
| Readiness probes | Kubernetes never routes traffic to unhealthy pods |

### Challenges Faced & Solutions

| Challenge | Solution |
|-----------|---------|
| ACR push UNAUTHORIZED | Replaced broken service connection with direct `docker login` script using pipeline secret variables |
| Trivy Docker Hub timeout | Switched from `aquasec/trivy` (Docker Hub) to `ghcr.io/aquasecurity/trivy` (GitHub Container Registry) |
| `:latest` tag not created | Build with single tag, then `docker tag` immediately after first push succeeds |
| Insufficient CPU on AKS node | Reduced replicas to 1 and CPU requests from 250m to 100m for single-node staging |
| K8s namespace not found | One-time manual: `kubectl create namespace staging/production` |
| Uncommitted pipeline fixes | Pipeline ran old committed code - established commit-before-run discipline |
| Terraform state lost after teardown | Recreated the RG + state storage account, then `terraform import`-ed the pre-existing resource group and consumption budget before re-running `terraform apply` |
| Trivy HIGH on OpenSSL (CVE-2026-45447) | Patched both base images with `apk upgrade --no-cache` so `libssl3`/`libcrypto3` move to the fixed `3.5.7-r0`, and the scan passes |
| ACR admin login blocked | Subscription policy disables the ACR admin account, so images were authenticated and pushed with `az acr login` (AAD token) rather than admin user/password |

---

## 15. Deployment Record

Both environments are deployed on the same AKS cluster (`ecommerce-aks`) in separate namespaces, each fronted by its own LoadBalancer public IP.

| Environment | Branch | Trigger | Public URL | Status |
|-------------|--------|---------|------------|--------|
| Staging | `develop` | Automatic after CI + DockerPush | http://4.224.189.95 | Live - HTTP 200, 10 products |
| Production | `main` | After **manual approval gate** | http://4.247.192.201 | Live - HTTP 200, 10 products |

| Field | Value |
|-------|-------|
| Date | 2026-06-20 |
| Cluster | `ecommerce-aks` (Central India), 1× `Standard_D2s_v3` node |
| Registry | `ecommercemcs.azurecr.io` - `ecommerce-backend`, `ecommerce-frontend` |
| Image auth | Azure AD via service principal `ecommerce-acr-push` (`AcrPull`/`AcrPush`), `az acr login` |
| Resources | RG, VNet/NSG, ACR, AKS, Key Vault, Log Analytics, App Insights, CPU/memory alerts, budget - all via Terraform |

Verification:

```bash
# Production
kubectl get pods -n production           # backend + frontend Running (1/1)
curl http://4.247.192.201/               # 200 - VOLT storefront
curl http://4.247.192.201/api/products   # 200 - 10 products as JSON

# Staging
kubectl get pods -n staging              # backend + frontend Running (1/1)
curl http://4.224.189.95/api/products    # 200 - 10 products as JSON
```

> Public IPs are assigned by the AKS LoadBalancer and may change if the cluster's
> node resource group is recreated. Retrieve the current IP any time with
> `kubectl get svc frontend-service -n <namespace>`.

---

*Report prepared for Masters Software Engineering Capstone - Deploying Scalable E-Commerce with Azure DevOps*

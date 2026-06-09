# E-Commerce Application — Architecture & Services Documentation

## Project Overview

This is a full-stack E-Commerce application deployed on Microsoft Azure using a fully automated DevOps pipeline. The application consists of a Node.js/Express backend and a React frontend, containerised with Docker and orchestrated on Kubernetes.

---

## Architecture Diagram

```
Developer (Git Push)
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│                  Azure DevOps Pipeline                   │
│                                                         │
│  Stage 1: CI          Stage 2: DockerPush               │
│  ┌──────────────┐    ┌──────────────────────────────┐   │
│  │ Backend Test │    │ Docker Build + Trivy Scan     │   │
│  │ Frontend Test│    │ Push → ACR + Docker Hub       │   │
│  │ Frontend Build│   └──────────────────────────────┘   │
│  └──────────────┘                                       │
│                                                         │
│  Stage 3: DeployStaging    Stage 4: DeployProduction    │
│  ┌──────────────────┐     ┌──────────────────────────┐  │
│  │ kubectl apply    │     │ kubectl apply (main only) │  │
│  │ namespace:staging│     │ namespace:production      │  │
│  └──────────────────┘     └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
        │                              │
        ▼                              ▼
┌──────────────┐              ┌──────────────────┐
│  ACR         │              │  AKS Cluster     │
│  (Images)    │─────pull────▶│  staging ns      │
└──────────────┘              │  production ns   │
                              └──────────────────┘
```

---

## Services Used

### 1. Azure Kubernetes Service (AKS)
**What:** Managed Kubernetes cluster running on Azure.  
**Why:** Provides container orchestration — automatically manages deployment, scaling, and self-healing of application containers. Eliminates the need to manage Kubernetes control plane infrastructure manually.  
**Used for:** Hosting backend and frontend containers in `staging` and `production` namespaces.

---

### 2. Azure Container Registry (ACR) — `ecommercemcs.azurecr.io`
**What:** Private Docker image registry hosted on Azure.  
**Why:** Stores built Docker images privately and securely within the same Azure network as AKS. AKS pulls images directly from ACR without going over the public internet, which is faster and more secure than Docker Hub.  
**Used for:** Storing versioned backend and frontend images (e.g., `ecommerce-backend:38`).

---

### 3. Azure DevOps Pipelines
**What:** Cloud-based CI/CD automation platform.  
**Why:** Automates the entire software delivery process — from running tests to building Docker images to deploying to Kubernetes — every time code is pushed. Eliminates manual deployment steps and ensures consistent, repeatable releases.  
**Used for:** Running the 4-stage pipeline (CI → DockerPush → DeployStaging → DeployProduction).

---

### 4. Docker Hub — `singhvikas872`
**What:** Public Docker image registry.  
**Why:** Provides a publicly accessible copy of images for portability and as a backup registry. Also used during the pipeline to avoid Docker Hub pull rate limits by logging in before pulling base images.  
**Used for:** Publishing `singhvikas872/ecommerce-backend` and `singhvikas872/ecommerce-frontend` as public images.

---

### 5. Terraform
**What:** Infrastructure as Code (IaC) tool by HashiCorp.  
**Why:** Allows all Azure infrastructure (AKS, ACR, Key Vault, VNet, Log Analytics, etc.) to be defined in code and version-controlled. Infrastructure can be created, modified, and destroyed repeatably with a single command rather than manual portal clicks.  
**Used for:** Provisioning all Azure resources in `ecommerce-rg` resource group. State stored in Azure Blob Storage (`ecomtfstate872`).

---

### 6. Trivy (by Aqua Security)
**What:** Open-source container image vulnerability scanner.  
**Why:** Scans Docker images for known CVEs (Common Vulnerabilities and Exposures) before they are pushed to ACR. Prevents vulnerable images from ever reaching production. Integrated directly into the pipeline so security checks are automatic on every build.  
**Used for:** Scanning `ecommerce-backend` and `ecommerce-frontend` images for HIGH and CRITICAL severity vulnerabilities. Pulled from `ghcr.io/aquasecurity/trivy` (GitHub Container Registry) to avoid Docker Hub rate limits.

---

### 7. Node.js / Express — Backend
**What:** JavaScript runtime and web framework.  
**Why:** Lightweight and efficient for building REST APIs. Large ecosystem via npm. Well-suited for e-commerce API endpoints (products, cart, orders).  
**Used for:** Backend REST API server running on port 5000, with a `/health` endpoint for Kubernetes liveness and readiness probes.

---

### 8. React — Frontend
**What:** JavaScript UI library by Meta.  
**Why:** Component-based architecture makes it easy to build interactive e-commerce UIs. Vite build tooling produces optimised static assets served by Nginx inside the container.  
**Used for:** Frontend single-page application served on port 80, connecting to the backend API.

---

### 9. Azure Key Vault — `ecom-kv-872`
**What:** Azure secrets management service.  
**Why:** Stores sensitive configuration (API keys, credentials, connection strings) securely outside of application code and pipeline YAML. Secrets are fetched at runtime rather than hardcoded.  
**Used for:** Linked to Azure DevOps via the `ecommerce-keyvault-secrets` variable group.

---

### 10. Azure Log Analytics + Application Insights
**What:** Azure monitoring and observability services.  
**Why:** Log Analytics collects and queries logs from all Azure resources including AKS. Application Insights provides application-level performance monitoring, request tracing, and failure detection.  
**Used for:** Monitoring AKS cluster health. CPU and memory alerts trigger email notifications when thresholds exceed 80%.

---

### 11. Azure Monitor — Alerts & Budgets
**What:** Azure alerting and cost management service.  
**Why:** Proactively notifies the team when infrastructure is under stress (high CPU/memory) or when cloud spend approaches budget limits.  
**Used for:** CPU > 80% alert, Memory > 80% alert, and a $50/month budget alert — all sending email to `vikassingh.dnagrowth@gmail.com`.

---

### 12. Azure Virtual Network (VNet) + NSG
**What:** Private network and Network Security Group for traffic filtering.  
**Why:** Isolates AKS cluster traffic within a private network. The NSG controls inbound traffic, allowing only HTTP (port 80) and HTTPS (port 443) from the internet.  
**Used for:** `ecommerce-vnet` (10.0.0.0/16) with AKS subnet (10.0.1.0/24).

---

## Pipeline Stages

| Stage | Trigger | What it does |
|-------|---------|-------------|
| **CI** | Every push to `main` or `develop` | Installs dependencies, runs backend unit tests, runs frontend unit tests, builds frontend |
| **DockerPush** | After CI passes (not on PRs) | Builds Docker images, scans with Trivy, pushes to ACR and Docker Hub |
| **DeployStaging** | After DockerPush, `develop` branch only | Deploys to AKS `staging` namespace |
| **DeployProduction** | After DeployStaging, `main` branch only | Deploys to AKS `production` namespace |

---

## Kubernetes Namespaces

| Namespace | Purpose |
|-----------|---------|
| `staging` | Pre-production environment, deployed from `develop` branch |
| `production` | Live environment, deployed from `main` branch only |

---

## Image Tagging Strategy

Every build produces two tags:
- `:<BUILD_ID>` — unique per build, used by Kubernetes manifests for precise rollback
- `:latest` — always points to the most recent build

---

## Repository Structure

```
E-Commerce/
├── backend/            Node.js/Express API
├── frontend/           React application
├── infra/              Terraform infrastructure code
├── backend.yaml        Kubernetes manifest — backend Deployment + Service
├── frontend.yaml       Kubernetes manifest — frontend Deployment + Service
├── azure-pipelines.yml Azure DevOps pipeline definition
└── .trivyignore        CVEs suppressed in Trivy scans (npm bundled deps)
```

# E-Commerce Application Architecture

## Project Overview

This is a full-stack e-commerce application running on Microsoft Azure behind an
automated DevOps pipeline. There are two parts to the app: a Node.js/Express
backend that serves a product API, and a React frontend built with Vite. Both are
packaged as Docker images and run as pods on Kubernetes.

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
│  │ Frontend Test│    │ Push to ACR + Docker Hub      │   │
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

## The Application

The backend is a small Express server. It exposes `GET /api/products` for the
catalogue and `GET /health` for the Kubernetes probes, and listens on port 5000.
The frontend is a React single-page app compiled by Vite into static files, which
are served by Nginx on port 80. Inside the cluster, Nginx also forwards any `/api`
request to the backend service, so the browser only ever talks to the frontend.

## Azure Services and Tools

**Azure Kubernetes Service (AKS)** runs the containers. It handles scheduling,
self-healing, and rolling updates so I don't have to manage the Kubernetes control
plane myself. The backend and frontend run in two namespaces, `staging` and
`production`, which keeps the two environments isolated on the same cluster.

**Azure Container Registry (`ecommercemcs`)** stores the Docker images
privately. Because it sits in the same Azure network as AKS, image pulls are fast
and stay off the public internet. Every build produces a versioned image such as
`ecommerce-backend:44`. A public copy is also pushed to Docker Hub under
`singhvikas872` as a backup and to avoid Docker Hub pull rate limits during builds.

**Azure DevOps Pipelines** is the automation engine. A single YAML file defines the
four stages (CI, DockerPush, DeployStaging, DeployProduction) and runs them on
every push, so testing, building, scanning, and deploying all happen without manual
steps.

**Terraform** defines all of the Azure infrastructure as code in `infra/main.tf`.
Instead of clicking around the portal, the resource group, networking, ACR, AKS,
Key Vault, Log Analytics, and Application Insights are all created from version-
controlled files, and the state is stored remotely in Azure Blob Storage.

**Trivy** scans each image for known CVEs before it is pushed. The pipeline asks it
to fail on HIGH or CRITICAL findings, so a vulnerable image never reaches the
registry. It is pulled from GitHub Container Registry (`ghcr.io/aquasecurity/trivy`)
to sidestep Docker Hub rate limits.

**Azure Key Vault (`ecom-kv-872`)** holds the pipeline secrets so credentials never
live in code or YAML. The pipeline authenticates to ACR with an Azure AD service
principal rather than a static admin password.

**Azure Monitor, Application Insights, and Log Analytics** cover observability. AKS
streams logs and metrics into the Log Analytics workspace, Application Insights
tracks request and failure rates, and two metric alerts email me if node CPU or
memory crosses 80% for fifteen minutes.

**Networking** is a virtual network (`10.0.0.0/16`) with a dedicated AKS subnet. A
network security group on that subnet only allows inbound traffic on ports 80 and
443.

**Azure Cost Management** enforces a $50/month budget on the resource group, with
email alerts at 80% and 100% of spend so costs can't quietly run away.

## Pipeline Stages

| Stage | Trigger | What it does |
|-------|---------|--------------|
| CI | Every push to `main` or `develop` | Installs dependencies, runs backend and frontend unit tests, builds the frontend |
| DockerPush | After CI passes (not on PRs) | Builds the images, scans them with Trivy, pushes to ACR and Docker Hub |
| DeployStaging | `develop` only | Deploys to the AKS `staging` namespace |
| DeployProduction | `main` only | Deploys to the AKS `production` namespace after a manual approval |

## Kubernetes Namespaces

`staging` is the pre-production environment deployed from `develop`, and
`production` is the live environment deployed from `main`. Keeping them in separate
namespaces means staging changes can be tested without any risk to production.

## Image Tagging

Each build tags an image two ways: with the build ID (for example `:44`) so a
specific version can be rolled back to, and with `:latest` so the most recent build
is easy to reference.

## Repository Structure

```
E-Commerce/
├── backend/            Node.js/Express API
├── frontend/           React application
├── infra/              Terraform infrastructure code
├── backend.yaml        Kubernetes Deployment + Service (backend)
├── frontend.yaml       Kubernetes Deployment + Service (frontend)
├── azure-pipelines.yml Azure DevOps pipeline definition
└── .trivyignore        CVEs accepted/suppressed in Trivy scans
```

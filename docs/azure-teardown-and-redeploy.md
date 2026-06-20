# Azure Teardown & Redeploy Guide

This document covers how to delete all Azure resources (stop billing) and bring everything back up when needed.

---

## Resource Inventory

| Resource | Name | Location |
|---|---|---|
| Resource Group | `ecommerce-rg` | Central India |
| AKS Cluster | `ecommerce-aks` | Central India |
| ACR | `ecommercemcs` | Central India |
| Key Vault | `ecom-kv-872` | Central India |
| Log Analytics | `ecommerce-law` | Central India |
| App Insights | `ecommerce-appinsights` | Central India |
| Terraform Backend | `ecomtfstate872` (storage account) | Central India |
| VNet | `ecommerce-vnet` | Central India |

## Estimated Monthly Cost

| Resource | Est. Cost |
|---|---|
| AKS (Standard_D2s_v3, 1 node) | ~$70–140 |
| ACR Basic | ~$5 |
| Log Analytics | ~$2–5 |
| Key Vault, Storage, VNet | ~$1–2 |
| **Total** | **~$80–152/month** |

---



## Teardown (Delete Everything)

> **Warning:** This permanently deletes all resources including the Terraform backend storage account. You will need to recreate the backend before running Terraform again.

### Step 1 — Login to Azure

```powershell
az login
```

### Step 2 — Delete the entire resource group

```powershell
az group delete --name ecommerce-rg --yes
```

This single command removes all resources (AKS, ACR, Key Vault, VNet, storage, etc.) and stops billing.

### Step 3 — Verify deletion

```powershell
az group show --name ecommerce-rg
```

Should return a "not found" error confirming deletion.

---

## Redeploy (Bring Everything Back)

### Prerequisites

- Azure CLI installed and logged in (`az login`)
- Terraform installed (`terraform -version`)
- kubectl installed (`kubectl version --client`)
- Azure DevOps pipeline still configured

### Step 1 — Recreate Terraform Backend Storage

The Terraform state backend lives inside the resource group, so it gets deleted along with everything else. Recreate it first before running `terraform init`.

```powershell
# Create the resource group
az group create --name ecommerce-rg --location "Central India"

# Create the storage account for Terraform state
az storage account create `
  --name ecomtfstate872 `
  --resource-group ecommerce-rg `
  --location "Central India" `
  --sku Standard_LRS

# Create the blob container
az storage container create `
  --name tfstate `
  --account-name ecomtfstate872
```

### Step 2 — Deploy Infrastructure via Terraform

```powershell
cd infra
terraform init
terraform apply -auto-approve
```

Terraform will recreate: AKS, ACR, Key Vault, VNet, Log Analytics, App Insights, Monitor Alerts, Cost Budget.

### Step 3 — Connect kubectl to the new AKS cluster

```powershell
az aks get-credentials --resource-group ecommerce-rg --name ecommerce-aks
```

Verify the cluster is reachable:

```powershell
kubectl get nodes
```

### Step 4 — Deploy the Application

**Option A — Trigger Azure DevOps pipeline (recommended)**

Push any commit to `main` or `develop` in Azure DevOps — the pipeline will build images, push to ACR, and deploy to AKS automatically.

**Option B — Manual deploy**

```powershell
# From the project root
kubectl apply -f backend.yaml
kubectl apply -f frontend.yaml

# Check rollout
kubectl get pods
kubectl get svc
```

### Step 5 — Verify the App is Running

```powershell
# Get the external IP of the frontend service
kubectl get svc frontend-service

# Test backend health
curl http://<EXTERNAL-IP>/api/products
```

---

## Key Vault Secrets (after redeploy)

After `terraform apply`, re-add secrets to the Key Vault since they are not stored in Terraform state:

```powershell
az keyvault secret set --vault-name ecom-kv-872 --name ACR-USERNAME --value <acr-username>
az keyvault secret set --vault-name ecom-kv-872 --name ACR-PASSWORD --value <acr-password>
```

Retrieve ACR credentials from:

```powershell
az acr credential show --name ecommercemcs
```

---

## Terraform Backend Config (reference)

Defined in `infra/main.tf`:

```hcl
backend "azurerm" {
  resource_group_name  = "ecommerce-rg"
  storage_account_name = "ecomtfstate872"
  container_name       = "tfstate"
  key                  = "ecommerce.terraform.tfstate"
}
```

---

## Quick Reference

| Action | Command |
|---|---|
| Login | `az login` |
| Delete everything | `az group delete --name ecommerce-rg --yes` |
| Recreate backend storage | See Step 1 above |
| Deploy infra | `cd infra && terraform init && terraform apply -auto-approve` |
| Connect kubectl | `az aks get-credentials --resource-group ecommerce-rg --name ecommerce-aks` |
| Check pods | `kubectl get pods` |
| Check services | `kubectl get svc` |

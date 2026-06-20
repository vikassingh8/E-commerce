terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "ecommerce-rg"
    storage_account_name = "ecomtfstate872"
    container_name       = "tfstate"
    key                  = "ecommerce.terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = true
    }
  }
}

data "azurerm_client_config" "current" {}

# Resource Group
resource "azurerm_resource_group" "rg" {
  name     = "ecommerce-rg"
  location = "Central India"
}

# Networking
resource "azurerm_virtual_network" "vnet" {
  name                = "ecommerce-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_subnet" "aks_subnet" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_network_security_group" "nsg" {
  name                = "ecommerce-nsg"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "allow-http"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow-https"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "nsg_assoc" {
  subnet_id                 = azurerm_subnet.aks_subnet.id
  network_security_group_id = azurerm_network_security_group.nsg.id
}

# Azure Container Registry
resource "azurerm_container_registry" "acr" {
  name                = "ecommercemcs"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic"
  admin_enabled       = true
}

# Azure Key Vault
resource "azurerm_key_vault" "kv" {
  name                        = "ecom-kv-872"
  location                    = azurerm_resource_group.rg.location
  resource_group_name         = azurerm_resource_group.rg.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"
  soft_delete_retention_days  = 7
  purge_protection_enabled    = false

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = ["Get", "List", "Set", "Delete"]
  }
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "law" {
  name                = "ecommerce-law"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# Application Insights
resource "azurerm_application_insights" "appinsights" {
  name                = "ecommerce-appinsights"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  workspace_id        = azurerm_log_analytics_workspace.law.id
  application_type    = "web"
}

# Azure Kubernetes Service
resource "azurerm_kubernetes_cluster" "aks" {
  name                = "ecommerce-aks"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "ecommerceaks"
  oidc_issuer_enabled = true

  default_node_pool {
    name           = "default"
    node_count     = 1
    vm_size        = "Standard_D2s_v3"
    vnet_subnet_id = azurerm_subnet.aks_subnet.id
  }

  identity {
    type = "SystemAssigned"
  }

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.law.id
  }

  network_profile {
    network_plugin = "azure"
    network_policy = "azure"
    service_cidr   = "10.2.0.0/16"
    dns_service_ip = "10.2.0.10"
  }
}

# Grant AKS pull access to ACR
resource "azurerm_role_assignment" "aks_acr_pull" {
  principal_id                     = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = azurerm_container_registry.acr.id
  skip_service_principal_aad_check = true
}

# Monitor alert: AKS CPU > 80%
resource "azurerm_monitor_metric_alert" "aks_cpu_alert" {
  name                = "aks-high-cpu"
  resource_group_name = azurerm_resource_group.rg.name
  scopes              = [azurerm_kubernetes_cluster.aks.id]
  description         = "Alert when AKS node CPU exceeds 80%"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "node_cpu_usage_percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.email_alert.id
  }
}

# Monitor alert: AKS memory > 80%
resource "azurerm_monitor_metric_alert" "aks_memory_alert" {
  name                = "aks-high-memory"
  resource_group_name = azurerm_resource_group.rg.name
  scopes              = [azurerm_kubernetes_cluster.aks.id]
  description         = "Alert when AKS node memory exceeds 80%"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "node_memory_working_set_percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.email_alert.id
  }
}

# Monitor action group for email notifications
resource "azurerm_monitor_action_group" "email_alert" {
  name                = "ecommerce-alerts"
  resource_group_name = azurerm_resource_group.rg.name
  short_name          = "ecom-alert"

  email_receiver {
    name          = "admin"
    email_address = "singhvikas872@gmail.com"
  }
}

# Monthly cost budget alert
resource "azurerm_consumption_budget_resource_group" "budget" {
  name              = "ecommerce-monthly-budget"
  resource_group_id = azurerm_resource_group.rg.id
  amount            = 50
  time_grain        = "Monthly"

  time_period {
    start_date = "2026-06-01T00:00:00Z"
  }

  notification {
    enabled        = true
    threshold      = 80
    operator       = "GreaterThan"
    threshold_type = "Actual"

    contact_emails = ["singhvikas872@gmail.com"]
  }

  notification {
    enabled        = true
    threshold      = 100
    operator       = "GreaterThan"
    threshold_type = "Actual"

    contact_emails = ["singhvikas872@gmail.com"]
  }
}

# Outputs
output "acr_login_server" {
  value = azurerm_container_registry.acr.login_server
}

output "aks_kube_config" {
  value     = azurerm_kubernetes_cluster.aks.kube_config_raw
  sensitive = true
}

output "appinsights_instrumentation_key" {
  value     = azurerm_application_insights.appinsights.instrumentation_key
  sensitive = true
}

output "key_vault_uri" {
  value = azurerm_key_vault.kv.vault_uri
}

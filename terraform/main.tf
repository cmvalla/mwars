terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0"
    }
  }
}

provider "google" {
  project = "goreply-n8n-hawk"
  region  = "europe-west1"
}

resource "google_artifact_registry_repository" "repo" {
  location      = "europe-west1"
  repository_id = "mwars"
  description   = "Repository for Multiplication Wars"
  format        = "DOCKER"
}

resource "google_cloud_run_v2_service" "mwars" {
  name     = "mwars"
  location = "europe-west1"
  ingress  = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    annotations = {
      "client.knative.dev/user-image" = "europe-west1-docker.pkg.dev/goreply-n8n-hawk/mwars/app:latest"
      "run.googleapis.com/client-name" = "terraform"
      "force-update" = timestamp()
    }
    containers {
      image = "europe-west1-docker.pkg.dev/goreply-n8n-hawk/mwars/app:latest"
      ports {
        container_port = 80
      }
    }
  }
  
  depends_on = [google_artifact_registry_repository.repo]
}

data "google_iam_policy" "noauth" {
  binding {
    role    = "roles/run.invoker"
    members = ["allUsers"]
  }
}

resource "google_cloud_run_service_iam_policy" "noauth" {
  location    = google_cloud_run_v2_service.mwars.location
  project     = google_cloud_run_v2_service.mwars.project
  service     = google_cloud_run_v2_service.mwars.name
  policy_data = data.google_iam_policy.noauth.policy_data
}

resource "google_cloud_run_domain_mapping" "mwars" {
  location = google_cloud_run_v2_service.mwars.location
  name     = "mwars.godata.dev"

  metadata {
    namespace = "goreply-n8n-hawk"
  }

  spec {
    route_name = google_cloud_run_v2_service.mwars.name
  }
}

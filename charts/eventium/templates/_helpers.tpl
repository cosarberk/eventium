{{- define "eventium.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "eventium.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "eventium.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{ include "eventium.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "eventium.selectorLabels" -}}
app.kubernetes.io/name: {{ include "eventium.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/* Postgres/Redis servis adları ve DATABASE_URL */}}
{{- define "eventium.postgresHost" -}}
{{- printf "%s-postgres" (include "eventium.fullname" .) -}}
{{- end -}}

{{- define "eventium.redisHost" -}}
{{- printf "%s-redis" (include "eventium.fullname" .) -}}
{{- end -}}

{{- define "eventium.databaseUrl" -}}
{{- if .Values.secrets.databaseUrl -}}
{{- .Values.secrets.databaseUrl -}}
{{- else -}}
{{- printf "postgresql://%s:%s@%s:5432/%s" .Values.postgres.user .Values.postgres.password (include "eventium.postgresHost" .) .Values.postgres.database -}}
{{- end -}}
{{- end -}}

{{- define "eventium.redisUrl" -}}
{{- if .Values.redis.enabled -}}
{{- printf "redis://%s:6379" (include "eventium.redisHost" .) -}}
{{- else -}}
{{- .Values.config.REDIS_URL -}}
{{- end -}}
{{- end -}}

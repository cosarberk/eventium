# Eventium — Kubernetes deploy

Test amaçlı, kendi içinde çalışan bir kurulum: **tek `eventium` image'ı**
(backend + frontend aynı container'da) + cluster içi Postgres & Redis. Prod'da
Postgres/Redis'i managed servise taşımak için ilgili dosyaların başındaki nota bak.

## Dosyalar
| Dosya | İçerik |
|---|---|
| `namespace.yaml` | `eventium` namespace |
| `secret.example.yaml` | Secret şablonu — kopyala, doldur, `secret.yaml` olarak uygula |
| `configmap.yaml` | Gizli olmayan ayarlar (NODE_ENV, PUBLIC_URL, RUN_SEED, …) |
| `postgres.yaml` | Postgres StatefulSet + PVC + Service |
| `redis.yaml` | Redis StatefulSet + PVC + Service |
| `eventium.yaml` | Uygulama Deployment + Service (nginx :8080, backend :4000 aynı pod) |
| `ingress.yaml` | Tek giriş: `/` → eventium servisi |
| `kustomization.yaml` | Kaynak listesi + image registry/tag override |

## Adımlar

### 1. Image'ı build & push et
```bash
# repo kökünde — tek image
docker build -f docker/Dockerfile -t REGISTRY/eventium:latest .
docker push REGISTRY/eventium:latest
```
Sonra `kustomization.yaml` içindeki `images:` bloğunda `REGISTRY/...` değerini
gerçek registry'inle güncelle (örn. `docker.io/cosarberk/eventium`).

### 2. Secret'ı hazırla
```bash
cd k8s
cp secret.example.yaml secret.yaml
# secret.yaml'ı doldur:  openssl rand -base64 48  (JWT_SECRET, ENCRYPTION_KEY)
```
> `secret.yaml` .gitignore'da — commit'lenmez.

### 3. ConfigMap'i gözden geçir
`configmap.yaml` içinde en azından `PUBLIC_URL`'i kendi domainine ayarla.
İlk kurulumda `RUN_SEED: "true"` ilk admin'i oluşturur (parola pod log'unda bir
kez görünür); kurduktan sonra `"false"` yapıp deployment'ı yeniden başlat.

### 4. Uygula
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -k k8s/
```

### 5. Doğrula
```bash
kubectl -n eventium get pods,svc,ingress
kubectl -n eventium logs deploy/eventium     # ilk admin parolası + migration logu
kubectl -n eventium rollout status deploy/eventium
```

## Notlar
- **Probe'lar:** liveness `/healthz` (nginx, :8080), readiness `/health` (backend,
  :4000 — DB+Redis), startup `/health/live` (:4000). Backend ölürse launcher
  nginx'i de kapatır → pod yeniden başlar.
- **Ölçekleme:** container başlangıçta `prisma migrate deploy` çalıştırır; birden
  fazla replika aynı anda migrate ederse yarışabilir. `replicas`'ı artırmadan önce
  migration'ı ayrı bir `Job`'a taşı ve configmap'te `RUN_MIGRATIONS=false` yap.
  Ayrıca tek image olduğu için frontend ve backend'i ayrı ölçekleyemezsin.

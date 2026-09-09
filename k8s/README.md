# Eventium — Kubernetes deploy

Test amaçlı, kendi içinde çalışan bir kurulum: backend + frontend + cluster içi
Postgres & Redis. Prod'da Postgres/Redis'i managed servise taşımak için ilgili
dosyaların başındaki nota bak.

## Dosyalar
| Dosya | İçerik |
|---|---|
| `namespace.yaml` | `eventium` namespace |
| `secret.example.yaml` | Secret şablonu — kopyala, doldur, `secret.yaml` olarak uygula |
| `configmap.yaml` | Gizli olmayan ayarlar (NODE_ENV, PUBLIC_URL, RUN_SEED, …) |
| `postgres.yaml` | Postgres StatefulSet + PVC + Service |
| `redis.yaml` | Redis StatefulSet + PVC + Service |
| `backend.yaml` | Backend Deployment + Service (probe: `/health/live`, `/health`) |
| `frontend.yaml` | Frontend Deployment + Service (probe: `/healthz`, uid 101) |
| `ingress.yaml` | Tek giriş: `/` → frontend (frontend `/api`,`/graphql`'i proxy'liyor) |
| `kustomization.yaml` | Kaynak listesi + image registry/tag override |

## Adımlar

### 1. Image'ları build & push et
```bash
# repo kökünde
docker build -f docker/Dockerfile.backend  -t REGISTRY/eventium-backend:latest  .
docker build -f docker/Dockerfile.frontend -t REGISTRY/eventium-frontend:latest .
docker push REGISTRY/eventium-backend:latest
docker push REGISTRY/eventium-frontend:latest
```
Sonra `kustomization.yaml` içindeki `images:` bloğunda `REGISTRY/...` değerlerini
gerçek registry'inle güncelle.

### 2. Secret'ı hazırla
```bash
cd k8s
cp secret.example.yaml secret.yaml
# secret.yaml'ı doldur:  openssl rand -base64 48  (JWT_SECRET, ENCRYPTION_KEY)
```
> `secret.yaml` .gitignore'da — commit'lenmez.

### 3. ConfigMap'i gözden geçir
`configmap.yaml` içinde en azından `PUBLIC_URL`'i kendi domainine ayarla.
İlk kurulumda `RUN_SEED: "true"` ilk admin'i oluşturur (parola backend log'unda
bir kez görünür); kurduktan sonra `"false"` yapıp backend'i yeniden başlat.

### 4. Uygula
```bash
# namespace + secret önce
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
# gerisi
kubectl apply -k k8s/
```

### 5. Doğrula
```bash
kubectl -n eventium get pods,svc,ingress
kubectl -n eventium logs deploy/backend        # ilk admin parolası + migration logu
kubectl -n eventium rollout status deploy/backend
```

## Ölçekleme notu
`backend` başlangıçta `prisma migrate deploy` çalıştırır; birden fazla replika
aynı anda migrate ederse yarışabilir. `replicas`'ı artırmadan önce migration'ı
ayrı bir `Job`/`initContainer`'a taşı ve configmap'te `RUN_MIGRATIONS=false` yap.

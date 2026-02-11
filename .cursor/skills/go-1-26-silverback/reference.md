# Go 1.26 — Referencia

## Versión y entorno

- **Go 1.26.0** (Febrero 2026)
- GC por defecto: **Green Tea**. En CPUs con AVX-512 (Intel Ice Lake, AMD Zen 4+), el runtime usa instrucciones de hardware para acelerar el marcado → menos overhead de GC (~40% en escenarios favorables).

## Comandos útiles

```bash
# Escape analysis (qué se escapa al heap)
go build -gcflags="-m" ./...

# PGO: generar perfil y compilar con él
go build -cpuprofile=cpu.prof .
# ejecutar carga, luego:
go tool pprof -proto cpu.prof > default.pgo
go build -pgo=default.pgo .

# Ver goroutines en tests (evitar leaks)
# Usar runtime/metrics o go test con verificación post-test del número de goroutines
go test -v ./...
```

## Ejemplos rápidos

### Context en handlers HTTP

```go
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	result, err := h.svc.Do(ctx, r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(result)
}
```

### Cierre de Body

```go
resp, err := http.Get(url)
if err != nil {
	return err
}
defer func() { _ = resp.Body.Close() }()
```

### Pre-alocar slice/map

```go
keys := make([]string, 0, len(m))
m2 := make(map[string]int, len(keys))
```

### new(expr) en 1.26

```go
p := new(int(42))
```

## JSON v2 y streaming

Para payloads grandes, usar el motor de `encoding/json/v2` en modo streaming en lugar de `json.Unmarshal` que carga todo en memoria.

## runtime/metrics (1.26)

Métricas de runtime para validar en tests que el número de goroutines vuelve al valor esperado después de cada caso, detectando goroutine leaks.

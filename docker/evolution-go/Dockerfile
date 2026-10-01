# Evolution Go 0.7.2 com o pool de Postgres compartilhado (PR 117, ainda sem release).
# A sessão WhatsApp continua em evolution_go_dbdata e em evogo_auth.
# O histórico do CRM fica no Postgres do S3E (DATABASE_SAVE_MESSAGES=false).
# Não apague volumes ao trocar esta imagem.
#
# Build (na raiz do repositório não é necessário; o contexto é esta pasta):
#   docker build -t odev10antonio/s3e-evolution-go:0.7.2-poolfix docker/evolution-go
#   docker push odev10antonio/s3e-evolution-go:0.7.2-poolfix
FROM golang:1.25.0-alpine AS build

RUN apk update && apk add --no-cache git build-base libjpeg-turbo-dev libwebp-dev patch

WORKDIR /src

ARG EVOLUTION_GO_REF=0.7.2
RUN git clone --depth 1 --branch "${EVOLUTION_GO_REF}" https://github.com/evolution-foundation/evolution-go.git .

COPY 0001-reuse-capped-sqlstore.patch /tmp/pool.patch
RUN patch -p1 --forward < /tmp/pool.patch

ARG VERSION=0.7.2-poolfix
RUN CGO_ENABLED=1 go build -ldflags "-X main.version=${VERSION}" -o server ./cmd/evolution-go

FROM alpine:3.19.1 AS final

RUN apk update && apk add --no-cache tzdata ffmpeg libjpeg-turbo libwebp poppler-utils

WORKDIR /app

COPY --from=build /src/server .
COPY --from=build /src/manager/dist ./manager/dist
COPY --from=build /src/VERSION ./VERSION

ENV TZ=America/Sao_Paulo

ENTRYPOINT ["/app/server"]

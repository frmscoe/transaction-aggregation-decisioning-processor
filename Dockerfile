ARG BUILD_IMAGE=oven/bun
ARG RUN_IMAGE=oven/bun:slim

# BUILD
FROM ${BUILD_IMAGE} AS builder
LABEL stage=build

WORKDIR /home/app
COPY ./src ./src
COPY ./package*.json ./
COPY ./tsconfig.json ./
COPY bunfig.toml ./

ARG GH_TOKEN
RUN sed -i "s/\${GH_TOKEN}/$GH_TOKEN/g" ./bunfig.toml

RUN bun install

# RUN
FROM ${RUN_IMAGE} AS run-env
LABEL stage=run

USER bun

WORKDIR /home/app
COPY --from=builder /home/app/node_modules ./node_modules
COPY ./src ./src
COPY ./package*.json ./
COPY ./tsconfig.json ./
COPY bunfig.toml ./

# APP
ENV FUNCTION_NAME=transaction-aggregation-decisioning-processor-rel-1-0-0
ENV NODE_ENV=production
ENV SERVER_URL=
ENV CMS_ENDPOINT=
ENV NPM_CONFIG_LOGLEVEL warn

# REDIS
ENV REDIS_DB=0
ENV REDIS_AUTH=
ENV REDIS_SERVERS=
ENV REDIS_IS_CLUSTER=
ENV CACHE_TTL=30

# NATS
ENV STARTUP_TYPE=nats
ENV SERVER_URL=0.0.0.0:4222
ENV PRODUCER_STREAM=
ENV CONSUMER_STREAM=
ENV STREAM_SUBJECT=
ENV ACK_POLICY=Explicit
ENV PRODUCER_STORAGE=File
ENV PRODUCER_RETENTION_POLICY=Workqueue

# DATABASE
ENV DATABASE_URL=
ENV DATABASE_USER=root
ENV DATABASE_PASSWORD=
ENV CONFIGURATION_DB=Configuration
ENV TRANSACTION_HISTORY_DB=transactionHistory
ENV TRANSACTION_DB=
ENV DATABASE_CERT_PATH=
ENV CACHE_ENABLED=

# APM
ENV APM_ACTIVE=true
ENV APM_SERVICE_NAME=transaction-monitoring-service
ENV APM_URL=http://apm-server.development.svc.cluster.local:8200/
ENV APM_SECRET_TOKEN=

# LOGSTASH
ENV LOGSTASH_HOST=logstash.development.svc.cluster.local
ENV LOGSTASH_PORT=8080
ENV LOGSTASH_LEVEL='info'

# CONTAINER
HEALTHCHECK --interval=60s CMD [ -e /tmp/.lock ] || exit 1
EXPOSE 4222

CMD ["bun", "./src/index.ts"]

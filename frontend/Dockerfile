FROM node:20-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

FROM node:20-alpine AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

FROM node:20-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

# Final image for production
# FROM node:20-alpine
# COPY ./package.json package-lock.json /app/
# COPY --from=production-dependencies-env /app/node_modules /app/node_modules
# COPY --from=build-env /app/build /app/build
# WORKDIR /app
# CMD ["npm", "run", "start"]

# Final image for development
FROM node:20-alpine
COPY ./package.json package-lock.json /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
COPY ./certs/ca-root.crt /usr/local/share/ca-certificates/my-ca.crt
RUN apk add --no-cache ca-certificates && update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-root.pem
WORKDIR /app
CMD ["npm", "run", "dev"]

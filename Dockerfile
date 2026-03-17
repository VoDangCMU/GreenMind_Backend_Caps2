FROM node:22-alpine AS builder

WORKDIR /home/node/app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build


FROM node:22-alpine AS runtime

WORKDIR /home/node/app

COPY --from=builder /home/node/app/dist ./dist
COPY --from=builder /home/node/app/src ./src
COPY --from=builder /home/node/app/tsconfig.json ./
COPY --from=builder /home/node/app/package.json ./
COPY --from=builder /home/node/app/yarn.lock ./
COPY --from=builder /home/node/app/entrypoint.sh ./

RUN yarn install --frozen-lockfile \
  && yarn global add tsx nodemon

RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]

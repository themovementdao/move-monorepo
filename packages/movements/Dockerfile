FROM node:16.13.0-alpine

RUN apk add git openssh-client
RUN mkdir -p -m 0600 ~/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts
RUN npm install -g npm@8.1.0

WORKDIR /app

RUN npm install -g @graphprotocol/graph-cli

COPY package.json /app
COPY yarn.lock /app

RUN yarn

COPY . .

CMD ["yarn", "start:dev"]


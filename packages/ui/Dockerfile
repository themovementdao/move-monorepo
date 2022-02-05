
# Node version matching the version declared in the package.json 
FROM node:16.13.0-alpine3.11 as build
RUN apk add git openssh-client
RUN mkdir -p -m 0600 ~/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts
RUN npm install -g npm@8.1.0

# Created the app work dir
WORKDIR /app

# Add node to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# Copy app configs
COPY package.json ./
COPY package-lock.json ./

COPY src/abis ./src/abis

# Install app dependencies
RUN npm ci


COPY . .

# Build app
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
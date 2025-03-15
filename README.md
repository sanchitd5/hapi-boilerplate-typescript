# Node 22 User Onboarding application (Typescript) [![Build Status](https://github.com/sanchitd5/hapi-boilerplate-typescript/actions/workflows/sonar.yml/badge.svg)](https://github.com/sanchitd5/hapi-boilerplate-typescript/actions/workflows/sonar.yml)
A Node based module to onboard user's into a very basic application, secured using JWT authorization.

The Node.js app uses [Hapi Framework](https://hapijs.com) and [Hapi Swagger](https://github.com/glennjones/hapi-swagger)

## Key Features Added in TypeScript Version
This TypeScript version extends significantly beyond the original JavaScript project with the addition of:

* **Clustering Support** - Utilizes Node.js clustering for improved performance and reliability
* **Advanced Memory Management** - Proactive memory monitoring, garbage collection, and backpressure mechanisms
* **Multi-Database Support** - MongoDB, PostgreSQL, and MySQL integrations
* **Task Processing Queue** - Priority-based task execution with automatic scaling based on system load
* **Real-time Socket Communications** - Scalable Socket.io implementation with cluster support
* **Caching Layer** - Efficient in-memory caching with automatic cleanup
* **PM2 Process Management** - Built-in utilities for process management and monitoring
* **Redis Integration** - Distributed locking and data sharing across worker processes
* **Graceful Shutdown** - Resource cleanup and request completion during service termination

PS: This project started as a TypeScript rewrite of [this project](https://github.com/ChoudharyNavit22/User-Onboarding-Module), with the original featuring only basic user authentication.

# Contents

* [Project Architecture](#project-architecture)
* [Technology Stack](#technology-stack)
* [Project Dependencies](#project-dependencies)
* [Configuration Options](#configuration-options)
* [Manual Deployment](#manual-deployment)
* [API Documentation](#api-documentation)
* [Security Features](#security-features)
* [Testing](#testing)
* [Docker Deployment](#docker-deployment)
* [Upload Image/Document Guidelines](UPLOAD_IMAGE_GUIDLINE.md)

# Project Architecture

The application follows a modular architecture pattern with clear separation of concerns:

* **Controllers** - Handle business logic and request processing
* **Services** - Manage data access and persistence operations
* **Routes** - Define API endpoints and their handlers
* **Models** - Define database schemas and data structures
* **Lib** - Utility modules and shared functionality
* **Config** - Environment-specific configuration
* **Server** - Server setup and plugin registration

The application uses a worker-based architecture with the main process managing multiple worker processes via Node.js clustering. This provides fault tolerance and load balancing across available CPU cores.

## Process Flow

1. Entry point initializes clustering if enabled
2. Master process spawns worker processes
3. Each worker instantiates a Hapi server instance
4. Requests are distributed across workers
5. Memory monitoring ensures system stability
6. Processing queue manages background tasks

# Technology Stack

* **Runtime**: Node.js 18+ (TypeScript)
* **API Framework**: Hapi.js
* **Documentation**: Swagger via hapi-swagger
* **Authentication**: JWT via hapi-auth-bearer-token
* **Process Management**: PM2
* **Databases**:
  * MongoDB (via Mongoose)
  * PostgreSQL (via Sequelize)
  * MySQL (optional)
* **Caching**: Node-Cache + Redis
* **Real-time**: Socket.io with cluster adapter
* **Logging**: Log4js with rotational file strategy
* **Task Processing**: Custom processing queue with backpressure
* **Memory Management**: V8 heap monitoring and optimization
* **Build System**: pnpm + TypeScript compiler

# Project Dependencies

* Node.js 18+ ([Download](https://nodejs.org/))
* MongoDB ([Install MongoDB](https://docs.mongodb.com/manual/administration/install-community/))
* Redis (Optional - for distributed features)
* PostgreSQL (Optional - for SQL data storage)
* GraphicsMagick and ImageMagick (for image processing, see [Upload Guidelines](UPLOAD_IMAGE_GUIDLINE.md))

# Configuration Options

The application can be configured via environment variables. Copy `.env.example` to `.env` and adjust the values:

```
# Server Configuration
APP_NAME=HapiBoilerplate
HAPI_PORT=8000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/hapi-boilerplate

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=hapi-boilerplate
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=root

# JWT Configuration
JWT_SECRET_KEY=your-secret-key
JWT_EXPIRATION_TIME=1d

# Clustering Configuration
CLUSTERING_ENABLED=true
MAX_CLUSTER_SIZE=4

# AWS S3 Configuration
AWS_S3_ACCESS_KEY_ID=
AWS_S3_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_S3_REGION=
```

# Manual Deployment

## Setup Node.js

Inorder to setup NodeJS you need to fellow the current steps:

### Mac OS X

* Step1: Install Home brew

```
$ /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

$ brew -v
```

* Step2: Install Node using Brew

```
$ brew install node

$ node -v

$ npm -v
```

### Linux Systems

* Step1: Install Node using apt-get

```
$ sudo apt-get install curl python-software-properties

$ curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -

$ sudo apt-get install nodejs

$ node -v

$ npm -v
```
## Setup Node User Onboarding Application

* Step1: Git clone the application

* Step2a: Install node modules

```
$ npm i -g pnpm
```

```
$ pnpm i
```

* Step3: Copy .env.example to .env

```
$ cp .env.example .env
```

* Step4a: Start the application

```
$ pnpm start
```
* Step4b: Start With Nodemon
```
$ pnpm nodemon
```

## Build

```
$ pnpm build
```

## Starting the build
```
$ pnpm deployment
```

## Using PM2 for Production

For production deployment with optimal performance and reliability:

```
$ npm i -g pm2
$ pm2 start ecosystem.config.js --env production
```

The current version of your application would be running on **http://localhost:8000** or **http://IP_OF_SERVER:8000** (in case you are running on the server)

# API Documentation

The API is fully documented using Swagger. Once the server is running, you can access the interactive API documentation at:

```
http://localhost:8000/swagger
```

The API includes the following main endpoints:

* `/api/user` - User management endpoints
* `/api/admin` - Admin management endpoints
* `/api/uploads` - File upload endpoints

# Security Features

This boilerplate implements several security best practices:

* **JWT Authentication** - Secure token-based authentication system
* **Role-based Access Control** - Different access levels for users and admins
* **Rate Limiting** - Protection against brute force and DoS attacks
* **Input Validation** - Request payload validation using Joi
* **Secure Password Storage** - Passwords are hashed using bcrypt
* **Token Refresh Mechanism** - Automatic token refresh with secure validation
* **CORS Protection** - Configurable CORS policy
* **Helmet Integration** - HTTP headers security
* **Environment Isolation** - Separate configurations for development and production

# Testing

The project is set up to support comprehensive testing with:

* Unit tests
* Integration tests
* API tests

To run the tests:

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage
```

# Docker Deployment

The project includes Docker support for easy containerization:

```bash
# Build the Docker image
docker build -t hapi-boilerplate .

# Run the container
docker run -p 8000:8000 -d hapi-boilerplate
```

You can also use Docker Compose for a complete development environment:

```bash
docker-compose up -d
```

This will start the application along with MongoDB and Redis services.

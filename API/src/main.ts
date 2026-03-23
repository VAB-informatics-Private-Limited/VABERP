import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // Validate required environment variables before starting
  const requiredEnvVars = ['JWT_SECRET', 'DB_PASSWORD'];
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS — restrict to configured origin
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin && corsOrigin !== '*' ? corsOrigin.split(',') : false,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,Accept,Origin,X-Requested-With',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 3600,
  });

  // Limit request body size to 10mb
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('VAB Enterprise API')
    .setDescription('VAB Enterprise ERP System - REST API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Enterprises', 'Enterprise management')
    .addTag('Employees', 'Employee management')
    .addTag('Customers', 'Customer management')
    .addTag('Products', 'Product catalog management')
    .addTag('Inventory', 'Inventory management')
    .addTag('Enquiries', 'Sales enquiries and follow-ups')
    .addTag('Quotations', 'Quotation management')
    .addTag('Manufacturing', 'Job cards and production')
    .addTag('Reports', 'Reports and analytics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`
    🚀 VAB Enterprise API is running!
    📍 Local:    http://localhost:${port}
    📚 Swagger:  http://localhost:${port}/docs
    🌍 Env:      ${process.env.NODE_ENV || 'development'}
  `);
}

bootstrap();

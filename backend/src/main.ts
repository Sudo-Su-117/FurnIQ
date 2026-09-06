import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger, BadRequestException, ValidationError } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { corsConfig } from './config/cors.config';
import { setupSwagger } from './config/swagger.config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Increase request body limits to support Base64 images
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Enable CORS
  app.enableCors(corsConfig);

  // Global Exception Filter for standardized rejected responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Response Interceptor for standardized module-aware success responses
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));

  // Global Validation Pipe with structured field-by-field error reporting
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        const flattenErrors = (errors: ValidationError[], parent = ''): any[] => {
          let result: any[] = [];
          for (const err of errors) {
            const propertyPath = parent ? `${parent}.${err.property}` : err.property;
            if (err.constraints) {
              result.push({
                field: propertyPath,
                message: Object.values(err.constraints)[0],
                allConstraints: Object.values(err.constraints),
              });
            }
            if (err.children && err.children.length > 0) {
              result = result.concat(flattenErrors(err.children, propertyPath));
            }
          }
          return result;
        };

        const formattedErrors = flattenErrors(validationErrors);
        return new BadRequestException({
          message: 'Input validation failed',
          errors: formattedErrors,
        });
      },
    }),
  );

  // Swagger OpenAPI Documentation
  setupSwagger(app);

  // Prisma Shutdown Hooks
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`========================================================`);
  logger.log(`🚀 FurnIQ Backend running at: http://localhost:${port}`);
  logger.log(`📚 Swagger OpenAPI Documentation: http://localhost:${port}/api/docs`);
  logger.log(`========================================================`);
}

bootstrap();

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorName = 'Internal Server Error';
    let message: string = 'An unexpected server error occurred';
    let validationErrors: any = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorName = exception.name.replace('Exception', '');
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const respObj = exceptionResponse as Record<string, any>;
        errorName = respObj.error || exception.name.replace('Exception', '');
        message = respObj.message || exception.message;

        // Extract validation errors if emitted by ValidationPipe
        if (respObj.errors) {
          validationErrors = respObj.errors;
        } else if (Array.isArray(respObj.message)) {
          validationErrors = respObj.message;
          message = respObj.message[0] || 'Validation failed';
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known database errors from Prisma
      switch (exception.code) {
        case 'P2002': {
          statusCode = HttpStatus.CONFLICT;
          errorName = 'Conflict';
          const target = (exception.meta?.target as string[]) || [];
          message = `Unique constraint violation: A record with this ${target.join(', ')} already exists`;
          break;
        }
        case 'P2025': {
          statusCode = HttpStatus.NOT_FOUND;
          errorName = 'Not Found';
          message = (exception.meta?.cause as string) || 'Requested database record was not found';
          break;
        }
        case 'P2003': {
          statusCode = HttpStatus.BAD_REQUEST;
          errorName = 'Bad Request';
          message = `Foreign key reference failed on field: ${exception.meta?.field_name || 'relation'}`;
          break;
        }
        default:
          statusCode = HttpStatus.BAD_REQUEST;
          errorName = 'Database Error';
          message = `Database operation failed [code: ${exception.code}]`;
          break;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      errorName = 'Bad Request';
      message = 'Database validation error: Invalid input data structure supplied';
    } else if (exception instanceof Error) {
      message = exception.message;
      errorName = exception.name;
    }

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${statusCode} - Error: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(statusCode).json({
      error: true,
      statusCode,
      statuscode: statusCode,
      message,
      data: null,
      ...(validationErrors ? { errors: validationErrors } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

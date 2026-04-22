import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const isProd = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        errors = responseObj.errors || null;
      }
    } else if (exception instanceof Error) {
      // Log full detail server-side, but don't leak internals to client in prod
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
      message = isProd ? 'Internal server error' : exception.message;
    } else {
      this.logger.error('Unknown exception thrown', exception as any);
    }

    response.status(status).json({
      status: 'failed',
      statuscode: status,
      message: Array.isArray(message) ? message[0] : message,
      errors: errors,
      data: null,
    });
  }
}

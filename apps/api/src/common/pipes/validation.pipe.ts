import {
  ValidationPipe as NestValidationPipe,
  BadRequestException,
} from '@nestjs/common';

/**
 * AppValidationPipe — global validation pipe using class-validator.
 *
 * Per 05-security-ops.md § Validation Rules:
 *   - DTO or schema validation on every write endpoint
 *   - Whitelist fields only (strip unknown keys)
 *   - Reject unknown fields on write endpoints (forbidNonWhitelisted: true)
 *   - Type coercion where safe
 *   - Structured error messages — machine-readable field-level errors
 *
 * Error shape (400):
 *   {
 *     statusCode: 400,
 *     error: "Bad Request",
 *     message: ["email must be a valid email address", ...],
 *     path: "/api/auth/login",
 *     timestamp: "...",
 *     correlationId: "..."
 *   }
 */
export const AppValidationPipe = new NestValidationPipe({
  whitelist: true, // Strip properties not declared in DTO
  forbidNonWhitelisted: true, // Reject (400) requests with undeclared properties
  transform: true, // Auto-transform payloads to DTO class instances
  transformOptions: {
    enableImplicitConversion: true, // Convert query params to correct types
  },
  exceptionFactory: (errors) => {
    // Flatten nested validation errors into a flat string array
    const messages = errors.flatMap((err) => {
      if (err.constraints) return Object.values(err.constraints);
      // Nested errors (e.g. nested DTOs)
      if (err.children?.length) {
        return err.children.flatMap((child) =>
          child.constraints ? Object.values(child.constraints) : [],
        );
      }
      return [`${err.property} is invalid`];
    });
    return new BadRequestException(messages);
  },
});

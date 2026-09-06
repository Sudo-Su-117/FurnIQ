import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('FurnIQ — Urban Furniture Accounting System API')
    .setDescription(
      'Enterprise modular accounting REST API supporting Master Data, Purchases, Sales, Double-entry Accounting Ledger, Stock Integrity, and Financial Reports.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token (Bearer <token>)',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Endpoints for user registration, login, token refresh, and profile inspection')
    .addTag('Users', 'User management and role administration')
    .addTag('Contacts', 'Customer and Vendor master data')
    .addTag('Products', 'Furniture goods, services, and combo products')
    .addTag('Chart of Accounts', 'Accounting chart of accounts and journals')
    .addTag('Journal Entries', 'Double-entry general ledger vouchers')
    .addTag('Purchases', 'Purchase Orders, Vendor Bills, and Supplier workflows')
    .addTag('Sales', 'Sales Orders, Customer Invoices, and Client workflows')
    .addTag('Payments', 'Customer and Vendor cash/bank payment settlement')
    .addTag('Stock', 'Physical stock balance and movement records')
    .addTag('Budgets', 'Analytic accounts and budget performance')
    .addTag('Dashboard', 'Real-time financial and operational metrics')
    .addTag('Reports', 'Balance Sheet, Profit & Loss, and Budget Variance reports')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
    },
    customSiteTitle: 'FurnIQ API Documentation',
  });
}

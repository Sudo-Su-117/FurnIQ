import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { appConfig } from './config/app.config';
import { jwtConfig } from './config/jwt.config';
import { databaseConfig } from './config/database.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ProductsModule } from './modules/products/products.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { SalesModule } from './modules/sales/sales.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { StockModule } from './modules/stock/stock.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, databaseConfig],
    }),

    // Global Database Module
    PrismaModule,

    // Core Business & Domain Modules
    AuthModule,
    UsersModule,
    ContactsModule,
    ProductsModule,
    AccountingModule,
    PurchasesModule,
    SalesModule,
    PaymentsModule,
    StockModule,
    BudgetsModule,
    ReportsModule,
    DashboardModule,
  ],
  providers: [
    // Standardized Global Response Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private readonly reflector?: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = response.statusCode || HttpStatus.OK;

    // 1. Check if custom message decorator was attached to the handler
    const handlerMessage = this.reflector?.get<string>(
      RESPONSE_MESSAGE_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      map((data) => {
        // If data is already in standardized ApiResponse envelope, return as is
        if (
          data &&
          typeof data === 'object' &&
          'error' in data &&
          ('statusCode' in data || 'statuscode' in data) &&
          'data' in data
        ) {
          return data;
        }

        let message = handlerMessage;
        let responseData = data;

        // 2. Check if data returned from service has explicit { message, data }
        if (
          data &&
          typeof data === 'object' &&
          !Array.isArray(data) &&
          'message' in data &&
          'data' in data
        ) {
          message = data.message;
          responseData = data.data;
        } else if (
          data &&
          typeof data === 'object' &&
          !Array.isArray(data) &&
          'message' in data &&
          Object.keys(data).length === 1
        ) {
          message = data.message;
          responseData = null as any;
        }

        // 3. If no explicit message, generate dynamic contextual message based on module & HTTP method
        if (!message) {
          message = this.getDynamicMessage(request.method, request.path, responseData);
        }

        return {
          error: false,
          statusCode,
          statuscode: statusCode,
          message,
          data: responseData !== undefined ? responseData : null,
        };
      }),
    );
  }

  /**
   * Intelligently resolves a precise, user-friendly success message
   * based on the HTTP method, endpoint route, and response structure.
   */
  private getDynamicMessage(method: string, path: string, data: any): string {
    const normalizedPath = path.toLowerCase();

    // Authentication
    if (normalizedPath.includes('/auth/register')) return 'User registered successfully';
    if (normalizedPath.includes('/auth/login')) return 'User authenticated successfully';
    if (normalizedPath.includes('/auth/me')) return 'User profile retrieved successfully';

    // Contacts
    if (normalizedPath.includes('/contacts')) {
      if (method === 'POST') return 'Contact created successfully';
      if (method === 'PATCH') return 'Contact updated successfully';
      if (method === 'DELETE') return 'Contact archived successfully';
      if (method === 'GET') {
        const hasId = normalizedPath.split('/contacts/')[1];
        return hasId ? 'Contact details retrieved successfully' : 'Contacts retrieved successfully';
      }
    }

    // Products
    if (normalizedPath.includes('/products')) {
      if (method === 'POST') return 'Product created successfully';
      if (method === 'PATCH') return 'Product updated successfully';
      if (method === 'GET') {
        const hasId = normalizedPath.split('/products/')[1];
        return hasId ? 'Product details retrieved successfully' : 'Products retrieved successfully';
      }
    }

    // Purchases: Orders
    if (normalizedPath.includes('/purchases/orders')) {
      if (normalizedPath.endsWith('/confirm')) return 'Purchase order confirmed successfully';
      if (normalizedPath.endsWith('/cancel')) return 'Purchase order cancelled successfully';
      if (method === 'POST') return 'Purchase order created successfully';
      if (method === 'GET') {
        const hasId = normalizedPath.split('/purchases/orders/')[1];
        return hasId ? 'Purchase order details retrieved successfully' : 'Purchase orders retrieved successfully';
      }
    }

    // Purchases: Vendor Bills
    if (normalizedPath.includes('/purchases/bills')) {
      if (normalizedPath.includes('/from-po')) return 'Vendor bill generated from Purchase Order successfully';
      if (normalizedPath.endsWith('/confirm')) return 'Vendor bill confirmed and stock updated successfully';
      if (normalizedPath.endsWith('/cancel')) return 'Vendor bill cancelled and stock reversed successfully';
      if (method === 'POST') return 'Vendor bill created successfully';
      if (method === 'GET') {
        const hasId = normalizedPath.split('/purchases/bills/')[1];
        return hasId ? 'Vendor bill details retrieved successfully' : 'Vendor bills retrieved successfully';
      }
    }

    // Sales: Orders
    if (normalizedPath.includes('/sales/orders')) {
      if (normalizedPath.endsWith('/confirm')) return 'Sales order confirmed successfully';
      if (normalizedPath.endsWith('/cancel')) return 'Sales order cancelled successfully';
      if (method === 'POST') return 'Sales order created successfully';
      if (method === 'GET') {
        const hasId = normalizedPath.split('/sales/orders/')[1];
        return hasId ? 'Sales order details retrieved successfully' : 'Sales orders retrieved successfully';
      }
    }

    // Sales: Customer Invoices
    if (normalizedPath.includes('/sales/invoices')) {
      if (normalizedPath.includes('/from-so')) return 'Customer invoice generated from Sales Order successfully';
      if (normalizedPath.endsWith('/confirm')) return 'Customer invoice confirmed and stock updated successfully';
      if (normalizedPath.endsWith('/cancel')) return 'Customer invoice cancelled and stock reversed successfully';
      if (method === 'POST') return 'Customer invoice created successfully';
      if (method === 'GET') {
        const hasId = normalizedPath.split('/sales/invoices/')[1];
        return hasId ? 'Customer invoice details retrieved successfully' : 'Customer invoices retrieved successfully';
      }
    }

    // Payments
    if (normalizedPath.includes('/payments')) {
      if (normalizedPath.includes('/customer')) return 'Customer payment recorded and invoice updated successfully';
      if (normalizedPath.includes('/vendor')) return 'Vendor payment recorded and bill updated successfully';
      if (method === 'GET') {
        const hasId = normalizedPath.split('/payments/')[1];
        return hasId ? 'Payment details retrieved successfully' : 'Payments retrieved successfully';
      }
    }

    // Stock
    if (normalizedPath.includes('/stock')) {
      if (normalizedPath.includes('/summary')) return 'Stock inventory summary retrieved successfully';
      return 'Stock inventory list retrieved successfully';
    }

    // Accounting: Chart of Accounts
    if (normalizedPath.includes('/accounting/accounts')) {
      return 'Chart of Accounts retrieved successfully';
    }

    // Accounting: Journals
    if (normalizedPath.includes('/accounting/journals')) {
      return 'Journals retrieved successfully';
    }

    // Accounting: Journal Entries
    if (normalizedPath.includes('/accounting/journal-entries')) {
      const hasId = normalizedPath.split('/accounting/journal-entries/')[1];
      return hasId ? 'Journal entry voucher details retrieved successfully' : 'Journal entry vouchers retrieved successfully';
    }

    // Budgets & Analytic Accounts
    if (normalizedPath.includes('/budgets')) {
      if (normalizedPath.includes('/analytic-accounts')) {
        return method === 'POST' ? 'Analytic account created successfully' : 'Analytic accounts retrieved successfully';
      }
      if (method === 'POST') return 'Budget target created successfully';
      if (method === 'GET') {
        const hasId = normalizedPath.split('/budgets/')[1];
        return hasId ? 'Budget details retrieved successfully' : 'Budgets retrieved successfully';
      }
    }

    // Reports
    if (normalizedPath.includes('/reports/profit-loss')) return 'Profit & Loss statement generated successfully';
    if (normalizedPath.includes('/reports/balance-sheet')) return 'Balance sheet generated successfully';
    if (normalizedPath.includes('/reports/budget')) return 'Budget variance report generated successfully';

    // Dashboard
    if (normalizedPath.includes('/dashboard')) return 'Executive dashboard summary retrieved successfully';

    // Fallback based on HTTP method
    switch (method) {
      case 'GET':
        return 'Data retrieved successfully';
      case 'POST':
        return 'Resource created successfully';
      case 'PATCH':
      case 'PUT':
        return 'Resource updated successfully';
      case 'DELETE':
        return 'Resource deleted successfully';
      default:
        return 'Operation completed successfully';
    }
  }
}

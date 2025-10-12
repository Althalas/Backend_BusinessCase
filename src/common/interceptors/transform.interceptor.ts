import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Decimal } from "@prisma/client/runtime/library";

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.transformData(data)));
  }

  private transformData(data: unknown): unknown {
    if (data instanceof Decimal) {
      return data.toNumber();
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.transformData(item));
    }

    if (data !== null && typeof data === "object") {
      // Handle Date objects if needed, but usually unnecessary for JSON
      if (data instanceof Date) {
        return data; // Let NestJS/JSON.stringify handle dates
      }

      const newData: Record<string, unknown> = {};
      for (const key of Object.keys(data)) {
        newData[key] = this.transformData(
          (data as Record<string, unknown>)[key],
        );
      }
      return newData;
    }

    return data;
  }
}

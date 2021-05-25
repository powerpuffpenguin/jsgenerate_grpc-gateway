import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse, HttpHeaders, HttpClient } from '@angular/common/http'
import { from, Observable } from 'rxjs';
import { catchError, concatAll, map, mapTo } from 'rxjs/operators';
import { Manager, Session } from '../session/session';
import { NetError, resolveError, resolveHttpError } from '../core/restful';

@Injectable()
export class HeaderInterceptor implements HttpInterceptor {
  constructor(private readonly httpClient: HttpClient) { }
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let headers = req.headers

    if (req.method == "GET" || req.method == "HEAD") {
      headers = headers.set('ngsw-bypass', '')
    }

    if (headers.has(`Interceptor`)) {
      const interceptor = headers.get(`Interceptor`)
      headers = headers.delete(`Interceptor`)
      if (interceptor === 'none') {
        return next.handle(req.clone({
          headers: headers,
        }))
      }
    }
    const session = Manager.instance.session
    if (session) {
      if (!headers.has('Authorization')) {
        headers = headers.set('Authorization', `Bearer ${session.access}`)
      }
    }
    let first = true
    return next.handle(req.clone({
      headers: headers,
    })).pipe(
      catchError((err, caught) => {
        if (first) {
          // only refresh once
          first = false
          if (session && err instanceof HttpErrorResponse) {
            if (err.status === 401) {
              return this._refreshRetry(req, next, session)
            } else if (err.status === 403) {
              err = resolveHttpError(err)
              if (err.grpc == 7 && err.message == 'token not exists') {
                Manager.instance.clear(session)
              }
            }
          }
        }
        throw err
      }),
    )
  }
  private _refreshRetry(req: HttpRequest<any>, next: HttpHandler, session: Session): Observable<HttpEvent<any>> {
    return from(new Promise<Session>((resolve, reject) => {
      Manager.instance.refresh(this.httpClient, session).then((session) => {
        if (session) {
          resolve(session)
        } else {
          reject()
        }
      }).catch((e) => {
        reject(e)
      })
    })).pipe(
      map((session) => {
        let headers = req.headers
        headers = headers.set('Authorization', `Bearer ${session.access}`)
        return next.handle(req.clone({
          headers: headers,
        }))
      }),
      concatAll(),
    )
  }
}

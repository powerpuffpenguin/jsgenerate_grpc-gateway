import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse, HttpHeaders } from '@angular/common/http'
import { from, Observable } from 'rxjs';
import { getUnix, getUUID, md5String } from '../utils/utils';
import { Manager, Token } from '../session/manager';
import { catchError, concatAll, map, mapTo } from 'rxjs/operators';

@Injectable()
export class HeaderInterceptor implements HttpInterceptor {
  constructor() { }
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let headers = req.headers
    if (headers.has(`Interceptor`)) {
      const interceptor = headers.get(`Interceptor`)
      headers = headers.delete(`Interceptor`)
      if (interceptor === 'none') {
        return next.handle(req.clone({
          headers: headers,
        }))
      }
    }

    if (req.method == "GET" || req.method == "HEAD") {
      headers = headers.set('ngsw-bypass', '')
    }
    const access = Manager.instance.access
    if (access) {
      if (!headers.has('Authorization')) {
        headers = headers.set('Authorization', `Bearer ${access.token}`)
      }
      if (!headers.has(`Signature`) && access.data.salt) {
        try {
          const unix = getUnix().toString()
          const nonce = getUUID()
          const signature = md5String(md5String(unix + nonce) + access.data.salt)
          headers = headers.set(`Unix`, unix)
          headers = headers.set(`Nonce`, nonce)
          headers = headers.set(`Signature`, signature)
        } catch (e) {
          console.log(e)
        }
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
          if (access && err instanceof HttpErrorResponse && err.status === 401) {
            return this._refreshRetry(req, next, access)
          }
        }
        throw err
      }),
    )
  }
  private _refreshRetry(req: HttpRequest<any>, next: HttpHandler, access: Token): Observable<HttpEvent<any>> {
    return from(new Promise<Token>((resolve, reject) => {
      Manager.instance.refresh(access).then((access) => {
        if (access) {
          resolve(access)
        } else {
          reject()
        }
      }).catch((e) => {
        reject(e)
      })
    })).pipe(
      map((access) => {
        let headers = req.headers
        headers = headers.set('Authorization', `Bearer ${access.token}`)
        headers = headers.delete(`Unix`)
        headers = headers.delete(`Nonce`)
        headers = headers.delete(`Signature`)
        if (access.data.salt) {
          try {
            const unix = getUnix().toString()
            const nonce = getUUID()
            const signature = md5String(md5String(unix + nonce) + access.data.salt)
            headers = headers.set(`Unix`, unix)
            headers = headers.set(`Nonce`, nonce)
            headers = headers.set(`Signature`, signature)
          } catch (e) {
            console.log(e)
          }
        }
        return next.handle(req.clone({
          headers: headers,
        }))
      }),
      concatAll(),
    )
  }
}

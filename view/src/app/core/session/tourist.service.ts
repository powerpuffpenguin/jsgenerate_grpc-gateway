import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ServerAPI } from '../core/api';
import { getItem, setItem, expired } from "../utils/local-storage";
import { Completer } from '../utils/completer';
import { getUnix, getUUID, md5String } from '../utils/utils';
import { Token } from './manager';
import { NetError } from '../core/restful';
import { environment } from 'src/environments/environment';

const AccessKey = 'token.tourist.access'
const RefreshKey = 'token.tourist.refresh'
export interface RefreshResponse {
  // access jwt token
  access: string
}
export interface Response extends RefreshResponse {
  // refresh jwt token
  refresh: string
}

export function loadToken(key: string): Token | undefined {
  const tokenString = getItem(key)
  if (typeof tokenString === "string" && tokenString.length > 0) {
    const tokent = new Token(tokenString)
    if (tokent.valid) {
      return tokent
    }
  }
  return undefined
}
@Injectable({
  providedIn: 'root'
})
export class TouristService {
  private access_: Completer<Token> | undefined
  private refresh_: Token | undefined
  constructor(private readonly httpClient: HttpClient,
  ) {
    try {
      const token = loadToken(AccessKey)
      if (token) {
        const completer = new Completer<Token>()
        completer.resolve(token)
        this.access_ = completer
        if (environment.production) {
          console.log(`load tourist access token`)
        } else {
          console.log(`load tourist access token`, token)
        }
      }
    } catch (e) {
      console.warn(`load tourist access token error :`, e)
    }
    try {
      const token = loadToken(RefreshKey)
      if (token) {
        this.refresh_ = token
        if (environment.production) {
          console.log(`load tourist refresh token`)
        } else {
          console.log(`load tourist refresh token`, token)
        }
      }
    } catch (e) {
      console.warn(`load tourist refresh token error :`, e)
    }
  }
  async accessValid(): Promise<Token> {
    const token = await this.access()
    if (token.seconds < 60 * 5) {
      this.access_ = undefined
      return await this.access()
    }
    return token
  }
  async access(force?: boolean): Promise<Token> {
    if (force && this.access_) {
      try {
        await this.access_.promise
        this.access_ = undefined
      } catch (e) {

      }
    }
    if (!this.access_) {
      this.access_ = new Completer<Token>()
      try {
        const token = await this._refreshAccess()
        this.access_.resolve(token)
      } catch (e) {
        this.access_.reject(e)
        const promise = this.access_.promise
        this.access_ = undefined
        return promise
      }
    }
    return this.access_.promise
  }
  private async _refreshAccess(): Promise<Token> {
    if (this.refresh_ && this.refresh_.seconds < 60 * 5) {
      // request refresh token
      const token = this.refresh_
      try {
        const response = await ServerAPI.v1.features.sessions.child('refresh').post<RefreshResponse>(this.httpClient,
          undefined,
          {
            headers: generateHeader(getUnix(), token.data.salt, token.token),
          },
        ).toPromise()
        const access = new Token(response.access)
        if (access.seconds > 60) {
          setItem(AccessKey, access.token)
        }
        return access
      } catch (e) {
        if (token.token === this.refresh_?.token &&
          e instanceof NetError &&
          e.status === 401
        ) {
          // refresh token expired
          this.refresh_ = undefined
          expired(RefreshKey, token.token)
        }
      }
    }
    // request new token
    const response = await ServerAPI.v1.features.sessions.child('tourist').get<Response>(this.httpClient,
      {
        headers: generateHeader(),
      },
    ).toPromise()
    const access = new Token(response.access)
    if (access.seconds > 60 * 5) {
      setItem(AccessKey, access.token)
    }
    if (typeof response.refresh === "string" && response.refresh.length > 0) {
      try {
        const refresh = new Token(response.refresh)
        if (refresh.seconds > 60 * 5) {
          setItem(RefreshKey, refresh.token)
        }
      } catch (e) {
        console.warn('new tourist refresh token error :', e)
      }
    }
    return access
  }
}
export function generateHeader(
  unix?: number,
  slat?: string,
  authorization?: string,
): {
  [header: string]: string | string[];
} {
  const headers: {
    [header: string]: string | string[];
  } = {
    'Interceptor': 'none',
  }
  if (authorization) {
    headers['Authorization'] = `Bearer ${authorization}`
  }
  if (unix) {
    headers['Unix'] = unix.toString()
    if (slat) {
      const nonce = getUUID()
      headers['Nonce'] = nonce
      const signature = md5String(md5String(unix + nonce) + slat)
      headers['Signature'] = signature
    }
  }
  return headers
}
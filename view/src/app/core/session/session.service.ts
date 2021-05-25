import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TouristService, loadToken, RefreshResponse, Response, generateHeader } from './tourist.service';
import { Completer } from '../utils/completer';
import { BehaviorSubject, Observable } from 'rxjs';
import { ServerAPI } from '../core/api';
import { removeItem, setItem, expired } from "../utils/local-storage";
import { getUnix, md5String } from '../utils/utils';
import { map } from 'rxjs/operators';
import { Manager, Token } from './manager';
import { NetError } from '../core/restful';
import { environment } from 'src/environments/environment';

const AccessKey = 'token.session.access'
const RefreshKey = 'token.session.refresh'
class Session {
  constructor(public readonly access?: Token, public readonly refresh?: Token) {
  }
}
@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private readonly ready_ = new Completer<void>()
  get ready(): Promise<void> {
    return this.ready_.promise
  }
  get session(): Session | undefined {
    return this.subject_.value
  }
  private readonly subject_ = new BehaviorSubject<Session | undefined>(undefined)
  get observable(): Observable<Session | undefined> {
    return this.subject_
  }
  get access(): Observable<Token | undefined> {
    return this.subject_.pipe(
      map((session) => session ? session.access : undefined)
    )
  }
  private remember_ = false
  constructor(private readonly httpClient: HttpClient,
    private readonly touristService: TouristService,
  ) {
    Manager.instance.setRefresh((access) => {
      return this.refresh(access)
    })
    let access: Token | undefined
    let refresh: Token | undefined
    try {
      const token = loadToken(AccessKey)
      if (token) {
        access = token
        if (environment.production) {
          console.log(`load session access token`)
        } else {
          console.log(`load session access token`, token)
        }
      }
    } catch (e) {
      console.warn(`load session access token error :`, e)
    }
    try {
      const token = loadToken(RefreshKey)
      if (token) {
        refresh = token
        if (environment.production) {
          console.log(`load session refresh token`)
        } else {
          console.log(`load session refresh token`, token)
        }
      }
    } catch (e) {
      console.warn(`load session refresh token error :`, e)
    }
    this._restore(access, refresh)
  }
  private _nextSession(session: Session | undefined) {
    if (session) {
      Manager.instance.access = session.access
    } else {
      Manager.instance.access = undefined
    }
    this.subject_.next(session)
  }
  private async _restore(access?: Token, refresh?: Token) {
    let session: Session | undefined
    try {
      if (access) {
        this.remember_ = true
        if (environment.production) {
          console.log(`restore session access token`)
        } else {
          console.log(`restore session access token`, access)
        }
        if (refresh) {
          if (environment.production) {
            console.log(`restore session refresh token`)
          } else {
            console.log(`restore session refresh token`, refresh)
          }
        }
        session = new Session(access, refresh)
      } else if (refresh) {
        this.remember_ = true
        if (environment.production) {
          console.log(`restore session refresh token`)
        } else {
          console.log(`restore session refresh token`, refresh)
        }
        const access = await this._refresh(refresh)
        if (environment.production) {
          console.log(`refresh session access token`)
        } else {
          console.log(`refresh session access token`, access)
        }
        session = new Session(access, refresh)
      }
    } catch (e) {
      if (e instanceof NetError
        && e.status === 401
        && refresh
      ) {
        expired(RefreshKey, refresh.token)
      }
      console.error(`restore session token error : `, e)
    } finally {
      this.ready_.resolve()
      if (session) {
        this.remember_ = true
        this._nextSession(session)
      }
    }
  }
  private async _refresh(refresh: Token): Promise<Token> {
    const response = await ServerAPI.v1.features.sessions.child('refresh').post<RefreshResponse>(this.httpClient,
      undefined,
      {
        headers: generateHeader(getUnix(), refresh.data.salt, refresh.token),
      },
    ).toPromise()
    return new Token(response.access)
  }
  private refresh_: Completer<Token | undefined> | undefined
  async refresh(accessToken: string): Promise<Token | undefined> {
    const session = this.subject_.value
    if (!session || accessToken !== session.access?.token) {
      return
    }
    const refresh = session.refresh
    if (!refresh || refresh.seconds < 60 * 5) {
      return
    }

    if (!this.refresh_) {
      this.refresh_ = new Completer<Token | undefined>()
      try {
        const token = await this._refreshAccess(accessToken, refresh)
        this.refresh_.resolve(token)
      } catch (e) {
        this.refresh_.reject(e)
        const promise = this.refresh_.promise
        this.refresh_ = undefined
        return promise
      }
    }
    const promise = this.refresh_.promise
    this.refresh_ = undefined
    return promise
  }
  private async _refreshAccess(accessToken: string, refresh: Token): Promise<Token> {
    try {
      const access = await this._refresh(refresh)
      const session = this.subject_.value
      if (!session || session.access?.token != accessToken || session.refresh?.token != refresh.token) {
        throw new Error("refresh expired")
      }
      this._nextSession(new Session(access, refresh))
      if (this.remember_ && access.seconds > 60) {
        setItem(AccessKey, access.token)
      }
      return access
    } catch (e) {
      const session = this.subject_.value
      if (refresh.token === session?.refresh?.token
        && e instanceof NetError
        && e.status === 401
        && this.remember_
      ) {
        expired(RefreshKey, refresh.token)
        this._nextSession(new Session(session.access, undefined))
      }
      throw e
    }
  }
  private readonly signining_ = new BehaviorSubject<boolean>(false)
  get signining(): Observable<boolean> {
    return this.signining_
  }
  async signin(name: string, password: string, remember: boolean): Promise<Token | undefined> {
    if (this.signining_.value) {
      console.warn('wait signing completed')
      return
    }

    this.signining_.next(true)
    try {
      const tourist = await this.touristService.accessValid()
      return await this._signin(tourist, name, password, remember)
    } catch (e) {
      if (e instanceof NetError && e.status == 401) {
        const tourist = await this.touristService.access(true)
        return await this._signin(tourist, name, password, remember)
      }
      throw e
    } finally {
      this.signining_.next(false)
    }
  }
  async _signin(tourist: Token, name: string, password: string, remember: boolean): Promise<Token | undefined> {
    const unix = getUnix()
    password = md5String(md5String(password) + tourist.data.salt + unix)

    const response = await ServerAPI.v1.features.sessions.post<Response>(this.httpClient,
      {
        name: name,
        password: password,
      },
      {
        headers: generateHeader(unix, tourist.data.salt, tourist.token),
      },
    ).toPromise()
    const access = new Token(response.access)
    if (remember && access.seconds > 60) {
      setItem(AccessKey, access.token)
    }
    let refresh: Token | undefined
    if (remember && typeof response.refresh === "string" && response.refresh.length > 0) {
      try {
        refresh = new Token(response.refresh)
        if (refresh.seconds > 60 * 5) {
          setItem(RefreshKey, refresh.token)
        }
      } catch (e) {
        console.warn('new session refresh token error :', e)
      }
    }
    this.remember_ = remember
    this._nextSession(new Session(access, refresh))
    return access
  }
  signout() {
    if (this.subject_.value) {
      if (this.remember_) {
        removeItem(AccessKey)
        removeItem(RefreshKey)
      }
      this._nextSession(undefined)
    }
  }
}

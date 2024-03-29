import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Authorization, ServerAPI } from '../core/api';
import { Completer } from '../utils/completer';
import { removeItem } from "../utils/local-storage";
import { getItem, setItem } from "../utils/aes-local-storage";
import { getUnix } from '../utils/utils';
import { md5String } from '../utils/md5';
import { aesDecrypt, aesEncrypt } from '../utils/aes';
import { Codes, NetError } from '../core/restful';
const Key = 'session'
const KeyLast = 'last.session'
const Platform = 'web'
export interface Userdata {
    readonly id: string
    readonly name?: string
    readonly nickname?: string
    readonly authorization?: Array<number>
}
export class Token {
    public readonly accessDeadline: number
    public readonly refreshDeadline: number
    public readonly deadline: number
    constructor(
        public readonly access: string,
        public readonly refresh: string,
        accessDeadline: string | number,
        refreshDeadline: string | number,
        deadline: string | number,
    ) {
        if (typeof accessDeadline === "number") {
            this.accessDeadline = accessDeadline

        } else {
            this.accessDeadline = parseInt(accessDeadline)
        }
        if (typeof refreshDeadline === "number") {
            this.refreshDeadline = refreshDeadline
        } else {
            this.refreshDeadline = parseInt(refreshDeadline)
        }
        if (typeof deadline === "number") {
            this.deadline = deadline
        } else if (typeof deadline === "string") {
            this.deadline = parseInt(deadline)
        } else {
            this.deadline = 0
        }
    }
    get expired(): boolean {
        return getUnix() > this.accessDeadline
    }
    get deleted(): boolean {
        return getUnix() > this.refreshDeadline
    }
    get canRefresh(): boolean {
        if (this.deadline == 0) {
            return true
        }
        return getUnix() < this.deadline
    }
}
export class Session {
    constructor(public readonly token: Token, public readonly userdata: Userdata) {
    }
    get access(): string {
        return this.token.access
    }
    get who(): string {
        if (!this.userdata || !this.userdata.id) {
            return ''
        }
        let name = this.userdata.name ?? ''
        const nickname = this.userdata.nickname ?? ''
        return nickname.length == 0 ? name : `${nickname} [${name}]`
    }
    get root(): boolean {
        return this.anyAuth(Authorization.Root)
    }
    get authorization(): Array<number> {
        if (!this.userdata || !this.userdata.authorization || !Array.isArray(this.userdata.authorization)) {
            return []
        }
        return this.userdata.authorization
    }
    /**
     * if has all authorization return true
     */
    testAuth(...vals: Array<number>): boolean {
        if (!this.userdata || !this.userdata.id) {
            return false
        }
        let found: boolean
        const authorization = this.authorization
        for (let i = 0; i < vals.length; i++) {
            found = false
            const val = vals[i]
            for (let j = 0; j < authorization.length; j++) {
                if (val == authorization[j]) {
                    found = true
                    break
                }
            }
            if (!found) {
                return false
            }
        }
        return true
    }
    /**
     * if not has any authorization return true
     */
    noneAuth(...vals: Array<number>): boolean {
        if (!this.userdata || !this.userdata.id) {
            return false
        }
        const authorization = this.authorization
        for (let i = 0; i < authorization.length; i++) {
            for (let j = 0; j < vals.length; j++) {
                const val = vals[j]
                if (authorization[i] == val) {
                    return false
                }
            }
        }
        return true
    }
    /**
     * if has any authorization return true
     */
    anyAuth(...vals: Array<number>): boolean {
        if (!this.userdata || !this.userdata.id) {
            return false
        }
        const authorization = this.authorization
        for (let i = 0; i < authorization.length; i++) {
            for (let j = 0; j < vals.length; j++) {
                const val = vals[j]
                if (authorization[i] == val) {
                    return true
                }
            }
        }
        return false
    }
}
interface Store {
    userdata: Userdata
    token: Token
}
interface SigninResponse {
    token: Token
    data: Userdata
}
interface RefreshResponse {
    token: Token
}
export class Manager {
    static instance_ = new Manager()
    static get instance(): Manager {
        return Manager.instance_
    }
    private constructor() {
    }
    private remember_ = false
    get session(): Session | undefined {
        return this.subject_.value
    }
    private readonly subject_ = new BehaviorSubject<Session | undefined>(undefined)
    get observable(): Observable<Session | undefined> {
        return this.subject_
    }
    private _load(key: string): Session | undefined {
        const str = getItem(key)
        if (typeof str !== "string") {
            return
        }
        try {
            const obj: Store = JSON.parse(aesDecrypt(str))
            if (obj !== null && typeof obj === "object") {
                const t = obj.token
                const token = new Token(
                    t.access, t.refresh,
                    t.accessDeadline, t.refreshDeadline,
                    t.deadline,
                )
                const userdata = obj.userdata
                if (!token.deleted
                    && userdata !== null && typeof userdata === "object" && userdata.id) {
                    this.remember_ = true
                    const session = new Session(token, userdata)
                    return session
                }
            }
        } catch (e) {
            console.warn(`load token error`, e)
        }
        return
    }
    load() {
        this.subject_.next(this._load(Key))
    }
    private _save(session: Session, remember: boolean, last = true) {
        if (!remember && !last) {
            return
        }
        try {
            const data = JSON.stringify({
                userdata: session.userdata,
                token: session.token,
            })
            console.log(`save token`, data)
            const val = aesEncrypt(data)
            if (remember) {
                setItem(Key, val)
            }
            if (last) {
                setItem(KeyLast, val)
            }
        } catch (e) {
            console.log('save token error', e)
        }
    }
    refresh_: Completer<Session | undefined> | undefined
    private readonly signining_ = new BehaviorSubject<boolean>(false)
    get signining(): Observable<boolean> {
        return this.signining_
    }
    async signin(httpClient: HttpClient,
        name: string, password: string, remember: boolean,
    ): Promise<Session | undefined> {
        if (this.signining_.value) {
            console.warn('wait signing completed')
            return
        }
        this.signining_.next(true)
        this.remember_ = remember
        let completer: Completer<Session | undefined> | undefined
        let session: Session | undefined
        try {
            // wait refresh completed
            while (this.refresh_) {
                const completer = this.refresh_
                try {
                    await completer.promise
                } catch (error) {
                }
                if (completer == this.refresh_) {
                    this.refresh_ = undefined
                }
            }
            completer = new Completer<Session | undefined>()
            this.refresh_ = completer
            const unix = getUnix()
            password = md5String(password)
            password = md5String(`${Platform}.${password}.${unix}`)
            const response = await ServerAPI.v1.sessions.post<SigninResponse>(httpClient,
                {
                    platform: Platform,
                    name: name,
                    password: password,
                    unix: unix,
                },
                {
                    headers: {
                        'Interceptor': 'none',
                    },
                },
            ).toPromise()
            const token = response.token
            session = new Session(
                new Token(
                    token.access, token.refresh,
                    token.accessDeadline, token.refreshDeadline,
                    token.deadline,
                ),
                response.data)
            this._save(session, remember)
            this.subject_.next(session)
        } finally {
            if (completer) {
                completer.resolve(session)
                if (completer == this.refresh_) {
                    this.refresh_ = undefined
                }
            }
            this.signining_.next(false)
        }
        return
    }
    signout(httpClient: HttpClient) {
        const session = this.subject_.value
        if (session) {
            this.clear(session)
            this.subject_.next(undefined)
            ServerAPI.v1.sessions.child('access').delete(httpClient, {
                headers: {
                    Interceptor: 'none',
                    Authorization: `Bearer ${session.access}`
                }
            }).toPromise().then(() => {
                console.info(`signout who=${session.who}`)
            }, (e) => {
                console.warn(`signout who=${session.who} error=${e}`)
            })
        }
    }
    async refresh(httpClient: HttpClient, session: Session, err?: NetError): Promise<Session | undefined> {
        if (this.refresh_) { // refreshing
            return this.refresh_.promise
        }

        const current = this.subject_.value
        if (!current) { // already signout
            return
        } else if (session != current) { // already refresh
            return current
        }
        let token = session.token
        const last = this._load(KeyLast)
        if (last && last.access != session.access && last.userdata.id && last.userdata.id == session.userdata.id) {
            const lt = last.token
            if (!lt.deleted) {
                if (!lt.expired) {
                    this.subject_.next(last)
                    this._save(last, this.remember_, false)
                    return last
                }
                if (lt.canRefresh) {
                    token = lt
                }
            }
        }

        if (err) {
            if (err.grpc != Codes.Unauthenticated) {
                throw err
            } else if (err.message == 'token not exists') {
                throw err
            }
        }
        if (!token.canRefresh) {
            throw "can't refresh token"
        }

        // refresh
        const completer = new Completer<Session | undefined>()
        this.refresh_ = completer
        ServerAPI.v1.sessions.child('refresh').post<RefreshResponse>(httpClient,
            {
                access: token.access,
                refresh: token.refresh,
            },
            {
                headers: {
                    Interceptor: 'none',
                }
            },
        ).toPromise().then((resp) => {
            const token = resp.token
            const s = new Session(
                new Token(
                    token.access, token.refresh,
                    token.accessDeadline, token.refreshDeadline,
                    token.deadline,
                ),
                session.userdata,
            )
            this._save(s, this.remember_)
            this.subject_.next(s)
            completer.resolve(s)
        }, (e) => {
            completer.reject(e)
        }).finally(() => {
            this.refresh_ = undefined
        })
        return completer.promise
    }
    clear(session: Session) {
        if (session == this.subject_.value) {
            this.subject_.next(undefined)
            if (this.remember_) {
                const current = this._load(Key)
                if (current && current.access == session.access) {
                    removeItem(Key)
                }
            }
            const current = this._load(KeyLast)
            if (current && current.access == session.access) {
                removeItem(KeyLast)
            }
        }
    }
}
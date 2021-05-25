import jwtDecode from 'jwt-decode';
import { Authorization } from '../core/api';
export interface Data {
    readonly id: string
    readonly name?: string
    readonly authorization?: Array<number>
    readonly nickname?: string

    // tourist or user
    readonly tourist: boolean
    // access or refresh
    readonly access: boolean
    // expiration unix
    readonly exp: number
    // encryption salt
    readonly salt: string
    readonly sub: "tourist access" | "tourist refresh" | "access" | "refresh"
}
export class Token {
    private data_: Data
    get data(): Data {
        return this.data_
    }
    constructor(public readonly token: string) {
        this.data_ = jwtDecode<Data>(token)
    }
    /**
   * Return how long it will expire, if less than or equal to 0, it has expired
   */
    get seconds(): number {
        const now = Math.floor(Date.now() / 1000)
        return this.data_.exp - now
    }
    get valid(): boolean {
        return this.seconds >= 0
    }
    get who(): string {
        if (!this.data_) {
            return ''
        }
        let name = this.data_.name ?? ''
        const nickname = this.data_.nickname ?? ''
        return nickname.length == 0 ? name : `${nickname} [${name}]`
    }
    get root(): boolean {
        return this.anyAuth(Authorization.Root)
    }
    get authorization(): Array<number> {
        if (!this.data_ || !this.data_.authorization || !Array.isArray(this.data_.authorization)) {
            return []
        }
        return this.data_.authorization
    }
    /**
     * if has all authorization return true
     */
    testAuth(...vals: Array<number>): boolean {
        const authorization = this.authorization
        for (let i = 0; i < authorization.length; i++) {
            for (let j = 0; j < vals.length; j++) {
                const val = vals[j]
                if (authorization[i] != val) {
                    return false
                }
            }
        }
        return true
    }
    /**
     * if not has any authorization return true
     */
    noneAuth(...vals: Array<number>): boolean {
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
export class Manager {
    static readonly instance = new Manager()
    private constructor() {
    }
    access: Token | undefined
    private refresh_: ((access: string) => Promise<Token | undefined>) | undefined
    setRefresh(handler: ((access: string) => Promise<Token | undefined>)) {
        this.refresh_ = handler
    }
    refresh(access: Token): Promise<Token | undefined> {
        if (this.refresh_) {
            return this.refresh_(access.token)
        }
        return Promise.resolve(undefined)
    }
}
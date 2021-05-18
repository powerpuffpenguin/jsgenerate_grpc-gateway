import { join, sep } from "path"

export class Exclude {
    private set_: Set<string>
    constructor(
        public readonly prefix?: Array<string>,
        public readonly suffix?: Array<string>,
        exclude?: Array<string>,
    ) {
        if (exclude) {
            const set = new Set<string>()
            for (let i = 0; i < exclude.length; i++) {
                set.add(exclude[i])
            }
            this.set_ = set
        }
    }
    check(str: string): boolean {
        if (this.set_) {
            if (this.set_.has(str)) {
                return true
            }
        }
        if (this.prefix) {
            for (let i = 0; i < this.prefix.length; i++) {
                const element = this.prefix[i]
                if (str.startsWith(element)) {
                    return true
                }
            }
        }
        if (this.suffix) {
            for (let i = 0; i < this.suffix.length; i++) {
                const element = this.suffix[i];
                if (str.endsWith(element)) {
                    return true
                }
            }
        }
        return false
    }
}

export class NameService {
    private rename_ = new Map<string, string>()
    constructor(public readonly output: string,
        public readonly uuid: string,
        public readonly exclude: Exclude,
    ) {

    }
    rename(dst: string, src: string, ...prefix: Array<string>) {
        if (prefix && prefix.length > 0) {
            this.rename_.set(join(join(...prefix), src), join(join(...prefix), dst))
        } else {
            this.rename_.set(src, dst)
        }
        return this
    }
    checkExclude(name: string): boolean {
        if (this.exclude) {
            if (name.endsWith('.art')) {
                name = name.substr(0, name.length - 4)
            }
            return this.exclude.check(name)
        }
        return false
    }
    getOutput(name: string): string {
        if (name.endsWith('.art')) {
            name = name.substr(0, name.length - 4)
            if (this.rename_.has(name)) {
                name = this.rename_.get(name)
            }
        }
        const prefix = `pb` + sep
        if (name.startsWith(prefix)) {
            name = join(`pb`, this.uuid, name.substring(prefix.length))
        }
        return join(this.output, name)
    }
    isTemplate(name: string) {
        return name.endsWith('.art')
    }
}
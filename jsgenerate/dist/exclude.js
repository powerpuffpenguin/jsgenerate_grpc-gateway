"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Exclude = void 0;
class Exclude {
    constructor(prefix, suffix, exclude) {
        this.prefix = prefix;
        this.suffix = suffix;
        if (exclude) {
            const set = new Set();
            for (let i = 0; i < exclude.length; i++) {
                set.add(exclude[i]);
            }
            this.set_ = set;
        }
    }
    check(str) {
        if (this.set_) {
            if (this.set_.has(str)) {
                return true;
            }
        }
        if (this.prefix) {
            for (let i = 0; i < this.prefix.length; i++) {
                const element = this.prefix[i];
                if (str.startsWith(element)) {
                    return true;
                }
            }
        }
        if (this.suffix) {
            for (let i = 0; i < this.suffix.length; i++) {
                const element = this.suffix[i];
                if (str.endsWith(element)) {
                    return true;
                }
            }
        }
        return false;
    }
}
exports.Exclude = Exclude;

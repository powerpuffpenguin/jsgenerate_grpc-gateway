"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NameService = exports.Exclude = void 0;
const path_1 = require("path");
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
class NameService {
    constructor(output, uuid, exclude) {
        this.output = output;
        this.uuid = uuid;
        this.exclude = exclude;
        this.rename_ = new Map();
    }
    rename(dst, src, ...prefix) {
        if (prefix && prefix.length > 0) {
            this.rename_.set(path_1.join(path_1.join(...prefix), src), path_1.join(path_1.join(...prefix), dst));
        }
        else {
            this.rename_.set(src, dst);
        }
        return this;
    }
    checkExclude(name) {
        if (this.exclude) {
            if (name.endsWith('.art')) {
                name = name.substr(0, name.length - 4);
            }
            return this.exclude.check(name);
        }
        return false;
    }
    getOutput(name) {
        if (name.endsWith('.art')) {
            name = name.substr(0, name.length - 4);
            if (this.rename_.has(name)) {
                name = this.rename_.get(name);
            }
        }
        const prefix = `pb` + path_1.sep;
        if (name.startsWith(prefix)) {
            name = path_1.join(`pb`, this.uuid, name.substring(prefix.length));
        }
        return path_1.join(this.output, name);
    }
    isTemplate(name) {
        return name.endsWith('.art');
    }
}
exports.NameService = NameService;

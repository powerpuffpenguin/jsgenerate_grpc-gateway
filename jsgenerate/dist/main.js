"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsgenerate = exports.description = exports.tag = void 0;
const fs_1 = require("fs");
const helper_1 = require("./helper");
const path_1 = require("path");
exports.tag = 'default gateway gin db view init-trunc init-supplement';
exports.description = 'google grpc frame template';
async function exists(filename) {
    try {
        await fs_1.promises.access(filename, fs_1.constants.F_OK);
        return true;
    }
    catch (e) {
    }
    return false;
}
class Metadata {
    constructor(pkg, name, tag, uuid) {
        this.uuid = uuid;
        this.date = new Date();
        this.project_ = '';
        this.pkg_ = '';
        this.year = new Date().getFullYear();
        this.gin = false;
        this.db = false;
        this.view = false;
        this.initTrunc = false;
        this.initSupplement = false;
        this.grpcPrefix = 'jsgenerate_';
        pkg = pkg.replace('.', '/').replace('@', '').replace('-', '_');
        pkg = pkg.replace('//', '/').replace('__', '_');
        this.pkg_ = pkg;
        name = name.replace('.', '').replace('@', '').replace('-', '_').replace('/', '');
        name = name.replace('__', '_');
        this.project_ = name;
        this.grpcPrefix += name;
        if (Array.isArray(tag)) {
            for (let i = 0; i < tag.length; i++) {
                const v = tag[i];
                if (v == 'default') {
                    this.gin = true;
                    this.db = true;
                    this.view = true;
                }
                else if (v == 'gin') {
                    this.gin = true;
                }
                else if (v == 'view') {
                    this.gin = true;
                    this.view = true;
                }
                else if (v == 'db') {
                    this.db = true;
                }
                else if (v == 'init-trunc') {
                    this.initTrunc = true;
                }
                else if (v == 'init-supplement') {
                    this.initSupplement = true;
                }
            }
        }
    }
    get project() {
        return this.project_;
    }
    get pkg() {
        return this.pkg_;
    }
}
async function getUUID(context) {
    try {
        const dir = await fs_1.promises.opendir(path_1.join(context.output, 'pb'));
        for await (const dirent of dir) {
            if (!dirent.isDirectory()) {
                continue;
            }
            const name = dirent.name;
            if (name.length == 36 && /[a-z0-9]{8}\-([a-z0-9]{4}\-){3}[a-z0-9]{12}/.test(name)) {
                return name;
            }
        }
    }
    catch (e) {
    }
    return context.uuidv1();
}
function jsgenerate(context) {
    getUUID(context).then((uuid) => {
        const md = new Metadata(context.pkg, context.name, context.tag, uuid);
        const prefix = [
            '.git' + path_1.sep, 'document' + path_1.sep,
            path_1.join('view', 'node_modules'),
        ];
        const exclude = ['.git', 'document'];
        if (!md.db) {
            exclude.push(path_1.join('configure', 'db.go'));
            exclude.push(path_1.join('db', 'manipulator', 'init.go'));
        }
        if (!md.gin) {
            prefix.push('web' + path_1.sep);
            exclude.push('web');
            prefix.push('static' + path_1.sep);
            exclude.push('static');
            exclude.push(path_1.join('cmd', 'internal', 'daemon', 'gin.go'));
            prefix.push('assets' + path_1.sep);
            exclude.push('assets');
        }
        if (!md.view) {
            prefix.push('view' + path_1.sep);
            exclude.push('view');
            const locales = ['en-US', 'zh-Hans', 'zh-Hant'];
            locales.forEach((str) => {
                str = path_1.join('assets', str);
                prefix.push(str + path_1.sep);
                exclude.push(str);
            });
        }
        const nameService = new helper_1.NameService(context.output, uuid, new helper_1.Exclude(prefix, [], exclude)).rename(`${md.project}.jsonnet`, `example.jsonnet`, `bin`, `etc`);
        const skip = new Set()
            .add(path_1.join(__dirname, '..', '..', 'README.md'))
            .add(path_1.join(__dirname, '..', '..', 'README_ZH.md'))
            .add(path_1.join(__dirname, '..', '..', 'LICENSE'))
            .add(path_1.join(__dirname, '..', '..', '.gitignore'));
        context.serve(async function (name, src, stat) {
            if (skip.has(src) || nameService.checkExclude(name)) {
                return;
            }
            const filename = nameService.getOutput(name);
            if (await exists(filename)) {
                if (md.initSupplement) {
                    return;
                }
                if (!md.initTrunc) {
                    throw new Error(`file already exists : ${filename}`);
                }
            }
            console.log(filename, name, src);
            if (nameService.isTemplate(name)) {
                const text = context.template(src, md);
                console.log('renderTo', filename);
                context.writeFile(filename, text, stat.mode);
            }
            else {
                console.log('copyTo', filename);
                await context.copyFile(filename, src, stat.mode);
            }
        }, async function (name, _, stat) {
            if (nameService.checkExclude(name)) {
                return;
            }
            const filename = nameService.getOutput(name);
            if (await exists(filename)) {
                if (md.initSupplement) {
                    return;
                }
                if (!md.initTrunc) {
                    throw new Error(`directory already exists : ${filename}`);
                }
            }
            console.log('mkdir', filename);
            await context.mkdir(filename, true, stat.mode);
        }).then(() => {
            console.log(`jsgenerate success`);
            console.log(`package : ${md.pkg}`);
            console.log(`project : ${md.project}`);
            console.log(`uuid : ${uuid}`);
        });
    });
}
exports.jsgenerate = jsgenerate;

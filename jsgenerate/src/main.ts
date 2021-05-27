import { Context } from "./context";
import { promises, constants } from "fs";
import { Exclude, NameService } from "./helper";
import { join, sep } from "path";
export const tag = 'default view init-trunc init-supplement'
export const description = 'google grpc frame template'
async function exists(filename: string): Promise<boolean> {
    try {
        await promises.access(filename, constants.F_OK)
        return true
    } catch (e) {

    }
    return false
}
class Metadata {
    readonly date = new Date()
    private project_ = ''
    get project(): string {
        return this.project_
    }
    private pkg_ = ''
    get pkg(): string {
        return this.pkg_
    }
    year = new Date().getFullYear()
    view = false
    initTrunc = false
    initSupplement = false
    grpcPrefix = 'jsgenerate_'
    constructor(pkg: string,
        name: string,
        tag: Array<string>,
        public readonly uuid: string,
    ) {
        pkg = pkg.replace('.', '/').replace('@', '').replace('-', '_')
        pkg = pkg.replace('//', '/').replace('__', '_')
        this.pkg_ = pkg
        name = name.replace('.', '').replace('@', '').replace('-', '_').replace('/', '')
        name = name.replace('__', '_')
        this.project_ = name
        this.grpcPrefix += name

        if (Array.isArray(tag)) {
            for (let i = 0; i < tag.length; i++) {
                const v = tag[i]
                if (v == 'default') {
                    this.view = true
                } else if (v == 'view') {
                    this.view = true
                } else if (v == 'init-trunc') {
                    this.initTrunc = true
                } else if (v == 'init-supplement') {
                    this.initSupplement = true
                }
            }
        }
    }
}
async function getUUID(context: Context): Promise<string> {
    try {
        const dir = await promises.opendir(join(context.output, 'pb'))
        for await (const dirent of dir) {
            if (!dirent.isDirectory()) {
                continue
            }
            const name = dirent.name
            if (name.length == 36 && /[a-z0-9]{8}\-([a-z0-9]{4}\-){3}[a-z0-9]{12}/.test(name)) {
                return name
            }
        }
    } catch (e) {

    }
    return context.uuidv1()
}
export function jsgenerate(context: Context) {
    getUUID(context).then((uuid) => {
        const md = new Metadata(context.pkg, context.name, context.tag, uuid)
        const prefix = [
            '.git' + sep, 'document' + sep,
            join('view', 'node_modules'),
        ]
        const exclude = ['.git', 'document']

        if (!md.view) {
            prefix.push('view' + sep)
            exclude.push('view')
            let tmp = join('static', 'public')
            prefix.push(tmp + sep)
            exclude.push(tmp)
            tmp = join('m', 'web', 'view')
            prefix.push(tmp + sep)
            exclude.push(tmp)
            const locales = ['en-US', 'zh-Hans', 'zh-Hant']
            locales.forEach((str) => {
                str = join('assets', str)
                prefix.push(str + sep)
                exclude.push(str)
            })
        }
        const nameService = new NameService(context.output, uuid,
            new Exclude(
                prefix,
                [],
                exclude,
            ),
        ).rename(
            `${md.project}.jsonnet`, `example.jsonnet`,
            `bin`, `etc`,
        )
        const skip = new Set<string>()
            .add(join(__dirname, '..', '..', 'README.md'))
            .add(join(__dirname, '..', '..', 'README_ZH.md'))
            .add(join(__dirname, '..', '..', 'LICENSE'))
            .add(join(__dirname, '..', '..', '.gitignore'))
        context.serve(
            async function (name, src, stat): Promise<undefined> {
                if (skip.has(src) || nameService.checkExclude(name)) {
                    return
                }
                const filename = nameService.getOutput(name)
                if (await exists(filename)) {
                    if (md.initSupplement) {
                        return
                    }
                    if (!md.initTrunc) {
                        throw new Error(`file already exists : ${filename}`)
                    }
                }
                if (nameService.isTemplate(name)) {
                    const text = context.template(src, md)
                    console.log('renderTo', filename)
                    context.writeFile(filename, text, stat.mode)
                } else {
                    console.log('copyTo', filename)
                    await context.copyFile(filename, src, stat.mode)
                }
            },
            async function (name, _, stat): Promise<undefined> {
                if (nameService.checkExclude(name)) {
                    return
                }
                const filename = nameService.getOutput(name)
                if (await exists(filename)) {
                    if (md.initSupplement) {
                        return
                    }
                    if (!md.initTrunc) {
                        throw new Error(`directory already exists : ${filename}`)
                    }
                }
                console.log('mkdir', filename)
                await context.mkdir(filename, true, stat.mode)
            },
        ).then(() => {
            console.log(`jsgenerate success`)
            console.log(`package : ${md.pkg}`)
            console.log(`project : ${md.project}`)
            console.log(`uuid : ${uuid}`)
        })
    })
}

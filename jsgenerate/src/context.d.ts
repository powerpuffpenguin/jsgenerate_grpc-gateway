/// <reference types="node" />
import { Stats } from "fs";
export declare class Context {
    readonly tag: Array<string>;
    readonly root: string;
    readonly output: string;
    readonly data: Map<string, any>;
    readonly version = "1.0.2";
    private pkg_;
    private name_;
    get pkg(): string;
    get name(): string;
    constructor(pkg: string, name: string, tag: string, root: string, output: string);
    serve(renderFile: (name: string, src: string, stat: Stats) => void | Promise<undefined>, renderDir: (name: string, src: string, stat: Stats) => void | Promise<undefined>): Promise<void>;
    private _name;
    private _serve;
    get extension(): {
        [key: string]: Function;
    };
    get defaults(): {
        filename?: string;
        rules: any[];
        excape: boolean;
        debug: boolean;
        bail: boolean;
        cache: boolean;
        minimize: boolean;
        compileDebug: boolean;
        resolveFilename: any;
        include: any;
        htmlMinifier: any;
        htmlMinifierOptions: {
            collapseWhitespace: boolean;
            minifyCSS: boolean;
            minifyJS: boolean;
            ignoreCustomFragments: any[];
        };
        onerror: any;
        loader: any;
        caches: any;
        root: string;
        extname: string;
        ignore: any[];
        imports: {
            [key: string]: Function;
        };
    };
    template(filenameOrTemplateId: string, content?: string | Object): any;
    compile(source: string, options?: any): (data: any) => string;
    render(source: string, data: any, options?: any): string;
    mkdir(path: string, recursive?: boolean, mode?: string | number): Promise<string>;
    copyFile(dst: string, src: string, mode?: string | number): Promise<void>;
    writeFile(dst: string, text: string, mode?: string | number, encoding?: BufferEncoding): Promise<void>;
    uuidv1(): string;
    uuidv4(): string;
}

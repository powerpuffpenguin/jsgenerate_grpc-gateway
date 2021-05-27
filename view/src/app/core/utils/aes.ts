import { environment } from 'src/environments/environment';
import { ModeOfOperation, utils } from 'aes-js';
import { md5String } from './md5';

const key = utils.hex.toBytes(md5String(environment.aesKey))
const iv = utils.hex.toBytes(md5String(environment.aesIV))
export function aesDecrypt(data: string): string {
    const aes = new ModeOfOperation.ofb(key, iv)
    return utils.utf8.fromBytes(aes.decrypt(utils.hex.toBytes(data)))
}
export function aesEncrypt(data: string): string {
    const aes = new ModeOfOperation.ofb(key, iv)
    return utils.hex.fromBytes(aes.encrypt(utils.utf8.toBytes(data)))
}
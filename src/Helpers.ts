import {Md5} from "ts-md5";

export function generateBasicAuthToken(username: string, password: string = '') {
    if (!username) return ''
    return Buffer.from(`${username}:${password}`).toString('base64');
}

export function generateRandomId(length: number): string {
    const characters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result: string = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}


export function getHash(content: string): string {
    return Md5.hashStr(content) as string
}
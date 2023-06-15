export function generateBasicAuthToken(username:string,password:string=''){
    return Buffer.from(`${username}:${password}`).toString('base64');
}
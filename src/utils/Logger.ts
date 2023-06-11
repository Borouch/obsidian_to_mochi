export function debug (message:any){
    console.groupCollapsed(message);
    console.trace();
    console.groupEnd();
}


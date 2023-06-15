export interface MochiAttachment {
    // The file name (before the extension) must match the regex /[0-9a-zA-Z]{8,16}/. E.g. "j94fuC0R.jpg"
    fileName: string;
    //MIME TYPE
    contentType: string;
    //BASE64
    data: string;
}


export interface MochiAttachmentDTO{
    "file-name": string;
    "content-type": string;
    data: string;
}


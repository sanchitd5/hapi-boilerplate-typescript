
interface S3FolderDetails {
    readonly profilePicture: string;
    readonly thumb: string;
    readonly original: string;
    readonly image: string;
    readonly docs: string;
    readonly files: string;
    readonly video: string;
    readonly audio: string;
}


interface AwsS3BucketProperties {
    readonly projectFolder: string;
    readonly bucket: string;
    readonly endpoint: string;
    readonly apiKeyId: string;
    readonly serviceInstanceId: string;
    readonly folder: S3FolderDetails;
}

interface S3BucketCredentialsProps {
    projectFolder: string;
    bucket: string;
}

class S3BucketCredentials implements AwsS3BucketProperties {
    readonly projectFolder: string;
    readonly bucket: string;
    readonly endpoint = "";
    readonly apiKeyId = "";
    readonly serviceInstanceId = "";
    readonly folder: S3FolderDetails;

    constructor(data: S3BucketCredentialsProps) {
        this.projectFolder = data.projectFolder;
        this.bucket = data.bucket;
        this.folder = {
            profilePicture: "profilePicture",
            thumb: "thumb",
            original: "original",
            image: "image",
            docs: "docs",
            files: "files",
            video: "video",
            audio: "audio"
        };
    }
}

export default {
    s3BucketCredentials: new S3BucketCredentials({
        bucket: "<project_bucket>",
        projectFolder: ""
    })
} as const;

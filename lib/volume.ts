import VolumeAPIClient from "./client/volume";
import MultipartUploadPartClient from "./util/multipart-upload";

export default class Volume {
  public volumeName: string;
  public appName?: string;

  public constructor(volumeName: string, appName?: string) {
    this.volumeName = volumeName;
    this.appName = appName;
  }

  public UploadFiles(files: File[]) {
    const uploadClient = new MultipartUploadPartClient(
      async (files: File[]) =>
        VolumeAPIClient.SetupMultipartUploads(
          this.volumeName,
          this.appName,
          files.map((f) => f.name)
        ),
      VolumeAPIClient.GetMultipartUploadURL,
      VolumeAPIClient.CancelMultipartUpload,
      VolumeAPIClient.CompleteMultipartUpload
    );

    return uploadClient.UploadFiles(files);
  }
}

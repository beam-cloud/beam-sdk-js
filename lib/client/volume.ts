import { IMultipartUploadURL, ISetupMultipartUploads, MultipartUploadPart } from "..//util/multipart-upload";
import { API_BASE_URL } from "../../config/config";
import HttpClient, { IServiceResponse } from "./http";

export default class VolumeAPIClient {
  private static baseUrl: string = `${API_BASE_URL}/volume`;

  public static async SetupMultipartUploads(
    volumeName: string,
    appName: string | undefined,
    files: string[]
  ): Promise<IServiceResponse<ISetupMultipartUploads>> {
    return HttpClient.request({
      method: "POST",
      baseURL: VolumeAPIClient.baseUrl,
      url: `${volumeName}/multipart-upload-setup/`,
      data: {
        files: files,
        ...(appName ? { app_name: appName } : {}),
      },
    });
  }

  public static async GetMultipartUploadURL(
    partNumber: number,
    key: string,
    uploadId: string
  ): Promise<IServiceResponse<IMultipartUploadURL>> {
    return HttpClient.request({
      method: "POST",
      baseURL: VolumeAPIClient.baseUrl,
      url: `multipart-upload-url/`,
      data: {
        key: key,
        upload_id: uploadId,
        part_number: partNumber,
      },
    });
  }

  public static async CompleteMultipartUpload(
    key: string,
    uploadId: string,
    uploadedParts: MultipartUploadPart[]
  ): Promise<IServiceResponse<void>> {
    return HttpClient.request({
      method: "POST",
      baseURL: VolumeAPIClient.baseUrl,
      url: `multipart-upload-complete/`,
      data: {
        key: key,
        upload_id: uploadId,
        parts: uploadedParts.map((p) => ({
          etag: p.etag,
          part_number: p.partNumber,
        })),
      },
    });
  }

  public static async CancelMultipartUpload(key: string, uploadId: string): Promise<IServiceResponse<void>> {
    return HttpClient.request({
      method: "POST",
      baseURL: VolumeAPIClient.baseUrl,
      url: `multipart-upload-cancel/`,
      data: {
        key: key,
        upload_id: uploadId,
      },
    });
  }
}

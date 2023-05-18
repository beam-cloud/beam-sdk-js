import HttpClient, { IServiceResponse } from "../client/http";
import { BeamClientError } from "../exceptions";

export interface MultipartUploadSetupDetails {
  key: string;
  upload_id: string;
}

export interface ISetupMultipartUploads {
  files: {
    [fileName: string]: MultipartUploadSetupDetails;
  };
}

export interface MultipartUploadPart {
  etag: string;
  partNumber: number;
}

export interface IMultipartUploadURL {
  url: string;
}

interface ChunkRequest {
  partNumber: number;
  request: Promise<any>;
}

type MultipartSetupInfoFn = (files: File[]) => Promise<IServiceResponse<any>>;
type MultipartUploadUrlFn = (
  partNumber: number,
  uploadKey: string,
  uploadId: string
) => Promise<IServiceResponse<any>>;
type MultipartUploadCancelFn = (uploadKey: string, uploadId: string) => Promise<IServiceResponse<any>>;
type MultipartUploadCompleteFn = (
  uploadKey: string,
  uploadId: string,
  uploadedParts: MultipartUploadPart[]
) => Promise<IServiceResponse<any>>;

export default class MultipartUploadPartClient {
  private getMultipartSetupInfoFn: MultipartSetupInfoFn;
  private getMultipartUploadUrlFn: MultipartUploadUrlFn;
  private cancelMultipartUploadFn: MultipartUploadCancelFn;
  private completeMultipartUploadFn: MultipartUploadCompleteFn;

  public blockSize = 1024 * 1024 * 5;
  public maxConcurrentUploads = 5;

  public constructor(
    getMultipartSetupInfoFn: MultipartSetupInfoFn,
    getMultipartUploadUrlFn: MultipartUploadUrlFn,
    cancelMultipartUploadFn: MultipartUploadCancelFn,
    completeMultipartUploadFn: MultipartUploadCompleteFn
  ) {
    this.getMultipartSetupInfoFn = getMultipartSetupInfoFn;
    this.getMultipartUploadUrlFn = getMultipartUploadUrlFn;
    this.cancelMultipartUploadFn = cancelMultipartUploadFn;
    this.completeMultipartUploadFn = completeMultipartUploadFn;
  }

  private async setupUpload(files: File[]): Promise<Record<string, MultipartUploadSetupDetails>> {
    const response = await this.getMultipartSetupInfoFn(files);

    if (!response.data?.files) {
      throw new BeamClientError("Failed to get multipart upload setup info");
    }

    return response.data.files;
  }

  private async uploadChunk(
    chunk: Blob,
    partNumber: number,
    uploadKey: string,
    uploadId: string,
    abortController?: AbortController,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ): Promise<ChunkRequest> {
    const response = await this.getMultipartUploadUrlFn(partNumber, uploadKey, uploadId);

    if (!response.data?.url) {
      throw new BeamClientError("Failed to get upload URL");
    }

    return {
      partNumber: partNumber,
      request: HttpClient.UploadFileWithSignedUrl(response.data.url, chunk, abortController, onProgress),
    };
  }

  public async UploadFiles(
    files: File[],
    abortController?: AbortController,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ) {
    if (!files || files.length === 0) {
      return;
    }

    const multipartFiles = await this.setupUpload(files);

    for (const file of files) {
      const uploadId = multipartFiles[file.name].upload_id;
      const uploadKey = multipartFiles[file.name].key;
      const responses = [];
      const totalChunks = Math.ceil(file.size / this.blockSize);

      let requests = [];
      let chunkIndex = 1;
      while (chunkIndex <= totalChunks) {
        const start = (chunkIndex - 1) * this.blockSize;
        const end = Math.min(start + this.blockSize, file.size);
        const chunk = file.slice(start, end);

        requests.push(
          await this.uploadChunk(chunk, chunkIndex, uploadKey, uploadId, abortController, onProgress)
        );

        if (requests.length >= this.maxConcurrentUploads || chunkIndex === totalChunks) {
          responses.push(
            ...(await Promise.all(
              requests.map(async (r) => ({
                etag: (await r.request)?.headers.etag,
                partNumber: r.partNumber,
              }))
            ).catch((e) => {
              return e.name === "CanceledError" ? [] : Promise.reject(e);
            }))
          );
          requests = [];

          if (abortController?.signal.aborted) {
            await this.cancelMultipartUploadFn(uploadKey, uploadId);
            return;
          }
        }

        chunkIndex++;
      }

      await this.completeMultipartUploadFn(uploadKey, uploadId, responses);
    }
  }
}

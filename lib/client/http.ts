import axios, { Axios, AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { Buffer } from "buffer";
import { DEFAULT_TIMEOUT } from "../../config/config";
import HttpStatus from "http-status-codes";
import { ClientNotInitializedError } from "../exceptions";
import axiosRetry from "axios-retry";

const axiosRetryClient = axios.create();
const REQUEST_RETRY_TIMES = 10;

axiosRetry(axiosRetryClient, {
  retries: REQUEST_RETRY_TIMES,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error: AxiosError) => {
    return (
      (error.code !== "ECONNABORTED" &&
        (!error.response ||
          (error.response.status >= 500 && error.response.status <= 599) ||
          error.response.status === 0)) ||
      error.code === "ECONNREFUSED"
    );
  },
});

export type IServiceRequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface IServiceRequest extends AxiosRequestConfig {}

export interface IServerPaginatedResponse<T> {
  count: number;
  next: string;
  previous: string;
  results: T[];
}

export interface IServerError {
  code: string;
  detail: string;
  attr: string | null;
}

export interface IServerResponseError {
  type?: string;
  errors?: IServerError[];
}

export interface IServiceResponse<T> {
  data?: T;
  headers?: any;
  errors?: IServerError[];
  status: number;
  ok: boolean;
}

export default class HttpClient {
  private static _axiosClient: Axios | null = null;
  protected base_url: string;

  public static initialize(clientId: string, clientSecret: string, timeout: number = DEFAULT_TIMEOUT): void {
    if (HttpClient._axiosClient !== null) return;
    HttpClient._axiosClient = axios.create({
      timeout: timeout,
      headers: {
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
    });
  }

  public static _ok(response: any) {
    return response.status >= 200 && response.status < 300;
  }

  public static async request<T = {}>(request: IServiceRequest): Promise<IServiceResponse<T>> {
    if (HttpClient._axiosClient === null) {
      throw new ClientNotInitializedError("Beam client has not been initialized, yet");
    }

    try {
      const response = (await HttpClient._axiosClient.request<T>(request)) as AxiosResponse<T>;

      return {
        data: response.data,
        headers: response.headers,
        status: response.status,
        ok: HttpClient._ok(response),
      };
    } catch (_error) {
      const error = _error as AxiosError<IServerResponseError>;

      if (!axios.isAxiosError(error) || !error.response) {
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          ok: false,
        };
      }

      return {
        errors: error.response.data?.errors,
        status: error.response.status,
        ok: HttpClient._ok(error.response),
      };
    }
  }

  public static async UploadFileWithSignedUrl(
    url: string,
    data: any,
    controller?: AbortController,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ): Promise<IServiceResponse<any>> {
    return await axiosRetryClient.put(url, data, {
      ...(onProgress ? { onUploadProgress: onProgress } : {}),
      ...(controller ? { signal: controller.signal } : {}),
    });
  }
}

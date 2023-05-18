import HttpClient from "./client/http";
import Volume from "./volume";

interface ILoginParams {
  clientId: string;
  clientSecret: string;
  timeout?: number;
}

export default class BeamClient {
  public static login({ clientId, clientSecret, timeout }: ILoginParams) {
    HttpClient.initialize(clientId, clientSecret, timeout);
  }

  public static Volume(volumeName: string, appName?: string): Volume {
    return new Volume(volumeName, appName);
  }
}

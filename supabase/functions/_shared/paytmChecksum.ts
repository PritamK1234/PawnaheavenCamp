export class PaytmChecksum {
  private static iv = "@@@@&&&&####$$$$";

  static async encrypt(input: string, key: string): Promise<string> {
    const keyBuffer = new TextEncoder().encode(key);
    const ivBuffer = new TextEncoder().encode(this.iv);
    const dataBuffer = new TextEncoder().encode(input);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "AES-CBC", length: 256 },
      false,
      ["encrypt"]
    );

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-CBC", iv: ivBuffer },
      cryptoKey,
      dataBuffer
    );

    const base64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    return base64;
  }

  static async decrypt(encrypted: string, key: string): Promise<string> {
    const keyBuffer = new TextEncoder().encode(key);
    const ivBuffer = new TextEncoder().encode(this.iv);
    const encryptedBuffer = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "AES-CBC", length: 256 },
      false,
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv: ivBuffer },
      cryptoKey,
      encryptedBuffer
    );

    return new TextDecoder().decode(decrypted);
  }

  static async generateSignature(params: string, key: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyBuffer = encoder.encode(key);
    const dataBuffer = encoder.encode(params);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataBuffer);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  static async verifySignature(
    params: string,
    key: string,
    checksum: string
  ): Promise<boolean> {
    try {
      const paytmHash = await this.decrypt(checksum, key);
      const salt = paytmHash.substring(paytmHash.length - 4);
      const calculatedChecksum = await this.generateSignature(params + salt, key);
      return calculatedChecksum === paytmHash.substring(0, paytmHash.length - 4);
    } catch (error) {
      console.error("Checksum verification error:", error);
      return false;
    }
  }

  static async generateChecksum(
    params: Record<string, string>,
    key: string
  ): Promise<string> {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
          acc[key] = params[key];
        }
        return acc;
      }, {} as Record<string, string>);

    const paramsString = Object.keys(sortedParams)
      .map(k => `${k}=${sortedParams[k]}`)
      .join("&");

    const salt = this.generateRandomString(4);
    const signature = await this.generateSignature(paramsString + salt, key);
    const checksum = signature + salt;

    return await this.encrypt(checksum, key);
  }

  static async verifyChecksumByString(
    params: string,
    key: string,
    checksum: string
  ): Promise<boolean> {
    return await this.verifySignature(params, key, checksum);
  }

  static async verifyChecksumByObject(
    params: Record<string, string>,
    key: string,
    checksum: string
  ): Promise<boolean> {
    const paramsWithoutChecksum = { ...params };
    delete paramsWithoutChecksum.CHECKSUMHASH;

    const sortedParams = Object.keys(paramsWithoutChecksum)
      .sort()
      .reduce((acc, key) => {
        if (paramsWithoutChecksum[key] !== null && paramsWithoutChecksum[key] !== undefined && paramsWithoutChecksum[key] !== "") {
          acc[key] = paramsWithoutChecksum[key];
        }
        return acc;
      }, {} as Record<string, string>);

    const paramsString = Object.keys(sortedParams)
      .map(k => `${k}=${sortedParams[k]}`)
      .join("&");

    return await this.verifySignature(paramsString, key, checksum);
  }

  private static generateRandomString(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId: string;
}

export interface SecretCipher {
  encrypt(plaintext: string): EncryptedSecret | Promise<EncryptedSecret>;
  decrypt(secret: EncryptedSecret): string | Promise<string>;
}

/**
 * Local reference implementation only. Production callers must replace this
 * with a KMS/Vault-backed key encryption provider before handling user secrets.
 */
export class LocalEnvelopeCipher implements SecretCipher {
  constructor(private readonly keyEncryptionKey: Buffer, private readonly keyId = "local-dev") {
    if (keyEncryptionKey.length !== 32) throw new Error("Envelope KEK must be 32 bytes");
  }

  encrypt(plaintext: string): EncryptedSecret {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.keyEncryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return {
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      keyId: this.keyId,
    };
  }

  decrypt(secret: EncryptedSecret): string {
    const decipher = createDecipheriv("aes-256-gcm", this.keyEncryptionKey, Buffer.from(secret.iv, "base64"));
    decipher.setAuthTag(Buffer.from(secret.tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(secret.ciphertext, "base64")), decipher.final()]).toString("utf8");
  }
}

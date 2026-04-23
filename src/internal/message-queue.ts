// SPDX-License-Identifier: Apache-2.0

/**
 * Single-producer / single-consumer message queue. Mirrors
 * `bitbox-api-rs/pkg/webhid.js` MessageQueue: if a consumer is already
 * awaiting, `push` resolves it immediately; otherwise the message is buffered.
 * @internal
 */
export class MessageQueue {
  private readonly messages: Uint8Array[] = [];
  private readonly resolvers: Array<(m: Uint8Array) => void> = [];

  push(msg: Uint8Array): void {
    const next = this.resolvers.shift();
    if (next !== undefined) {
      next(msg);
      return;
    }
    this.messages.push(msg);
  }

  next(): Promise<Uint8Array> {
    const msg = this.messages.shift();
    if (msg !== undefined) {
      return Promise.resolve(msg);
    }
    return new Promise((resolve) => {
      this.resolvers.push(resolve);
    });
  }
}

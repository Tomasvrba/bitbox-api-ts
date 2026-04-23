// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { MessageQueue } from '../src/internal/message-queue.js';

describe('MessageQueue', () => {
  it('delivers FIFO when push precedes next', async () => {
    const q = new MessageQueue();
    q.push(new Uint8Array([1]));
    q.push(new Uint8Array([2]));
    expect(await q.next()).toEqual(new Uint8Array([1]));
    expect(await q.next()).toEqual(new Uint8Array([2]));
  });

  it('resolves a pending next() when push arrives', async () => {
    const q = new MessageQueue();
    const pending = q.next();
    q.push(new Uint8Array([42]));
    expect(await pending).toEqual(new Uint8Array([42]));
  });

  it('resolves multiple pending next() calls in FIFO order', async () => {
    const q = new MessageQueue();
    const a = q.next();
    const b = q.next();
    q.push(new Uint8Array([1]));
    q.push(new Uint8Array([2]));
    expect(await a).toEqual(new Uint8Array([1]));
    expect(await b).toEqual(new Uint8Array([2]));
  });
});

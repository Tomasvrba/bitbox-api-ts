// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { openSession } from '../src/internal/connect.js';
import type { HwwCommunication } from '../src/internal/hww.js';
import type { LowerTransport } from '../src/internal/read-write.js';

function makeLowerTransport(onTransportClose: () => void): LowerTransport {
  let closed = false;
  return {
    write(): void {},
    read(): Promise<Uint8Array> {
      return Promise.resolve(new Uint8Array());
    },
    close(): void {
      if (closed) {
        return;
      }
      closed = true;
      onTransportClose();
    },
  };
}

describe('connect bootstrap', () => {
  it('closes the lower transport and suppresses onCloseCb when startup fails', async () => {
    const transportClose = vi.fn();
    const onClose = vi.fn();
    let forwardedClose: (() => void) | undefined;

    const lower = makeLowerTransport(() => {
      transportClose();
      forwardedClose?.();
    });

    const startupError = new Error('startup failed');
    await expect(
      openSession(
        async (closeCb) => {
          forwardedClose = closeCb;
          return lower;
        },
        (transport) => transport,
        onClose,
        async () => { throw startupError; },
      ),
    ).rejects.toBe(startupError);

    expect(transportClose).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('forwards onCloseCb only after startup succeeds', async () => {
    const transportClose = vi.fn();
    const onClose = vi.fn();
    let forwardedClose: (() => void) | undefined;

    const lower = makeLowerTransport(() => {
      transportClose();
      forwardedClose?.();
    });

    const fakeHww = {
      info: {
        version: '9.24.0',
        product: 'bitbox02-nova-multi',
        unlocked: false,
        initialized: false,
      },
    } as HwwCommunication;

    const session = await openSession(
      async (closeCb) => {
        forwardedClose = closeCb;
        return lower;
      },
      (transport) => transport,
      onClose,
      async () => fakeHww,
    );

    expect(onClose).not.toHaveBeenCalled();
    session.close();
    expect(transportClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

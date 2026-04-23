// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { ethIdentifyCase } from '../src/index.js';

describe('ethIdentifyCase', () => {
  it('returns upper for an all-uppercase string (0X prefix)', () => {
    expect(ethIdentifyCase('0XF39FD6E51AAD88F6F4CE6AB8827279CFFFB92266')).toBe('upper');
  });

  it('returns lower for an all-lowercase string (0x prefix)', () => {
    expect(ethIdentifyCase('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266')).toBe('lower');
  });

  it('returns mixed for an EIP-55 checksummed address', () => {
    expect(ethIdentifyCase('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')).toBe('mixed');
  });
});

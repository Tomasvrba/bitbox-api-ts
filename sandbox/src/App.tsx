// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import * as bitbox from 'bitbox-api-ts';
import './App.css';

import { Ethereum } from './Ethereum';
import { General } from './General';
import { ErrorNotification } from './ErrorNotification';
import { Accordion } from './Accordion';

type ConnectMethod = 'webHID' | 'bridge' | 'auto';

function hasWebHID(): boolean {
  return (globalThis as { navigator?: { hid?: unknown } }).navigator?.hid !== undefined;
}

function App() {
  const [connected, setConnected] = useState<bitbox.BitBox>();
  const [pairing, setPairing] = useState<bitbox.PairingBitBox>();
  const [bb02, setBB02] = useState<bitbox.PairedBitBox>();
  const [pairingCode, setPairingCode] = useState<string>();
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<bitbox.Error>();

  const onClose = () => {
    setConnected(undefined);
    setPairing(undefined);
    setBB02(undefined);
    setPairingCode(undefined);
    setRunning(false);
    setErr(undefined);
  };

  const connect = async (method: ConnectMethod) => {
    setRunning(true);
    setErr(undefined);
    try {
      let device: bitbox.BitBox;
      switch (method) {
        case 'webHID':
          device = await bitbox.bitbox02ConnectWebHID(onClose);
          break;
        case 'bridge':
          device = await bitbox.bitbox02ConnectBridge(onClose);
          break;
        case 'auto':
          device = await bitbox.bitbox02ConnectAuto(onClose);
          break;
      }
      setConnected(device);
      setPairing(undefined);
      setBB02(undefined);
      setPairingCode(undefined);
    } catch (e) {
      setErr(bitbox.ensureError(e));
    } finally {
      setRunning(false);
    }
  };

  const unlockAndPair = async () => {
    if (connected === undefined) {
      return;
    }
    setRunning(true);
    setErr(undefined);
    try {
      const nextPairing = await connected.unlockAndPair();
      setPairing(nextPairing);
      setPairingCode(nextPairing.getPairingCode());
    } catch (e) {
      setErr(bitbox.ensureError(e));
    } finally {
      setRunning(false);
    }
  };

  const waitConfirm = async () => {
    if (pairing === undefined) {
      return;
    }
    setRunning(true);
    setErr(undefined);
    try {
      const paired = await pairing.waitConfirm();
      setConnected(undefined);
      setPairing(undefined);
      setBB02(paired);
      setPairingCode(undefined);
    } catch (e) {
      setErr(bitbox.ensureError(e));
      setPairingCode(pairing.getPairingCode());
    } finally {
      setRunning(false);
    }
  };

  if (pairing !== undefined) {
    return (
      <div className="container">
        <h2>Pairing</h2>
        {pairingCode !== undefined ? (
          <>
            <p>Verify this pairing code on the BitBox02, then continue.</p>
            <pre>{pairingCode}</pre>
          </>
        ) : (
          <p>No pairing code is required for this session. Continue to finish pairing.</p>
        )}
        <button className="menuButton" disabled={running} onClick={() => { void waitConfirm(); }}>
          {running ? 'Waiting for confirmation...' : 'Wait for confirmation'}
        </button>
        {err !== undefined && (
          <ErrorNotification
            message={err.message}
            code={err.code}
            onClose={() => setErr(undefined)}
          />
        )}
      </div>
    );
  }

  if (bb02 !== undefined) {
    return (
      <div className="contentContainer">
        <h2 style={{ textAlign: 'left' }}>BitBox02 sandbox</h2>
        <div style={{ textAlign: 'left' }}>
          <p>Connection established.</p>
          &nbsp;
          <button onClick={() => bb02.close()}>Close connection</button>
        </div>
        <Accordion opened title="General">
          <General />
        </Accordion>
        {bb02.ethSupported() && (
          <Accordion title="Ethereum">
            <Ethereum />
          </Accordion>
        )}
      </div>
    );
  }

  if (connected !== undefined) {
    return (
      <div className="container">
        <h2>Connection established</h2>
        <p>Continue to the device pairing flow.</p>
        <button className="menuButton" disabled={running} onClick={() => { void unlockAndPair(); }}>
          {running ? 'Starting pairing...' : 'Start pairing'}
        </button>
        {err !== undefined && (
          <ErrorNotification
            message={err.message}
            code={err.code}
            onClose={() => setErr(undefined)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="container">
      <h1>BitBox sandbox</h1>
      {hasWebHID() && (
        <>
          <button className="menuButton" disabled={running} onClick={() => { void connect('webHID'); }}>
            Connect using WebHID
          </button>
          <br />
        </>
      )}
      <button className="menuButton" disabled={running} onClick={() => { void connect('bridge'); }}>
        Connect using BitBoxBridge
      </button>
      <br />
      <button className="menuButton" disabled={running} onClick={() => { void connect('auto'); }}>
        Choose automatically
      </button>
      {err !== undefined && (
        <ErrorNotification
          message={err.message}
          code={err.code}
          onClose={() => setErr(undefined)}
        />
      )}
      <p className="portNote">
        This sandbox is backed by the in-tree{' '}
        <a href="https://github.com/BitBoxSwiss/bitbox-api-ts">bitbox-api-ts</a>{' '}
        package. It validates the current browser integration and currently
        wired flows; it is not intended to track full API parity.
      </p>
    </div>
  );
}

export default App;

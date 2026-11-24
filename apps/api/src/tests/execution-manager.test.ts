import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  spawnAsyncWithTreeTermination,
  getSanitizedEnv,
  terminateWindowsTree,
  terminatePosixGroup,
  terminateProcessTree,
  cleanupAllActiveSubprocesses,
  registerProcessShutdownHandler,
  resetProcessShutdownHandlerForTests,
  executeShutdown,
  getActiveSubprocessCountForTests,
  getUtf8Boundary,
  processManagerInternal,
  parseProcessTableCsv,
  checkWindowsDescendants,
  parseDmtfDateToEpochMs,
} from '../services/coding/process-manager';
import * as processManagerModule from '../services/coding/process-manager';
import { executeCppSubprocess } from '../services/coding/coding-compiled.service';
import child_process from 'child_process';
import { EventEmitter } from 'events';

describe('Phase 9E.1C — Execution Manager & Process Lifecycle Hardening', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    resetProcessShutdownHandlerForTests();
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    resetProcessShutdownHandlerForTests();
    vi.restoreAllMocks();
    // Ensure all spawned subprocesses and timers are drained even if assertions fail
    await cleanupAllActiveSubprocesses().catch(() => {});
  });

  describe('1. Environment Sanitization & Restoration', () => {
    it('strips sensitive environment variables from subprocess environment', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@secret-neon-host/db';
      process.env.JWT_SECRET = 'super-secret-jwt-key';
      process.env.REDIS_URL = 'redis://secret-redis-host:6379';

      const sanitized = getSanitizedEnv();

      expect(sanitized.DATABASE_URL).toBeUndefined();
      expect(sanitized.JWT_SECRET).toBeUndefined();
      expect(sanitized.REDIS_URL).toBeUndefined();
      expect(sanitized.PATH).toBeDefined();
    });

    it('ensures environment variables are cleanly restored in afterEach', () => {
      expect(process.env.DATABASE_URL).toBe(originalEnv.DATABASE_URL);
      expect(process.env.JWT_SECRET).toBe(originalEnv.JWT_SECRET);
    });
  });

  describe('2. Strict Validation of Timeouts and Buffer Limits', () => {
    it('rejects invalid timeout values: negative, NaN, Infinity, -Infinity, and non-number', async () => {
      await expect(
        spawnAsyncWithTreeTermination('node', ['-v'], { timeoutMs: -1 })
      ).rejects.toThrow(TypeError);

      await expect(
        spawnAsyncWithTreeTermination('node', ['-v'], { timeoutMs: NaN })
      ).rejects.toThrow(TypeError);

      await expect(
        spawnAsyncWithTreeTermination('node', ['-v'], { timeoutMs: Infinity })
      ).rejects.toThrow(TypeError);

      await expect(
        spawnAsyncWithTreeTermination('node', ['-v'], { timeoutMs: -Infinity })
      ).rejects.toThrow(TypeError);

      await expect(
        spawnAsyncWithTreeTermination('node', ['-v'], { timeoutMs: '100' as any })
      ).rejects.toThrow(TypeError);
    });

    it('rejects invalid maxBufferBytes: negative, fractional, NaN, Infinity, and non-number', async () => {
      await expect(
        spawnAsyncWithTreeTermination('node', ['-v'], { timeoutMs: 100, maxBufferBytes: -1 })
      ).rejects.toThrow(TypeError);

      await expect(
        spawnAsyncWithTreeTermination('node', ['-v'], { timeoutMs: 100, maxBufferBytes: 10.5 })
      ).rejects.toThrow(TypeError);

      await expect(
        spawnAsyncWithTreeTermination('node', ['-v'], { timeoutMs: 100, maxBufferBytes: NaN })
      ).rejects.toThrow(TypeError);

      await expect(
        spawnAsyncWithTreeTermination('node', ['-v'], { timeoutMs: 100, maxBufferBytes: Infinity })
      ).rejects.toThrow(TypeError);

      await expect(
        spawnAsyncWithTreeTermination('node', ['-v'], { timeoutMs: 100, maxBufferBytes: '512' as any })
      ).rejects.toThrow(TypeError);
    });

    it('immediately aborts and reports timed_out when budget is exactly 0', async () => {
      const result = await spawnAsyncWithTreeTermination('node', ['-e', 'console.log("hello")'], {
        timeoutMs: 0,
      });

      expect(result.timedOut).toBe(true);
      expect(result.error?.message).toContain('budget exhausted');
    });

    it('resolves cleanly with an error result when spawned child PID is undefined without hanging', async () => {
      const spawnSpy = vi.spyOn(child_process, 'spawn').mockImplementation((() => {
        const emitter = new EventEmitter();
        (emitter as any).pid = undefined;
        (emitter as any).exitCode = null;
        return emitter as any;
      }) as any);

      const result = await spawnAsyncWithTreeTermination('mock-cmd', [], { timeoutMs: 1000 });
      spawnSpy.mockRestore();

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('PID is undefined');
      expect(result.timedOut).toBe(false);
    });
  });

  describe('3. Descendant Process Cleanup & Unified Termination', () => {
    it('1. Parent spawns a descendant; entire process tree is terminated when timeout occurs', async () => {
      const parentScript = `
        const { spawn } = require('child_process');
        const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
          stdio: 'ignore',
        });
        console.log('DESCENDANT_PID:' + child.pid);
        setInterval(() => {}, 1000);
      `;

      const result = await spawnAsyncWithTreeTermination(
        process.execPath,
        ['-e', parentScript],
        { timeoutMs: 300 }
      );

      expect(result.timedOut).toBe(true);
      const match = result.stdout.match(/DESCENDANT_PID:(\d+)/);
      expect(match).not.toBeNull();
      const descendantPid = parseInt(match![1], 10);

      // Verify descendant PID is confirmed dead in OS process table
      let isDescendantDead = false;
      for (let i = 0; i < 20; i++) {
        try {
          process.kill(descendantPid, 0);
          await new Promise((r) => setTimeout(r, 50));
        } catch (err: any) {
          if (err?.code === 'ESRCH') {
            isDescendantDead = true;
            break;
          }
        }
      }
      expect(isDescendantDead).toBe(true);
    }, 10000);

    it('3. Timeout, natural exit, and shutdown share one idempotent termination sequence', async () => {
      const spy = vi.spyOn(processManagerModule, 'terminateProcessTree');

      // Process that exits quickly right around timeout
      await spawnAsyncWithTreeTermination(
        process.execPath,
        ['-e', 'setTimeout(() => { process.exit(0); }, 30)'],
        { timeoutMs: 35 }
      );

      // Verify that terminateProcessTree was invoked at most once
      expect(spy.mock.calls.length).toBeLessThanOrEqual(1);
    });
  });

  describe('4. POSIX Termination Confirmation & Escalation', () => {
    it('2. Escalates to SIGKILL when SIGTERM fails and confirms termination', async () => {
      const killCalls: Array<{ target: number; sig?: string | number }> = [];
      let isDead = false;

      const spy = vi.spyOn(process, 'kill').mockImplementation(((target: number, sig?: string | number) => {
        killCalls.push({ target, sig });
        if (sig === 0) {
          if (isDead) {
            const err: any = new Error('No such process');
            err.code = 'ESRCH';
            throw err;
          }
          return true; // Still alive
        }
        if (sig === 'SIGKILL') {
          isDead = true; // Dies after SIGKILL
        }
        return true;
      }) as any);

      const res = await terminatePosixGroup(12345, 40);

      spy.mockRestore();

      expect(killCalls.some((c) => c.target === -12345 && c.sig === 'SIGTERM')).toBe(true);
      expect(killCalls.some((c) => c.target === -12345 && c.sig === 'SIGKILL')).toBe(true);
      expect(res.confirmed).toBe(true);
      expect(res.signal).toBe('SIGKILL');
    });

    it('distinguishes EPERM from ESRCH: does not report confirmed if probe fails with EPERM', async () => {
      const spy = vi.spyOn(process, 'kill').mockImplementation(((target: number, sig?: string | number) => {
        if (sig === 0) {
          const err: any = new Error('Operation not permitted');
          err.code = 'EPERM';
          throw err;
        }
        return true;
      }) as any);

      const res = await terminatePosixGroup(23456, 40);
      spy.mockRestore();

      // Because probe threw EPERM rather than ESRCH, termination could not be confirmed dead
      expect(res.confirmed).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('returns alreadyExited: true immediately when initial probe throws ESRCH', async () => {
      const spy = vi.spyOn(process, 'kill').mockImplementation(((target: number, sig?: string | number) => {
        if (sig === 0) {
          const err: any = new Error('No such process');
          err.code = 'ESRCH';
          throw err;
        }
        return true;
      }) as any);

      const res = await terminatePosixGroup(34567, 300);
      spy.mockRestore();

      expect(res.confirmed).toBe(true);
      expect(res.alreadyExited).toBe(true);
      expect(res.treeConfirmed).toBe(true);
    });
  });

  describe('5. Windows Termination Observability & Mocked Fallback', () => {
    it('4. Distinguishes confirmed tree termination from direct child fallback kill', async () => {
      // Mock taskkill failure by mocking child_process.spawn to emit error
      const mockFallbackProc = { kill: vi.fn() } as any;

      // Mock process.kill(pid, 0) so it reports process as alive instead of ESRCH
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(((target: number, sig?: string | number) => {
        if (sig === 0) return true; // Report PID is alive
        return true;
      }) as any);

      const spawnSpy = vi.spyOn(child_process, 'spawn').mockImplementation(((cmd: string) => {
        if (cmd === 'taskkill') {
          const emitter = new EventEmitter();
          process.nextTick(() => {
            emitter.emit('error', new Error('taskkill not found'));
          });
          return emitter as any;
        }
        return new EventEmitter() as any;
      }) as any);

      const res = await terminateWindowsTree(77777, mockFallbackProc);
      spawnSpy.mockRestore();
      killSpy.mockRestore();

      // Direct child fallback was invoked
      expect(mockFallbackProc.kill).toHaveBeenCalled();
      expect(res.fallbackUsed).toBe(true);
      // Explicitly does NOT report treeConfirmed when only direct child was targeted
      expect(res.treeConfirmed).toBe(false);
    });

    it('reports treeConfirmed: true when taskkill closes with exit code 0', async () => {
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(((target: number, sig?: string | number) => {
        if (sig === 0) return true; // Report PID is alive
        return true;
      }) as any);

      const spawnSpy = vi.spyOn(child_process, 'spawn').mockImplementation(((cmd: string) => {
        if (cmd === 'taskkill') {
          const emitter = new EventEmitter();
          process.nextTick(() => {
            emitter.emit('close', 0);
          });
          return emitter as any;
        }
        return new EventEmitter() as any;
      }) as any);

      const res = await terminateWindowsTree(88888);
      spawnSpy.mockRestore();
      killSpy.mockRestore();

      expect(res.confirmed).toBe(true);
      expect(res.treeConfirmed).toBe(true);
      expect(res.fallbackUsed).toBe(false);
    });

    it('reports alreadyExited: true when taskkill closes with exit code 128', async () => {
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(((target: number, sig?: string | number) => {
        if (sig === 0) return true; // Report PID is alive
        return true;
      }) as any);

      const spawnSpy = vi.spyOn(child_process, 'spawn').mockImplementation(((cmd: string) => {
        if (cmd === 'taskkill') {
          const emitter = new EventEmitter();
          process.nextTick(() => {
            emitter.emit('close', 128);
          });
          return emitter as any;
        }
        return new EventEmitter() as any;
      }) as any);

      const res = await terminateWindowsTree(99999);
      spawnSpy.mockRestore();
      killSpy.mockRestore();

      expect(res.confirmed).toBe(true);
      expect(res.alreadyExited).toBe(true);
      expect(res.treeConfirmed).toBe(false);
    });
  });

  describe('6. UTF-8 Output Truncation & Chunk Splitting', () => {
    it('5. Handles multi-byte UTF-8 split across separate chunks without emitting U+FFFD', () => {
      // 4-byte UTF-8 character '🚀': [0xF0, 0x9F, 0x9A, 0x80]
      const chunk1 = Buffer.from([0xF0, 0x9F]); // partial character (2 bytes)
      const chunk2 = Buffer.from([0x9A, 0x80, 0x41]); // remaining 2 bytes + ASCII 'A'
      const combined = Buffer.concat([chunk1, chunk2]);

      // If cut at 3 bytes (incomplete multi-byte character):
      const cut3 = getUtf8Boundary(combined, 3);
      expect(cut3).toBe(0); // Cuts off incomplete emoji entirely
      const str3 = combined.subarray(0, cut3).toString('utf-8');
      expect(str3).toBe('');
      expect(str3).not.toContain('\uFFFD');

      // If cut at 4 bytes (complete emoji):
      const cut4 = getUtf8Boundary(combined, 4);
      expect(cut4).toBe(4);
      const str4 = combined.subarray(0, cut4).toString('utf-8');
      expect(str4).toBe('🚀');
      expect(str4).not.toContain('\uFFFD');
    });

    it('enforces stdout and stderr limits independently with safe chunk accumulation', async () => {
      const script = `
        process.stdout.write(Buffer.from([0xF0, 0x9F]));
        process.stdout.write(Buffer.from([0x9A, 0x80]));
        process.stdout.write('A'.repeat(500));
        process.stderr.write('B'.repeat(500));
      `;
      const maxBytes = 200;
      const result = await spawnAsyncWithTreeTermination(
        process.execPath,
        ['-e', script],
        { timeoutMs: 3000, maxBufferBytes: maxBytes }
      );

      expect(Buffer.byteLength(result.stdout, 'utf-8')).toBeLessThanOrEqual(maxBytes);
      expect(Buffer.byteLength(result.stderr, 'utf-8')).toBeLessThanOrEqual(maxBytes);
      expect(result.stdout).not.toContain('\uFFFD');
      expect(result.stderr).not.toContain('\uFFFD');
      expect(result.outputTruncated).toBe(true);
    });

    it('truncation exactly in the middle of a multi-byte character never contains U+FFFD', async () => {
      // 4-byte emoji '🔥' (0xF0 0x9F 0x94 0xA5)
      // Total bytes: 'A' (1) + '🔥' (4) + 'B' (1) = 6 bytes.
      // MaxBufferBytes = 3 cuts right in the middle of '🔥' (1 byte of 'A' + 2 bytes of '🔥').
      const script = `
        process.stdout.write('A' + '🔥' + 'B');
      `;
      const result = await spawnAsyncWithTreeTermination(
        process.execPath,
        ['-e', script],
        { timeoutMs: 3000, maxBufferBytes: 3 }
      );

      expect(result.stdout).toBe('A');
      expect(result.stdout).not.toContain('\uFFFD');
      expect(Buffer.byteLength(result.stdout, 'utf-8')).toBeLessThanOrEqual(3);
    });

    it('exact-limit buffers correctly truncate incomplete trailing 2-, 3-, and 4-byte UTF-8 sequences', () => {
      // 2-byte incomplete: 'A' (1 byte) + first byte of 'ñ' (0xC3) -> length 2, limit 2
      const buf2 = Buffer.from([0x41, 0xC3]);
      expect(getUtf8Boundary(buf2, 2)).toBe(1);
      expect(buf2.subarray(0, 1).toString('utf-8')).toBe('A');

      // 3-byte incomplete: 'A' (1 byte) + first 2 bytes of '€' (0xE2, 0x82) -> length 3, limit 3
      const buf3 = Buffer.from([0x41, 0xE2, 0x82]);
      expect(getUtf8Boundary(buf3, 3)).toBe(1);
      expect(buf3.subarray(0, 1).toString('utf-8')).toBe('A');

      // 4-byte incomplete: 'A' (1 byte) + first 3 bytes of '🚀' (0xF0, 0x9F, 0x9A) -> length 4, limit 4
      const buf4 = Buffer.from([0x41, 0xF0, 0x9F, 0x9A]);
      expect(getUtf8Boundary(buf4, 4)).toBe(1);
      expect(buf4.subarray(0, 1).toString('utf-8')).toBe('A');
    });

    it('exact-limit multi-chunk output never ends with an incomplete sequence or U+FFFD', async () => {
      // Chunk 1 writes 6 ASCII bytes 'Hello '
      // Chunk 2 writes 2 bytes [0xE2, 0x82] (partial 3-byte Euro sign)
      // Total bytes accumulated = 8 bytes. maxBufferBytes = 8.
      const script = `
        process.stdout.write('Hello ');
        process.stdout.write(Buffer.from([0xE2, 0x82]));
      `;
      const result = await spawnAsyncWithTreeTermination(
        process.execPath,
        ['-e', script],
        { timeoutMs: 3000, maxBufferBytes: 8 }
      );

      expect(result.stdout).toBe('Hello ');
      expect(result.stdout).not.toContain('\uFFFD');
      expect(Buffer.byteLength(result.stdout, 'utf-8')).toBe(6);
    });
  });

  describe('7. Cleanup Registry Race Hardening', () => {
    it('6. Does not drop a process registered while cleanup is in progress', async () => {
      let resolveFirstTerm: (() => void) | null = null;
      let firstTerminated = false;
      let secondTerminated = false;

      // Register first process with deferred termination to simulate an in-flight block
      const proc1 = spawnAsyncWithTreeTermination(
        process.execPath,
        ['-e', 'setInterval(() => {}, 1000)'],
        { timeoutMs: 10000 }
      );

      // Wait a tick for proc1 to register in activeSubprocesses
      await new Promise((r) => setTimeout(r, 60));

      // Trigger first cleanup
      const cleanupP = cleanupAllActiveSubprocesses();

      // Register a second process WHILE cleanup is in flight
      const proc2 = spawnAsyncWithTreeTermination(
        process.execPath,
        ['-e', 'setInterval(() => {}, 1000)'],
        { timeoutMs: 10000 }
      );

      await cleanupP;

      // Both processes must be terminated
      const res1 = await proc1;
      const res2 = await proc2;

      expect(res1.exitCode).not.toBe(0);
      expect(res2.exitCode).not.toBe(0);
    });

    it('concurrent cleanup calls share the exact same in-flight promise', async () => {
      const p1 = cleanupAllActiveSubprocesses();
      const p2 = cleanupAllActiveSubprocesses();
      expect(p1).toBe(p2);
      await p1;
    });

    it('does not delete an unconfirmed entry and throws cleanup unconfirmed error', async () => {
      // Mock termination failure
      const termSpy = vi.spyOn(processManagerInternal, 'terminateProcessTree').mockResolvedValue({
        confirmed: false,
        alreadyExited: false,
        fallbackUsed: false,
        treeConfirmed: false,
        error: new Error('Cannot signal process'),
      });

      const proc = spawnAsyncWithTreeTermination(
        process.execPath,
        ['-e', 'setInterval(() => {}, 1000)'],
        { timeoutMs: 1000 }
      );
      await new Promise((r) => setTimeout(r, 60));

      // Cleanup must reject because termination could not be confirmed
      await expect(cleanupAllActiveSubprocesses()).rejects.toThrow(
        /Subprocess cleanup unconfirmed/
      );

      termSpy.mockRestore();
      // Clean up for real
      await cleanupAllActiveSubprocesses();
      await proc.catch(() => {});
    });

    it('specifically requires treeConfirmed: true to delete registry entry (confirmed: true, treeConfirmed: false retains entry and fails)', async () => {
      // Direct child fallback kill reports confirmed: true (child dead), but treeConfirmed: false
      const termSpy = vi.spyOn(processManagerInternal, 'terminateProcessTree').mockResolvedValue({
        confirmed: true,
        alreadyExited: false,
        fallbackUsed: true,
        treeConfirmed: false,
      });

      const proc = spawnAsyncWithTreeTermination(
        process.execPath,
        ['-e', 'setInterval(() => {}, 1000)'],
        { timeoutMs: 1000 }
      );
      await new Promise((r) => setTimeout(r, 60));

      expect(getActiveSubprocessCountForTests()).toBeGreaterThan(0);

      // Cleanup must reject because tree confirmation was not achieved
      await expect(cleanupAllActiveSubprocesses()).rejects.toThrow(
        /Subprocess cleanup unconfirmed/
      );

      // Unconfirmed entry MUST NOT have been deleted from active registry
      expect(getActiveSubprocessCountForTests()).toBeGreaterThan(0);

      termSpy.mockRestore();
      await cleanupAllActiveSubprocesses();
      await proc.catch(() => {});
    });
  });

  describe('8. Shutdown Handler & Callback Errors', () => {
    it('surfaces callback error while still executing subprocess cleanup', async () => {
      // Spawn an active process registered in activeSubprocesses
      const proc = spawnAsyncWithTreeTermination(
        process.execPath,
        ['-e', 'setInterval(() => {}, 1000)'],
        { timeoutMs: 1000 }
      );
      await new Promise((r) => setTimeout(r, 60));

      const failingCallback = vi.fn().mockRejectedValue(new Error('Callback boom'));

      registerProcessShutdownHandler(failingCallback);

      // Trigger shutdown signal
      process.emit('SIGTERM' as any);
      await new Promise((r) => setTimeout(r, 80));

      expect(failingCallback).toHaveBeenCalled();

      // Active subprocess must be terminated by shutdown cleanup despite callback error
      const res = await proc;
      expect(res.exitCode).not.toBe(0);
    });

    it('reset removes listeners without clearing live registry entries', async () => {
      const proc = spawnAsyncWithTreeTermination(
        process.execPath,
        ['-e', 'setInterval(() => {}, 1000)'],
        { timeoutMs: 1000 }
      );
      await new Promise((r) => setTimeout(r, 60));

      const initialCount = getActiveSubprocessCountForTests();
      expect(initialCount).toBeGreaterThan(0);

      const initialSigtermListeners = process.listenerCount('SIGTERM');
      const initialSigintListeners = process.listenerCount('SIGINT');

      registerProcessShutdownHandler(async () => {});

      expect(process.listenerCount('SIGTERM')).toBe(initialSigtermListeners + 1);
      expect(process.listenerCount('SIGINT')).toBe(initialSigintListeners + 1);

      // Reset test handler
      resetProcessShutdownHandlerForTests();

      // Listeners are removed
      expect(process.listenerCount('SIGTERM')).toBe(initialSigtermListeners);
      expect(process.listenerCount('SIGINT')).toBe(initialSigintListeners);

      // Live subprocess entries in registry MUST NOT be cleared
      expect(getActiveSubprocessCountForTests()).toBe(initialCount);

      await cleanupAllActiveSubprocesses();
      await proc.catch(() => {});
    });

    it('shares the exact same in-flight shutdown promise and makes errors observable', async () => {
      const errCallback = vi.fn().mockRejectedValue(new Error('Worker close timeout'));
      registerProcessShutdownHandler(errCallback);

      const p1 = executeShutdown('SIGTERM');
      const p2 = executeShutdown('SIGINT');

      // Concurrent calls share the exact in-flight promise
      expect(p1).toBe(p2);

      // Rejection with descriptive aggregate error is observable
      await expect(p1).rejects.toThrow(/Worker close timeout/);
      expect(errCallback).toHaveBeenCalledTimes(1); // Not called twice concurrently
    });
  });

  describe('9. C++ Execution Budget & Timeout Fixture', () => {
    it('7. Benign C++ fixture compiles and executes successfully with expected result', async () => {
      // Mock spawnAsyncWithTreeTermination specifically for executeCppSubprocess test
      const spawnSpy = vi.spyOn(processManagerModule, 'spawnAsyncWithTreeTermination').mockImplementation((async (cmd: string) => {
        if (cmd === 'g++') {
          return { stdout: '', stderr: '', exitCode: 0, timedOut: false };
        }
        // Simulated compiled binary execution
        return { stdout: '{"result":"Passed"}', stderr: '', exitCode: 0, timedOut: false };
      }) as any);

      const code = `int solution() { return 42; }`;
      const result = await executeCppSubprocess(code, 'solution', [], 3000);

      spawnSpy.mockRestore();

      expect(result.actual).toBe('Passed');
      expect(result.timedOut).toBeUndefined();
    });

    it('7. Infinite loop C++ fixture times out and terminates without allowing CompileError', async () => {
      const spawnSpy = vi.spyOn(processManagerModule, 'spawnAsyncWithTreeTermination').mockImplementation((async (cmd: string) => {
        if (cmd === 'g++') {
          // Compilation succeeds
          return { stdout: '', stderr: '', exitCode: 0, timedOut: false };
        }
        // Binary execution times out
        return { stdout: '', stderr: '', exitCode: null, timedOut: true };
      }) as any);

      const code = `void solution() { while(true) {} }`;
      const result = await executeCppSubprocess(code, 'solution', [], 800);

      spawnSpy.mockRestore();

      expect(result.actual).toBeNull();
      expect(result.timedOut).toBe(true);
      expect(result.error).toBe('C++ execution timed out');
      // CompileError must NOT be an acceptable result for a test proving timeout behavior
      expect(result.error).not.toContain('CompileError');
    });

    it('immediately aborts C++ execution when budget is <= 0', async () => {
      const code = `void solution() {}`;
      const result = await executeCppSubprocess(code, 'solution', [], 0);

      expect(result.actual).toBeNull();
      expect(result.timedOut).toBe(true);
      expect(result.error).toContain('budget exhausted');
    });
  });

  describe('10. Process Cleanup & Tree Confirmation Invariance', () => {
    it('1. when a main process exits but its descendant remains alive and termination is unconfirmed, its registry entry remains', async () => {
      // Mock unconfirmed tree termination to simulate surviving descendant process tree
      const termSpy = vi.spyOn(processManagerInternal, 'terminateProcessTree').mockResolvedValue({
        confirmed: true,
        alreadyExited: true,
        fallbackUsed: false,
        treeConfirmed: false,
      });

      const parentScript = [
        'const { spawn } = require("child_process");',
        'const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {',
        '  detached: true,',
        '  stdio: "ignore",',
        '});',
        'console.log("DESCENDANT_PID:" + child.pid);',
        'child.unref();',
        'process.exit(0);',
      ].join('\n');

      let descendantPid: number | null = null;
      try {
        const result = await spawnAsyncWithTreeTermination(
          process.execPath,
          ['-e', parentScript],
          { timeoutMs: 5000 }
        );
        expect(result.exitCode).toBe(0);

        const match = result.stdout.match(/DESCENDANT_PID:(\d+)/);
        expect(match).not.toBeNull();
        descendantPid = parseInt(match![1], 10);

        // Verify descendant is confirmed alive at this checkpoint
        let isDescendantAlive = false;
        try {
          process.kill(descendantPid, 0);
          isDescendantAlive = true;
        } catch (e: any) {
          isDescendantAlive = e?.code !== 'ESRCH';
        }
        expect(isDescendantAlive).toBe(true);

        // Main process exited and closed, but tree termination was unconfirmed:
        // Registry entry MUST remain in activeSubprocesses
        expect(getActiveSubprocessCountForTests()).toBeGreaterThan(0);

        termSpy.mockRestore();

        // Later cleanup occurs: when tree cleanup succeeds, registry entry is removed
        const cleanSpy = vi.spyOn(processManagerInternal, 'terminateProcessTree').mockResolvedValue({
          confirmed: true,
          alreadyExited: true,
          fallbackUsed: false,
          treeConfirmed: true,
        });

        await cleanupAllActiveSubprocesses();
        expect(getActiveSubprocessCountForTests()).toBe(0);
        cleanSpy.mockRestore();
      } finally {
        // Ensure test fixture descendant is ALWAYS cleaned up even if assertions fail
        if (descendantPid) {
          try {
            if (process.platform === 'win32') {
              child_process.spawn('taskkill', ['/F', '/T', '/PID', descendantPid.toString()], { stdio: 'ignore' });
            } else {
              process.kill(descendantPid, 'SIGKILL');
            }
          } catch {}
        }
      }
    });

    it('2. a later successful tree cleanup removes that entry', async () => {
      let isTreeConfirmed = false;
      const termSpy = vi.spyOn(processManagerInternal, 'terminateProcessTree').mockImplementation(async () => {
        return {
          confirmed: true,
          alreadyExited: true,
          fallbackUsed: false,
          treeConfirmed: isTreeConfirmed,
        };
      });

      // Spawn process that exits with unconfirmed tree
      await spawnAsyncWithTreeTermination(
        process.execPath,
        ['-e', 'process.exit(0)'],
        { timeoutMs: 5000 }
      );
      expect(getActiveSubprocessCountForTests()).toBeGreaterThan(0);

      // Now later successful tree cleanup occurs
      isTreeConfirmed = true;
      await cleanupAllActiveSubprocesses();

      // Successfully confirmed cleanup must remove the entry
      expect(getActiveSubprocessCountForTests()).toBe(0);

      termSpy.mockRestore();
    });

    it('3. a confirmed tree termination does not leave a stale registry entry', async () => {
      const termSpy = vi.spyOn(processManagerInternal, 'terminateProcessTree').mockResolvedValue({
        confirmed: true,
        alreadyExited: false,
        fallbackUsed: false,
        treeConfirmed: true,
      });

      const proc = spawnAsyncWithTreeTermination(
        process.execPath,
        ['-e', 'setInterval(() => {}, 1000)'],
        { timeoutMs: 1000 }
      );
      await new Promise((r) => setTimeout(r, 60));

      expect(getActiveSubprocessCountForTests()).toBeGreaterThan(0);

      // Trigger cleanup which confirms tree termination
      await cleanupAllActiveSubprocesses();

      // Confirmed tree termination must NOT leave a stale registry entry
      expect(getActiveSubprocessCountForTests()).toBe(0);

      termSpy.mockRestore();
      await proc.catch(() => {});
    });

    it('4. parent exits while real descendant is alive, and later cleanup pass actually terminates that descendant (ESRCH)', async () => {
      // In this test, the parent process intentionally spawns a detached descendant and exits immediately.
      // During immediate parent exit, tree termination status is simulated as temporarily unconfirmed (established: false).
      // The unconfirmed exit retains the registry entry and leaves the descendant alive.
      // When cleanupAllActiveSubprocesses() runs without mocking, it actively finds the surviving descendant,
      // terminates it with taskkill, verifies ESRCH, and cleans up the registry entry.
      let initialExit = true;
      const origCheck = processManagerInternal.checkWindowsDescendants;
      const checkSpy = vi.spyOn(processManagerInternal, 'checkWindowsDescendants').mockImplementation(async (pid, spawnTime) => {
        if (initialExit) {
          return {
            established: false,
            hasDescendants: false,
            descendantPids: [],
            ambiguous: true,
          };
        }
        return origCheck(pid, spawnTime);
      });

      const parentScript = [
        'const { spawn } = require("child_process");',
        'const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {',
        '  detached: true,',
        '  stdio: "ignore",',
        '});',
        'console.log("DESCENDANT_PID:" + child.pid);',
        'child.unref();',
        'process.exit(0);',
      ].join('\n');

      let descendantPid: number | null = null;
      try {
        const result = await spawnAsyncWithTreeTermination(
          process.execPath,
          ['-e', parentScript],
          { timeoutMs: 5000 }
        );

        // Initial exit finished: restore real descendant checking so the cleanup pass runs for real
        checkSpy.mockRestore();

        const match = result.stdout.match(/DESCENDANT_PID:(\d+)/);
        expect(match).not.toBeNull();
        descendantPid = parseInt(match![1], 10);

        // Verify descendant is confirmed alive before cleanup
        let isDescendantAlive = false;
        try {
          process.kill(descendantPid, 0);
          isDescendantAlive = true;
        } catch (e: any) {
          isDescendantAlive = e?.code !== 'ESRCH';
        }
        expect(isDescendantAlive).toBe(true);

        // Parent exited, but tree cleanup was unconfirmed at exit time:
        // Registry entry MUST still be retained in activeSubprocesses
        expect(getActiveSubprocessCountForTests()).toBeGreaterThan(0);

        // Now run the real subprocess cleanup pass (no mocks!)
        await cleanupAllActiveSubprocesses();

        // Registry entry must be cleared
        expect(getActiveSubprocessCountForTests()).toBe(0);

        // Verify the surviving descendant has now actually exited (ESRCH)
        let isDead = false;
        for (let i = 0; i < 10; i++) {
          try {
            process.kill(descendantPid, 0);
            await new Promise((r) => setTimeout(r, 50));
          } catch (e: any) {
            if (e?.code === 'ESRCH') {
              isDead = true;
              break;
            }
          }
        }
        expect(isDead).toBe(true);
      } finally {
        checkSpy.mockRestore();
        if (descendantPid) {
          try {
            if (process.platform === 'win32') {
              child_process.spawn('taskkill', ['/F', '/T', '/PID', descendantPid.toString()], { stdio: 'ignore' });
            } else {
              process.kill(descendantPid, 'SIGKILL');
            }
          } catch {}
        }
      }
    });

    it('5. grandchildren and multi-tier process trees are discovered and handled', async () => {
      // Test parseProcessTableCsv and multi-tier graph traversal (parent 100 -> child 101 -> grandchild 102)
      const sampleCsv = [
        'Node,ParentProcessId,ProcessId,CreationDate',
        'HOST,0,4,20261121100000.000000+000',
        'HOST,4,100,20261121100001.000000+000', // root parent 100
        'HOST,100,101,20261121100002.000000+000', // child 101
        'HOST,101,102,20261121100003.000000+000', // grandchild 102
      ].join('\r\n');

      const parsed = parseProcessTableCsv(sampleCsv);
      expect(parsed).not.toBeNull();
      expect(parsed!.get(100)).toEqual([101]);
      expect(parsed!.get(101)).toEqual([102]);
      expect(parsed!.byPid.get(102)?.ppid).toBe(101);

      // Verify that terminateWindowsTree discovers both child and grandchild when parent 100 is ESRCH
      const checkSpy = vi.spyOn(processManagerInternal, 'checkWindowsDescendants')
        .mockResolvedValueOnce({
          established: true,
          hasDescendants: true,
          descendantPids: [101, 102],
          ambiguous: false,
        })
        .mockResolvedValueOnce({
          established: true,
          hasDescendants: false,
          descendantPids: [],
          ambiguous: false,
        });

      const killedPids: string[] = [];
      const origSpawn = child_process.spawn;
      const spawnSpy = vi.spyOn(child_process, 'spawn').mockImplementation(((cmd: string, args: any, opts: any) => {
        if (cmd === 'taskkill') {
          const pidIdx = args.indexOf('/PID');
          if (pidIdx !== -1 && args[pidIdx + 1]) {
            killedPids.push(args[pidIdx + 1]);
          }
          const ee = new EventEmitter();
          setImmediate(() => ee.emit('close', 0));
          return ee as any;
        }
        return origSpawn(cmd, args, opts);
      }) as any);

      const killSpy = vi.spyOn(process, 'kill').mockImplementation(((target: number, sig?: string | number) => {
        if (sig === 0) {
          const err: any = new Error('ESRCH');
          err.code = 'ESRCH';
          throw err;
        }
        return true;
      }) as any);

      const res = await terminateWindowsTree(100);
      expect(res.confirmed).toBe(true);
      expect(res.alreadyExited).toBe(true);
      expect(res.treeConfirmed).toBe(true);

      // Both child 101 and grandchild 102 must have been targeted for termination
      expect(killedPids).toContain('101');
      expect(killedPids).toContain('102');

      checkSpy.mockRestore();
      spawnSpy.mockRestore();
      killSpy.mockRestore();
    });

    it('6. PID reuse and ambiguous process identity prevents terminating unrelated processes', async () => {
      // 1. Validate parseDmtfDateToEpochMs
      const dmtf = '20261121120000.500000+000';
      const parsedMs = parseDmtfDateToEpochMs(dmtf);
      expect(parsedMs).not.toBeNull();
      expect(new Date(parsedMs!).toISOString()).toBe('2026-11-21T12:00:00.500Z');

      // 2. Candidate child created before parent spawn time (PID reuse detected)
      const parentSpawnTimeMs = Date.UTC(2026, 10, 21, 12, 0, 0); // 12:00:00
      const reusedChildDmtf = '20261121110000.000000+000'; // 11:00:00 (1 hour before parent!)

      const sampleCsv = [
        'Node,ParentProcessId,ProcessId,CreationDate',
        'HOST,0,4,20261121100000.000000+000',
        `HOST,4,100,20261121120000.000000+000`, // root parent 100 spawned at 12:00:00
        `HOST,100,999,${reusedChildDmtf}`, // candidate child 999 spawned at 11:00:00 (recycled PID!)
      ].join('\r\n');

      const parsed = parseProcessTableCsv(sampleCsv);
      expect(parsed).not.toBeNull();

      // Tooling simulation: checkWindowsDescendants returns ambiguous: true because of PID reuse
      const checkSpy = vi.spyOn(processManagerInternal, 'checkWindowsDescendants').mockResolvedValue({
        established: false,
        hasDescendants: true,
        descendantPids: [],
        ambiguous: true,
      });

      const killedPids: string[] = [];
      const origSpawn = child_process.spawn;
      const spawnSpy = vi.spyOn(child_process, 'spawn').mockImplementation(((cmd: string, args: any, opts: any) => {
        if (cmd === 'taskkill') {
          const pidIdx = args.indexOf('/PID');
          if (pidIdx !== -1 && args[pidIdx + 1]) {
            killedPids.push(args[pidIdx + 1]);
          }
        }
        return origSpawn(cmd, args, opts);
      }) as any);

      const killSpy = vi.spyOn(process, 'kill').mockImplementation(((target: number, sig?: string | number) => {
        if (sig === 0) {
          const err: any = new Error('ESRCH');
          err.code = 'ESRCH';
          throw err;
        }
        return true;
      }) as any);

      // terminateWindowsTree must NOT terminate ambiguous processes and must fail closed (treeConfirmed: false)
      const res = await terminateWindowsTree(100, undefined, parentSpawnTimeMs);
      expect(res.confirmed).toBe(true);
      expect(res.alreadyExited).toBe(true);
      expect(res.treeConfirmed).toBe(false);

      // Verify that no kill request was dispatched against the unrelated process
      expect(killedPids).toHaveLength(0);

      checkSpy.mockRestore();
      spawnSpy.mockRestore();
      killSpy.mockRestore();
    });

    it('7. malformed, corrupted, or incomplete process-table output causes parseProcessTableCsv to return null and fails closed', async () => {
      // Missing creationdate header
      const missingCreationDate = [
        'Node,ParentProcessId,ProcessId',
        'HOST,0,4',
        'HOST,4,100',
      ].join('\r\n');
      expect(parseProcessTableCsv(missingCreationDate)).toBeNull();

      // Missing ProcessId header
      const missingProcessId = [
        'Node,ParentProcessId,CreationDate',
        'HOST,0,20261121100000.000000+000',
        'HOST,4,20261121100001.000000+000',
      ].join('\r\n');
      expect(parseProcessTableCsv(missingProcessId)).toBeNull();

      // Truncated / malformed row (missing column in row 2): strictly returns null, never skips!
      const truncatedRow = [
        'Node,ParentProcessId,ProcessId,CreationDate',
        'HOST,0,4,20261121100000.000000+000',
        'HOST,4', // truncated row
        'HOST,4,100,20261121100001.000000+000',
      ].join('\r\n');
      expect(parseProcessTableCsv(truncatedRow)).toBeNull();

      // Non-integer corrupted PID
      const corruptedPid = [
        'Node,ParentProcessId,ProcessId,CreationDate',
        'HOST,0,4,20261121100000.000000+000',
        'HOST,invalid_ppid,100,20261121100001.000000+000',
      ].join('\r\n');
      expect(parseProcessTableCsv(corruptedPid)).toBeNull();

      // Incomplete table (validCount < 2)
      const emptyTable = [
        'Node,ParentProcessId,ProcessId,CreationDate',
        'HOST,0,4,20261121100000.000000+000',
      ].join('\r\n');
      expect(parseProcessTableCsv(emptyTable)).toBeNull();

      // Verify that when tooling fails to parse, terminateWindowsTree fails closed
      const checkSpy = vi.spyOn(processManagerInternal, 'checkWindowsDescendants').mockResolvedValue({
        established: false,
        hasDescendants: false,
        descendantPids: [],
        ambiguous: true,
      });

      const killSpy = vi.spyOn(process, 'kill').mockImplementation(((target: number, sig?: string | number) => {
        if (sig === 0) {
          const err: any = new Error('ESRCH');
          err.code = 'ESRCH';
          throw err;
        }
        return true;
      }) as any);

      const res = await terminateWindowsTree(12345);
      expect(res.confirmed).toBe(true);
      expect(res.alreadyExited).toBe(true);
      expect(res.treeConfirmed).toBe(false);

      checkSpy.mockRestore();
      killSpy.mockRestore();
    });

    it('8. post-registration child error triggers termination and retains unconfirmed entry', async () => {
      // Mock termination to simulate unconfirmed tree status
      const termSpy = vi.spyOn(processManagerInternal, 'terminateProcessTree').mockResolvedValue({
        confirmed: true,
        alreadyExited: false,
        fallbackUsed: false,
        treeConfirmed: false,
      });

      let capturedChild: any = null;
      const originalSpawn = child_process.spawn;
      const spawnSpy = vi.spyOn(child_process, 'spawn').mockImplementation(((cmd: string, args: any, opts: any) => {
        const proc = originalSpawn(cmd, args, opts);
        capturedChild = proc;
        return proc;
      }) as any);

      const promise = spawnAsyncWithTreeTermination(
        process.execPath,
        ['-e', 'setInterval(() => {}, 1000)'],
        { timeoutMs: 1000 }
      );

      // Wait a tick for child PID to be registered in activeSubprocesses
      await new Promise((r) => setTimeout(r, 60));
      expect(getActiveSubprocessCountForTests()).toBeGreaterThan(0);

      // Emit error AFTER registration
      const testErr = new Error('Post-registration connection reset');
      capturedChild.emit('error', testErr);

      const result = await promise;
      expect(result.error).toBe(testErr);

      // Process must have routed through terminate()
      expect(termSpy).toHaveBeenCalled();

      // Because termination was unconfirmed, registry entry MUST remain in activeSubprocesses
      expect(getActiveSubprocessCountForTests()).toBeGreaterThan(0);

      termSpy.mockRestore();
      spawnSpy.mockRestore();

      // Later cleanup confirms termination
      const cleanSpy = vi.spyOn(processManagerInternal, 'terminateProcessTree').mockResolvedValue({
        confirmed: true,
        alreadyExited: false,
        fallbackUsed: false,
        treeConfirmed: true,
      });
      await cleanupAllActiveSubprocesses();
      expect(getActiveSubprocessCountForTests()).toBe(0);
      cleanSpy.mockRestore();
    });

    it('9. existing in-flight termination is awaited and not lost when child error occurs', async () => {
      let terminateCallCount = 0;
      let resolveTerm: ((res: any) => void) | null = null;
      const termPromise = new Promise<any>((r) => {
        resolveTerm = r;
      });

      const termSpy = vi.spyOn(processManagerInternal, 'terminateProcessTree').mockImplementation(async () => {
        terminateCallCount++;
        return termPromise;
      });

      let capturedChild: any = null;
      const originalSpawn = child_process.spawn;
      const spawnSpy = vi.spyOn(child_process, 'spawn').mockImplementation(((cmd: string, args: any, opts: any) => {
        const proc = originalSpawn(cmd, args, opts);
        capturedChild = proc;
        return proc;
      }) as any);

      const promise = spawnAsyncWithTreeTermination(
        process.execPath,
        ['-e', 'setInterval(() => {}, 1000)'],
        { timeoutMs: 5000 }
      );

      await new Promise((r) => setTimeout(r, 60));
      expect(getActiveSubprocessCountForTests()).toBeGreaterThan(0);

      // Trigger exit first to put termination in-flight
      capturedChild.emit('exit', 0);
      expect(terminateCallCount).toBe(1);

      // Now emit an error while termination is already in flight
      const err = new Error('Concurrent error while terminating');
      capturedChild.emit('error', err);

      // Did NOT launch a second competing terminateProcessTree
      expect(terminateCallCount).toBe(1);

      // Resolve the in-flight termination
      resolveTerm!({
        confirmed: true,
        alreadyExited: false,
        fallbackUsed: false,
        treeConfirmed: true,
      });

      const result = await promise;
      expect(result.error).toBe(err);
      expect(getActiveSubprocessCountForTests()).toBe(0);

      termSpy.mockRestore();
      spawnSpy.mockRestore();
    });
  });
});

import child_process, { type ChildProcess } from 'child_process';
import os from 'os';

export interface SpawnAsyncResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  outputTruncated?: boolean;
  error?: Error;
}

export interface ProcessTerminationResult {
  confirmed: boolean;
  alreadyExited: boolean;
  fallbackUsed: boolean;
  treeConfirmed: boolean;
  signal?: string;
  error?: Error;
}

interface ActiveProcessEntry {
  pid: number;
  pgid: number;
  spawnTimeMs: number;
  terminate: (graceMs?: number) => Promise<ProcessTerminationResult>;
}

// Active subprocess registry to coordinate graceful worker shutdown and prevent orphaned processes
const activeSubprocesses = new Set<ActiveProcessEntry>();

/**
 * Strips sensitive environment variables (such as DATABASE_URL, JWT_SECRET, REDIS_URL)
 * while preserving runtime-critical system variables required to execute node, python, etc.
 */
export function getSanitizedEnv(): NodeJS.ProcessEnv {
  const isWin = process.platform === 'win32';
  return {
    PATH: process.env.PATH || '',
    TEMP: process.env.TEMP || os.tmpdir(),
    TMP: process.env.TMP || os.tmpdir(),
    USERPROFILE: process.env.USERPROFILE || '',
    HOME: process.env.HOME || '',
    SYSTEMROOT: process.env.SYSTEMROOT || (isWin ? 'C:\\Windows' : ''),
    WINDIR: process.env.WINDIR || (isWin ? 'C:\\Windows' : ''),
    COMSPEC: process.env.COMSPEC || (isWin ? 'C:\\Windows\\system32\\cmd.exe' : ''),
    PATHEXT: process.env.PATHEXT || (isWin ? '.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC' : ''),
    LANG: 'en_US.UTF-8',
    PYTHONIOENCODING: 'utf-8',
    NODE_ENV: 'test',
  };
}

export interface ProcessNode {
  pid: number;
  ppid: number;
  creationTimeMs?: number;
}

export interface ProcessTableParsed {
  byPid: Map<number, ProcessNode>;
  parentToChildren: Map<number, number[]>;
  get(ppid: number): number[] | undefined;
}

export interface WindowsDescendantCheckResult {
  established: boolean;
  hasDescendants: boolean;
  descendantPids: number[];
  ambiguous: boolean;
}

/**
 * Parses DMTF datetime strings (YYYYMMDDHHmmss.ffffff+zzz) into UTC epoch milliseconds.
 */
export function parseDmtfDateToEpochMs(dmtf: string): number | null {
  if (!dmtf || typeof dmtf !== 'string') return null;
  const match = dmtf.trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\.(\d{3,6})([+-])(\d{3})$/);
  if (!match) {
    const parsed = Date.parse(dmtf);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const [, y, m, d, hh, mm, ss, frac, sign, offsetMinsStr] = match;
  const ms = parseInt(frac.substring(0, 3), 10);
  const offsetMins = parseInt(offsetMinsStr, 10);
  const totalOffsetMs = (sign === '-' ? -1 : 1) * offsetMins * 60 * 1000;
  const utc = Date.UTC(
    parseInt(y, 10),
    parseInt(m, 10) - 1,
    parseInt(d, 10),
    parseInt(hh, 10),
    parseInt(mm, 10),
    parseInt(ss, 10),
    ms
  );
  return utc - totalOffsetMs;
}

/**
 * Parses process table CSV output (from wmic or powershell) mapping parent PIDs to child PIDs.
 * Rejects corrupt, incomplete, or ambiguous tables.
 */
export function parseProcessTableCsv(text: string): ProcessTableParsed | null {
  if (!text || typeof text !== 'string') return null;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const headerLine = lines[0];
  const headers = headerLine
    .split(',')
    .map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
  const pidIdx = headers.indexOf('processid');
  const ppidIdx = headers.indexOf('parentprocessid');
  const creationIdx = headers.indexOf('creationdate');

  // Validate required columns exist in header
  if (pidIdx === -1 || ppidIdx === -1 || creationIdx === -1) return null;

  const expectedMinCols = Math.max(pidIdx, ppidIdx, creationIdx) + 1;
  const byPid = new Map<number, ProcessNode>();
  const parentToChildren = new Map<number, number[]>();
  let validCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawRow = lines[i];
    const row = rawRow.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());

    // Do NOT silently skip malformed rows and pretend the table is complete!
    if (row.length < expectedMinCols) {
      return null;
    }

    const pid = parseInt(row[pidIdx], 10);
    const ppid = parseInt(row[ppidIdx], 10);
    if (!Number.isInteger(pid) || !Number.isInteger(ppid) || pid < 0 || ppid < 0) {
      return null;
    }

    let creationTimeMs: number | undefined;
    if (row.length > creationIdx) {
      const parsedMs = parseDmtfDateToEpochMs(row[creationIdx]);
      if (parsedMs !== null) {
        creationTimeMs = parsedMs;
      }
    }

    const node: ProcessNode = { pid, ppid, creationTimeMs };
    byPid.set(pid, node);

    let list = parentToChildren.get(ppid);
    if (!list) {
      list = [];
      parentToChildren.set(ppid, list);
    }
    list.push(pid);
    validCount++;
  }

  // Reject truncated/empty tables
  if (validCount < 2) return null;

  return {
    byPid,
    parentToChildren,
    get: (ppid: number) => parentToChildren.get(ppid),
  };
}

/**
 * Checks whether any descendant processes of rootPid exist in the Windows process table.
 * Traverses the complete descendant tree (immediate children, grandchildren, etc.).
 * Protects against PID reuse using process creation timestamps.
 *
 * Guarantees:
 * - Does not treat command failure, timeout, unavailable tooling, or ambiguous output as proof that no descendants exist.
 * - If descendant status cannot be reliably established, returns established: false and ambiguous: true.
 * - Uses execFile with direct argument vectors to avoid shell-injection risks.
 */
export async function checkWindowsDescendants(
  rootPid: number,
  expectedSpawnTimeMs?: number
): Promise<WindowsDescendantCheckResult> {
  if (!Number.isInteger(rootPid) || rootPid <= 0) {
    return { established: false, hasDescendants: false, descendantPids: [], ambiguous: false };
  }

  const fetchWmicTable = (): Promise<string | null> => {
    return new Promise((resolve) => {
      child_process.execFile(
        'wmic',
        ['process', 'get', 'ProcessId,ParentProcessId,CreationDate', '/format:csv'],
        { windowsHide: true, timeout: 1000 },
        (err, stdout) => {
          if (err || !stdout) return resolve(null);
          resolve(stdout);
        }
      );
    });
  };

  const fetchPowershellTable = (): Promise<string | null> => {
    return new Promise((resolve) => {
      child_process.execFile(
        'powershell',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          "Get-CimInstance Win32_Process | Select-Object -Property ParentProcessId,ProcessId,@{Name='CreationDate';Expression={$_.CreationDate.ToUniversalTime().ToString('yyyyMMddHHmmss.ffffff+000')}} | ConvertTo-Csv -NoTypeInformation",
        ],
        { windowsHide: true, timeout: 1500 },
        (err, stdout) => {
          if (err || !stdout) return resolve(null);
          resolve(stdout);
        }
      );
    });
  };

  let rawTable = await fetchWmicTable();
  let parsed = rawTable ? parseProcessTableCsv(rawTable) : null;

  if (!parsed) {
    rawTable = await fetchPowershellTable();
    parsed = rawTable ? parseProcessTableCsv(rawTable) : null;
  }

  if (!parsed) {
    // Tooling failure, timeout, or ambiguous result: cannot reliably establish descendant status
    return { established: false, hasDescendants: false, descendantPids: [], ambiguous: true };
  }

  const { byPid, parentToChildren } = parsed;

  // Validate root process identity if expectedSpawnTimeMs is known and rootPid is still in table
  const rootNode = byPid.get(rootPid);
  if (rootNode && expectedSpawnTimeMs !== undefined && rootNode.creationTimeMs !== undefined) {
    if (rootNode.creationTimeMs < expectedSpawnTimeMs - 2000) {
      // Root PID in table was created before expected spawn time: PID reuse detected!
      return { established: false, hasDescendants: false, descendantPids: [], ambiguous: true };
    }
  }

  // Traverse complete descendant tree (immediate children, grandchildren, etc.)
  const queue: number[] = [rootPid];
  const visited = new Set<number>([rootPid]);
  const descendantPids: number[] = [];
  let ambiguous = false;

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currNode = byPid.get(curr);
    const children = parentToChildren.get(curr);
    if (children) {
      for (const childPid of children) {
        if (!visited.has(childPid)) {
          visited.add(childPid);

          const childNode = byPid.get(childPid);

          // Protect against PID reuse:
          // A true descendant cannot have been created before the parent spawn time
          if (expectedSpawnTimeMs !== undefined && childNode?.creationTimeMs !== undefined) {
            if (childNode.creationTimeMs < expectedSpawnTimeMs - 2000) {
              ambiguous = true;
              continue;
            }
          }

          if (currNode?.creationTimeMs !== undefined && childNode?.creationTimeMs !== undefined) {
            if (childNode.creationTimeMs < currNode.creationTimeMs - 2000) {
              ambiguous = true;
              continue;
            }
          }

          descendantPids.push(childPid);
          queue.push(childPid);
        }
      }
    }
  }

  if (ambiguous) {
    // Relationship cannot be established reliably: fail closed
    return {
      established: false,
      hasDescendants: descendantPids.length > 0,
      descendantPids,
      ambiguous: true,
    };
  }

  return {
    established: true,
    hasDescendants: descendantPids.length > 0,
    descendantPids,
    ambiguous: false,
  };
}

/**
 * Backward-compatible helper checking whether any descendant processes survive.
 */
export async function hasWindowsDescendants(pid: number): Promise<boolean> {
  const result = await checkWindowsDescendants(pid);
  return result.hasDescendants;
}

/**
 * Asynchronously terminates a process and all its child/grandchild processes on Windows.
 * Uses taskkill.exe /F /T /PID without blocking the Node.js event loop.
 *
 * Accuracy and confirmation guarantees:
 * - When parent PID returns ESRCH:
 *   - Discovers surviving descendants (including grandchildren).
 *   - Safely attempts termination of all discovered descendants.
 *   - Probes the process table to verify they have actually exited.
 *   - Returns treeConfirmed: true only after full verified teardown.
 *   - If verification or relationship status cannot be established, returns treeConfirmed: false.
 * - Distinguishes confirmed tree termination (taskkill exit 0 or verified descendant termination)
 *   from an unconfirmed tree (exit 128 without tree proof, tool failure, or living descendants).
 */
export function terminateWindowsTree(
  pid: number,
  fallbackProc?: ChildProcess,
  expectedSpawnTimeMs?: number
): Promise<ProcessTerminationResult> {
  return new Promise((resolve) => {
    let settled = false;
    let killer: ChildProcess;
    let killerTimeout: NodeJS.Timeout | null = null;

    const finalize = (res: ProcessTerminationResult) => {
      if (settled) return;
      settled = true;
      if (killerTimeout) clearTimeout(killerTimeout);
      resolve(res);
    };

    // Fast check: if the parent process is already dead (ESRCH), inspect and terminate surviving descendants.
    try {
      process.kill(pid, 0);
    } catch (checkErr: any) {
      if (checkErr?.code === 'ESRCH') {
        (async () => {
          const descResult = await processManagerInternal.checkWindowsDescendants(pid, expectedSpawnTimeMs);

          if (!descResult.established) {
            // Descendant status cannot be established reliably: fail closed
            return finalize({
              confirmed: true,
              alreadyExited: true,
              fallbackUsed: false,
              treeConfirmed: false,
            });
          }

          if (!descResult.hasDescendants) {
            // Reliably confirmed that no descendants exist
            return finalize({
              confirmed: true,
              alreadyExited: true,
              fallbackUsed: false,
              treeConfirmed: true,
            });
          }

          // Descendants exist: safely attempt to terminate all discovered descendants (including grandchildren)
          const killDescendant = (descPid: number): Promise<void> => {
            return new Promise((res) => {
              try {
                const k = child_process.spawn('taskkill', ['/F', '/T', '/PID', descPid.toString()], {
                  windowsHide: true,
                  stdio: 'ignore',
                });
                const t = setTimeout(() => {
                  try { k.kill(); } catch {}
                  try { process.kill(descPid); } catch {}
                  res();
                }, 800);
                if (typeof t.unref === 'function') t.unref();
                k.on('close', () => {
                  clearTimeout(t);
                  res();
                });
                k.on('error', () => {
                  clearTimeout(t);
                  try { process.kill(descPid); } catch {}
                  res();
                });
              } catch {
                try { process.kill(descPid); } catch {}
                res();
              }
            });
          };

          await Promise.allSettled(descResult.descendantPids.map(killDescendant));

          // Verify that all discovered descendants have actually exited (probing for ESRCH)
          let allExited = true;
          for (const descPid of descResult.descendantPids) {
            let pidDead = false;
            for (let attempt = 0; attempt < 6; attempt++) {
              try {
                process.kill(descPid, 0);
                await new Promise((r) => setTimeout(r, 25));
              } catch (probeErr: any) {
                if (probeErr?.code === 'ESRCH') {
                  pidDead = true;
                  break;
                }
              }
            }
            if (!pidDead) {
              allExited = false;
              break;
            }
          }

          if (!allExited) {
            return finalize({
              confirmed: false,
              alreadyExited: true,
              fallbackUsed: true,
              treeConfirmed: false,
            });
          }

          // Final verification pass: check that no remaining descendants exist
          const finalCheck = await processManagerInternal.checkWindowsDescendants(pid, expectedSpawnTimeMs);
          const fullyConfirmed = finalCheck.established && !finalCheck.hasDescendants;

          finalize({
            confirmed: true,
            alreadyExited: true,
            fallbackUsed: true,
            treeConfirmed: fullyConfirmed,
          });
        })().catch(() => {
          finalize({
            confirmed: false,
            alreadyExited: true,
            fallbackUsed: false,
            treeConfirmed: false,
          });
        });
        return;
      }
    }

    // Probing helper for fallback: checks if direct child has actually exited
    const verifyChildExited = async (): Promise<boolean> => {
      for (let i = 0; i < 4; i++) {
        try {
          process.kill(pid, 0);
          await new Promise((r) => setTimeout(r, 25));
        } catch (err: any) {
          if (err?.code === 'ESRCH') return true;
        }
      }
      return false;
    };

    const executeFallbackKill = async (causeError?: Error): Promise<ProcessTerminationResult> => {
      let dispatchSucceeded = false;
      let dispatchError: Error | undefined;
      try {
        if (fallbackProc) {
          fallbackProc.kill();
          dispatchSucceeded = true;
        } else {
          process.kill(pid);
          dispatchSucceeded = true;
        }
      } catch (fbErr: any) {
        if (fbErr?.code === 'ESRCH') {
          return {
            confirmed: true,
            alreadyExited: true,
            fallbackUsed: true,
            treeConfirmed: false,
            error: causeError,
          };
        }
        dispatchError = fbErr instanceof Error ? fbErr : new Error(String(fbErr));
      }

      const exited = await verifyChildExited();
      return {
        confirmed: exited,
        alreadyExited: false,
        fallbackUsed: true,
        treeConfirmed: false, // Direct child fallback cannot guarantee tree termination
        error: exited
          ? causeError ?? dispatchError
          : (causeError ?? dispatchError ?? new Error(`Direct child process PID ${pid} did not exit after fallback kill`)),
      };
    };

    try {
      killer = child_process.spawn('taskkill', ['/F', '/T', '/PID', pid.toString()], {
        windowsHide: true,
        stdio: 'ignore',
      });
    } catch (spawnErr: any) {
      const err = spawnErr instanceof Error ? spawnErr : new Error(String(spawnErr));
      executeFallbackKill(err).then(finalize);
      return;
    }

    killerTimeout = setTimeout(async () => {
      if (!settled) {
        try { killer.kill(); } catch {}
        const res = await executeFallbackKill(new Error(`taskkill timed out for PID ${pid}`));
        finalize(res);
      }
    }, 1000);
    if (typeof killerTimeout.unref === 'function') killerTimeout.unref();

    killer.on('error', async (err) => {
      const res = await executeFallbackKill(err);
      finalize(res);
    });

    killer.on('close', async (code) => {
      // Exit code 0: entire process tree confirmed terminated
      if (code === 0) {
        return finalize({
          confirmed: true,
          alreadyExited: false,
          fallbackUsed: false,
          treeConfirmed: true,
        });
      }
      // Exit code 128: process not found (already exited before taskkill ran).
      // Parent was already gone, so tree termination could not be verified by taskkill.
      if (code === 128) {
        return finalize({
          confirmed: true,
          alreadyExited: true,
          fallbackUsed: false,
          treeConfirmed: false,
        });
      }
      // Nonzero exit code (e.g. 1 Access Denied or syntax error): invoke verified fallback kill
      const res = await executeFallbackKill(new Error(`taskkill exited with code ${code}`));
      finalize(res);
    });
  });
}

// In-flight POSIX group termination tracking to prevent duplicate concurrent signals
const inFlightPosixTerminations = new Map<number, Promise<ProcessTerminationResult>>();

/**
 * Terminate a POSIX process group with SIGTERM and an observable, tracked escalation timer to SIGKILL.
 *
 * Distinguishes successful signal dispatch from confirmed process-group termination:
 * - Probes process group status via process.kill(-pgid, 0).
 * - ESRCH: confirmed dead / already gone.
 * - EPERM or other error: process group existence cannot be ruled out; unconfirmed.
 * - Does not silently discard errors from fallback SIGTERM or SIGKILL attempts; preserves meaningful errors.
 * - After SIGKILL is dispatched, verifies via post-kill probing whether the process group was reaped.
 * - Returns confirmed: false if the process group still exists or remains in unconfirmed state.
 *
 * PID/PGID reuse limitation:
 * In POSIX systems, process IDs wrap around and are recycled. If a process terminates and its PID/PGID
 * is reassigned before signal delivery, an escalation signal could theoretically hit an unrelated process.
 * To mitigate this risk, short polling intervals (25ms) detect ESRCH immediately, canceling pending timers.
 * Absolute isolation against PID reuse requires Linux PID namespaces or containers.
 */
export function terminatePosixGroup(
  pgid: number,
  graceMs: number = 300,
  fallbackProc?: ChildProcess
): Promise<ProcessTerminationResult> {
  const existing = inFlightPosixTerminations.get(pgid);
  if (existing) return existing;

  const promise = new Promise<ProcessTerminationResult>((resolve) => {
    // Probing helper:
    // dead: true only if ESRCH is observed.
    // dead: false if signal probe succeeds or throws EPERM / other error.
    const probeGroup = (): { dead: boolean; error?: Error } => {
      try {
        process.kill(-pgid, 0);
        return { dead: false };
      } catch (err: any) {
        if (err?.code === 'ESRCH') {
          return { dead: true };
        }
        return { dead: false, error: err instanceof Error ? err : new Error(String(err)) };
      }
    };

    let fallbackUsed = false;
    let lastSignalError: Error | undefined;

    // Fast check: is group already dead?
    const initialProbe = probeGroup();
    if (initialProbe.dead) {
      return resolve({
        confirmed: true,
        alreadyExited: true,
        fallbackUsed: false,
        treeConfirmed: true,
      });
    }

    // 1. Initial SIGTERM to process group
    try {
      process.kill(-pgid, 'SIGTERM');
    } catch (err: any) {
      if (err?.code === 'ESRCH') {
        return resolve({
          confirmed: true,
          alreadyExited: true,
          fallbackUsed: false,
          treeConfirmed: true,
        });
      }
      lastSignalError = err instanceof Error ? err : new Error(String(err));
      fallbackUsed = true;
      try {
        if (fallbackProc) {
          fallbackProc.kill('SIGTERM');
        } else {
          process.kill(pgid, 'SIGTERM');
        }
      } catch (fallbackErr: any) {
        if (fallbackErr?.code === 'ESRCH') {
          return resolve({
            confirmed: true,
            alreadyExited: true,
            fallbackUsed: true,
            treeConfirmed: false,
            error: lastSignalError,
          });
        }
        lastSignalError = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
      }
    }

    // Check if SIGTERM immediately terminated group
    const postTermProbe = probeGroup();
    if (postTermProbe.dead) {
      return resolve({
        confirmed: true,
        alreadyExited: false,
        fallbackUsed,
        treeConfirmed: !fallbackUsed,
        signal: 'SIGTERM',
        error: fallbackUsed ? lastSignalError : undefined,
      });
    }

    let escalationTimer: NodeJS.Timeout | null = null;
    let pollInterval: NodeJS.Timeout | null = null;
    let postKillPoll: NodeJS.Timeout | null = null;

    const cleanupTimers = () => {
      if (escalationTimer) {
        clearTimeout(escalationTimer);
        escalationTimer = null;
      }
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      if (postKillPoll) {
        clearInterval(postKillPoll);
        postKillPoll = null;
      }
    };

    escalationTimer = setTimeout(() => {
      cleanupTimers();

      // Dispatch SIGKILL
      try {
        process.kill(-pgid, 'SIGKILL');
      } catch (killErr: any) {
        if (killErr?.code === 'ESRCH') {
          return resolve({
            confirmed: true,
            alreadyExited: false,
            fallbackUsed,
            treeConfirmed: !fallbackUsed,
            signal: 'SIGKILL',
            error: fallbackUsed ? lastSignalError : undefined,
          });
        }
        lastSignalError = killErr instanceof Error ? killErr : new Error(String(killErr));
        fallbackUsed = true;
        try {
          if (fallbackProc) {
            fallbackProc.kill('SIGKILL');
          } else {
            process.kill(pgid, 'SIGKILL');
          }
        } catch (fbKillErr: any) {
          if (fbKillErr?.code === 'ESRCH') {
            return resolve({
              confirmed: true,
              alreadyExited: false,
              fallbackUsed: true,
              treeConfirmed: false,
              signal: 'SIGKILL',
              error: lastSignalError,
            });
          }
          lastSignalError = fbKillErr instanceof Error ? fbKillErr : new Error(String(fbKillErr));
        }
      }

      // Do NOT merely report confirmed termination because SIGKILL was dispatched!
      // Must probe post-kill to confirm ESRCH:
      let attempts = 0;
      postKillPoll = setInterval(() => {
        attempts++;
        const probe = probeGroup();
        if (probe.dead) {
          cleanupTimers();
          return resolve({
            confirmed: true,
            alreadyExited: false,
            fallbackUsed,
            treeConfirmed: !fallbackUsed,
            signal: 'SIGKILL',
            error: fallbackUsed ? lastSignalError : undefined,
          });
        }

        if (attempts >= 6) {
          // ~150ms after SIGKILL, group is still alive or unconfirmed
          cleanupTimers();
          return resolve({
            confirmed: false,
            alreadyExited: false,
            fallbackUsed,
            treeConfirmed: false,
            signal: 'SIGKILL',
            error: probe.error ?? lastSignalError ?? new Error(`Process group ${pgid} did not terminate after SIGKILL`),
          });
        }
      }, 25);
      if (typeof postKillPoll.unref === 'function') postKillPoll.unref();
    }, graceMs);

    if (typeof escalationTimer.unref === 'function') {
      escalationTimer.unref();
    }

    pollInterval = setInterval(() => {
      const probe = probeGroup();
      if (probe.dead) {
        cleanupTimers();
        resolve({
          confirmed: true,
          alreadyExited: false,
          fallbackUsed,
          treeConfirmed: !fallbackUsed,
          signal: 'SIGTERM',
          error: fallbackUsed ? lastSignalError : undefined,
        });
      }
    }, 25);

    if (typeof pollInterval.unref === 'function') {
      pollInterval.unref();
    }
  }).finally(() => {
    inFlightPosixTerminations.delete(pgid);
  });

  inFlightPosixTerminations.set(pgid, promise);
  return promise;
}

/**
 * Terminate a process and all its children/process group asynchronously.
 */
export async function terminateProcessTree(
  procOrPid: ChildProcess | number,
  graceMs: number = 300,
  expectedSpawnTimeMs?: number
): Promise<ProcessTerminationResult> {
  const pid = typeof procOrPid === 'number' ? procOrPid : procOrPid.pid;
  if (!pid) {
    return {
      confirmed: false,
      alreadyExited: true,
      fallbackUsed: false,
      treeConfirmed: false,
      error: new Error('Cannot terminate process: PID is undefined'),
    };
  }

  const fallbackProc = typeof procOrPid === 'number' ? undefined : procOrPid;

  if (process.platform === 'win32') {
    return await terminateWindowsTree(pid, fallbackProc, expectedSpawnTimeMs);
  } else {
    return await terminatePosixGroup(pid, graceMs, fallbackProc);
  }
}

export const processManagerInternal = {
  terminateProcessTree,
  checkWindowsDescendants,
};

let inFlightCleanup: Promise<void> | null = null;
const resolvedCleanupPromise = Promise.resolve();

/**
 * Drains all in-flight subprocesses tracked across the worker runtime.
 * Concurrent calls share and await the same in-flight cleanup promise.
 *
 * Confirmation and state retention guarantees:
 * - Does not ignore the ProcessTerminationResult returned by entry.terminate().
 * - Does NOT delete a registry entry when termination is unconfirmed.
 * - Prevents silent success: if any subprocess fails to confirm termination after
 *   draining passes, throws a meaningful error and retains unconfirmed entries in the
 *   registry for a subsequent cleanup attempt.
 * - Avoids infinite loops by capping draining passes.
 */
export function cleanupAllActiveSubprocesses(): Promise<void> {
  if (inFlightCleanup) return inFlightCleanup;
  if (activeSubprocesses.size === 0) return resolvedCleanupPromise;

  inFlightCleanup = (async () => {
    const maxPasses = 3;
    let passes = 0;

    while (activeSubprocesses.size > 0 && passes < maxPasses) {
      passes++;
      const currentBatch = Array.from(activeSubprocesses);
      await Promise.allSettled(
        currentBatch.map(async (entry) => {
          try {
            const res = await entry.terminate(100);
            if (res && res.confirmed && res.treeConfirmed) {
              activeSubprocesses.delete(entry);
            }
          } catch {
            // Unconfirmed or failed: retain entry in activeSubprocesses
          }
        })
      );
    }

    if (activeSubprocesses.size > 0) {
      const unconfirmedPids = Array.from(activeSubprocesses).map((e) => e.pid);
      throw new Error(
        `Subprocess cleanup unconfirmed: ${unconfirmedPids.length} process(es) could not be confirmed terminated (PIDs: ${unconfirmedPids.join(', ')})`
      );
    }
  })().finally(() => {
    inFlightCleanup = null;
  });

  return inFlightCleanup;
}

let shutdownHandlerRegistered = false;
let inFlightShutdown: Promise<void> | null = null;
let sigtermListener: (() => void) | null = null;
let sigintListener: (() => void) | null = null;
const shutdownCallbacks: Array<() => Promise<void>> = [];

/**
 * Executes registered shutdown callbacks and drains all active subprocesses.
 * Thread-safe: concurrent or repeated calls share the exact same in-flight shutdown promise.
 * Propagates errors so cleanup failures are observable to callers/tests.
 */
export function executeShutdown(signal: string = 'SIGTERM'): Promise<void> {
  if (inFlightShutdown) return inFlightShutdown;

  inFlightShutdown = (async () => {
    const errors: Error[] = [];

    for (const cb of shutdownCallbacks) {
      try {
        await cb();
      } catch (cbErr) {
        const err = cbErr instanceof Error ? cbErr : new Error(String(cbErr));
        console.error('[ProcessManager] Shutdown callback error:', err.message);
        errors.push(err);
      }
    }

    try {
      await cleanupAllActiveSubprocesses();
    } catch (cleanupErr) {
      const err = cleanupErr instanceof Error ? cleanupErr : new Error(String(cleanupErr));
      console.error('[ProcessManager] Cleanup subprocess error during shutdown:', err.message);
      errors.push(err);
    }

    if (errors.length > 0) {
      throw new Error(
        `Shutdown encountered ${errors.length} error(s): ${errors.map((e) => e.message).join('; ')}`
      );
    }
  })();

  return inFlightShutdown;
}

/**
 * Installs controlled shutdown handlers for the Node process.
 * Integrates with worker SIGTERM/SIGINT signals to ensure full graceful shutdown.
 *
 * Repeated shutdown signals share the same in-flight shutdown promise.
 * Callback errors are logged and surfaced rather than silently swallowed.
 */
export function registerProcessShutdownHandler(callback?: () => Promise<void>): void {
  if (callback) {
    shutdownCallbacks.push(callback);
  }

  if (shutdownHandlerRegistered) return;
  shutdownHandlerRegistered = true;

  sigtermListener = () => {
    executeShutdown('SIGTERM').catch(() => {});
  };
  sigintListener = () => {
    executeShutdown('SIGINT').catch(() => {});
  };

  process.on('SIGTERM', sigtermListener);
  process.on('SIGINT', sigintListener);
}

/**
 * Resets registered shutdown handlers and listeners for testing.
 * Removes the process signal listeners to prevent leaking across test cases.
 * Notice: DOES NOT clear activeSubprocesses, preserving live subprocess tracking.
 */
export function resetProcessShutdownHandlerForTests(): void {
  shutdownCallbacks.length = 0;
  inFlightShutdown = null;
  if (sigtermListener) {
    process.removeListener('SIGTERM', sigtermListener);
    sigtermListener = null;
  }
  if (sigintListener) {
    process.removeListener('SIGINT', sigintListener);
    sigintListener = null;
  }
  shutdownHandlerRegistered = false;
}

export function getActiveSubprocessCountForTests(): number {
  return activeSubprocesses.size;
}

/**
 * Calculates the exact valid UTF-8 character boundary up to maxBytes.
 * Guarantees that slicing a buffer at the returned boundary never ends in an incomplete
 * multi-byte sequence, preventing U+FFFD replacement characters.
 */
export function getUtf8Boundary(buf: Buffer, maxBytes: number): number {
  if (maxBytes <= 0 || buf.length === 0) return 0;
  const len = Math.min(buf.length, maxBytes);

  // Walk backwards over any trailing continuation bytes (0b10xxxxxx = 0x80..0xBF)
  let i = len - 1;
  while (i >= 0 && (buf[i] & 0xC0) === 0x80) {
    i--;
  }

  if (i < 0) {
    // Only continuation bytes were present up to len without a leading byte
    return 0;
  }

  const lead = buf[i];
  let expected = 1;
  if ((lead & 0xE0) === 0xC0) expected = 2;
  else if ((lead & 0xF0) === 0xE0) expected = 3;
  else if ((lead & 0xF8) === 0xF0) expected = 4;
  else if (lead >= 0x80) {
    // Non-standard byte >= 0xF8: invalid UTF-8 leading byte
    return i;
  }

  // If the multi-byte sequence starting at leadIndex i is incomplete within len,
  // slice before i to avoid emitting an incomplete sequence.
  if (len - i < expected) {
    return i;
  }

  return len;
}

/**
 * Output Limit Policy:
 * - maxBufferBytes (default: 2MB) applies independently per stream: stdout and stderr each
 *   have an independent byte budget of maxBufferBytes.
 * - When either stream reaches maxBufferBytes, further incoming data on that stream is discarded
 *   (drained) to avoid OS pipe buffer saturation and child process deadlocks.
 * - UTF-8 character integrity is strictly preserved: output truncated at maxBufferBytes
 *   never ends in an incomplete UTF-8 sequence, guaranteeing no U+FFFD replacement characters.
 * - outputTruncated is set to true if either stdout or stderr exceeded maxBufferBytes.
 *
 * Spawns a child process asynchronously without blocking the Node.js event loop:
 * - Validates timeoutMs and maxBufferBytes strictly: rejects non-finite, negative, and fractional values.
 * - Unifies timeout, exit, and shutdown through one idempotent per-process termination mechanism.
 * - If child.pid is undefined, cleanly resolves with an error result without leaving the promise pending.
 * - Integrates with active process registry for graceful worker shutdown.
 */
export function spawnAsyncWithTreeTermination(
  command: string,
  args: string[],
  options: {
    input?: string;
    timeoutMs: number;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    maxBufferBytes?: number;
  }
): Promise<SpawnAsyncResult> {
  // 1. Input Validation: reject non-finite, negative, or non-number values
  if (
    typeof options.timeoutMs !== 'number' ||
    !Number.isFinite(options.timeoutMs) ||
    options.timeoutMs < 0
  ) {
    return Promise.reject(
      new TypeError(
        `Invalid timeoutMs: must be a finite, non-negative number, received ${options.timeoutMs}`
      )
    );
  }

  if (options.maxBufferBytes !== undefined) {
    if (
      typeof options.maxBufferBytes !== 'number' ||
      !Number.isFinite(options.maxBufferBytes) ||
      !Number.isInteger(options.maxBufferBytes) ||
      options.maxBufferBytes < 0
    ) {
      return Promise.reject(
        new TypeError(
          `Invalid maxBufferBytes: must be a finite, non-negative integer, received ${options.maxBufferBytes}`
        )
      );
    }
  }

  // Strict deadline: if timeout budget is 0, do not launch subprocess
  if (options.timeoutMs === 0) {
    return Promise.resolve({
      stdout: '',
      stderr: '',
      exitCode: null,
      timedOut: true,
      error: new Error('Subprocess execution budget exhausted before launch'),
    });
  }

  return new Promise((resolve) => {
    const timeoutMs = options.timeoutMs;
    const maxBufferBytes = options.maxBufferBytes ?? 2 * 1024 * 1024; // 2MB per stream
    const env = options.env ?? getSanitizedEnv();
    const spawnTimeMs = Date.now();

    let child: ChildProcess;
    try {
      child = child_process.spawn(command, args, {
        cwd: options.cwd,
        env,
        detached: process.platform !== 'win32', // Create independent process group on POSIX
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (err: any) {
      return resolve({
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: false,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let outputTruncated = false;
    let timedOut = false;
    let settled = false;
    let timeoutTimer: NodeJS.Timeout | null = null;
    let registryEntry: ActiveProcessEntry | null = null;
    let childTerminatePromise: Promise<ProcessTerminationResult> | null = null;

    const cleanupTimers = () => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
    };

    let executionError: Error | undefined;

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      cleanupTimers();

      const finalError = err ?? executionError;

      // Decode stdout and stderr buffers at exact UTF-8 character boundaries up to maxBufferBytes
      const combinedStdout = Buffer.concat(stdoutChunks);
      const stdoutCut = getUtf8Boundary(combinedStdout, maxBufferBytes);
      const stdout = combinedStdout.subarray(0, stdoutCut).toString('utf-8');

      const combinedStderr = Buffer.concat(stderrChunks);
      const stderrCut = getUtf8Boundary(combinedStderr, maxBufferBytes);
      const stderr = combinedStderr.subarray(0, stderrCut).toString('utf-8');

      resolve({
        stdout,
        stderr,
        exitCode: child.exitCode,
        timedOut,
        outputTruncated,
        error: finalError,
      });
    };

    // Unified per-process termination mechanism: timeout, exit, and shutdown all route here
    const terminate = (graceMs = 300): Promise<ProcessTerminationResult> => {
      if (childTerminatePromise) return childTerminatePromise;
      const prom = (async () => {
        try {
          const res = await processManagerInternal.terminateProcessTree(child, graceMs, spawnTimeMs);
          if (res && res.confirmed && res.treeConfirmed) {
            if (registryEntry) {
              activeSubprocesses.delete(registryEntry);
            }
            finish();
          } else {
            // Unconfirmed tree termination: keep in activeSubprocesses and allow subsequent retry
            childTerminatePromise = null;
          }
          return res;
        } catch (err) {
          childTerminatePromise = null;
          throw err;
        }
      })();
      childTerminatePromise = prom;
      return prom;
    };

    // Attach stream error handlers immediately to prevent unhandled stream errors (e.g. EPIPE)
    if (child.stdin) child.stdin.on('error', () => {});
    if (child.stdout) child.stdout.on('error', () => {});
    if (child.stderr) child.stderr.on('error', () => {});

    // Attach child process error handler to capture spawn failures and post-registration runtime errors
    child.on('error', async (err) => {
      executionError = err;

      if (!registryEntry) {
        // Pre-registration spawn error (e.g. immediate failure / ENOENT):
        // resolve immediately without leaving stale registry entries
        finish(err);
        return;
      }

      // Post-registration error: do NOT abandon a potentially live process tree!
      // Await existing in-flight termination if already running, or initiate bounded termination:
      const termPromise = childTerminatePromise || terminate(100);
      try {
        await termPromise;
      } catch {}

      // Finish resolving caller promise with the error (idempotent with finish)
      finish(err);
    });

    const pid = child.pid;
    if (!pid) {
      // Node.js emits 'error' (e.g. ENOENT) asynchronously on process.nextTick when spawn fails.
      // Give the error event a turn to fire; if no error event fires, resolve with undefined PID error.
      setImmediate(() => {
        if (settled) return;
        settled = true;
        cleanupTimers();
        resolve({
          stdout: '',
          stderr: '',
          exitCode: child.exitCode ?? null,
          timedOut: false,
          outputTruncated: false,
          error: new Error('Failed to spawn subprocess: child process PID is undefined'),
        });
      });
      return;
    }

    const pgid = pid;
    const entry: ActiveProcessEntry = { pid, pgid, spawnTimeMs, terminate };
    registryEntry = entry;
    activeSubprocesses.add(entry);

    // Timeout mechanism: terminates the entire process group if execution exceeds deadline
    timeoutTimer = setTimeout(async () => {
      if (!settled) {
        timedOut = true;
        await terminate(250);
      }
    }, timeoutMs);

    if (options.input && child.stdin) {
      try {
        child.stdin.write(options.input, 'utf-8', () => {
          try {
            child.stdin?.end();
          } catch {}
        });
      } catch {
        try {
          child.stdin.end();
        } catch {}
      }
    } else if (child.stdin) {
      try {
        child.stdin.end();
      } catch {}
    }

    // Bounded streaming: accumulate raw chunks up to maxBufferBytes, then drain stream
    if (child.stdout) {
      child.stdout.on('data', (chunk: Buffer) => {
        const remaining = maxBufferBytes - stdoutBytes;
        if (remaining > 0) {
          if (chunk.length <= remaining) {
            stdoutChunks.push(chunk);
            stdoutBytes += chunk.length;
          } else {
            stdoutChunks.push(chunk.subarray(0, remaining));
            stdoutBytes += remaining;
            outputTruncated = true;
          }
        } else {
          outputTruncated = true;
        }
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk: Buffer) => {
        const remaining = maxBufferBytes - stderrBytes;
        if (remaining > 0) {
          if (chunk.length <= remaining) {
            stderrChunks.push(chunk);
            stderrBytes += chunk.length;
          } else {
            stderrChunks.push(chunk.subarray(0, remaining));
            stderrBytes += remaining;
            outputTruncated = true;
          }
        } else {
          outputTruncated = true;
        }
      });
    }

    child.on('exit', async (_code) => {
      // Route through unified terminate mechanism if not already terminating
      const termPromise = childTerminatePromise || terminate(100);
      try {
        await termPromise;
      } catch {}

      // If open pipes are held by surviving processes, forcefully finish after 250ms
      const drainTimer = setTimeout(() => {
        finish();
      }, 250);
      if (typeof drainTimer.unref === 'function') drainTimer.unref();
    });

    child.on('close', async () => {
      const termPromise = childTerminatePromise || terminate(100);
      try {
        await termPromise;
      } catch {}
      finish();
    });
  });
}

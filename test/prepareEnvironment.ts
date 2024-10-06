/** @license CLI testing library
 * Copyright (c) Georgy Marchuk.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ChildProcessWithoutNullStreams } from 'child_process';
import {
    copyFile,
    readFile,
    unlink,
    rmdir,
    writeFile,
    mkdtemp,
    access,
    readdir,
    mkdir,
} from 'fs';
import path from 'path';
import { promisify } from 'util';
import { tmpdir } from 'os';

const keyMap = {
  arrowDown: '\x1B\x5B\x42',
  arrowLeft: '\x1b\x5b\x44',
  arrowRight: '\x1b\x5b\x43',
  arrowUp: '\x1b\x5b\x41',
  backSpace: '\x08',
  delete: '\x1b\x5b\x33\x7e',
  end: '\x1b\x4f\x46',
  enter: '\x0D',
  escape: '\x1b',
  home: '\x1b\x4f\x48',
  pageUp: '\x1b\x5b\x35\x7e',
  pageDown: '\x1b\x5b\x36\x7e',
  space: '\x20',
};

type KeyMap = keyof typeof keyMap;
const keyToHEx = (key: KeyMap) => {
  return keyMap[key];
};

export const copy = promisify(copyFile);
export const fsRead = promisify(readFile);
export const fsWrite = promisify(writeFile);
export const fsRemove = promisify(unlink);
export const fsRemoveDir = promisify(rmdir);
export const fsMakeDir = promisify(mkdir);
export const fsMakeTempDir = promisify(mkdtemp);
export const fsReadDir = promisify(readdir);
export const fsAccess = promisify(access);
export const relative = (p: string) => path.resolve(__dirname, p);

export const prepareEnvironment = async (): Promise<CLITestEnvironment> => {
    const hasCalledCleanup: {
        current: boolean;
    } = { current: false };
    const startedTasks: { current: ChildProcessWithoutNullStreams | null }[] =
        [];
    const tempDir = await fsMakeTempDir(
        path.join(tmpdir(), 'cli-testing-library-')
    );
    const relative = (p: string) => path.resolve(tempDir, p);
    const cleanup = async () => {
        hasCalledCleanup.current = true;

        startedTasks.forEach((task) => {
            task.current?.kill(0);
            task.current?.stdin.end();
            task.current?.stdin.destroy();
            task.current?.stdout.destroy();
            task.current?.stderr.destroy();

            task.current = null;
        });

        await fsRemoveDir(tempDir, { recursive: true });
    };

    try {
        const execute = async (
            runner: string,
            command: string,
            runFrom?: string
        ) => {
            const output = new Output();
            const currentProcessRef: {
                current: ChildProcessWithoutNullStreams | null;
            } = { current: null };

            const scopedExecute = createExecute(
                tempDir,
                output,
                currentProcessRef
            );

            startedTasks.push(currentProcessRef);

            return await scopedExecute(runner, command, runFrom);
        };
        const spawn = async (
            runner: string,
            command: string,
            runFrom?: string
        ): Promise<SpawnResult> => {
            const output = new Output();
            const currentProcessRef: {
                current: ChildProcessWithoutNullStreams | null;
            } = { current: null };
            const exitCodeRef: { current: ExitCode | null } = { current: null };
            let currentProcessPromise: Promise<ExecResult> | null = null;

            const scopedExecute = createExecute(
                tempDir,
                output,
                currentProcessRef,
                exitCodeRef
            );

            startedTasks.push(currentProcessRef);

            currentProcessPromise = scopedExecute(runner, command, runFrom);

            const waitForText = (
                input: string
            ): Promise<{ line: string; type: OutputType }> => {
                return new Promise((resolve) => {
                    const handler = (value: string) => {
                        if (value.toString().includes(input)) {
                            resolve({
                                type: 'stdout',
                                line: value.toString(),
                            });

                            output.off(handler);
                        }
                    };

                    output.on(handler);
                });
            };
            const wait = (delay: number): Promise<void> => {
                return new Promise((resolve) => {
                    setTimeout(resolve, delay);
                });
            };
            const waitForFinish = async (): Promise<ExecResult> => {
                if (currentProcessPromise) {
                    currentProcessRef.current?.stdin.end();

                    return currentProcessPromise;
                }

                return new Promise((resolve) => {
                    resolve({
                        code: exitCodeRef.current as ExitCode,
                        stdout: output.stdout,
                        stderr: output.stderr,
                    });
                });
            };
            const writeText = async (input: string): Promise<void> => {
                return new Promise((resolve) => {
                    if (checkRunningProcess(currentProcessRef)) {
                        currentProcessRef.current.stdin.write(input, () =>
                            resolve()
                        );
                    }
                });
            };
            const pressKey = async (input: KeyMap): Promise<void> => {
                return new Promise((resolve) => {
                    if (checkRunningProcess(currentProcessRef)) {
                        currentProcessRef.current.stdin.write(
                            keyToHEx(input),
                            () => {
                                resolve();
                            }
                        );
                    }
                });
            };
            const kill = (signal: NodeJS.Signals) => {
                if (checkRunningProcess(currentProcessRef)) {
                    currentProcessRef.current.kill(signal);
                }
            };
            const debug = () => {
                const handler = (value: string, type: OutputType) => {
                    process[type].write(value);
                };

                output.on(handler);
            };

            return {
                wait,
                waitForFinish,
                waitForText,
                pressKey,
                writeText,
                kill,
                debug,
                getStdout: () => output.stdout,
                getStderr: () => output.stderr,
                getExitCode: () => exitCodeRef.current,
            };
        };
        const exists = async (path: string) => {
            try {
                await fsAccess(relative(path));

                return true;
            } catch {
                return false;
            }
        };
        const makeDir = async (path: string) => {
            await fsMakeDir(relative(path), { recursive: true });
        };
        const writeFile = async (p: string, content: string) => {
            const dir = path.dirname(relative(p));
            if (!(await exists(dir))) {
                await makeDir(dir);
            }
            await fsWrite(relative(p), content);
        };
        const readFile = async (path: string) => {
            return (await fsRead(relative(path))).toString();
        };
        const removeFile = async (path: string) => {
            return await fsRemove(relative(path));
        };
        const removeDir = async (path: string) => {
            return await fsRemoveDir(relative(path));
        };
        const ls = async (path?: string) => {
            return await fsReadDir(path ? relative(path) : tempDir);
        };

        return {
            path: tempDir,
            cleanup,
            writeFile,
            readFile,
            removeFile,
            removeDir,
            ls,
            exists,
            makeDir,
            execute,
            spawn,
        };
    } catch (e) {
        await cleanup();
        throw e;
    }
};


type OutputType = 'stdout' | 'stderr';
type InternalOutputType = '_stdout' | '_stderr';

 class Output {
    private _stdoutHandlers: ((line: string, type: 'stdout') => void)[] = [];
    private _stderrHandlers: ((line: string, type: 'stderr') => void)[] = [];

    private _stdout: string[] = [];
    private _stderr: string[] = [];

    public replaceStrings: Record<string, string> = {};

    public get stdout(): string[] {
        return this.processStdLineGet(this._stdout);
    }

    public set stdout(value: string[]) {
        this.processStdLineSet(value, '_stdout');
        this._stdoutHandlers.forEach((fn) => {
            fn(value[0], 'stdout');
        });
    }

    public get stderr(): string[] {
        return this.processStdLineGet(this._stderr);
    }

    public set stderr(value: string[]) {
        this.processStdLineSet(value, '_stderr');
        this._stderrHandlers.forEach((fn) => {
            fn(value[0], 'stderr');
        });
    }

    private processStdLineSet = (value: string[], type: InternalOutputType) => {
        value.forEach((input) => {
            input
                .toString()
                .split('\n')
                .forEach((line) => {
                    this[type].push(line);
                });
        });
    };

    private processStdLineGet = (buffer: string[]) => {
        const output = buffer
            .map((line) => {
                let output = line.toString();

                for (const [original, replaced] of Object.entries(
                    this.replaceStrings
                )) {
                    const reg = new RegExp(original, 'gm');

                    output = output.replace(reg, replaced);
                    output = output.trim();
                }

                return output;
            })
            .filter((line) => line !== '');

        return output;
    };

    public on = (
        handler: (line: string, type: OutputType) => void,
        type?: OutputType
    ) => {
        if (type === 'stdout') {
            this._stdoutHandlers.push(handler);
            return;
        }
        if (type === 'stderr') {
            this._stderrHandlers.push(handler);
            return;
        }

        this._stdoutHandlers.push(handler);
        this._stderrHandlers.push(handler);
    };

    public off = (
        handler: (line: string, type: OutputType) => void,
        type?: OutputType
    ) => {
        if (type === 'stdout') {
            this._stdoutHandlers = this._stdoutHandlers.filter(
                (item) => item !== handler
            );
            return;
        }
        if (type === 'stderr') {
            this._stderrHandlers = this._stderrHandlers.filter(
                (item) => item !== handler
            );
            return;
        }

        this._stdoutHandlers = this._stdoutHandlers.filter(
            (item) => item !== handler
        );
        this._stderrHandlers = this._stderrHandlers.filter(
            (item) => item !== handler
        );
    };
}



export const checkRunningProcess = (currentProcessRef: {
    current: ChildProcessWithoutNullStreams | null;
}): currentProcessRef is { current: ChildProcessWithoutNullStreams } => {
    if (!currentProcessRef.current) {
        throw new Error(
            'No process is running. Start it with `execute`, or the process has already finished.'
        );
    }

    return true;
};


type SpawnResult = {
  wait: (delay: number) => Promise<void>;
  waitForText: (
      output: string
  ) => Promise<{ line: string; type: 'stdout' | 'stderr' }>;
  waitForFinish: () => Promise<ExecResult>;
  writeText: (input: string) => Promise<void>;
  getStdout: () => string[];
  getStderr: () => string[];
  getExitCode: () => null | ExitCode;
  kill: (signal: NodeJS.Signals) => void;
  debug: () => void;
  pressKey: (input: KeyMap) => Promise<void>;
};

type CLITestEnvironment = {
  path: string;
  cleanup: () => Promise<void>;
  writeFile: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  removeFile: (path: string) => Promise<void>;
  removeDir: (path: string) => Promise<void>;
  ls: (path?: string) => Promise<string[]>;
  exists: (path: string) => Promise<boolean>;
  makeDir: (path: string) => Promise<void>;

  execute: (
      runner: string,
      command: string,
      runFrom?: string
  ) => Promise<ExecResult>;
  spawn: (
      runner: string,
      command: string,
      runFrom?: string
  ) => Promise<SpawnResult>;
};


import { spawn } from 'child_process';
import { homedir } from 'os';

type ExitCode = 0 | 1;
type ExecResult = { code: ExitCode; stdout: string[]; stderr: string[] };
function createExecute(
    base: string,
    output: Output,
    currentProcessRef?: { current: ChildProcessWithoutNullStreams | null },
    exitCodeRef?: { current: ExitCode | null }
) {
    return (
        runner: string,
        command: string,
        runFrom?: string
    ): Promise<ExecResult> => {
        return new Promise((accept) => {
            output.replaceStrings = {
                [homedir()]: '{{homedir}}',
                [`/private${base}`]: '{{base}}',
                [base]: '{{base}}',
                '[\\u001b\\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]':
                    '',
                '': '', // you might not see it, but there is a special ESC symbol
            };

            const args = command
                .split(' ')
                .map((arg) =>
                    arg.includes('./') ? path.join(process.cwd(), arg) : arg
                );
            let shell: ChildProcessWithoutNullStreams | null = spawn(
                runner,
                args,
                {
                    cwd: runFrom ? path.join(base, runFrom) : path.join(base),
                }
            );

            shell.stdin.setDefaultEncoding('utf8');

            if (currentProcessRef) {
                currentProcessRef.current = shell;
            }

            shell.stdout.on('data', (s: string) => (output.stdout = [s]));
            shell.stderr.on('data', (s: string) => (output.stderr = [s]));
            shell.on('close', (code: 0 | 1) => {
                if (exitCodeRef) {
                    exitCodeRef.current = code;
                }

                return accept({
                    code,
                    stdout: output.stdout,
                    stderr: output.stderr,
                });
            });

            shell.unref();
            shell = null;
        });
    };
}

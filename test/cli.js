const pathModule = require('path');
const expect = require('unexpected').clone();

const childProcess = require('child_process');

function consumeStream(stream) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    stream
      .on('data', buffer => buffers.push(buffer))
      .on('end', () => resolve(Buffer.concat(buffers)))
      .on('error', reject);
  });
}

async function run(commandAndArgs, stdin) {
  if (typeof commandAndArgs !== 'undefined' && !Array.isArray(commandAndArgs)) {
    commandAndArgs = [commandAndArgs];
  }

  const proc = childProcess.spawn(commandAndArgs[0], commandAndArgs.slice(1));

  const promises = {
    exit: new Promise((resolve, reject) => {
      proc.on('error', reject).on('exit', exitCode => {
        if (exitCode === 0) {
          resolve();
        } else {
          const err = new Error(`Child process exited with ${exitCode}`);
          err.exitCode = exitCode;
          reject(err);
        }
      });
    }),
    stdin: new Promise((resolve, reject) => {
      proc.stdin.on('error', reject).on('close', resolve);
    }),
    stdout: consumeStream(proc.stdout),
    stderr: consumeStream(proc.stderr)
  };

  if (typeof stdin === 'undefined') {
    proc.stdin.end();
  } else {
    proc.stdin.end(stdin);
  }

  try {
    await Promise.all(Object.values(promises));
    return [await promises.stdout, await promises.stderr];
  } catch (err) {
    err.stdout = await promises.stdout;
    err.stderr = await promises.stderr;
    throw err;
  }
}

async function runSubfont(...args) {
  const proc = childProcess.spawn(
    pathModule.resolve(__dirname, '..', 'lib', 'cli.js'),
    args
  );

  const promises = {
    exit: new Promise((resolve, reject) => {
      proc.on('error', reject).on('exit', exitCode => {
        if (exitCode === 0) {
          resolve();
        } else {
          const err = new Error(`Child process exited with ${exitCode}`);
          err.exitCode = exitCode;
          reject(err);
        }
      });
    }),
    stdin: new Promise((resolve, reject) => {
      proc.stdin.on('error', reject).on('close', resolve);
    }),
    stdout: consumeStream(proc.stdout),
    stderr: consumeStream(proc.stderr)
  };

  proc.stdin.end();

  let err;
  try {
    await Promise.all(Object.values(promises));
  } catch (_err) {
    err = _err;
  }
  return {
    err,
    stdout: (await promises.stdout).toString('utf-8'),
    stderr: (await promises.stderr).toString('utf-8')
  };
}

describe('cli', function() {
  it('should display usage info if --help is passed', async function() {
    const { err, stdout } = await runSubfont('--help');
    expect(err, 'to be falsy');
    expect(stdout, 'to contain', 'Options:');
    expect(stdout, 'not to contain', 'No input files');
  });

  it('should display usage info if an error is encountered', async function() {
    const { err, stderr } = await runSubfont('i-do-not-exist.html');
    expect(err, 'to have property', 'exitCode', 1);
    expect(stderr, 'to contain', 'Options:');
  });

  it('should a wrong usage error without a stack trace', async function() {
    const { err, stderr } = await runSubfont('https://example.com');
    expect(err, 'to have property', 'exitCode', 1);
    expect(
      stderr,
      'to contain',
      '--output has to be specified when using non-file input urls'
    );
    expect(stderr, 'not to match', /^\s+at/m);
  });
});

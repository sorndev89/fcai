/**
 * Monkey-patch fs removal functions for Windows EPERM workaround.
 *
 * PROBLEM:
 *   VS Code's TypeScript language server holds file handles on .d.ts and .json
 *   files inside node_modules/.cache/nuxt/.  Nuxt/Nitro uses fs.unlink(),
 *   fs.rm(), and their Sync/promises variants.  On Windows, these all fail with
 *   EPERM when the target file is open in another process.
 *
 * SOLUTION:
 *   Intercept ALL fs removal operations and fall back to the Windows
 *   `del /f /q` command when EPERM occurs.  This uses the Windows DeleteFileW
 *   API directly which CAN force-delete files even when other processes hold
 *   handles (provided FILE_SHARE_DELETE was granted, which VS Code does).
 *
 * USAGE:
 *   This script is loaded automatically via NODE_OPTIONS="--require ..."
 *   by scripts/build.js before running the frontend build step.
 */

'use strict';

// Only needed on Windows
if (process.platform !== 'win32') {
  module.exports = {};
  return;
}

const { execSync } = require('child_process');

let hasLogged = false;
function logOnce() {
  if (!hasLogged) {
    // Can't use console.log in preload phase reliably, use process.stderr
    process.stderr.write('[patch-fs-unlink] Applied fs EPERM workaround\n');
    hasLogged = true;
  }
}

/**
 * Escape a file path for safe use in a Windows cmd.exe command.
 * Special chars: & | < > ^ ( )
 */
function escapeForCmd(fp) {
  return fp.replace(/[&|<>^()]/g, '^$&');
}

/**
 * Force-delete a single file using Windows del /f /q command.
 * Returns true if the command likely succeeded.
 */
function forceDelete(filePath) {
  try {
    const escaped = escapeForCmd(filePath);
    execSync(`del /f /q "${escaped}" 2>nul`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ── Helper: wrap a synchronous unlink/rm function ──
function wrapSyncFn(origFn) {
  return function patchedSync(filePath, options) {
    try {
      return origFn(filePath, options);
    } catch (err) {
      if (err.code === 'EPERM') {
        logOnce();
        if (forceDelete(filePath)) return undefined; // success
      }
      throw err;
    }
  };
}

// ── Helper: wrap a callback-based unlink/rm function ──
function wrapCallbackFn(origFn) {
  return function patchedCallback(filePath, options, callback) {
    // Normalize arguments: (path, cb) or (path, options, cb)
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    // fs.unlink() only accepts (path, callback) — no options param.
    // fs.rm() accepts (path, options, callback).
    // Only pass options when it's defined to avoid "cb must be function"
    // errors on Node.js v24+.
    const cb = (err) => {
      if (err && err.code === 'EPERM') {
        logOnce();
        if (forceDelete(filePath)) {
          if (typeof callback === 'function') callback(null);
          return;
        }
      }
      if (typeof callback === 'function') callback(err);
    };
    if (options !== undefined) {
      origFn(filePath, options, cb);
    } else {
      origFn(filePath, cb);
    }
  };
}

// ── Helper: wrap a promises-based unlink/rm function ──
function wrapPromiseFn(origFn) {
  return async function patchedPromise(filePath, options) {
    try {
      return await origFn(filePath, options);
    } catch (err) {
      if (err.code === 'EPERM') {
        logOnce();
        if (forceDelete(filePath)) return; // success
      }
      throw err;
    }
  };
}

// ── Patch fs (CommonJS) ──
const fs = require('fs');

// fs.unlinkSync + fs.rmSync
fs.unlinkSync = wrapSyncFn(fs.unlinkSync.bind(fs));
fs.rmSync = wrapSyncFn(fs.rmSync.bind(fs));

// fs.unlink (callback)
fs.unlink = wrapCallbackFn(fs.unlink.bind(fs));

// fs.rm (callback) - added in Node 14.14
if (typeof fs.rm === 'function') {
  fs.rm = wrapCallbackFn(fs.rm.bind(fs));
}

// ── Patch fs.promises ──
if (fs.promises) {
  if (typeof fs.promises.unlink === 'function') {
    fs.promises.unlink = wrapPromiseFn(fs.promises.unlink.bind(fs.promises));
  }
  if (typeof fs.promises.rm === 'function') {
    fs.promises.rm = wrapPromiseFn(fs.promises.rm.bind(fs.promises));
  }
}

// ── Also patch require('node:fs/promises') directly ──
// Some ESM imports go through the internal 'node:fs/promises' binding which
// may reference a different object than fs.promises.
try {
  const fsPromises = require('node:fs/promises');
  if (typeof fsPromises.unlink === 'function' && fsPromises.unlink.name !== 'patchedPromise') {
    const orig = fsPromises.unlink.bind(fsPromises);
    fsPromises.unlink = async function patchedFsPromisesUnlink(fp, opts) {
      try { return await orig(fp, opts); }
      catch (err) {
        if (err.code === 'EPERM' && forceDelete(fp)) { logOnce(); return; }
        throw err;
      }
    };
  }
  if (typeof fsPromises.rm === 'function' && fsPromises.rm.name !== 'patchedPromise') {
    const orig = fsPromises.rm.bind(fsPromises);
    fsPromises.rm = async function patchedFsPromisesRm(fp, opts) {
      try { return await orig(fp, opts); }
      catch (err) {
        if (err.code === 'EPERM' && forceDelete(fp)) { logOnce(); return; }
        throw err;
      }
    };
  }
} catch (e) {
  // node:fs/promises might not be available (very old Node.js)
}

// ── Also patch require('fs/promises') directly ──
try {
  const fsPromisesCjs = require('fs/promises');
  if (typeof fsPromisesCjs.unlink === 'function' && fsPromisesCjs.unlink.name !== 'patchedPromise') {
    const orig = fsPromisesCjs.unlink.bind(fsPromisesCjs);
    fsPromisesCjs.unlink = async function patchedFsPromisesCjsUnlink(fp, opts) {
      try { return await orig(fp, opts); }
      catch (err) {
        if (err.code === 'EPERM' && forceDelete(fp)) { logOnce(); return; }
        throw err;
      }
    };
  }
  if (typeof fsPromisesCjs.rm === 'function' && fsPromisesCjs.rm.name !== 'patchedPromise') {
    const orig = fsPromisesCjs.rm.bind(fsPromisesCjs);
    fsPromisesCjs.rm = async function patchedFsPromisesCjsRm(fp, opts) {
      try { return await orig(fp, opts); }
      catch (err) {
        if (err.code === 'EPERM' && forceDelete(fp)) { logOnce(); return; }
        throw err;
      }
    };
  }
} catch (e) {
  // fs/promises might not be available
}

module.exports = {};

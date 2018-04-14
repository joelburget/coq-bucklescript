var Module = function(Module) {
  Module = Module || {};

// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module !== 'undefined' ? Module : {};

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
// {{PRE_JSES}}

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
var key;
for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

Module['arguments'] = [];
Module['thisProgram'] = './this.program';
Module['quit'] = function(status, toThrow) {
  throw toThrow;
};
Module['preRun'] = [];
Module['postRun'] = [];

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;

// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)

if (Module['ENVIRONMENT']) {
  if (Module['ENVIRONMENT'] === 'WEB') {
    ENVIRONMENT_IS_WEB = true;
  } else if (Module['ENVIRONMENT'] === 'WORKER') {
    ENVIRONMENT_IS_WORKER = true;
  } else if (Module['ENVIRONMENT'] === 'NODE') {
    ENVIRONMENT_IS_NODE = true;
  } else if (Module['ENVIRONMENT'] === 'SHELL') {
    ENVIRONMENT_IS_SHELL = true;
  } else {
    throw new Error('Module[\'ENVIRONMENT\'] value is not valid. must be one of: WEB|WORKER|NODE|SHELL.');
  }
} else {
  ENVIRONMENT_IS_WEB = typeof window === 'object';
  ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
  ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
  ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
}


if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  var nodeFS;
  var nodePath;

  Module['read'] = function shell_read(filename, binary) {
    var ret;
    ret = tryParseAsDataURI(filename);
    if (!ret) {
      if (!nodeFS) nodeFS = require('fs');
      if (!nodePath) nodePath = require('path');
      filename = nodePath['normalize'](filename);
      ret = nodeFS['readFileSync'](filename);
    }
    return binary ? ret : ret.toString();
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  if (process['argv'].length > 1) {
    Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
  }

  Module['arguments'] = process['argv'].slice(2);

  // MODULARIZE will export the module in the proper place outside, we don't need to export here

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });
  // Currently node will swallow unhandled rejections, but this behavior is
  // deprecated, and in the future it will exit with error status.
  process['on']('unhandledRejection', function(reason, p) {
    Module['printErr']('node.js exiting due to unhandled promise rejection');
    process['exit'](1);
  });

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
}
else if (ENVIRONMENT_IS_SHELL) {
  if (typeof read != 'undefined') {
    Module['read'] = function shell_read(f) {
      var data = tryParseAsDataURI(f);
      if (data) {
        return intArrayToString(data);
      }
      return read(f);
    };
  }

  Module['readBinary'] = function readBinary(f) {
    var data;
    data = tryParseAsDataURI(f);
    if (data) {
      return data;
    }
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof quit === 'function') {
    Module['quit'] = function(status, toThrow) {
      quit(status);
    }
  }
}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function shell_read(url) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send(null);
      return xhr.responseText;
    } catch (err) {
      var data = tryParseAsDataURI(url);
      if (data) {
        return intArrayToString(data);
      }
      throw err;
    }
  };

  if (ENVIRONMENT_IS_WORKER) {
    Module['readBinary'] = function readBinary(url) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.responseType = 'arraybuffer';
        xhr.send(null);
        return new Uint8Array(xhr.response);
      } catch (err) {
        var data = tryParseAsDataURI(url);
        if (data) {
          return data;
        }
        throw err;
      }
    };
  }

  Module['readAsync'] = function readAsync(url, onload, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function xhr_onload() {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
        return;
      }
      var data = tryParseAsDataURI(url);
      if (data) {
        onload(data.buffer);
        return;
      }
      onerror();
    };
    xhr.onerror = onerror;
    xhr.send(null);
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  Module['setWindowTitle'] = function(title) { document.title = title };
}
else {
  // Unreachable because SHELL is dependent on the others
  throw new Error('unknown runtime environment');
}

// console.log is checked first, as 'print' on the web will open a print dialogue
// printErr is preferable to console.warn (works better in shells)
// bind(console) is necessary to fix IE/Edge closed dev tools panel behavior.
Module['print'] = typeof console !== 'undefined' ? console.log.bind(console) : (typeof print !== 'undefined' ? print : null);
Module['printErr'] = typeof printErr !== 'undefined' ? printErr : ((typeof console !== 'undefined' && console.warn.bind(console)) || Module['print']);

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Merge back in the overrides
for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = undefined;



// {{PREAMBLE_ADDITIONS}}

var STACK_ALIGN = 16;

// stack management, and other functionality that is provided by the compiled code,
// should not be used before it is ready
stackSave = stackRestore = stackAlloc = setTempRet0 = getTempRet0 = function() {
  abort('cannot use the stack before compiled code is ready to run, and has provided stack access');
};

function staticAlloc(size) {
  assert(!staticSealed);
  var ret = STATICTOP;
  STATICTOP = (STATICTOP + size + 15) & -16;
  return ret;
}

function dynamicAlloc(size) {
  assert(DYNAMICTOP_PTR);
  var ret = HEAP32[DYNAMICTOP_PTR>>2];
  var end = (ret + size + 15) & -16;
  HEAP32[DYNAMICTOP_PTR>>2] = end;
  if (end >= TOTAL_MEMORY) {
    var success = enlargeMemory();
    if (!success) {
      HEAP32[DYNAMICTOP_PTR>>2] = ret;
      return 0;
    }
  }
  return ret;
}

function alignMemory(size, factor) {
  if (!factor) factor = STACK_ALIGN; // stack alignment (16-byte) by default
  var ret = size = Math.ceil(size / factor) * factor;
  return ret;
}

function getNativeTypeSize(type) {
  switch (type) {
    case 'i1': case 'i8': return 1;
    case 'i16': return 2;
    case 'i32': return 4;
    case 'i64': return 8;
    case 'float': return 4;
    case 'double': return 8;
    default: {
      if (type[type.length-1] === '*') {
        return 4; // A pointer
      } else if (type[0] === 'i') {
        var bits = parseInt(type.substr(1));
        assert(bits % 8 === 0);
        return bits / 8;
      } else {
        return 0;
      }
    }
  }
}

function warnOnce(text) {
  if (!warnOnce.shown) warnOnce.shown = {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    Module.printErr(text);
  }
}



var jsCallStartIndex = 1;
var functionPointers = new Array(0);

// 'sig' parameter is only used on LLVM wasm backend
function addFunction(func, sig) {
  if (typeof sig === 'undefined') {
    Module.printErr('Warning: addFunction: Provide a wasm function signature ' +
                    'string as a second argument');
  }
  var base = 0;
  for (var i = base; i < base + 0; i++) {
    if (!functionPointers[i]) {
      functionPointers[i] = func;
      return jsCallStartIndex + i;
    }
  }
  throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
}

function removeFunction(index) {
  functionPointers[index-jsCallStartIndex] = null;
}

var funcWrappers = {};

function getFuncWrapper(func, sig) {
  if (!func) return; // on null pointer, return undefined
  assert(sig);
  if (!funcWrappers[sig]) {
    funcWrappers[sig] = {};
  }
  var sigCache = funcWrappers[sig];
  if (!sigCache[func]) {
    // optimize away arguments usage in common cases
    if (sig.length === 1) {
      sigCache[func] = function dynCall_wrapper() {
        return dynCall(sig, func);
      };
    } else if (sig.length === 2) {
      sigCache[func] = function dynCall_wrapper(arg) {
        return dynCall(sig, func, [arg]);
      };
    } else {
      // general case
      sigCache[func] = function dynCall_wrapper() {
        return dynCall(sig, func, Array.prototype.slice.call(arguments));
      };
    }
  }
  return sigCache[func];
}


function makeBigInt(low, high, unsigned) {
  return unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0));
}

function dynCall(sig, ptr, args) {
  if (args && args.length) {
    assert(args.length == sig.length-1);
    assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
    return Module['dynCall_' + sig].apply(null, [ptr].concat(args));
  } else {
    assert(sig.length == 1);
    assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
    return Module['dynCall_' + sig].call(null, ptr);
  }
}


function getCompilerSetting(name) {
  throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for getCompilerSetting or emscripten_get_compiler_setting to work';
}

var Runtime = {
  // FIXME backwards compatibility layer for ports. Support some Runtime.*
  //       for now, fix it there, then remove it from here. That way we
  //       can minimize any period of breakage.
  dynCall: dynCall, // for SDL2 port
  // helpful errors
  getTempRet0: function() { abort('getTempRet0() is now a top-level function, after removing the Runtime object. Remove "Runtime."') },
  staticAlloc: function() { abort('staticAlloc() is now a top-level function, after removing the Runtime object. Remove "Runtime."') },
  stackAlloc: function() { abort('stackAlloc() is now a top-level function, after removing the Runtime object. Remove "Runtime."') },
};

// The address globals begin at. Very low in memory, for code size and optimization opportunities.
// Above 0 is static memory, starting with globals.
// Then the stack.
// Then 'dynamic' memory for sbrk.
var GLOBAL_BASE = 8;



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html



//========================================
// Runtime essentials
//========================================

var ABORT = 0; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  assert(func, 'Cannot call unknown function ' + ident + ', make sure it is exported');
  return func;
}

var JSfuncs = {
  // Helpers for cwrap -- it can't refer to Runtime directly because it might
  // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
  // out what the minified function name is.
  'stackSave': function() {
    stackSave()
  },
  'stackRestore': function() {
    stackRestore()
  },
  // type conversion from js to c
  'arrayToC' : function(arr) {
    var ret = stackAlloc(arr.length);
    writeArrayToMemory(arr, ret);
    return ret;
  },
  'stringToC' : function(str) {
    var ret = 0;
    if (str !== null && str !== undefined && str !== 0) { // null string
      // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
      var len = (str.length << 2) + 1;
      ret = stackAlloc(len);
      stringToUTF8(str, ret, len);
    }
    return ret;
  }
};
// For fast lookup of conversion functions
var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

// C calling interface.
function ccall (ident, returnType, argTypes, args, opts) {
  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  assert(returnType !== 'array', 'Return type should not be "array".');
  if (args) {
    for (var i = 0; i < args.length; i++) {
      var converter = toC[argTypes[i]];
      if (converter) {
        if (stack === 0) stack = stackSave();
        cArgs[i] = converter(args[i]);
      } else {
        cArgs[i] = args[i];
      }
    }
  }
  var ret = func.apply(null, cArgs);
  if (returnType === 'string') ret = Pointer_stringify(ret);
  if (stack !== 0) {
    stackRestore(stack);
  }
  return ret;
}

function cwrap (ident, returnType, argTypes) {
  argTypes = argTypes || [];
  var cfunc = getCFunc(ident);
  // When the function takes numbers and returns a number, we can just return
  // the original function
  var numericArgs = argTypes.every(function(type){ return type === 'number'});
  var numericRet = returnType !== 'string';
  if (numericRet && numericArgs) {
    return cfunc;
  }
  return function() {
    return ccall(ident, returnType, argTypes, arguments);
  }
}

/** @type {function(number, number, string, boolean=)} */
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}

/** @type {function(number, string, boolean=)} */
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for getValue: ' + type);
    }
  return null;
}

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
/** @type {function((TypedArray|Array<number>|number), string, number, number=)} */
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [typeof _malloc === 'function' ? _malloc : staticAlloc, stackAlloc, staticAlloc, dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var stop;
    ptr = ret;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(/** @type {!Uint8Array} */ (slab), ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return staticAlloc(size);
  if (!runtimeInitialized) return dynamicAlloc(size);
  return _malloc(size);
}

/** @type {function(number, number=)} */
function Pointer_stringify(ptr, length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return UTF8ToString(ptr);
}

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;
function UTF8ArrayToString(u8Array, idx) {
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  while (u8Array[endPtr]) ++endPtr;

  if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
  } else {
    var u0, u1, u2, u3, u4, u5;

    var str = '';
    while (1) {
      // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
      u0 = u8Array[idx++];
      if (!u0) return str;
      if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
      u1 = u8Array[idx++] & 63;
      if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
      u2 = u8Array[idx++] & 63;
      if ((u0 & 0xF0) == 0xE0) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
        u3 = u8Array[idx++] & 63;
        if ((u0 & 0xF8) == 0xF0) {
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
        } else {
          u4 = u8Array[idx++] & 63;
          if ((u0 & 0xFC) == 0xF8) {
            u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
          } else {
            u5 = u8Array[idx++] & 63;
            u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
          }
        }
      }
      if (u0 < 0x10000) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 0x10000;
        str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
      }
    }
  }
}

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8,ptr);
}

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;
function UTF16ToString(ptr) {
  assert(ptr % 2 == 0, 'Pointer passed to UTF16ToString must be aligned to two bytes!');
  var endPtr = ptr;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  var idx = endPtr >> 1;
  while (HEAP16[idx]) ++idx;
  endPtr = idx << 1;

  if (endPtr - ptr > 32 && UTF16Decoder) {
    return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
  } else {
    var i = 0;

    var str = '';
    while (1) {
      var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
      if (codeUnit == 0) return str;
      ++i;
      // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
      str += String.fromCharCode(codeUnit);
    }
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  assert(outPtr % 2 == 0, 'Pointer passed to stringToUTF16 must be aligned to two bytes!');
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}

function UTF32ToString(ptr) {
  assert(ptr % 4 == 0, 'Pointer passed to UTF32ToString must be aligned to four bytes!');
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  assert(outPtr % 4 == 0, 'Pointer passed to stringToUTF32 must be aligned to four bytes!');
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}

// Allocate heap space for a JS string, and write it there.
// It is the responsibility of the caller to free() that memory.
function allocateUTF8(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = _malloc(size);
  if (ret) stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}

// Allocate stack space for a JS string, and write it there.
function allocateUTF8OnStack(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = stackAlloc(size);
  stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}

function demangle(func) {
  warnOnce('warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  return func;
}

function demangleAll(text) {
  var regex =
    /__Z[\w\d_]+/g;
  return text.replace(regex,
    function(x) {
      var y = demangle(x);
      return x === y ? x : (x + ' [' + y + ']');
    });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  var js = jsStackTrace();
  if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
  return demangleAll(js);
}

// Memory management

var PAGE_SIZE = 16384;
var WASM_PAGE_SIZE = 65536;
var ASMJS_PAGE_SIZE = 16777216;
var MIN_TOTAL_MEMORY = 16777216;

function alignUp(x, multiple) {
  if (x % multiple > 0) {
    x += multiple - (x % multiple);
  }
  return x;
}

var HEAP,
/** @type {ArrayBuffer} */
  buffer,
/** @type {Int8Array} */
  HEAP8,
/** @type {Uint8Array} */
  HEAPU8,
/** @type {Int16Array} */
  HEAP16,
/** @type {Uint16Array} */
  HEAPU16,
/** @type {Int32Array} */
  HEAP32,
/** @type {Uint32Array} */
  HEAPU32,
/** @type {Float32Array} */
  HEAPF32,
/** @type {Float64Array} */
  HEAPF64;

function updateGlobalBuffer(buf) {
  Module['buffer'] = buffer = buf;
}

function updateGlobalBufferViews() {
  Module['HEAP8'] = HEAP8 = new Int8Array(buffer);
  Module['HEAP16'] = HEAP16 = new Int16Array(buffer);
  Module['HEAP32'] = HEAP32 = new Int32Array(buffer);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer);
}

var STATIC_BASE, STATICTOP, staticSealed; // static area
var STACK_BASE, STACKTOP, STACK_MAX; // stack area
var DYNAMIC_BASE, DYNAMICTOP_PTR; // dynamic area handled by sbrk

  STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
  staticSealed = false;


// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  assert((STACK_MAX & 3) == 0);
  HEAPU32[(STACK_MAX >> 2)-1] = 0x02135467;
  HEAPU32[(STACK_MAX >> 2)-2] = 0x89BACDFE;
}

function checkStackCookie() {
  if (HEAPU32[(STACK_MAX >> 2)-1] != 0x02135467 || HEAPU32[(STACK_MAX >> 2)-2] != 0x89BACDFE) {
    abort('Stack overflow! Stack cookie has been overwritten, expected hex dwords 0x89BACDFE and 0x02135467, but received 0x' + HEAPU32[(STACK_MAX >> 2)-2].toString(16) + ' ' + HEAPU32[(STACK_MAX >> 2)-1].toString(16));
  }
  // Also test the global address 0 for integrity. This check is not compatible with SAFE_SPLIT_MEMORY though, since that mode already tests all address 0 accesses on its own.
  if (HEAP32[0] !== 0x63736d65 /* 'emsc' */) throw 'Runtime error: The application has corrupted its heap memory area (address zero)!';
}

function abortStackOverflow(allocSize) {
  abort('Stack overflow! Attempted to allocate ' + allocSize + ' bytes on the stack, but stack has only ' + (STACK_MAX - stackSave() + allocSize) + ' bytes available!');
}

function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or (4) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}


function enlargeMemory() {
  abortOnCannotGrowMemory();
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
if (TOTAL_MEMORY < TOTAL_STACK) Module.printErr('TOTAL_MEMORY should be larger than TOTAL_STACK, was ' + TOTAL_MEMORY + '! (TOTAL_STACK=' + TOTAL_STACK + ')');

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && Int32Array.prototype.subarray !== undefined && Int32Array.prototype.set !== undefined,
       'JS engine does not provide full typed array support');



// Use a provided buffer, if there is one, or else allocate a new one
if (Module['buffer']) {
  buffer = Module['buffer'];
  assert(buffer.byteLength === TOTAL_MEMORY, 'provided buffer should be ' + TOTAL_MEMORY + ' bytes, but it is ' + buffer.byteLength);
} else {
  // Use a WebAssembly memory where available
  {
    buffer = new ArrayBuffer(TOTAL_MEMORY);
  }
  assert(buffer.byteLength === TOTAL_MEMORY);
  Module['buffer'] = buffer;
}
updateGlobalBufferViews();


function getTotalMemory() {
  return TOTAL_MEMORY;
}

// Endianness check (note: assumes compiler arch was little-endian)
  HEAP32[0] = 0x63736d65; /* 'emsc' */
HEAP16[1] = 0x6373;
if (HEAPU8[2] !== 0x73 || HEAPU8[3] !== 0x63) throw 'Runtime error: expected the system to be little-endian!';

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Module['dynCall_v'](func);
      } else {
        Module['dynCall_vi'](func, callback.arg);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  checkStackCookie();
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  checkStackCookie();
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  checkStackCookie();
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  checkStackCookie();
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

// Deprecated: This function should not be called because it is unsafe and does not provide
// a maximum length limit of how many bytes it is allowed to write. Prefer calling the
// function stringToUTF8Array() instead, which takes in a maximum length that can be used
// to be secure from out of bounds writes.
/** @deprecated */
function writeStringToMemory(string, buffer, dontAddNull) {
  warnOnce('writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!');

  var /** @type {number} */ lastChar, /** @type {number} */ end;
  if (dontAddNull) {
    // stringToUTF8Array always appends null. If we don't want to do that, remember the
    // character that existed at the location where the null will be placed, and restore
    // that after the write (below).
    end = buffer + lengthBytesUTF8(string);
    lastChar = HEAP8[end];
  }
  stringToUTF8(string, buffer, Infinity);
  if (dontAddNull) HEAP8[end] = lastChar; // Restore the value under the null character.
}

function writeArrayToMemory(array, buffer) {
  assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
  HEAP8.set(array, buffer);
}

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

assert(Math['imul'] && Math['fround'] && Math['clz32'] && Math['trunc'], 'this is a legacy browser, build with LEGACY_VM_SUPPORT');

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_round = Math.round;
var Math_min = Math.min;
var Math_max = Math.max;
var Math_clz32 = Math.clz32;
var Math_trunc = Math.trunc;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 10000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;



var /* show errors on likely calls to FS when it was not included */ FS = {
  error: function() {
    abort('Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with  -s FORCE_FILESYSTEM=1');
  },
  init: function() { FS.error() },
  createDataFile: function() { FS.error() },
  createPreloadedFile: function() { FS.error() },
  createLazyFile: function() { FS.error() },
  open: function() { FS.error() },
  mkdev: function() { FS.error() },
  registerDevice: function() { FS.error() },
  analyzePath: function() { FS.error() },
  loadFilesFromDB: function() { FS.error() },

  ErrnoError: function ErrnoError() { FS.error() },
};
Module['FS_createDataFile'] = FS.createDataFile;
Module['FS_createPreloadedFile'] = FS.createPreloadedFile;



// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

// Indicates whether filename is a base64 data URI.
function isDataURI(filename) {
  return String.prototype.startsWith ?
      filename.startsWith(dataURIPrefix) :
      filename.indexOf(dataURIPrefix) === 0;
}





// === Body ===

var ASM_CONSTS = [];





STATIC_BASE = GLOBAL_BASE;

STATICTOP = STATIC_BASE + 5520;
/* global initializers */  __ATINIT__.push();


memoryInitializer = "data:application/octet-stream;base64,AQAAAAIAAAADAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAAMAAAADQAAAA4AAAAPAAAAEAAAABEAAAASAAAAEwAAABQAAAAVAAAAFgAAABcAAAAYAAAAGQAAABoAAAAbAAAAHAAAAB0AAAAeAAAAHwAAACAAAAAhAAAAIgAAACMAAAAkAAAAJQAAACYAAAAnAAAAKAAAACkAAAAqAAAAKwAAACwAAAAtAAAALgAAAC8AAAAwAAAAMQAAADIAAAAzAAAANAAAADUAAAA2AAAANwAAADgAAAA5AAAAOgAAADsAAAA8AAAAPQAAAD4AAAA/AAAAQAAAAEEAAABCAAAAQwAAAEQAAABFAAAARgAAAEcAAABIAAAASQAAAEoAAABLAAAATAAAAE0AAABOAAAATwAAAFAAAABRAAAAUgAAAFMAAABUAAAAVQAAAFYAAABXAAAAWAAAAFkAAABaAAAAWwAAAFwAAABdAAAAXgAAAF8AAABgAAAAYQAAAGIAAABjAAAAZAAAAGUAAABmAAAAZwAAAGgAAABpAAAAagAAAGsAAABsAAAAAAAEAMABAAAFAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAwAAAHwRAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAD//////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAMAAACEEQAAAAQAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAACv////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEwRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYWxyZWFkeSBvcGVuIAoAQ29xIFZhbHVlcyA6IGNvcV9jbG9zdXJlX2FyaXR5ABEACgAREREAAAAABQAAAAAAAAkAAAAACwAAAAAAAAAAEQAPChEREQMKBwABEwkLCwAACQYLAAALAAYRAAAAERERAAAAAAAAAAAAAAAAAAAAAAsAAAAAAAAAABEACgoREREACgAAAgAJCwAAAAkACwAACwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAAAAwAAAAACQwAAAAAAAwAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAADQAAAAQNAAAAAAkOAAAAAAAOAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAA8AAAAADwAAAAAJEAAAAAAAEAAAEAAAEgAAABISEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASAAAAEhISAAAAAAAACQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAAAAAAAAAAACgAAAAAKAAAAAAkLAAAAAAALAAALAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAADAAAAAAJDAAAAAAADAAADAAALSsgICAwWDB4AChudWxsKQAtMFgrMFggMFgtMHgrMHggMHgAaW5mAElORgBuYW4ATkFOADAxMjM0NTY3ODlBQkNERUYuAFQhIhkNAQIDEUscDBAECx0SHidobm9wcWIgBQYPExQVGggWBygkFxgJCg4bHyUjg4J9JiorPD0+P0NHSk1YWVpbXF1eX2BhY2RlZmdpamtscnN0eXp7fABJbGxlZ2FsIGJ5dGUgc2VxdWVuY2UARG9tYWluIGVycm9yAFJlc3VsdCBub3QgcmVwcmVzZW50YWJsZQBOb3QgYSB0dHkAUGVybWlzc2lvbiBkZW5pZWQAT3BlcmF0aW9uIG5vdCBwZXJtaXR0ZWQATm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeQBObyBzdWNoIHByb2Nlc3MARmlsZSBleGlzdHMAVmFsdWUgdG9vIGxhcmdlIGZvciBkYXRhIHR5cGUATm8gc3BhY2UgbGVmdCBvbiBkZXZpY2UAT3V0IG9mIG1lbW9yeQBSZXNvdXJjZSBidXN5AEludGVycnVwdGVkIHN5c3RlbSBjYWxsAFJlc291cmNlIHRlbXBvcmFyaWx5IHVuYXZhaWxhYmxlAEludmFsaWQgc2VlawBDcm9zcy1kZXZpY2UgbGluawBSZWFkLW9ubHkgZmlsZSBzeXN0ZW0ARGlyZWN0b3J5IG5vdCBlbXB0eQBDb25uZWN0aW9uIHJlc2V0IGJ5IHBlZXIAT3BlcmF0aW9uIHRpbWVkIG91dABDb25uZWN0aW9uIHJlZnVzZWQASG9zdCBpcyBkb3duAEhvc3QgaXMgdW5yZWFjaGFibGUAQWRkcmVzcyBpbiB1c2UAQnJva2VuIHBpcGUASS9PIGVycm9yAE5vIHN1Y2ggZGV2aWNlIG9yIGFkZHJlc3MAQmxvY2sgZGV2aWNlIHJlcXVpcmVkAE5vIHN1Y2ggZGV2aWNlAE5vdCBhIGRpcmVjdG9yeQBJcyBhIGRpcmVjdG9yeQBUZXh0IGZpbGUgYnVzeQBFeGVjIGZvcm1hdCBlcnJvcgBJbnZhbGlkIGFyZ3VtZW50AEFyZ3VtZW50IGxpc3QgdG9vIGxvbmcAU3ltYm9saWMgbGluayBsb29wAEZpbGVuYW1lIHRvbyBsb25nAFRvbyBtYW55IG9wZW4gZmlsZXMgaW4gc3lzdGVtAE5vIGZpbGUgZGVzY3JpcHRvcnMgYXZhaWxhYmxlAEJhZCBmaWxlIGRlc2NyaXB0b3IATm8gY2hpbGQgcHJvY2VzcwBCYWQgYWRkcmVzcwBGaWxlIHRvbyBsYXJnZQBUb28gbWFueSBsaW5rcwBObyBsb2NrcyBhdmFpbGFibGUAUmVzb3VyY2UgZGVhZGxvY2sgd291bGQgb2NjdXIAU3RhdGUgbm90IHJlY292ZXJhYmxlAFByZXZpb3VzIG93bmVyIGRpZWQAT3BlcmF0aW9uIGNhbmNlbGVkAEZ1bmN0aW9uIG5vdCBpbXBsZW1lbnRlZABObyBtZXNzYWdlIG9mIGRlc2lyZWQgdHlwZQBJZGVudGlmaWVyIHJlbW92ZWQARGV2aWNlIG5vdCBhIHN0cmVhbQBObyBkYXRhIGF2YWlsYWJsZQBEZXZpY2UgdGltZW91dABPdXQgb2Ygc3RyZWFtcyByZXNvdXJjZXMATGluayBoYXMgYmVlbiBzZXZlcmVkAFByb3RvY29sIGVycm9yAEJhZCBtZXNzYWdlAEZpbGUgZGVzY3JpcHRvciBpbiBiYWQgc3RhdGUATm90IGEgc29ja2V0AERlc3RpbmF0aW9uIGFkZHJlc3MgcmVxdWlyZWQATWVzc2FnZSB0b28gbGFyZ2UAUHJvdG9jb2wgd3JvbmcgdHlwZSBmb3Igc29ja2V0AFByb3RvY29sIG5vdCBhdmFpbGFibGUAUHJvdG9jb2wgbm90IHN1cHBvcnRlZABTb2NrZXQgdHlwZSBub3Qgc3VwcG9ydGVkAE5vdCBzdXBwb3J0ZWQAUHJvdG9jb2wgZmFtaWx5IG5vdCBzdXBwb3J0ZWQAQWRkcmVzcyBmYW1pbHkgbm90IHN1cHBvcnRlZCBieSBwcm90b2NvbABBZGRyZXNzIG5vdCBhdmFpbGFibGUATmV0d29yayBpcyBkb3duAE5ldHdvcmsgdW5yZWFjaGFibGUAQ29ubmVjdGlvbiByZXNldCBieSBuZXR3b3JrAENvbm5lY3Rpb24gYWJvcnRlZABObyBidWZmZXIgc3BhY2UgYXZhaWxhYmxlAFNvY2tldCBpcyBjb25uZWN0ZWQAU29ja2V0IG5vdCBjb25uZWN0ZWQAQ2Fubm90IHNlbmQgYWZ0ZXIgc29ja2V0IHNodXRkb3duAE9wZXJhdGlvbiBhbHJlYWR5IGluIHByb2dyZXNzAE9wZXJhdGlvbiBpbiBwcm9ncmVzcwBTdGFsZSBmaWxlIGhhbmRsZQBSZW1vdGUgSS9PIGVycm9yAFF1b3RhIGV4Y2VlZGVkAE5vIG1lZGl1bSBmb3VuZABXcm9uZyBtZWRpdW0gdHlwZQBObyBlcnJvciBpbmZvcm1hdGlvbg==";





/* no memory initializer */
var tempDoublePtr = STATICTOP; STATICTOP += 16;

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


  function ___lock() {}

  
    

  
  var SYSCALLS={varargs:0,get:function (varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function () {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret;
      },get64:function () {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function () {
        assert(SYSCALLS.get() === 0);
      }};function ___syscall140(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // llseek
      var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
      // NOTE: offset_high is unused - Emscripten's off_t is 32-bit
      var offset = offset_low;
      FS.llseek(stream, offset, whence);
      HEAP32[((result)>>2)]=stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
  function flush_NO_FILESYSTEM() {
      // flush anything remaining in the buffers during shutdown
      var fflush = Module["_fflush"];
      if (fflush) fflush(0);
      var printChar = ___syscall146.printChar;
      if (!printChar) return;
      var buffers = ___syscall146.buffers;
      if (buffers[1].length) printChar(1, 10);
      if (buffers[2].length) printChar(2, 10);
    }function ___syscall146(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // writev
      // hack to support printf in NO_FILESYSTEM
      var stream = SYSCALLS.get(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      var ret = 0;
      if (!___syscall146.buffers) {
        ___syscall146.buffers = [null, [], []]; // 1 => stdout, 2 => stderr
        ___syscall146.printChar = function(stream, curr) {
          var buffer = ___syscall146.buffers[stream];
          assert(buffer);
          if (curr === 0 || curr === 10) {
            (stream === 1 ? Module['print'] : Module['printErr'])(UTF8ArrayToString(buffer, 0));
            buffer.length = 0;
          } else {
            buffer.push(curr);
          }
        };
      }
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[(((iov)+(i*8))>>2)];
        var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
        for (var j = 0; j < len; j++) {
          ___syscall146.printChar(stream, HEAPU8[ptr+j]);
        }
        ret += len;
      }
      return ret;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall54(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // ioctl
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall6(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // close
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
  
   
  
   
  
  var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_STATIC);   

  function ___unlock() {}

   

   

   

  function _caml_alloc_shr() {
  Module['printErr']('missing function: caml_alloc_shr'); abort(-1);
  }

  function _caml_failwith() {
  Module['printErr']('missing function: caml_failwith'); abort(-1);
  }

  function _caml_initialize() {
  Module['printErr']('missing function: caml_initialize'); abort(-1);
  }

  function _caml_minor_collection() {
  Module['printErr']('missing function: caml_minor_collection'); abort(-1);
  }

  function _caml_modify() {
  Module['printErr']('missing function: caml_modify'); abort(-1);
  }

  function _caml_process_pending_signals() {
  Module['printErr']('missing function: caml_process_pending_signals'); abort(-1);
  }

  function _caml_raise_out_of_memory() {
  Module['printErr']('missing function: caml_raise_out_of_memory'); abort(-1);
  }



   

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 

   

   

  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      else Module.printErr('failed to set errno from JS');
      return value;
    } 

  function _caml_atom_table() {
  Module['printErr']('missing function: caml_atom_table'); abort(-1);
  }

  function _caml_pending_signals() {
  Module['printErr']('missing function: caml_pending_signals'); abort(-1);
  }

  function _caml_scan_roots_hook() {
  Module['printErr']('missing function: caml_scan_roots_hook'); abort(-1);
  }

  function _caml_signals_are_pending() {
  Module['printErr']('missing function: caml_signals_are_pending'); abort(-1);
  }

  function _caml_young_limit() {
  Module['printErr']('missing function: caml_young_limit'); abort(-1);
  }

  function _caml_young_ptr() {
  Module['printErr']('missing function: caml_young_ptr'); abort(-1);
  }
DYNAMICTOP_PTR = staticAlloc(4);

STACK_BASE = STACKTOP = alignMemory(STATICTOP);

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = alignMemory(STACK_MAX);

HEAP32[DYNAMICTOP_PTR>>2] = DYNAMIC_BASE;

staticSealed = true; // seal the static portion of memory

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

var ASSERTIONS = true;

/** @type {function(string, boolean=, number=)} */
function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      if (ASSERTIONS) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      }
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}


// Copied from https://github.com/strophe/strophejs/blob/e06d027/src/polyfills.js#L149

// This code was written by Tyler Akins and has been placed in the
// public domain.  It would be nice if you left this header intact.
// Base64 code from Tyler Akins -- http://rumkin.com

/**
 * Decodes a base64 string.
 * @param {String} input The string to decode.
 */
var decodeBase64 = typeof atob === 'function' ? atob : function (input) {
  var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  var output = '';
  var chr1, chr2, chr3;
  var enc1, enc2, enc3, enc4;
  var i = 0;
  // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');
  do {
    enc1 = keyStr.indexOf(input.charAt(i++));
    enc2 = keyStr.indexOf(input.charAt(i++));
    enc3 = keyStr.indexOf(input.charAt(i++));
    enc4 = keyStr.indexOf(input.charAt(i++));

    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;

    output = output + String.fromCharCode(chr1);

    if (enc3 !== 64) {
      output = output + String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      output = output + String.fromCharCode(chr3);
    }
  } while (i < input.length);
  return output;
};

// Converts a string of base64 into a byte array.
// Throws error on invalid input.
function intArrayFromBase64(s) {
  if (typeof ENVIRONMENT_IS_NODE === 'boolean' && ENVIRONMENT_IS_NODE) {
    var buf;
    try {
      buf = Buffer.from(s, 'base64');
    } catch (_) {
      buf = new Buffer(s, 'base64');
    }
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  try {
    var decoded = decodeBase64(s);
    var bytes = new Uint8Array(decoded.length);
    for (var i = 0 ; i < decoded.length ; ++i) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return bytes;
  } catch (_) {
    throw new Error('Converting base64 string to bytes failed.');
  }
}

// If filename is a base64 data URI, parses and returns data (Buffer on node,
// Uint8Array otherwise). If filename is not a base64 data URI, returns undefined.
function tryParseAsDataURI(filename) {
  if (!isDataURI(filename)) {
    return;
  }

  return intArrayFromBase64(filename.slice(dataURIPrefix.length));
}



function nullFunc_ii(x) { Module["printErr"]("Invalid function pointer called with signature 'ii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_vi(x) { Module["printErr"]("Invalid function pointer called with signature 'vi'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_vii(x) { Module["printErr"]("Invalid function pointer called with signature 'vii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_vii(index,a1,a2) {
  try {
    Module["dynCall_vii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity };

Module.asmLibraryArg = { "abort": abort, "assert": assert, "enlargeMemory": enlargeMemory, "getTotalMemory": getTotalMemory, "abortOnCannotGrowMemory": abortOnCannotGrowMemory, "abortStackOverflow": abortStackOverflow, "nullFunc_ii": nullFunc_ii, "nullFunc_iiii": nullFunc_iiii, "nullFunc_vi": nullFunc_vi, "nullFunc_vii": nullFunc_vii, "invoke_ii": invoke_ii, "invoke_iiii": invoke_iiii, "invoke_vi": invoke_vi, "invoke_vii": invoke_vii, "___lock": ___lock, "___setErrNo": ___setErrNo, "___syscall140": ___syscall140, "___syscall146": ___syscall146, "___syscall54": ___syscall54, "___syscall6": ___syscall6, "___unlock": ___unlock, "_caml_alloc_shr": _caml_alloc_shr, "_caml_failwith": _caml_failwith, "_caml_initialize": _caml_initialize, "_caml_minor_collection": _caml_minor_collection, "_caml_modify": _caml_modify, "_caml_process_pending_signals": _caml_process_pending_signals, "_caml_raise_out_of_memory": _caml_raise_out_of_memory, "_emscripten_memcpy_big": _emscripten_memcpy_big, "flush_NO_FILESYSTEM": flush_NO_FILESYSTEM, "DYNAMICTOP_PTR": DYNAMICTOP_PTR, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "cttz_i8": cttz_i8, "_caml_atom_table": _caml_atom_table, "_caml_pending_signals": _caml_pending_signals, "_caml_scan_roots_hook": _caml_scan_roots_hook, "_caml_signals_are_pending": _caml_signals_are_pending, "_caml_young_limit": _caml_young_limit, "_caml_young_ptr": _caml_young_ptr };
// EMSCRIPTEN_START_ASM
var asm = (/** @suppress {uselessCode} */ function(global, env, buffer) {
'almost asm';


  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);

  var DYNAMICTOP_PTR=env.DYNAMICTOP_PTR|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var cttz_i8=env.cttz_i8|0;
  var _caml_atom_table=env._caml_atom_table|0;
  var _caml_pending_signals=env._caml_pending_signals|0;
  var _caml_scan_roots_hook=env._caml_scan_roots_hook|0;
  var _caml_signals_are_pending=env._caml_signals_are_pending|0;
  var _caml_young_limit=env._caml_young_limit|0;
  var _caml_young_ptr=env._caml_young_ptr|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntS = 0, tempValue = 0, tempDouble = 0.0;
  var tempRet0 = 0;

  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var Math_min=global.Math.min;
  var Math_max=global.Math.max;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var enlargeMemory=env.enlargeMemory;
  var getTotalMemory=env.getTotalMemory;
  var abortOnCannotGrowMemory=env.abortOnCannotGrowMemory;
  var abortStackOverflow=env.abortStackOverflow;
  var nullFunc_ii=env.nullFunc_ii;
  var nullFunc_iiii=env.nullFunc_iiii;
  var nullFunc_vi=env.nullFunc_vi;
  var nullFunc_vii=env.nullFunc_vii;
  var invoke_ii=env.invoke_ii;
  var invoke_iiii=env.invoke_iiii;
  var invoke_vi=env.invoke_vi;
  var invoke_vii=env.invoke_vii;
  var ___lock=env.___lock;
  var ___setErrNo=env.___setErrNo;
  var ___syscall140=env.___syscall140;
  var ___syscall146=env.___syscall146;
  var ___syscall54=env.___syscall54;
  var ___syscall6=env.___syscall6;
  var ___unlock=env.___unlock;
  var _caml_alloc_shr=env._caml_alloc_shr;
  var _caml_failwith=env._caml_failwith;
  var _caml_initialize=env._caml_initialize;
  var _caml_minor_collection=env._caml_minor_collection;
  var _caml_modify=env._caml_modify;
  var _caml_process_pending_signals=env._caml_process_pending_signals;
  var _caml_raise_out_of_memory=env._caml_raise_out_of_memory;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var flush_NO_FILESYSTEM=env.flush_NO_FILESYSTEM;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS

function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
  STACKTOP = (STACKTOP + 15)&-16;
  if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(size|0);

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}
function establishStackSpace(stackBase, stackMax) {
  stackBase = stackBase|0;
  stackMax = stackMax|0;
  STACKTOP = stackBase;
  STACK_MAX = stackMax;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}

function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _init_arity() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 HEAP32[(3840)>>2] = 0;
 HEAP32[(3836)>>2] = 0;
 HEAP32[(3832)>>2] = 0;
 HEAP32[(3828)>>2] = 0;
 HEAP32[(3824)>>2] = 0;
 HEAP32[(3812)>>2] = 0;
 HEAP32[(3808)>>2] = 0;
 HEAP32[(3800)>>2] = 0;
 HEAP32[(3796)>>2] = 0;
 HEAP32[(3792)>>2] = 0;
 HEAP32[(3804)>>2] = 0;
 HEAP32[(3788)>>2] = 0;
 HEAP32[(3784)>>2] = 0;
 HEAP32[(3780)>>2] = 0;
 HEAP32[(3776)>>2] = 0;
 HEAP32[(3772)>>2] = 0;
 HEAP32[(3768)>>2] = 0;
 HEAP32[(3764)>>2] = 0;
 HEAP32[(3760)>>2] = 0;
 HEAP32[(3752)>>2] = 0;
 HEAP32[(3844)>>2] = 0;
 HEAP32[(3740)>>2] = 0;
 HEAP32[(3732)>>2] = 0;
 HEAP32[(3728)>>2] = 0;
 HEAP32[(3724)>>2] = 0;
 HEAP32[(3720)>>2] = 0;
 HEAP32[(3712)>>2] = 0;
 HEAP32[(3708)>>2] = 0;
 HEAP32[(3704)>>2] = 0;
 HEAP32[(3700)>>2] = 0;
 HEAP32[(3684)>>2] = 0;
 HEAP32[(3680)>>2] = 0;
 HEAP32[(3672)>>2] = 0;
 HEAP32[(3668)>>2] = 0;
 HEAP32[(3624)>>2] = 0;
 HEAP32[(3620)>>2] = 0;
 HEAP32[(3616)>>2] = 0;
 HEAP32[(3608)>>2] = 0;
 HEAP32[(3604)>>2] = 0;
 HEAP32[(3600)>>2] = 0;
 HEAP32[(3576)>>2] = 0;
 HEAP32[(3552)>>2] = 0;
 HEAP32[(3548)>>2] = 0;
 HEAP32[(3544)>>2] = 0;
 HEAP32[(3528)>>2] = 0;
 HEAP32[(3524)>>2] = 0;
 HEAP32[(3520)>>2] = 0;
 HEAP32[(3516)>>2] = 0;
 HEAP32[(3508)>>2] = 0;
 HEAP32[(3504)>>2] = 0;
 HEAP32[(3500)>>2] = 0;
 HEAP32[(3496)>>2] = 0;
 HEAP32[(3484)>>2] = 0;
 HEAP32[(3480)>>2] = 0;
 HEAP32[(3476)>>2] = 0;
 HEAP32[(3472)>>2] = 0;
 HEAP32[(3468)>>2] = 0;
 HEAP32[(3464)>>2] = 0;
 HEAP32[(3460)>>2] = 0;
 HEAP32[(3456)>>2] = 0;
 HEAP32[(3452)>>2] = 0;
 HEAP32[(3444)>>2] = 0;
 HEAP32[(3440)>>2] = 0;
 HEAP32[(3436)>>2] = 0;
 HEAP32[(3432)>>2] = 0;
 HEAP32[(3428)>>2] = 0;
 HEAP32[(3424)>>2] = 0;
 HEAP32[(3420)>>2] = 0;
 HEAP32[854] = 0;
 HEAP32[(3696)>>2] = 1;
 HEAP32[(3816)>>2] = 1;
 HEAP32[(3756)>>2] = 1;
 HEAP32[(3688)>>2] = 1;
 HEAP32[(3676)>>2] = 1;
 HEAP32[(3664)>>2] = 1;
 HEAP32[(3584)>>2] = 1;
 HEAP32[(3736)>>2] = 1;
 HEAP32[(3716)>>2] = 1;
 HEAP32[(3748)>>2] = 1;
 HEAP32[(3656)>>2] = 1;
 HEAP32[(3652)>>2] = 1;
 HEAP32[(3648)>>2] = 1;
 HEAP32[(3644)>>2] = 1;
 HEAP32[(3636)>>2] = 1;
 HEAP32[(3632)>>2] = 1;
 HEAP32[(3628)>>2] = 1;
 HEAP32[(3612)>>2] = 1;
 HEAP32[(3580)>>2] = 1;
 HEAP32[(3572)>>2] = 1;
 HEAP32[(3568)>>2] = 1;
 HEAP32[(3564)>>2] = 1;
 HEAP32[(3560)>>2] = 1;
 HEAP32[(3540)>>2] = 1;
 HEAP32[(3536)>>2] = 1;
 HEAP32[(3532)>>2] = 1;
 HEAP32[(3512)>>2] = 1;
 HEAP32[(3492)>>2] = 1;
 HEAP32[(3488)>>2] = 1;
 HEAP32[(3448)>>2] = 1;
 HEAP32[(3692)>>2] = 2;
 HEAP32[(3820)>>2] = 2;
 HEAP32[(3588)>>2] = 2;
 HEAP32[(3640)>>2] = 2;
 HEAP32[(3556)>>2] = 2;
 HEAP32[(3744)>>2] = 4;
 HEAP32[(3660)>>2] = 0;
 HEAP32[(3596)>>2] = 0;
 HEAP32[(3592)>>2] = 0;
 return;
}
function _coq_stat_alloc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $3 = $1;
 $4 = (_malloc($3)|0);
 $2 = $4;
 $5 = $2;
 $6 = ($5|0)==(0|0);
 if ($6) {
  _caml_raise_out_of_memory();
  // unreachable;
 } else {
  $7 = $2;
  STACKTOP = sp;return ($7|0);
 }
 return (0)|0;
}
function _coq_makeaccu($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $4 = (_coq_stat_alloc(8)|0);
 $3 = $4;
 $5 = $3;
 $2 = $5;
 $6 = HEAP32[(340)>>2]|0;
 $7 = $6;
 $8 = 0;
 $9 = (($7) - ($8))|0;
 $10 = $2;
 $11 = ((($10)) + 4|0);
 $2 = $11;
 HEAP32[$10>>2] = $9;
 $12 = $1;
 $13 = $12 >> 1;
 $14 = $2;
 HEAP32[$14>>2] = $13;
 $15 = $3;
 $16 = $15;
 STACKTOP = sp;return ($16|0);
}
function _coq_pushpop($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $2 = $0;
 $6 = $2;
 $7 = $6 >> 1;
 $4 = $7;
 $8 = $4;
 $9 = ($8|0)==(0);
 if ($9) {
  $10 = (_coq_stat_alloc(4)|0);
  $3 = $10;
  $11 = HEAP32[(436)>>2]|0;
  $12 = $11;
  $13 = 0;
  $14 = (($12) - ($13))|0;
  $15 = $3;
  HEAP32[$15>>2] = $14;
  $16 = $3;
  $17 = $16;
  $1 = $17;
  $36 = $1;
  STACKTOP = sp;return ($36|0);
 } else {
  $18 = (_coq_stat_alloc(12)|0);
  $3 = $18;
  $19 = $3;
  $5 = $19;
  $20 = HEAP32[(84)>>2]|0;
  $21 = $20;
  $22 = 0;
  $23 = (($21) - ($22))|0;
  $24 = $5;
  $25 = ((($24)) + 4|0);
  $5 = $25;
  HEAP32[$24>>2] = $23;
  $26 = $4;
  $27 = $5;
  $28 = ((($27)) + 4|0);
  $5 = $28;
  HEAP32[$27>>2] = $26;
  $29 = HEAP32[(436)>>2]|0;
  $30 = $29;
  $31 = 0;
  $32 = (($30) - ($31))|0;
  $33 = $5;
  HEAP32[$33>>2] = $32;
  $34 = $3;
  $35 = $34;
  $1 = $35;
  $36 = $1;
  STACKTOP = sp;return ($36|0);
 }
 return (0)|0;
}
function _coq_is_accumulate_code($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $4 = $1;
 $5 = $4;
 $2 = $5;
 $6 = $2;
 $7 = HEAP32[$6>>2]|0;
 $8 = HEAP32[(332)>>2]|0;
 $9 = $8;
 $10 = 0;
 $11 = (($9) - ($10))|0;
 $12 = ($7|0)==($11|0);
 $13 = $12&1;
 $3 = $13;
 $14 = $3;
 $15 = ($14|0)!=(0);
 $16 = $15&1;
 $17 = $16 << 1;
 $18 = (($17) + 1)|0;
 STACKTOP = sp;return ($18|0);
}
function _coq_tcode_of_code($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0;
 var $or$cond = 0, $or$cond3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(64|0);
 $2 = $0;
 $3 = $1;
 $17 = $3;
 $18 = $17 >> 1;
 $7 = $18;
 $19 = $7;
 $20 = (_coq_stat_alloc($19)|0);
 $6 = $20;
 $21 = $6;
 $5 = $21;
 $22 = $7;
 $23 = (($22>>>0) / 4)&-1;
 $7 = $23;
 $24 = $2;
 $25 = $24;
 $4 = $25;
 L1: while(1) {
  $26 = $4;
  $27 = $2;
  $28 = $27;
  $29 = $7;
  $30 = (($28) + ($29<<2)|0);
  $31 = ($26>>>0)<($30>>>0);
  if (!($31)) {
   break;
  }
  $32 = $4;
  $33 = HEAP32[$32>>2]|0;
  $8 = $33;
  $34 = $4;
  $35 = ((($34)) + 4|0);
  $4 = $35;
  $36 = $8;
  $37 = ($36|0)<(0);
  $38 = $8;
  $39 = ($38|0)>(107);
  $or$cond = $37 | $39;
  if ($or$cond) {
   $8 = 107;
  }
  $40 = HEAP32[962]|0;
  $41 = $8;
  $42 = (($40) + ($41<<2)|0);
  $43 = HEAP32[$42>>2]|0;
  $44 = $43;
  $45 = 0;
  $46 = (($44) - ($45))|0;
  $47 = $5;
  $48 = ((($47)) + 4|0);
  $5 = $48;
  HEAP32[$47>>2] = $46;
  $49 = $8;
  $50 = ($49|0)==(61);
  if ($50) {
   $51 = $4;
   $52 = HEAP32[$51>>2]|0;
   $53 = $5;
   HEAP32[$53>>2] = $52;
   $54 = $4;
   $55 = ((($54)) + 4|0);
   $4 = $55;
   $56 = $5;
   $57 = ((($56)) + 4|0);
   $5 = $57;
   $58 = HEAP32[$56>>2]|0;
   $10 = $58;
   $59 = $10;
   $60 = $59 & 16777215;
   $11 = $60;
   $61 = $10;
   $62 = $61 >>> 24;
   $12 = $62;
   $63 = $11;
   $64 = $12;
   $65 = (($63) + ($64))|0;
   $10 = $65;
   $9 = 0;
   while(1) {
    $66 = $9;
    $67 = $10;
    $68 = ($66>>>0)<($67>>>0);
    if (!($68)) {
     continue L1;
    }
    $69 = $4;
    $70 = HEAP32[$69>>2]|0;
    $71 = $5;
    HEAP32[$71>>2] = $70;
    $72 = $4;
    $73 = ((($72)) + 4|0);
    $4 = $73;
    $74 = $5;
    $75 = ((($74)) + 4|0);
    $5 = $75;
    $76 = $9;
    $77 = (($76) + 1)|0;
    $9 = $77;
   }
  }
  $78 = $8;
  $79 = ($78|0)==(44);
  $80 = $8;
  $81 = ($80|0)==(45);
  $or$cond3 = $79 | $81;
  if ($or$cond3) {
   $82 = $4;
   $83 = HEAP32[$82>>2]|0;
   $84 = $5;
   HEAP32[$84>>2] = $83;
   $85 = $4;
   $86 = ((($85)) + 4|0);
   $4 = $86;
   $87 = $5;
   $88 = HEAP32[$87>>2]|0;
   $89 = $88<<1;
   $90 = (3 + ($89))|0;
   $14 = $90;
   $91 = $5;
   $92 = ((($91)) + 4|0);
   $5 = $92;
   $13 = 1;
   while(1) {
    $93 = $13;
    $94 = $14;
    $95 = ($93>>>0)<($94>>>0);
    if (!($95)) {
     continue L1;
    }
    $96 = $4;
    $97 = HEAP32[$96>>2]|0;
    $98 = $5;
    HEAP32[$98>>2] = $97;
    $99 = $4;
    $100 = ((($99)) + 4|0);
    $4 = $100;
    $101 = $5;
    $102 = ((($101)) + 4|0);
    $5 = $102;
    $103 = $13;
    $104 = (($103) + 1)|0;
    $13 = $104;
   }
  } else {
   $105 = $8;
   $106 = (3416 + ($105<<2)|0);
   $107 = HEAP32[$106>>2]|0;
   $16 = $107;
   $15 = 0;
   while(1) {
    $108 = $15;
    $109 = $16;
    $110 = ($108>>>0)<($109>>>0);
    if (!($110)) {
     continue L1;
    }
    $111 = $4;
    $112 = HEAP32[$111>>2]|0;
    $113 = $5;
    HEAP32[$113>>2] = $112;
    $114 = $4;
    $115 = ((($114)) + 4|0);
    $4 = $115;
    $116 = $5;
    $117 = ((($116)) + 4|0);
    $5 = $117;
    $118 = $15;
    $119 = (($118) + 1)|0;
    $15 = $119;
   }
  }
 }
 $120 = $6;
 $121 = $120;
 STACKTOP = sp;return ($121|0);
}
function _coq_interprete($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $$sink = 0, $$sink1 = 0, $$sink4 = 0, $$sink5 = 0, $$sink8 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0;
 var $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0;
 var $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0;
 var $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0;
 var $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $1075 = 0, $1076 = 0, $1077 = 0, $1078 = 0, $1079 = 0, $108 = 0, $1080 = 0, $1081 = 0, $1082 = 0, $1083 = 0, $1084 = 0;
 var $1085 = 0, $1086 = 0, $1087 = 0, $1088 = 0, $1089 = 0, $109 = 0, $1090 = 0, $1091 = 0, $1092 = 0, $1093 = 0, $1094 = 0, $1095 = 0, $1096 = 0, $1097 = 0, $1098 = 0, $1099 = 0, $11 = 0, $110 = 0, $1100 = 0, $1101 = 0;
 var $1102 = 0, $1103 = 0, $1104 = 0, $1105 = 0, $1106 = 0, $1107 = 0, $1108 = 0, $1109 = 0, $111 = 0, $1110 = 0, $1111 = 0, $1112 = 0, $1113 = 0, $1114 = 0, $1115 = 0, $1116 = 0, $1117 = 0, $1118 = 0, $1119 = 0, $112 = 0;
 var $1120 = 0, $1121 = 0, $1122 = 0, $1123 = 0, $1124 = 0, $1125 = 0, $1126 = 0, $1127 = 0, $1128 = 0, $1129 = 0, $113 = 0, $1130 = 0, $1131 = 0, $1132 = 0, $1133 = 0, $1134 = 0, $1135 = 0, $1136 = 0, $1137 = 0, $1138 = 0;
 var $1139 = 0, $114 = 0, $1140 = 0, $1141 = 0, $1142 = 0, $1143 = 0, $1144 = 0, $1145 = 0, $1146 = 0, $1147 = 0, $1148 = 0, $1149 = 0, $115 = 0, $1150 = 0, $1151 = 0, $1152 = 0, $1153 = 0, $1154 = 0, $1155 = 0, $1156 = 0;
 var $1157 = 0, $1158 = 0, $1159 = 0, $116 = 0, $1160 = 0, $1161 = 0, $1162 = 0, $1163 = 0, $1164 = 0, $1165 = 0, $1166 = 0, $1167 = 0, $1168 = 0, $1169 = 0, $117 = 0, $1170 = 0, $1171 = 0, $1172 = 0, $1173 = 0, $1174 = 0;
 var $1175 = 0, $1176 = 0, $1177 = 0, $1178 = 0, $1179 = 0, $118 = 0, $1180 = 0, $1181 = 0, $1182 = 0, $1183 = 0, $1184 = 0, $1185 = 0, $1186 = 0, $1187 = 0, $1188 = 0, $1189 = 0, $119 = 0, $1190 = 0, $1191 = 0, $1192 = 0;
 var $1193 = 0, $1194 = 0, $1195 = 0, $1196 = 0, $1197 = 0, $1198 = 0, $1199 = 0, $12 = 0, $120 = 0, $1200 = 0, $1201 = 0, $1202 = 0, $1203 = 0, $1204 = 0, $1205 = 0, $1206 = 0, $1207 = 0, $1208 = 0, $1209 = 0, $121 = 0;
 var $1210 = 0, $1211 = 0, $1212 = 0, $1213 = 0, $1214 = 0, $1215 = 0, $1216 = 0, $1217 = 0, $1218 = 0, $1219 = 0, $122 = 0, $1220 = 0, $1221 = 0, $1222 = 0, $1223 = 0, $1224 = 0, $1225 = 0, $1226 = 0, $1227 = 0, $1228 = 0;
 var $1229 = 0, $123 = 0, $1230 = 0, $1231 = 0, $1232 = 0, $1233 = 0, $1234 = 0, $1235 = 0, $1236 = 0, $1237 = 0, $1238 = 0, $1239 = 0, $124 = 0, $1240 = 0, $1241 = 0, $1242 = 0, $1243 = 0, $1244 = 0, $1245 = 0, $1246 = 0;
 var $1247 = 0, $1248 = 0, $1249 = 0, $125 = 0, $1250 = 0, $1251 = 0, $1252 = 0, $1253 = 0, $1254 = 0, $1255 = 0, $1256 = 0, $1257 = 0, $1258 = 0, $1259 = 0, $126 = 0, $1260 = 0, $1261 = 0, $1262 = 0, $1263 = 0, $1264 = 0;
 var $1265 = 0, $1266 = 0, $1267 = 0, $1268 = 0, $1269 = 0, $127 = 0, $1270 = 0, $1271 = 0, $1272 = 0, $1273 = 0, $1274 = 0, $1275 = 0, $1276 = 0, $1277 = 0, $1278 = 0, $1279 = 0, $128 = 0, $1280 = 0, $1281 = 0, $1282 = 0;
 var $1283 = 0, $1284 = 0, $1285 = 0, $1286 = 0, $1287 = 0, $1288 = 0, $1289 = 0, $129 = 0, $1290 = 0, $1291 = 0, $1292 = 0, $1293 = 0, $1294 = 0, $1295 = 0, $1296 = 0, $1297 = 0, $1298 = 0, $1299 = 0, $13 = 0, $130 = 0;
 var $1300 = 0, $1301 = 0, $1302 = 0, $1303 = 0, $1304 = 0, $1305 = 0, $1306 = 0, $1307 = 0, $1308 = 0, $1309 = 0, $131 = 0, $1310 = 0, $1311 = 0, $1312 = 0, $1313 = 0, $1314 = 0, $1315 = 0, $1316 = 0, $1317 = 0, $1318 = 0;
 var $1319 = 0, $132 = 0, $1320 = 0, $1321 = 0, $1322 = 0, $1323 = 0, $1324 = 0, $1325 = 0, $1326 = 0, $1327 = 0, $1328 = 0, $1329 = 0, $133 = 0, $1330 = 0, $1331 = 0, $1332 = 0, $1333 = 0, $1334 = 0, $1335 = 0, $1336 = 0;
 var $1337 = 0, $1338 = 0, $1339 = 0, $134 = 0, $1340 = 0, $1341 = 0, $1342 = 0, $1343 = 0, $1344 = 0, $1345 = 0, $1346 = 0, $1347 = 0, $1348 = 0, $1349 = 0, $135 = 0, $1350 = 0, $1351 = 0, $1352 = 0, $1353 = 0, $1354 = 0;
 var $1355 = 0, $1356 = 0, $1357 = 0, $1358 = 0, $1359 = 0, $136 = 0, $1360 = 0, $1361 = 0, $1362 = 0, $1363 = 0, $1364 = 0, $1365 = 0, $1366 = 0, $1367 = 0, $1368 = 0, $1369 = 0, $137 = 0, $1370 = 0, $1371 = 0, $1372 = 0;
 var $1373 = 0, $1374 = 0, $1375 = 0, $1376 = 0, $1377 = 0, $1378 = 0, $1379 = 0, $138 = 0, $1380 = 0, $1381 = 0, $1382 = 0, $1383 = 0, $1384 = 0, $1385 = 0, $1386 = 0, $1387 = 0, $1388 = 0, $1389 = 0, $139 = 0, $1390 = 0;
 var $1391 = 0, $1392 = 0, $1393 = 0, $1394 = 0, $1395 = 0, $1396 = 0, $1397 = 0, $1398 = 0, $1399 = 0, $14 = 0, $140 = 0, $1400 = 0, $1401 = 0, $1402 = 0, $1403 = 0, $1404 = 0, $1405 = 0, $1406 = 0, $1407 = 0, $1408 = 0;
 var $1409 = 0, $141 = 0, $1410 = 0, $1411 = 0, $1412 = 0, $1413 = 0, $1414 = 0, $1415 = 0, $1416 = 0, $1417 = 0, $1418 = 0, $1419 = 0, $142 = 0, $1420 = 0, $1421 = 0, $1422 = 0, $1423 = 0, $1424 = 0, $1425 = 0, $1426 = 0;
 var $1427 = 0, $1428 = 0, $1429 = 0, $143 = 0, $1430 = 0, $1431 = 0, $1432 = 0, $1433 = 0, $1434 = 0, $1435 = 0, $1436 = 0, $1437 = 0, $1438 = 0, $1439 = 0, $144 = 0, $1440 = 0, $1441 = 0, $1442 = 0, $1443 = 0, $1444 = 0;
 var $1445 = 0, $1446 = 0, $1447 = 0, $1448 = 0, $1449 = 0, $145 = 0, $1450 = 0, $1451 = 0, $1452 = 0, $1453 = 0, $1454 = 0, $1455 = 0, $1456 = 0, $1457 = 0, $1458 = 0, $1459 = 0, $146 = 0, $1460 = 0, $1461 = 0, $1462 = 0;
 var $1463 = 0, $1464 = 0, $1465 = 0, $1466 = 0, $1467 = 0, $1468 = 0, $1469 = 0, $147 = 0, $1470 = 0, $1471 = 0, $1472 = 0, $1473 = 0, $1474 = 0, $1475 = 0, $1476 = 0, $1477 = 0, $1478 = 0, $1479 = 0, $148 = 0, $1480 = 0;
 var $1481 = 0, $1482 = 0, $1483 = 0, $1484 = 0, $1485 = 0, $1486 = 0, $1487 = 0, $1488 = 0, $1489 = 0, $149 = 0, $1490 = 0, $1491 = 0, $1492 = 0, $1493 = 0, $1494 = 0, $1495 = 0, $1496 = 0, $1497 = 0, $1498 = 0, $1499 = 0;
 var $15 = 0, $150 = 0, $1500 = 0, $1501 = 0, $1502 = 0, $1503 = 0, $1504 = 0, $1505 = 0, $1506 = 0, $1507 = 0, $1508 = 0, $1509 = 0, $151 = 0, $1510 = 0, $1511 = 0, $1512 = 0, $1513 = 0, $1514 = 0, $1515 = 0, $1516 = 0;
 var $1517 = 0, $1518 = 0, $1519 = 0, $152 = 0, $1520 = 0, $1521 = 0, $1522 = 0, $1523 = 0, $1524 = 0, $1525 = 0, $1526 = 0, $1527 = 0, $1528 = 0, $1529 = 0, $153 = 0, $1530 = 0, $1531 = 0, $1532 = 0, $1533 = 0, $1534 = 0;
 var $1535 = 0, $1536 = 0, $1537 = 0, $1538 = 0, $1539 = 0, $154 = 0, $1540 = 0, $1541 = 0, $1542 = 0, $1543 = 0, $1544 = 0, $1545 = 0, $1546 = 0, $1547 = 0, $1548 = 0, $1549 = 0, $155 = 0, $1550 = 0, $1551 = 0, $1552 = 0;
 var $1553 = 0, $1554 = 0, $1555 = 0, $1556 = 0, $1557 = 0, $1558 = 0, $1559 = 0, $156 = 0, $1560 = 0, $1561 = 0, $1562 = 0, $1563 = 0, $1564 = 0, $1565 = 0, $1566 = 0, $1567 = 0, $1568 = 0, $1569 = 0, $157 = 0, $1570 = 0;
 var $1571 = 0, $1572 = 0, $1573 = 0, $1574 = 0, $1575 = 0, $1576 = 0, $1577 = 0, $1578 = 0, $1579 = 0, $158 = 0, $1580 = 0, $1581 = 0, $1582 = 0, $1583 = 0, $1584 = 0, $1585 = 0, $1586 = 0, $1587 = 0, $1588 = 0, $1589 = 0;
 var $159 = 0, $1590 = 0, $1591 = 0, $1592 = 0, $1593 = 0, $1594 = 0, $1595 = 0, $1596 = 0, $1597 = 0, $1598 = 0, $1599 = 0, $16 = 0, $160 = 0, $1600 = 0, $1601 = 0, $1602 = 0, $1603 = 0, $1604 = 0, $1605 = 0, $1606 = 0;
 var $1607 = 0, $1608 = 0, $1609 = 0, $161 = 0, $1610 = 0, $1611 = 0, $1612 = 0, $1613 = 0, $1614 = 0, $1615 = 0, $1616 = 0, $1617 = 0, $1618 = 0, $1619 = 0, $162 = 0, $1620 = 0, $1621 = 0, $1622 = 0, $1623 = 0, $1624 = 0;
 var $1625 = 0, $1626 = 0, $1627 = 0, $1628 = 0, $1629 = 0, $163 = 0, $1630 = 0, $1631 = 0, $1632 = 0, $1633 = 0, $1634 = 0, $1635 = 0, $1636 = 0, $1637 = 0, $1638 = 0, $1639 = 0, $164 = 0, $1640 = 0, $1641 = 0, $1642 = 0;
 var $1643 = 0, $1644 = 0, $1645 = 0, $1646 = 0, $1647 = 0, $1648 = 0, $1649 = 0, $165 = 0, $1650 = 0, $1651 = 0, $1652 = 0, $1653 = 0, $1654 = 0, $1655 = 0, $1656 = 0, $1657 = 0, $1658 = 0, $1659 = 0, $166 = 0, $1660 = 0;
 var $1661 = 0, $1662 = 0, $1663 = 0, $1664 = 0, $1665 = 0, $1666 = 0, $1667 = 0, $1668 = 0, $1669 = 0, $167 = 0, $1670 = 0, $1671 = 0, $1672 = 0, $1673 = 0, $1674 = 0, $1675 = 0, $1676 = 0, $1677 = 0, $1678 = 0, $1679 = 0;
 var $168 = 0, $1680 = 0, $1681 = 0, $1682 = 0, $1683 = 0, $1684 = 0, $1685 = 0, $1686 = 0, $1687 = 0, $1688 = 0, $1689 = 0, $169 = 0, $1690 = 0, $1691 = 0, $1692 = 0, $1693 = 0, $1694 = 0, $1695 = 0, $1696 = 0, $1697 = 0;
 var $1698 = 0, $1699 = 0, $17 = 0, $170 = 0, $1700 = 0, $1701 = 0, $1702 = 0, $1703 = 0, $1704 = 0, $1705 = 0, $1706 = 0, $1707 = 0, $1708 = 0, $1709 = 0, $171 = 0, $1710 = 0, $1711 = 0, $1712 = 0, $1713 = 0, $1714 = 0;
 var $1715 = 0, $1716 = 0, $1717 = 0, $1718 = 0, $1719 = 0, $172 = 0, $1720 = 0, $1721 = 0, $1722 = 0, $1723 = 0, $1724 = 0, $1725 = 0, $1726 = 0, $1727 = 0, $1728 = 0, $1729 = 0, $173 = 0, $1730 = 0, $1731 = 0, $1732 = 0;
 var $1733 = 0, $1734 = 0, $1735 = 0, $1736 = 0, $1737 = 0, $1738 = 0, $1739 = 0, $174 = 0, $1740 = 0, $1741 = 0, $1742 = 0, $1743 = 0, $1744 = 0, $1745 = 0, $1746 = 0, $1747 = 0, $1748 = 0, $1749 = 0, $175 = 0, $1750 = 0;
 var $1751 = 0, $1752 = 0, $1753 = 0, $1754 = 0, $1755 = 0, $1756 = 0, $1757 = 0, $1758 = 0, $1759 = 0, $176 = 0, $1760 = 0, $1761 = 0, $1762 = 0, $1763 = 0, $1764 = 0, $1765 = 0, $1766 = 0, $1767 = 0, $1768 = 0, $1769 = 0;
 var $177 = 0, $1770 = 0, $1771 = 0, $1772 = 0, $1773 = 0, $1774 = 0, $1775 = 0, $1776 = 0, $1777 = 0, $1778 = 0, $1779 = 0, $178 = 0, $1780 = 0, $1781 = 0, $1782 = 0, $1783 = 0, $1784 = 0, $1785 = 0, $1786 = 0, $1787 = 0;
 var $1788 = 0, $1789 = 0, $179 = 0, $1790 = 0, $1791 = 0, $1792 = 0, $1793 = 0, $1794 = 0, $1795 = 0, $1796 = 0, $1797 = 0, $1798 = 0, $1799 = 0, $18 = 0, $180 = 0, $1800 = 0, $1801 = 0, $1802 = 0, $1803 = 0, $1804 = 0;
 var $1805 = 0, $1806 = 0, $1807 = 0, $1808 = 0, $1809 = 0, $181 = 0, $1810 = 0, $1811 = 0, $1812 = 0, $1813 = 0, $1814 = 0, $1815 = 0, $1816 = 0, $1817 = 0, $1818 = 0, $1819 = 0, $182 = 0, $1820 = 0, $1821 = 0, $1822 = 0;
 var $1823 = 0, $1824 = 0, $1825 = 0, $1826 = 0, $1827 = 0, $1828 = 0, $1829 = 0, $183 = 0, $1830 = 0, $1831 = 0, $1832 = 0, $1833 = 0, $1834 = 0, $1835 = 0, $1836 = 0, $1837 = 0, $1838 = 0, $1839 = 0, $184 = 0, $1840 = 0;
 var $1841 = 0, $1842 = 0, $1843 = 0, $1844 = 0, $1845 = 0, $1846 = 0, $1847 = 0, $1848 = 0, $1849 = 0, $185 = 0, $1850 = 0, $1851 = 0, $1852 = 0, $1853 = 0, $1854 = 0, $1855 = 0, $1856 = 0, $1857 = 0, $1858 = 0, $1859 = 0;
 var $186 = 0, $1860 = 0, $1861 = 0, $1862 = 0, $1863 = 0, $1864 = 0, $1865 = 0, $1866 = 0, $1867 = 0, $1868 = 0, $1869 = 0, $187 = 0, $1870 = 0, $1871 = 0, $1872 = 0, $1873 = 0, $1874 = 0, $1875 = 0, $1876 = 0, $1877 = 0;
 var $1878 = 0, $1879 = 0, $188 = 0, $1880 = 0, $1881 = 0, $1882 = 0, $1883 = 0, $1884 = 0, $1885 = 0, $1886 = 0, $1887 = 0, $1888 = 0, $1889 = 0, $189 = 0, $1890 = 0, $1891 = 0, $1892 = 0, $1893 = 0, $1894 = 0, $1895 = 0;
 var $1896 = 0, $1897 = 0, $1898 = 0, $1899 = 0, $19 = 0, $190 = 0, $1900 = 0, $1901 = 0, $1902 = 0, $1903 = 0, $1904 = 0, $1905 = 0, $1906 = 0, $1907 = 0, $1908 = 0, $1909 = 0, $191 = 0, $1910 = 0, $1911 = 0, $1912 = 0;
 var $1913 = 0, $1914 = 0, $1915 = 0, $1916 = 0, $1917 = 0, $1918 = 0, $1919 = 0, $192 = 0, $1920 = 0, $1921 = 0, $1922 = 0, $1923 = 0, $1924 = 0, $1925 = 0, $1926 = 0, $1927 = 0, $1928 = 0, $1929 = 0, $193 = 0, $1930 = 0;
 var $1931 = 0, $1932 = 0, $1933 = 0, $1934 = 0, $1935 = 0, $1936 = 0, $1937 = 0, $1938 = 0, $1939 = 0, $194 = 0, $1940 = 0, $1941 = 0, $1942 = 0, $1943 = 0, $1944 = 0, $1945 = 0, $1946 = 0, $1947 = 0, $1948 = 0, $1949 = 0;
 var $195 = 0, $1950 = 0, $1951 = 0, $1952 = 0, $1953 = 0, $1954 = 0, $1955 = 0, $1956 = 0, $1957 = 0, $1958 = 0, $1959 = 0, $196 = 0, $1960 = 0, $1961 = 0, $1962 = 0, $1963 = 0, $1964 = 0, $1965 = 0, $1966 = 0, $1967 = 0;
 var $1968 = 0, $1969 = 0, $197 = 0, $1970 = 0, $1971 = 0, $1972 = 0, $1973 = 0, $1974 = 0, $1975 = 0, $1976 = 0, $1977 = 0, $1978 = 0, $1979 = 0, $198 = 0, $1980 = 0, $1981 = 0, $1982 = 0, $1983 = 0, $1984 = 0, $1985 = 0;
 var $1986 = 0, $1987 = 0, $1988 = 0, $1989 = 0, $199 = 0, $1990 = 0, $1991 = 0, $1992 = 0, $1993 = 0, $1994 = 0, $1995 = 0, $1996 = 0, $1997 = 0, $1998 = 0, $1999 = 0, $20 = 0, $200 = 0, $2000 = 0, $2001 = 0, $2002 = 0;
 var $2003 = 0, $2004 = 0, $2005 = 0, $2006 = 0, $2007 = 0, $2008 = 0, $2009 = 0, $201 = 0, $2010 = 0, $2011 = 0, $2012 = 0, $2013 = 0, $2014 = 0, $2015 = 0, $2016 = 0, $2017 = 0, $2018 = 0, $2019 = 0, $202 = 0, $2020 = 0;
 var $2021 = 0, $2022 = 0, $2023 = 0, $2024 = 0, $2025 = 0, $2026 = 0, $2027 = 0, $2028 = 0, $2029 = 0, $203 = 0, $2030 = 0, $2031 = 0, $2032 = 0, $2033 = 0, $2034 = 0, $2035 = 0, $2036 = 0, $2037 = 0, $2038 = 0, $2039 = 0;
 var $204 = 0, $2040 = 0, $2041 = 0, $2042 = 0, $2043 = 0, $2044 = 0, $2045 = 0, $2046 = 0, $2047 = 0, $2048 = 0, $2049 = 0, $205 = 0, $2050 = 0, $2051 = 0, $2052 = 0, $2053 = 0, $2054 = 0, $2055 = 0, $2056 = 0, $2057 = 0;
 var $2058 = 0, $2059 = 0, $206 = 0, $2060 = 0, $2061 = 0, $2062 = 0, $2063 = 0, $2064 = 0, $2065 = 0, $2066 = 0, $2067 = 0, $2068 = 0, $2069 = 0, $207 = 0, $2070 = 0, $2071 = 0, $2072 = 0, $2073 = 0, $2074 = 0, $2075 = 0;
 var $2076 = 0, $2077 = 0, $2078 = 0, $2079 = 0, $208 = 0, $2080 = 0, $2081 = 0, $2082 = 0, $2083 = 0, $2084 = 0, $2085 = 0, $2086 = 0, $2087 = 0, $2088 = 0, $2089 = 0, $209 = 0, $2090 = 0, $2091 = 0, $2092 = 0, $2093 = 0;
 var $2094 = 0, $2095 = 0, $2096 = 0, $2097 = 0, $2098 = 0, $2099 = 0, $21 = 0, $210 = 0, $2100 = 0, $2101 = 0, $2102 = 0, $2103 = 0, $2104 = 0, $2105 = 0, $2106 = 0, $2107 = 0, $2108 = 0, $2109 = 0, $211 = 0, $2110 = 0;
 var $2111 = 0, $2112 = 0, $2113 = 0, $2114 = 0, $2115 = 0, $2116 = 0, $2117 = 0, $2118 = 0, $2119 = 0, $212 = 0, $2120 = 0, $2121 = 0, $2122 = 0, $2123 = 0, $2124 = 0, $2125 = 0, $2126 = 0, $2127 = 0, $2128 = 0, $2129 = 0;
 var $213 = 0, $2130 = 0, $2131 = 0, $2132 = 0, $2133 = 0, $2134 = 0, $2135 = 0, $2136 = 0, $2137 = 0, $2138 = 0, $2139 = 0, $214 = 0, $2140 = 0, $2141 = 0, $2142 = 0, $2143 = 0, $2144 = 0, $2145 = 0, $2146 = 0, $2147 = 0;
 var $2148 = 0, $2149 = 0, $215 = 0, $2150 = 0, $2151 = 0, $2152 = 0, $2153 = 0, $2154 = 0, $2155 = 0, $2156 = 0, $2157 = 0, $2158 = 0, $2159 = 0, $216 = 0, $2160 = 0, $2161 = 0, $2162 = 0, $2163 = 0, $2164 = 0, $2165 = 0;
 var $2166 = 0, $2167 = 0, $2168 = 0, $2169 = 0, $217 = 0, $2170 = 0, $2171 = 0, $2172 = 0, $2173 = 0, $2174 = 0, $2175 = 0, $2176 = 0, $2177 = 0, $2178 = 0, $2179 = 0, $218 = 0, $2180 = 0, $2181 = 0, $2182 = 0, $2183 = 0;
 var $2184 = 0, $2185 = 0, $2186 = 0, $2187 = 0, $2188 = 0, $2189 = 0, $219 = 0, $2190 = 0, $2191 = 0, $2192 = 0, $2193 = 0, $2194 = 0, $2195 = 0, $2196 = 0, $2197 = 0, $2198 = 0, $2199 = 0, $22 = 0, $220 = 0, $2200 = 0;
 var $2201 = 0, $2202 = 0, $2203 = 0, $2204 = 0, $2205 = 0, $2206 = 0, $2207 = 0, $2208 = 0, $2209 = 0, $221 = 0, $2210 = 0, $2211 = 0, $2212 = 0, $2213 = 0, $2214 = 0, $2215 = 0, $2216 = 0, $2217 = 0, $2218 = 0, $2219 = 0;
 var $222 = 0, $2220 = 0, $2221 = 0, $2222 = 0, $2223 = 0, $2224 = 0, $2225 = 0, $2226 = 0, $2227 = 0, $2228 = 0, $2229 = 0, $223 = 0, $2230 = 0, $2231 = 0, $2232 = 0, $2233 = 0, $2234 = 0, $2235 = 0, $2236 = 0, $2237 = 0;
 var $2238 = 0, $2239 = 0, $224 = 0, $2240 = 0, $2241 = 0, $2242 = 0, $2243 = 0, $2244 = 0, $2245 = 0, $2246 = 0, $2247 = 0, $2248 = 0, $2249 = 0, $225 = 0, $2250 = 0, $2251 = 0, $2252 = 0, $2253 = 0, $2254 = 0, $2255 = 0;
 var $2256 = 0, $2257 = 0, $2258 = 0, $2259 = 0, $226 = 0, $2260 = 0, $2261 = 0, $2262 = 0, $2263 = 0, $2264 = 0, $2265 = 0, $2266 = 0, $2267 = 0, $2268 = 0, $2269 = 0, $227 = 0, $2270 = 0, $2271 = 0, $2272 = 0, $2273 = 0;
 var $2274 = 0, $2275 = 0, $2276 = 0, $2277 = 0, $2278 = 0, $2279 = 0, $228 = 0, $2280 = 0, $2281 = 0, $2282 = 0, $2283 = 0, $2284 = 0, $2285 = 0, $2286 = 0, $2287 = 0, $2288 = 0, $2289 = 0, $229 = 0, $2290 = 0, $2291 = 0;
 var $2292 = 0, $2293 = 0, $2294 = 0, $2295 = 0, $2296 = 0, $2297 = 0, $2298 = 0, $2299 = 0, $23 = 0, $230 = 0, $2300 = 0, $2301 = 0, $2302 = 0, $2303 = 0, $2304 = 0, $2305 = 0, $2306 = 0, $2307 = 0, $2308 = 0, $2309 = 0;
 var $231 = 0, $2310 = 0, $2311 = 0, $2312 = 0, $2313 = 0, $2314 = 0, $2315 = 0, $2316 = 0, $2317 = 0, $2318 = 0, $2319 = 0, $232 = 0, $2320 = 0, $2321 = 0, $2322 = 0, $2323 = 0, $2324 = 0, $2325 = 0, $2326 = 0, $2327 = 0;
 var $2328 = 0, $2329 = 0, $233 = 0, $2330 = 0, $2331 = 0, $2332 = 0, $2333 = 0, $2334 = 0, $2335 = 0, $2336 = 0, $2337 = 0, $2338 = 0, $2339 = 0, $234 = 0, $2340 = 0, $2341 = 0, $2342 = 0, $2343 = 0, $2344 = 0, $2345 = 0;
 var $2346 = 0, $2347 = 0, $2348 = 0, $2349 = 0, $235 = 0, $2350 = 0, $2351 = 0, $2352 = 0, $2353 = 0, $2354 = 0, $2355 = 0, $2356 = 0, $2357 = 0, $2358 = 0, $2359 = 0, $236 = 0, $2360 = 0, $2361 = 0, $2362 = 0, $2363 = 0;
 var $2364 = 0, $2365 = 0, $2366 = 0, $2367 = 0, $2368 = 0, $2369 = 0, $237 = 0, $2370 = 0, $2371 = 0, $2372 = 0, $2373 = 0, $2374 = 0, $2375 = 0, $2376 = 0, $2377 = 0, $2378 = 0, $2379 = 0, $238 = 0, $2380 = 0, $2381 = 0;
 var $2382 = 0, $2383 = 0, $2384 = 0, $2385 = 0, $2386 = 0, $2387 = 0, $2388 = 0, $2389 = 0, $239 = 0, $2390 = 0, $2391 = 0, $2392 = 0, $2393 = 0, $2394 = 0, $2395 = 0, $2396 = 0, $2397 = 0, $2398 = 0, $2399 = 0, $24 = 0;
 var $240 = 0, $2400 = 0, $2401 = 0, $2402 = 0, $2403 = 0, $2404 = 0, $2405 = 0, $2406 = 0, $2407 = 0, $2408 = 0, $2409 = 0, $241 = 0, $2410 = 0, $2411 = 0, $2412 = 0, $2413 = 0, $2414 = 0, $2415 = 0, $2416 = 0, $2417 = 0;
 var $2418 = 0, $2419 = 0, $242 = 0, $2420 = 0, $2421 = 0, $2422 = 0, $2423 = 0, $2424 = 0, $2425 = 0, $2426 = 0, $2427 = 0, $2428 = 0, $2429 = 0, $243 = 0, $2430 = 0, $2431 = 0, $2432 = 0, $2433 = 0, $2434 = 0, $2435 = 0;
 var $2436 = 0, $2437 = 0, $2438 = 0, $2439 = 0, $244 = 0, $2440 = 0, $2441 = 0, $2442 = 0, $2443 = 0, $2444 = 0, $2445 = 0, $2446 = 0, $2447 = 0, $2448 = 0, $2449 = 0, $245 = 0, $2450 = 0, $2451 = 0, $2452 = 0, $2453 = 0;
 var $2454 = 0, $2455 = 0, $2456 = 0, $2457 = 0, $2458 = 0, $2459 = 0, $246 = 0, $2460 = 0, $2461 = 0, $2462 = 0, $2463 = 0, $2464 = 0, $2465 = 0, $2466 = 0, $2467 = 0, $2468 = 0, $2469 = 0, $247 = 0, $2470 = 0, $2471 = 0;
 var $2472 = 0, $2473 = 0, $2474 = 0, $2475 = 0, $2476 = 0, $2477 = 0, $2478 = 0, $2479 = 0, $248 = 0, $2480 = 0, $2481 = 0, $2482 = 0, $2483 = 0, $2484 = 0, $2485 = 0, $2486 = 0, $2487 = 0, $2488 = 0, $2489 = 0, $249 = 0;
 var $2490 = 0, $2491 = 0, $2492 = 0, $2493 = 0, $2494 = 0, $2495 = 0, $2496 = 0, $2497 = 0, $2498 = 0, $2499 = 0, $25 = 0, $250 = 0, $2500 = 0, $2501 = 0, $2502 = 0, $2503 = 0, $2504 = 0, $2505 = 0, $2506 = 0, $2507 = 0;
 var $2508 = 0, $2509 = 0, $251 = 0, $2510 = 0, $2511 = 0, $2512 = 0, $2513 = 0, $2514 = 0, $2515 = 0, $2516 = 0, $2517 = 0, $2518 = 0, $2519 = 0, $252 = 0, $2520 = 0, $2521 = 0, $2522 = 0, $2523 = 0, $2524 = 0, $2525 = 0;
 var $2526 = 0, $2527 = 0, $2528 = 0, $2529 = 0, $253 = 0, $2530 = 0, $2531 = 0, $2532 = 0, $2533 = 0, $2534 = 0, $2535 = 0, $2536 = 0, $2537 = 0, $2538 = 0, $2539 = 0, $254 = 0, $2540 = 0, $2541 = 0, $2542 = 0, $2543 = 0;
 var $2544 = 0, $2545 = 0, $2546 = 0, $2547 = 0, $2548 = 0, $2549 = 0, $255 = 0, $2550 = 0, $2551 = 0, $2552 = 0, $2553 = 0, $2554 = 0, $2555 = 0, $2556 = 0, $2557 = 0, $2558 = 0, $2559 = 0, $256 = 0, $2560 = 0, $2561 = 0;
 var $2562 = 0, $2563 = 0, $2564 = 0, $2565 = 0, $2566 = 0, $2567 = 0, $2568 = 0, $2569 = 0, $257 = 0, $2570 = 0, $2571 = 0, $2572 = 0, $2573 = 0, $2574 = 0, $2575 = 0, $2576 = 0, $2577 = 0, $2578 = 0, $2579 = 0, $258 = 0;
 var $2580 = 0, $2581 = 0, $2582 = 0, $2583 = 0, $2584 = 0, $2585 = 0, $2586 = 0, $2587 = 0, $2588 = 0, $2589 = 0, $259 = 0, $2590 = 0, $2591 = 0, $2592 = 0, $2593 = 0, $2594 = 0, $2595 = 0, $2596 = 0, $2597 = 0, $2598 = 0;
 var $2599 = 0, $26 = 0, $260 = 0, $2600 = 0, $2601 = 0, $2602 = 0, $2603 = 0, $2604 = 0, $2605 = 0, $2606 = 0, $2607 = 0, $2608 = 0, $2609 = 0, $261 = 0, $2610 = 0, $2611 = 0, $2612 = 0, $2613 = 0, $2614 = 0, $2615 = 0;
 var $2616 = 0, $2617 = 0, $2618 = 0, $2619 = 0, $262 = 0, $2620 = 0, $2621 = 0, $2622 = 0, $2623 = 0, $2624 = 0, $2625 = 0, $2626 = 0, $2627 = 0, $2628 = 0, $2629 = 0, $263 = 0, $2630 = 0, $2631 = 0, $2632 = 0, $2633 = 0;
 var $2634 = 0, $2635 = 0, $2636 = 0, $2637 = 0, $2638 = 0, $2639 = 0, $264 = 0, $2640 = 0, $2641 = 0, $2642 = 0, $2643 = 0, $2644 = 0, $2645 = 0, $2646 = 0, $2647 = 0, $2648 = 0, $2649 = 0, $265 = 0, $2650 = 0, $2651 = 0;
 var $2652 = 0, $2653 = 0, $2654 = 0, $2655 = 0, $2656 = 0, $2657 = 0, $2658 = 0, $2659 = 0, $266 = 0, $2660 = 0, $2661 = 0, $2662 = 0, $2663 = 0, $2664 = 0, $2665 = 0, $2666 = 0, $2667 = 0, $2668 = 0, $2669 = 0, $267 = 0;
 var $2670 = 0, $2671 = 0, $2672 = 0, $2673 = 0, $2674 = 0, $2675 = 0, $2676 = 0, $2677 = 0, $2678 = 0, $2679 = 0, $268 = 0, $2680 = 0, $2681 = 0, $2682 = 0, $2683 = 0, $2684 = 0, $2685 = 0, $2686 = 0, $2687 = 0, $2688 = 0;
 var $2689 = 0, $269 = 0, $2690 = 0, $2691 = 0, $2692 = 0, $2693 = 0, $2694 = 0, $2695 = 0, $2696 = 0, $2697 = 0, $2698 = 0, $2699 = 0, $27 = 0, $270 = 0, $2700 = 0, $2701 = 0, $2702 = 0, $2703 = 0, $2704 = 0, $2705 = 0;
 var $2706 = 0, $2707 = 0, $2708 = 0, $2709 = 0, $271 = 0, $2710 = 0, $2711 = 0, $2712 = 0, $2713 = 0, $2714 = 0, $2715 = 0, $2716 = 0, $2717 = 0, $2718 = 0, $2719 = 0, $272 = 0, $2720 = 0, $2721 = 0, $2722 = 0, $2723 = 0;
 var $2724 = 0, $2725 = 0, $2726 = 0, $2727 = 0, $2728 = 0, $2729 = 0, $273 = 0, $2730 = 0, $2731 = 0, $2732 = 0, $2733 = 0, $2734 = 0, $2735 = 0, $2736 = 0, $2737 = 0, $2738 = 0, $2739 = 0, $274 = 0, $2740 = 0, $2741 = 0;
 var $2742 = 0, $2743 = 0, $2744 = 0, $2745 = 0, $2746 = 0, $2747 = 0, $2748 = 0, $2749 = 0, $275 = 0, $2750 = 0, $2751 = 0, $2752 = 0, $2753 = 0, $2754 = 0, $2755 = 0, $2756 = 0, $2757 = 0, $2758 = 0, $2759 = 0, $276 = 0;
 var $2760 = 0, $2761 = 0, $2762 = 0, $2763 = 0, $2764 = 0, $2765 = 0, $2766 = 0, $2767 = 0, $2768 = 0, $2769 = 0, $277 = 0, $2770 = 0, $2771 = 0, $2772 = 0, $2773 = 0, $2774 = 0, $2775 = 0, $2776 = 0, $2777 = 0, $2778 = 0;
 var $2779 = 0, $278 = 0, $2780 = 0, $2781 = 0, $2782 = 0, $2783 = 0, $2784 = 0, $2785 = 0, $2786 = 0, $2787 = 0, $2788 = 0, $2789 = 0, $279 = 0, $2790 = 0, $2791 = 0, $2792 = 0, $2793 = 0, $2794 = 0, $2795 = 0, $2796 = 0;
 var $2797 = 0, $2798 = 0, $2799 = 0, $28 = 0, $280 = 0, $2800 = 0, $2801 = 0, $2802 = 0, $2803 = 0, $2804 = 0, $2805 = 0, $2806 = 0, $2807 = 0, $2808 = 0, $2809 = 0, $281 = 0, $2810 = 0, $2811 = 0, $2812 = 0, $2813 = 0;
 var $2814 = 0, $2815 = 0, $2816 = 0, $2817 = 0, $2818 = 0, $2819 = 0, $282 = 0, $2820 = 0, $2821 = 0, $2822 = 0, $2823 = 0, $2824 = 0, $2825 = 0, $2826 = 0, $2827 = 0, $2828 = 0, $2829 = 0, $283 = 0, $2830 = 0, $2831 = 0;
 var $2832 = 0, $2833 = 0, $2834 = 0, $2835 = 0, $2836 = 0, $2837 = 0, $2838 = 0, $2839 = 0, $284 = 0, $2840 = 0, $2841 = 0, $2842 = 0, $2843 = 0, $2844 = 0, $2845 = 0, $2846 = 0, $2847 = 0, $2848 = 0, $2849 = 0, $285 = 0;
 var $2850 = 0, $2851 = 0, $2852 = 0, $2853 = 0, $2854 = 0, $2855 = 0, $2856 = 0, $2857 = 0, $2858 = 0, $2859 = 0, $286 = 0, $2860 = 0, $2861 = 0, $2862 = 0, $2863 = 0, $2864 = 0, $2865 = 0, $2866 = 0, $2867 = 0, $2868 = 0;
 var $2869 = 0, $287 = 0, $2870 = 0, $2871 = 0, $2872 = 0, $2873 = 0, $2874 = 0, $2875 = 0, $2876 = 0, $2877 = 0, $2878 = 0, $2879 = 0, $288 = 0, $2880 = 0, $2881 = 0, $2882 = 0, $2883 = 0, $2884 = 0, $2885 = 0, $2886 = 0;
 var $2887 = 0, $2888 = 0, $2889 = 0, $289 = 0, $2890 = 0, $2891 = 0, $2892 = 0, $2893 = 0, $2894 = 0, $2895 = 0, $2896 = 0, $2897 = 0, $2898 = 0, $2899 = 0, $29 = 0, $290 = 0, $2900 = 0, $2901 = 0, $2902 = 0, $2903 = 0;
 var $2904 = 0, $2905 = 0, $2906 = 0, $2907 = 0, $2908 = 0, $2909 = 0, $291 = 0, $2910 = 0, $2911 = 0, $2912 = 0, $2913 = 0, $2914 = 0, $2915 = 0, $2916 = 0, $2917 = 0, $2918 = 0, $2919 = 0, $292 = 0, $2920 = 0, $2921 = 0;
 var $2922 = 0, $2923 = 0, $2924 = 0, $2925 = 0, $2926 = 0, $2927 = 0, $2928 = 0, $2929 = 0, $293 = 0, $2930 = 0, $2931 = 0, $2932 = 0, $2933 = 0, $2934 = 0, $2935 = 0, $2936 = 0, $2937 = 0, $2938 = 0, $2939 = 0, $294 = 0;
 var $2940 = 0, $2941 = 0, $2942 = 0, $2943 = 0, $2944 = 0, $2945 = 0, $2946 = 0, $2947 = 0, $2948 = 0, $2949 = 0, $295 = 0, $2950 = 0, $2951 = 0, $2952 = 0, $2953 = 0, $2954 = 0, $2955 = 0, $2956 = 0, $2957 = 0, $2958 = 0;
 var $2959 = 0, $296 = 0, $2960 = 0, $2961 = 0, $2962 = 0, $2963 = 0, $2964 = 0, $2965 = 0, $2966 = 0, $2967 = 0, $2968 = 0, $2969 = 0, $297 = 0, $2970 = 0, $2971 = 0, $2972 = 0, $2973 = 0, $2974 = 0, $2975 = 0, $2976 = 0;
 var $2977 = 0, $2978 = 0, $2979 = 0, $298 = 0, $2980 = 0, $2981 = 0, $2982 = 0, $2983 = 0, $2984 = 0, $2985 = 0, $2986 = 0, $2987 = 0, $2988 = 0, $2989 = 0, $299 = 0, $2990 = 0, $2991 = 0, $2992 = 0, $2993 = 0, $2994 = 0;
 var $2995 = 0, $2996 = 0, $2997 = 0, $2998 = 0, $2999 = 0, $30 = 0, $300 = 0, $3000 = 0, $3001 = 0, $3002 = 0, $3003 = 0, $3004 = 0, $3005 = 0, $3006 = 0, $3007 = 0, $3008 = 0, $3009 = 0, $301 = 0, $3010 = 0, $3011 = 0;
 var $3012 = 0, $3013 = 0, $3014 = 0, $3015 = 0, $3016 = 0, $3017 = 0, $3018 = 0, $3019 = 0, $302 = 0, $3020 = 0, $3021 = 0, $3022 = 0, $3023 = 0, $3024 = 0, $3025 = 0, $3026 = 0, $3027 = 0, $3028 = 0, $3029 = 0, $303 = 0;
 var $3030 = 0, $3031 = 0, $3032 = 0, $3033 = 0, $3034 = 0, $3035 = 0, $3036 = 0, $3037 = 0, $3038 = 0, $3039 = 0, $304 = 0, $3040 = 0, $3041 = 0, $3042 = 0, $3043 = 0, $3044 = 0, $3045 = 0, $3046 = 0, $3047 = 0, $3048 = 0;
 var $3049 = 0, $305 = 0, $3050 = 0, $3051 = 0, $3052 = 0, $3053 = 0, $3054 = 0, $3055 = 0, $3056 = 0, $3057 = 0, $3058 = 0, $3059 = 0, $306 = 0, $3060 = 0, $3061 = 0, $3062 = 0, $3063 = 0, $3064 = 0, $3065 = 0, $3066 = 0;
 var $3067 = 0, $3068 = 0, $3069 = 0, $307 = 0, $3070 = 0, $3071 = 0, $3072 = 0, $3073 = 0, $3074 = 0, $3075 = 0, $3076 = 0, $3077 = 0, $3078 = 0, $3079 = 0, $308 = 0, $3080 = 0, $3081 = 0, $3082 = 0, $3083 = 0, $3084 = 0;
 var $3085 = 0, $3086 = 0, $3087 = 0, $3088 = 0, $3089 = 0, $309 = 0, $3090 = 0, $3091 = 0, $3092 = 0, $3093 = 0, $3094 = 0, $3095 = 0, $3096 = 0, $3097 = 0, $3098 = 0, $3099 = 0, $31 = 0, $310 = 0, $3100 = 0, $3101 = 0;
 var $3102 = 0, $3103 = 0, $3104 = 0, $3105 = 0, $3106 = 0, $3107 = 0, $3108 = 0, $3109 = 0, $311 = 0, $3110 = 0, $3111 = 0, $3112 = 0, $3113 = 0, $3114 = 0, $3115 = 0, $3116 = 0, $3117 = 0, $3118 = 0, $3119 = 0, $312 = 0;
 var $3120 = 0, $3121 = 0, $3122 = 0, $3123 = 0, $3124 = 0, $3125 = 0, $3126 = 0, $3127 = 0, $3128 = 0, $3129 = 0, $313 = 0, $3130 = 0, $3131 = 0, $3132 = 0, $3133 = 0, $3134 = 0, $3135 = 0, $3136 = 0, $3137 = 0, $3138 = 0;
 var $3139 = 0, $314 = 0, $3140 = 0, $3141 = 0, $3142 = 0, $3143 = 0, $3144 = 0, $3145 = 0, $3146 = 0, $3147 = 0, $3148 = 0, $3149 = 0, $315 = 0, $3150 = 0, $3151 = 0, $3152 = 0, $3153 = 0, $3154 = 0, $3155 = 0, $3156 = 0;
 var $3157 = 0, $3158 = 0, $3159 = 0, $316 = 0, $3160 = 0, $3161 = 0, $3162 = 0, $3163 = 0, $3164 = 0, $3165 = 0, $3166 = 0, $3167 = 0, $3168 = 0, $3169 = 0, $317 = 0, $3170 = 0, $3171 = 0, $3172 = 0, $3173 = 0, $3174 = 0;
 var $3175 = 0, $3176 = 0, $3177 = 0, $3178 = 0, $3179 = 0, $318 = 0, $3180 = 0, $3181 = 0, $3182 = 0, $3183 = 0, $3184 = 0, $3185 = 0, $3186 = 0, $3187 = 0, $3188 = 0, $3189 = 0, $319 = 0, $3190 = 0, $3191 = 0, $3192 = 0;
 var $3193 = 0, $3194 = 0, $3195 = 0, $3196 = 0, $3197 = 0, $3198 = 0, $3199 = 0, $32 = 0, $320 = 0, $3200 = 0, $3201 = 0, $3202 = 0, $3203 = 0, $3204 = 0, $3205 = 0, $3206 = 0, $3207 = 0, $3208 = 0, $3209 = 0, $321 = 0;
 var $3210 = 0, $3211 = 0, $3212 = 0, $3213 = 0, $3214 = 0, $3215 = 0, $3216 = 0, $3217 = 0, $3218 = 0, $3219 = 0, $322 = 0, $3220 = 0, $3221 = 0, $3222 = 0, $3223 = 0, $3224 = 0, $3225 = 0, $3226 = 0, $3227 = 0, $3228 = 0;
 var $3229 = 0, $323 = 0, $3230 = 0, $3231 = 0, $3232 = 0, $3233 = 0, $3234 = 0, $3235 = 0, $3236 = 0, $3237 = 0, $3238 = 0, $3239 = 0, $324 = 0, $3240 = 0, $3241 = 0, $3242 = 0, $3243 = 0, $3244 = 0, $3245 = 0, $3246 = 0;
 var $3247 = 0, $3248 = 0, $3249 = 0, $325 = 0, $3250 = 0, $3251 = 0, $3252 = 0, $3253 = 0, $3254 = 0, $3255 = 0, $3256 = 0, $3257 = 0, $3258 = 0, $3259 = 0, $326 = 0, $3260 = 0, $3261 = 0, $3262 = 0, $3263 = 0, $3264 = 0;
 var $3265 = 0, $3266 = 0, $3267 = 0, $3268 = 0, $3269 = 0, $327 = 0, $3270 = 0, $3271 = 0, $3272 = 0, $3273 = 0, $3274 = 0, $3275 = 0, $3276 = 0, $3277 = 0, $3278 = 0, $3279 = 0, $328 = 0, $3280 = 0, $3281 = 0, $3282 = 0;
 var $3283 = 0, $3284 = 0, $3285 = 0, $3286 = 0, $3287 = 0, $3288 = 0, $3289 = 0, $329 = 0, $3290 = 0, $3291 = 0, $3292 = 0, $3293 = 0, $3294 = 0, $3295 = 0, $3296 = 0, $3297 = 0, $3298 = 0, $3299 = 0, $33 = 0, $330 = 0;
 var $3300 = 0, $3301 = 0, $3302 = 0, $3303 = 0, $3304 = 0, $3305 = 0, $3306 = 0, $3307 = 0, $3308 = 0, $3309 = 0, $331 = 0, $3310 = 0, $3311 = 0, $3312 = 0, $3313 = 0, $3314 = 0, $3315 = 0, $3316 = 0, $3317 = 0, $3318 = 0;
 var $3319 = 0, $332 = 0, $3320 = 0, $3321 = 0, $3322 = 0, $3323 = 0, $3324 = 0, $3325 = 0, $3326 = 0, $3327 = 0, $3328 = 0, $3329 = 0, $333 = 0, $3330 = 0, $3331 = 0, $3332 = 0, $3333 = 0, $3334 = 0, $3335 = 0, $3336 = 0;
 var $3337 = 0, $3338 = 0, $3339 = 0, $334 = 0, $3340 = 0, $3341 = 0, $3342 = 0, $3343 = 0, $3344 = 0, $3345 = 0, $3346 = 0, $3347 = 0, $3348 = 0, $3349 = 0, $335 = 0, $3350 = 0, $3351 = 0, $3352 = 0, $3353 = 0, $3354 = 0;
 var $3355 = 0, $3356 = 0, $3357 = 0, $3358 = 0, $3359 = 0, $336 = 0, $3360 = 0, $3361 = 0, $3362 = 0, $3363 = 0, $3364 = 0, $3365 = 0, $3366 = 0, $3367 = 0, $3368 = 0, $3369 = 0, $337 = 0, $3370 = 0, $3371 = 0, $3372 = 0;
 var $3373 = 0, $3374 = 0, $3375 = 0, $3376 = 0, $3377 = 0, $3378 = 0, $3379 = 0, $338 = 0, $3380 = 0, $3381 = 0, $3382 = 0, $3383 = 0, $3384 = 0, $3385 = 0, $3386 = 0, $3387 = 0, $3388 = 0, $3389 = 0, $339 = 0, $3390 = 0;
 var $3391 = 0, $3392 = 0, $3393 = 0, $3394 = 0, $3395 = 0, $3396 = 0, $3397 = 0, $3398 = 0, $3399 = 0, $34 = 0, $340 = 0, $3400 = 0, $3401 = 0, $3402 = 0, $3403 = 0, $3404 = 0, $3405 = 0, $3406 = 0, $3407 = 0, $3408 = 0;
 var $3409 = 0, $341 = 0, $3410 = 0, $3411 = 0, $3412 = 0, $3413 = 0, $3414 = 0, $3415 = 0, $3416 = 0, $3417 = 0, $3418 = 0, $3419 = 0, $342 = 0, $3420 = 0, $3421 = 0, $3422 = 0, $3423 = 0, $3424 = 0, $3425 = 0, $3426 = 0;
 var $3427 = 0, $3428 = 0, $3429 = 0, $343 = 0, $3430 = 0, $3431 = 0, $3432 = 0, $3433 = 0, $3434 = 0, $3435 = 0, $3436 = 0, $3437 = 0, $3438 = 0, $3439 = 0, $344 = 0, $3440 = 0, $3441 = 0, $3442 = 0, $3443 = 0, $3444 = 0;
 var $3445 = 0, $3446 = 0, $3447 = 0, $3448 = 0, $3449 = 0, $345 = 0, $3450 = 0, $3451 = 0, $3452 = 0, $3453 = 0, $3454 = 0, $3455 = 0, $3456 = 0, $3457 = 0, $3458 = 0, $3459 = 0, $346 = 0, $3460 = 0, $3461 = 0, $3462 = 0;
 var $3463 = 0, $3464 = 0, $3465 = 0, $3466 = 0, $3467 = 0, $3468 = 0, $3469 = 0, $347 = 0, $3470 = 0, $3471 = 0, $3472 = 0, $3473 = 0, $3474 = 0, $3475 = 0, $3476 = 0, $3477 = 0, $3478 = 0, $3479 = 0, $348 = 0, $3480 = 0;
 var $3481 = 0, $3482 = 0, $3483 = 0, $3484 = 0, $3485 = 0, $3486 = 0, $3487 = 0, $3488 = 0, $3489 = 0, $349 = 0, $3490 = 0, $3491 = 0, $3492 = 0, $3493 = 0, $3494 = 0, $3495 = 0, $3496 = 0, $3497 = 0, $3498 = 0, $3499 = 0;
 var $35 = 0, $350 = 0, $3500 = 0, $3501 = 0, $3502 = 0, $3503 = 0, $3504 = 0, $3505 = 0, $3506 = 0, $3507 = 0, $3508 = 0, $3509 = 0, $351 = 0, $3510 = 0, $3511 = 0, $3512 = 0, $3513 = 0, $3514 = 0, $3515 = 0, $3516 = 0;
 var $3517 = 0, $3518 = 0, $3519 = 0, $352 = 0, $3520 = 0, $3521 = 0, $3522 = 0, $3523 = 0, $3524 = 0, $3525 = 0, $3526 = 0, $3527 = 0, $3528 = 0, $3529 = 0, $353 = 0, $3530 = 0, $3531 = 0, $3532 = 0, $3533 = 0, $3534 = 0;
 var $3535 = 0, $3536 = 0, $3537 = 0, $3538 = 0, $3539 = 0, $354 = 0, $3540 = 0, $3541 = 0, $3542 = 0, $3543 = 0, $3544 = 0, $3545 = 0, $3546 = 0, $3547 = 0, $3548 = 0, $3549 = 0, $355 = 0, $3550 = 0, $3551 = 0, $3552 = 0;
 var $3553 = 0, $3554 = 0, $3555 = 0, $3556 = 0, $3557 = 0, $3558 = 0, $3559 = 0, $356 = 0, $3560 = 0, $3561 = 0, $3562 = 0, $3563 = 0, $3564 = 0, $3565 = 0, $3566 = 0, $3567 = 0, $3568 = 0, $3569 = 0, $357 = 0, $3570 = 0;
 var $3571 = 0, $3572 = 0, $3573 = 0, $3574 = 0, $3575 = 0, $3576 = 0, $3577 = 0, $3578 = 0, $3579 = 0, $358 = 0, $3580 = 0, $3581 = 0, $3582 = 0, $3583 = 0, $3584 = 0, $3585 = 0, $3586 = 0, $3587 = 0, $3588 = 0, $3589 = 0;
 var $359 = 0, $3590 = 0, $3591 = 0, $3592 = 0, $3593 = 0, $3594 = 0, $3595 = 0, $3596 = 0, $3597 = 0, $3598 = 0, $3599 = 0, $36 = 0, $360 = 0, $3600 = 0, $3601 = 0, $3602 = 0, $3603 = 0, $3604 = 0, $3605 = 0, $3606 = 0;
 var $3607 = 0, $3608 = 0, $3609 = 0, $361 = 0, $3610 = 0, $3611 = 0, $3612 = 0, $3613 = 0, $3614 = 0, $3615 = 0, $3616 = 0, $3617 = 0, $3618 = 0, $3619 = 0, $362 = 0, $3620 = 0, $3621 = 0, $3622 = 0, $3623 = 0, $3624 = 0;
 var $3625 = 0, $3626 = 0, $3627 = 0, $3628 = 0, $3629 = 0, $363 = 0, $3630 = 0, $3631 = 0, $3632 = 0, $3633 = 0, $3634 = 0, $3635 = 0, $3636 = 0, $3637 = 0, $3638 = 0, $3639 = 0, $364 = 0, $3640 = 0, $3641 = 0, $3642 = 0;
 var $3643 = 0, $3644 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0;
 var $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0;
 var $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0;
 var $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0;
 var $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0;
 var $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0;
 var $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0;
 var $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0;
 var $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0;
 var $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0;
 var $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0;
 var $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0;
 var $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0;
 var $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0;
 var $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0;
 var $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0;
 var $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0;
 var $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0;
 var $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0;
 var $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0;
 var $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0;
 var $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0;
 var $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0;
 var $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0;
 var $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0;
 var $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0;
 var $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0;
 var $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0;
 var $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0;
 var $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0;
 var $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0;
 var $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0;
 var $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0;
 var $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0;
 var $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0;
 var $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $indirectbr_cast = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 432|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(432|0);
 $89 = sp + 32|0;
 $90 = sp + 24|0;
 $91 = sp + 16|0;
 $92 = sp + 8|0;
 $93 = sp;
 $5 = $0;
 $6 = $1;
 $7 = $2;
 $8 = $3;
 $107 = $5;
 $108 = ($107|0)==(0|0);
 if ($108) {
  HEAP32[962] = 8;
  $4 = 1;
  $3642 = $4;
  STACKTOP = sp;return ($3642|0);
 }
 $109 = HEAP32[966]|0;
 $10 = $109;
 $110 = $5;
 $9 = $110;
 $111 = $6;
 $11 = $111;
 $112 = $10;
 $113 = HEAP32[969]|0;
 $114 = ($112>>>0)<($113>>>0);
 if ($114) {
  $115 = $10;
  HEAP32[966] = $115;
  _realloc_coq_stack(256);
  $116 = HEAP32[966]|0;
  $10 = $116;
 }
 $117 = $9;
 $118 = ((($117)) + 4|0);
 $9 = $118;
 $$sink1 = $117;
 L8: while(1) {
  $3643 = HEAP32[$$sink1>>2]|0;
  $3644 = (0 + ($3643)|0);
  $indirectbr_cast = $3644;
  L10: do {
   switch ($indirectbr_cast|0) {
   case 108:  {
    break L8;
    break;
   }
   case 1:  {
    $119 = $10;
    $120 = HEAP32[$119>>2]|0;
    $11 = $120;
    $121 = $9;
    $122 = ((($121)) + 4|0);
    $9 = $122;
    $$sink1 = $121;
    continue L8;
    break;
   }
   case 2:  {
    $123 = $10;
    $124 = ((($123)) + 4|0);
    $125 = HEAP32[$124>>2]|0;
    $11 = $125;
    $126 = $9;
    $127 = ((($126)) + 4|0);
    $9 = $127;
    $$sink1 = $126;
    continue L8;
    break;
   }
   case 3:  {
    $128 = $10;
    $129 = ((($128)) + 8|0);
    $130 = HEAP32[$129>>2]|0;
    $11 = $130;
    $131 = $9;
    $132 = ((($131)) + 4|0);
    $9 = $132;
    $$sink1 = $131;
    continue L8;
    break;
   }
   case 4:  {
    $133 = $10;
    $134 = ((($133)) + 12|0);
    $135 = HEAP32[$134>>2]|0;
    $11 = $135;
    $136 = $9;
    $137 = ((($136)) + 4|0);
    $9 = $137;
    $$sink1 = $136;
    continue L8;
    break;
   }
   case 5:  {
    $138 = $10;
    $139 = ((($138)) + 16|0);
    $140 = HEAP32[$139>>2]|0;
    $11 = $140;
    $141 = $9;
    $142 = ((($141)) + 4|0);
    $9 = $142;
    $$sink1 = $141;
    continue L8;
    break;
   }
   case 6:  {
    $143 = $10;
    $144 = ((($143)) + 20|0);
    $145 = HEAP32[$144>>2]|0;
    $11 = $145;
    $146 = $9;
    $147 = ((($146)) + 4|0);
    $9 = $147;
    $$sink1 = $146;
    continue L8;
    break;
   }
   case 7:  {
    $148 = $10;
    $149 = ((($148)) + 24|0);
    $150 = HEAP32[$149>>2]|0;
    $11 = $150;
    $151 = $9;
    $152 = ((($151)) + 4|0);
    $9 = $152;
    $$sink1 = $151;
    continue L8;
    break;
   }
   case 8:  {
    $153 = $10;
    $154 = ((($153)) + 28|0);
    $155 = HEAP32[$154>>2]|0;
    $11 = $155;
    $156 = $9;
    $157 = ((($156)) + 4|0);
    $9 = $157;
    $$sink1 = $156;
    continue L8;
    break;
   }
   case 9:  {
    label = 24;
    break;
   }
   case 10:  {
    $158 = $11;
    $159 = $10;
    $160 = ((($159)) + -4|0);
    $10 = $160;
    HEAP32[$160>>2] = $158;
    $161 = $9;
    $162 = ((($161)) + 4|0);
    $9 = $162;
    $$sink1 = $161;
    continue L8;
    break;
   }
   case 11:  {
    $163 = $11;
    $164 = $10;
    $165 = ((($164)) + -4|0);
    $10 = $165;
    HEAP32[$165>>2] = $163;
    $166 = $9;
    $167 = ((($166)) + 4|0);
    $9 = $167;
    $$sink1 = $166;
    continue L8;
    break;
   }
   case 12:  {
    $168 = $11;
    $169 = $10;
    $170 = ((($169)) + -4|0);
    $10 = $170;
    HEAP32[$170>>2] = $168;
    $171 = $10;
    $172 = ((($171)) + 4|0);
    $173 = HEAP32[$172>>2]|0;
    $11 = $173;
    $174 = $9;
    $175 = ((($174)) + 4|0);
    $9 = $175;
    $$sink1 = $174;
    continue L8;
    break;
   }
   case 13:  {
    $176 = $11;
    $177 = $10;
    $178 = ((($177)) + -4|0);
    $10 = $178;
    HEAP32[$178>>2] = $176;
    $179 = $10;
    $180 = ((($179)) + 8|0);
    $181 = HEAP32[$180>>2]|0;
    $11 = $181;
    $182 = $9;
    $183 = ((($182)) + 4|0);
    $9 = $183;
    $$sink1 = $182;
    continue L8;
    break;
   }
   case 14:  {
    $184 = $11;
    $185 = $10;
    $186 = ((($185)) + -4|0);
    $10 = $186;
    HEAP32[$186>>2] = $184;
    $187 = $10;
    $188 = ((($187)) + 12|0);
    $189 = HEAP32[$188>>2]|0;
    $11 = $189;
    $190 = $9;
    $191 = ((($190)) + 4|0);
    $9 = $191;
    $$sink1 = $190;
    continue L8;
    break;
   }
   case 15:  {
    $192 = $11;
    $193 = $10;
    $194 = ((($193)) + -4|0);
    $10 = $194;
    HEAP32[$194>>2] = $192;
    $195 = $10;
    $196 = ((($195)) + 16|0);
    $197 = HEAP32[$196>>2]|0;
    $11 = $197;
    $198 = $9;
    $199 = ((($198)) + 4|0);
    $9 = $199;
    $$sink1 = $198;
    continue L8;
    break;
   }
   case 16:  {
    $200 = $11;
    $201 = $10;
    $202 = ((($201)) + -4|0);
    $10 = $202;
    HEAP32[$202>>2] = $200;
    $203 = $10;
    $204 = ((($203)) + 20|0);
    $205 = HEAP32[$204>>2]|0;
    $11 = $205;
    $206 = $9;
    $207 = ((($206)) + 4|0);
    $9 = $207;
    $$sink1 = $206;
    continue L8;
    break;
   }
   case 17:  {
    $208 = $11;
    $209 = $10;
    $210 = ((($209)) + -4|0);
    $10 = $210;
    HEAP32[$210>>2] = $208;
    $211 = $10;
    $212 = ((($211)) + 24|0);
    $213 = HEAP32[$212>>2]|0;
    $11 = $213;
    $214 = $9;
    $215 = ((($214)) + 4|0);
    $9 = $215;
    $$sink1 = $214;
    continue L8;
    break;
   }
   case 18:  {
    $216 = $11;
    $217 = $10;
    $218 = ((($217)) + -4|0);
    $10 = $218;
    HEAP32[$218>>2] = $216;
    $219 = $10;
    $220 = ((($219)) + 28|0);
    $221 = HEAP32[$220>>2]|0;
    $11 = $221;
    $222 = $9;
    $223 = ((($222)) + 4|0);
    $9 = $223;
    $$sink1 = $222;
    continue L8;
    break;
   }
   case 19:  {
    $224 = $11;
    $225 = $10;
    $226 = ((($225)) + -4|0);
    $10 = $226;
    HEAP32[$226>>2] = $224;
    label = 24;
    break;
   }
   case 20:  {
    $235 = $9;
    $236 = ((($235)) + 4|0);
    $9 = $236;
    $237 = HEAP32[$235>>2]|0;
    $238 = $10;
    $239 = (($238) + ($237<<2)|0);
    $10 = $239;
    $240 = $9;
    $241 = ((($240)) + 4|0);
    $9 = $241;
    $$sink1 = $240;
    continue L8;
    break;
   }
   case 21:  {
    $242 = $7;
    $243 = $242;
    $244 = ((($243)) + 4|0);
    $245 = HEAP32[$244>>2]|0;
    $11 = $245;
    $246 = $9;
    $247 = ((($246)) + 4|0);
    $9 = $247;
    $$sink1 = $246;
    continue L8;
    break;
   }
   case 22:  {
    $248 = $7;
    $249 = $248;
    $250 = ((($249)) + 8|0);
    $251 = HEAP32[$250>>2]|0;
    $11 = $251;
    $252 = $9;
    $253 = ((($252)) + 4|0);
    $9 = $253;
    $$sink1 = $252;
    continue L8;
    break;
   }
   case 23:  {
    $254 = $7;
    $255 = $254;
    $256 = ((($255)) + 12|0);
    $257 = HEAP32[$256>>2]|0;
    $11 = $257;
    $258 = $9;
    $259 = ((($258)) + 4|0);
    $9 = $259;
    $$sink1 = $258;
    continue L8;
    break;
   }
   case 24:  {
    $260 = $7;
    $261 = $260;
    $262 = ((($261)) + 16|0);
    $263 = HEAP32[$262>>2]|0;
    $11 = $263;
    $264 = $9;
    $265 = ((($264)) + 4|0);
    $9 = $265;
    $$sink1 = $264;
    continue L8;
    break;
   }
   case 25:  {
    label = 35;
    break;
   }
   case 26:  {
    $266 = $11;
    $267 = $10;
    $268 = ((($267)) + -4|0);
    $10 = $268;
    HEAP32[$268>>2] = $266;
    $269 = $7;
    $270 = $269;
    $271 = ((($270)) + 4|0);
    $272 = HEAP32[$271>>2]|0;
    $11 = $272;
    $273 = $9;
    $274 = ((($273)) + 4|0);
    $9 = $274;
    $$sink1 = $273;
    continue L8;
    break;
   }
   case 27:  {
    $275 = $11;
    $276 = $10;
    $277 = ((($276)) + -4|0);
    $10 = $277;
    HEAP32[$277>>2] = $275;
    $278 = $7;
    $279 = $278;
    $280 = ((($279)) + 8|0);
    $281 = HEAP32[$280>>2]|0;
    $11 = $281;
    $282 = $9;
    $283 = ((($282)) + 4|0);
    $9 = $283;
    $$sink1 = $282;
    continue L8;
    break;
   }
   case 28:  {
    $284 = $11;
    $285 = $10;
    $286 = ((($285)) + -4|0);
    $10 = $286;
    HEAP32[$286>>2] = $284;
    $287 = $7;
    $288 = $287;
    $289 = ((($288)) + 12|0);
    $290 = HEAP32[$289>>2]|0;
    $11 = $290;
    $291 = $9;
    $292 = ((($291)) + 4|0);
    $9 = $292;
    $$sink1 = $291;
    continue L8;
    break;
   }
   case 29:  {
    $293 = $11;
    $294 = $10;
    $295 = ((($294)) + -4|0);
    $10 = $295;
    HEAP32[$295>>2] = $293;
    $296 = $7;
    $297 = $296;
    $298 = ((($297)) + 16|0);
    $299 = HEAP32[$298>>2]|0;
    $11 = $299;
    $300 = $9;
    $301 = ((($300)) + 4|0);
    $9 = $301;
    $$sink1 = $300;
    continue L8;
    break;
   }
   case 30:  {
    $302 = $11;
    $303 = $10;
    $304 = ((($303)) + -4|0);
    $10 = $304;
    HEAP32[$304>>2] = $302;
    label = 35;
    break;
   }
   case 31:  {
    $314 = $10;
    $315 = ((($314)) + -12|0);
    $10 = $315;
    $316 = $9;
    $317 = $9;
    $318 = HEAP32[$317>>2]|0;
    $319 = (($316) + ($318<<2)|0);
    $320 = $319;
    $321 = $10;
    HEAP32[$321>>2] = $320;
    $322 = $7;
    $323 = $10;
    $324 = ((($323)) + 4|0);
    HEAP32[$324>>2] = $322;
    $325 = $8;
    $326 = $325 << 1;
    $327 = (($326) + 1)|0;
    $328 = $10;
    $329 = ((($328)) + 8|0);
    HEAP32[$329>>2] = $327;
    $8 = 0;
    $330 = $9;
    $331 = ((($330)) + 4|0);
    $9 = $331;
    $332 = $9;
    $333 = ((($332)) + 4|0);
    $9 = $333;
    $$sink1 = $332;
    continue L8;
    break;
   }
   case 32:  {
    $334 = $9;
    $335 = HEAP32[$334>>2]|0;
    $336 = (($335) - 1)|0;
    $8 = $336;
    $337 = $11;
    $338 = $337;
    $339 = HEAP32[$338>>2]|0;
    $9 = $339;
    $340 = $11;
    $7 = $340;
    label = 41;
    break;
   }
   case 33:  {
    $341 = $10;
    $342 = HEAP32[$341>>2]|0;
    $12 = $342;
    $343 = $10;
    $344 = ((($343)) + -12|0);
    $10 = $344;
    $345 = $12;
    $346 = $10;
    HEAP32[$346>>2] = $345;
    $347 = $9;
    $348 = $347;
    $349 = $10;
    $350 = ((($349)) + 4|0);
    HEAP32[$350>>2] = $348;
    $351 = $7;
    $352 = $10;
    $353 = ((($352)) + 8|0);
    HEAP32[$353>>2] = $351;
    $354 = $8;
    $355 = $354 << 1;
    $356 = (($355) + 1)|0;
    $357 = $10;
    $358 = ((($357)) + 12|0);
    HEAP32[$358>>2] = $356;
    $359 = $11;
    $360 = $359;
    $361 = HEAP32[$360>>2]|0;
    $9 = $361;
    $362 = $11;
    $7 = $362;
    $8 = 0;
    label = 41;
    break;
   }
   case 34:  {
    $363 = $10;
    $364 = HEAP32[$363>>2]|0;
    $13 = $364;
    $365 = $10;
    $366 = ((($365)) + 4|0);
    $367 = HEAP32[$366>>2]|0;
    $14 = $367;
    $368 = $10;
    $369 = ((($368)) + -12|0);
    $10 = $369;
    $370 = $13;
    $371 = $10;
    HEAP32[$371>>2] = $370;
    $372 = $14;
    $373 = $10;
    $374 = ((($373)) + 4|0);
    HEAP32[$374>>2] = $372;
    $375 = $9;
    $376 = $375;
    $377 = $10;
    $378 = ((($377)) + 8|0);
    HEAP32[$378>>2] = $376;
    $379 = $7;
    $380 = $10;
    $381 = ((($380)) + 12|0);
    HEAP32[$381>>2] = $379;
    $382 = $8;
    $383 = $382 << 1;
    $384 = (($383) + 1)|0;
    $385 = $10;
    $386 = ((($385)) + 16|0);
    HEAP32[$386>>2] = $384;
    $387 = $11;
    $388 = $387;
    $389 = HEAP32[$388>>2]|0;
    $9 = $389;
    $390 = $11;
    $7 = $390;
    $8 = 1;
    label = 41;
    break;
   }
   case 35:  {
    $391 = $10;
    $392 = HEAP32[$391>>2]|0;
    $15 = $392;
    $393 = $10;
    $394 = ((($393)) + 4|0);
    $395 = HEAP32[$394>>2]|0;
    $16 = $395;
    $396 = $10;
    $397 = ((($396)) + 8|0);
    $398 = HEAP32[$397>>2]|0;
    $17 = $398;
    $399 = $10;
    $400 = ((($399)) + -12|0);
    $10 = $400;
    $401 = $15;
    $402 = $10;
    HEAP32[$402>>2] = $401;
    $403 = $16;
    $404 = $10;
    $405 = ((($404)) + 4|0);
    HEAP32[$405>>2] = $403;
    $406 = $17;
    $407 = $10;
    $408 = ((($407)) + 8|0);
    HEAP32[$408>>2] = $406;
    $409 = $9;
    $410 = $409;
    $411 = $10;
    $412 = ((($411)) + 12|0);
    HEAP32[$412>>2] = $410;
    $413 = $7;
    $414 = $10;
    $415 = ((($414)) + 16|0);
    HEAP32[$415>>2] = $413;
    $416 = $8;
    $417 = $416 << 1;
    $418 = (($417) + 1)|0;
    $419 = $10;
    $420 = ((($419)) + 20|0);
    HEAP32[$420>>2] = $418;
    $421 = $11;
    $422 = $421;
    $423 = HEAP32[$422>>2]|0;
    $9 = $423;
    $424 = $11;
    $7 = $424;
    $8 = 2;
    label = 41;
    break;
   }
   case 36:  {
    $452 = $9;
    $453 = ((($452)) + 4|0);
    $9 = $453;
    $454 = HEAP32[$452>>2]|0;
    $19 = $454;
    $455 = $9;
    $456 = HEAP32[$455>>2]|0;
    $20 = $456;
    $457 = $10;
    $458 = $20;
    $459 = (($457) + ($458<<2)|0);
    $460 = $19;
    $461 = (0 - ($460))|0;
    $462 = (($459) + ($461<<2)|0);
    $21 = $462;
    $463 = $19;
    $464 = (($463) - 1)|0;
    $22 = $464;
    while(1) {
     $465 = $22;
     $466 = ($465|0)>=(0);
     if (!($466)) {
      break;
     }
     $467 = $10;
     $468 = $22;
     $469 = (($467) + ($468<<2)|0);
     $470 = HEAP32[$469>>2]|0;
     $471 = $21;
     $472 = $22;
     $473 = (($471) + ($472<<2)|0);
     HEAP32[$473>>2] = $470;
     $474 = $22;
     $475 = (($474) + -1)|0;
     $22 = $475;
    }
    $476 = $21;
    $10 = $476;
    $477 = $11;
    $478 = $477;
    $479 = HEAP32[$478>>2]|0;
    $9 = $479;
    $480 = $11;
    $7 = $480;
    $481 = $19;
    $482 = (($481) - 1)|0;
    $483 = $8;
    $484 = (($483) + ($482))|0;
    $8 = $484;
    label = 41;
    break;
   }
   case 37:  {
    $485 = $10;
    $486 = HEAP32[$485>>2]|0;
    $23 = $486;
    $487 = $10;
    $488 = $9;
    $489 = HEAP32[$488>>2]|0;
    $490 = (($487) + ($489<<2)|0);
    $491 = ((($490)) + -4|0);
    $10 = $491;
    $492 = $23;
    $493 = $10;
    HEAP32[$493>>2] = $492;
    $494 = $11;
    $495 = $494;
    $496 = HEAP32[$495>>2]|0;
    $9 = $496;
    $497 = $11;
    $7 = $497;
    label = 41;
    break;
   }
   case 38:  {
    $498 = $10;
    $499 = HEAP32[$498>>2]|0;
    $24 = $499;
    $500 = $10;
    $501 = ((($500)) + 4|0);
    $502 = HEAP32[$501>>2]|0;
    $25 = $502;
    $503 = $10;
    $504 = $9;
    $505 = HEAP32[$504>>2]|0;
    $506 = (($503) + ($505<<2)|0);
    $507 = ((($506)) + -8|0);
    $10 = $507;
    $508 = $24;
    $509 = $10;
    HEAP32[$509>>2] = $508;
    $510 = $25;
    $511 = $10;
    $512 = ((($511)) + 4|0);
    HEAP32[$512>>2] = $510;
    $513 = $11;
    $514 = $513;
    $515 = HEAP32[$514>>2]|0;
    $9 = $515;
    $516 = $11;
    $7 = $516;
    $517 = $8;
    $518 = (($517) + 1)|0;
    $8 = $518;
    label = 41;
    break;
   }
   case 39:  {
    $519 = $10;
    $520 = HEAP32[$519>>2]|0;
    $26 = $520;
    $521 = $10;
    $522 = ((($521)) + 4|0);
    $523 = HEAP32[$522>>2]|0;
    $27 = $523;
    $524 = $10;
    $525 = ((($524)) + 8|0);
    $526 = HEAP32[$525>>2]|0;
    $28 = $526;
    $527 = $10;
    $528 = $9;
    $529 = HEAP32[$528>>2]|0;
    $530 = (($527) + ($529<<2)|0);
    $531 = ((($530)) + -12|0);
    $10 = $531;
    $532 = $26;
    $533 = $10;
    HEAP32[$533>>2] = $532;
    $534 = $27;
    $535 = $10;
    $536 = ((($535)) + 4|0);
    HEAP32[$536>>2] = $534;
    $537 = $28;
    $538 = $10;
    $539 = ((($538)) + 8|0);
    HEAP32[$539>>2] = $537;
    $540 = $11;
    $541 = $540;
    $542 = HEAP32[$541>>2]|0;
    $9 = $542;
    $543 = $11;
    $7 = $543;
    $544 = $8;
    $545 = (($544) + 2)|0;
    $8 = $545;
    label = 41;
    break;
   }
   case 40:  {
    $546 = $9;
    $547 = ((($546)) + 4|0);
    $9 = $547;
    $548 = HEAP32[$546>>2]|0;
    $549 = $10;
    $550 = (($549) + ($548<<2)|0);
    $10 = $550;
    $551 = $8;
    $552 = ($551|0)>(0);
    if ($552) {
     $553 = $8;
     $554 = (($553) + -1)|0;
     $8 = $554;
     $555 = $11;
     $556 = $555;
     $557 = HEAP32[$556>>2]|0;
     $9 = $557;
     $558 = $11;
     $7 = $558;
    } else {
     $559 = $10;
     $560 = HEAP32[$559>>2]|0;
     $561 = $560;
     $9 = $561;
     $562 = $10;
     $563 = ((($562)) + 4|0);
     $564 = HEAP32[$563>>2]|0;
     $7 = $564;
     $565 = $10;
     $566 = ((($565)) + 8|0);
     $567 = HEAP32[$566>>2]|0;
     $568 = $567 >> 1;
     $8 = $568;
     $569 = $10;
     $570 = ((($569)) + 12|0);
     $10 = $570;
    }
    $571 = $9;
    $572 = ((($571)) + 4|0);
    $9 = $572;
    $$sink1 = $571;
    continue L8;
    break;
   }
   case 41:  {
    $573 = $7;
    $574 = $573;
    $575 = ((($574)) + -4|0);
    $576 = HEAP32[$575>>2]|0;
    $577 = $576 >>> 10;
    $578 = (($577) - 2)|0;
    $29 = $578;
    $579 = $10;
    $580 = $29;
    $581 = (0 - ($580))|0;
    $582 = (($579) + ($581<<2)|0);
    $583 = HEAP32[969]|0;
    $584 = ($582>>>0)<($583>>>0);
    if ($584) {
     $585 = $10;
     HEAP32[966] = $585;
     $586 = $29;
     $587 = (($586) + 256)|0;
     _realloc_coq_stack($587);
     $588 = HEAP32[966]|0;
     $10 = $588;
    }
    $589 = $29;
    $590 = $10;
    $591 = (0 - ($589))|0;
    $592 = (($590) + ($591<<2)|0);
    $10 = $592;
    $30 = 0;
    while(1) {
     $593 = $30;
     $594 = $29;
     $595 = ($593|0)<($594|0);
     $596 = $7;
     $597 = $596;
     if (!($595)) {
      break;
     }
     $598 = $30;
     $599 = (($598) + 2)|0;
     $600 = (($597) + ($599<<2)|0);
     $601 = HEAP32[$600>>2]|0;
     $602 = $10;
     $603 = $30;
     $604 = (($602) + ($603<<2)|0);
     HEAP32[$604>>2] = $601;
     $605 = $30;
     $606 = (($605) + 1)|0;
     $30 = $606;
    }
    $607 = ((($597)) + 4|0);
    $608 = HEAP32[$607>>2]|0;
    $7 = $608;
    $609 = $29;
    $610 = $8;
    $611 = (($610) + ($609))|0;
    $8 = $611;
    $612 = $9;
    $613 = ((($612)) + 4|0);
    $9 = $613;
    $$sink1 = $612;
    continue L8;
    break;
   }
   case 42:  {
    $614 = $9;
    $615 = ((($614)) + 4|0);
    $9 = $615;
    $616 = HEAP32[$614>>2]|0;
    $31 = $616;
    $617 = $8;
    $618 = $31;
    $619 = ($617|0)>=($618|0);
    if ($619) {
     $620 = $31;
     $621 = $8;
     $622 = (($621) - ($620))|0;
     $8 = $622;
    } else {
     $623 = $8;
     $624 = (1 + ($623))|0;
     $32 = $624;
     $625 = $32;
     $626 = (($625) + 2)|0;
     $627 = (($626) + 1)|0;
     $628 = $627<<2;
     $629 = HEAP32[_caml_young_ptr>>2]|0;
     $630 = (0 - ($628))|0;
     $631 = (($629) + ($630)|0);
     HEAP32[_caml_young_ptr>>2] = $631;
     $632 = HEAP32[_caml_young_ptr>>2]|0;
     $633 = HEAP32[_caml_young_limit>>2]|0;
     $634 = ($632>>>0)<($633>>>0);
     if ($634) {
      $635 = $32;
      $636 = (($635) + 2)|0;
      $637 = (($636) + 1)|0;
      $638 = $637<<2;
      $639 = HEAP32[_caml_young_ptr>>2]|0;
      $640 = (($639) + ($638)|0);
      HEAP32[_caml_young_ptr>>2] = $640;
      $641 = $10;
      $642 = ((($641)) + -8|0);
      $10 = $642;
      $643 = $11;
      $644 = $10;
      HEAP32[$644>>2] = $643;
      $645 = $7;
      $646 = $10;
      $647 = ((($646)) + 4|0);
      HEAP32[$647>>2] = $645;
      $648 = $10;
      HEAP32[966] = $648;
      _caml_minor_collection();
      $649 = $10;
      $650 = HEAP32[$649>>2]|0;
      $11 = $650;
      $651 = $10;
      $652 = ((($651)) + 4|0);
      $653 = HEAP32[$652>>2]|0;
      $7 = $653;
      $654 = $10;
      $655 = ((($654)) + 8|0);
      $10 = $655;
      $656 = $32;
      $657 = (($656) + 2)|0;
      $658 = (($657) + 1)|0;
      $659 = $658<<2;
      $660 = HEAP32[_caml_young_ptr>>2]|0;
      $661 = (0 - ($659))|0;
      $662 = (($660) + ($661)|0);
      HEAP32[_caml_young_ptr>>2] = $662;
     }
     $663 = $32;
     $664 = (($663) + 2)|0;
     $665 = $664 << 10;
     $666 = (($665) + 768)|0;
     $667 = (($666) + 247)|0;
     $668 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$668>>2] = $667;
     $669 = HEAP32[_caml_young_ptr>>2]|0;
     $670 = ((($669)) + 4|0);
     $671 = $670;
     $11 = $671;
     $672 = $7;
     $673 = $11;
     $674 = $673;
     $675 = ((($674)) + 4|0);
     HEAP32[$675>>2] = $672;
     $33 = 0;
     while(1) {
      $676 = $33;
      $677 = $32;
      $678 = ($676>>>0)<($677>>>0);
      if (!($678)) {
       break;
      }
      $679 = $10;
      $680 = $33;
      $681 = (($679) + ($680<<2)|0);
      $682 = HEAP32[$681>>2]|0;
      $683 = $11;
      $684 = $683;
      $685 = $33;
      $686 = (($685) + 2)|0;
      $687 = (($684) + ($686<<2)|0);
      HEAP32[$687>>2] = $682;
      $688 = $33;
      $689 = (($688) + 1)|0;
      $33 = $689;
     }
     $690 = $9;
     $691 = ((($690)) + -12|0);
     $692 = $11;
     $693 = $692;
     HEAP32[$693>>2] = $691;
     $694 = $32;
     $695 = $10;
     $696 = (($695) + ($694<<2)|0);
     $10 = $696;
     $697 = $10;
     $698 = HEAP32[$697>>2]|0;
     $699 = $698;
     $9 = $699;
     $700 = $10;
     $701 = ((($700)) + 4|0);
     $702 = HEAP32[$701>>2]|0;
     $7 = $702;
     $703 = $10;
     $704 = ((($703)) + 8|0);
     $705 = HEAP32[$704>>2]|0;
     $706 = $705 >> 1;
     $8 = $706;
     $707 = $10;
     $708 = ((($707)) + 12|0);
     $10 = $708;
    }
    $709 = $9;
    $710 = ((($709)) + 4|0);
    $9 = $710;
    $$sink1 = $709;
    continue L8;
    break;
   }
   case 43:  {
    $711 = $9;
    $712 = ((($711)) + 4|0);
    $9 = $712;
    $713 = HEAP32[$711>>2]|0;
    $34 = $713;
    $714 = $34;
    $715 = $8;
    $716 = ($714|0)<=($715|0);
    do {
     if ($716) {
      $717 = $10;
      $718 = $34;
      $719 = (($717) + ($718<<2)|0);
      $720 = HEAP32[$719>>2]|0;
      $721 = $720 & 1;
      $722 = ($721|0)==(0);
      if ($722) {
       $723 = $10;
       $724 = $34;
       $725 = (($723) + ($724<<2)|0);
       $726 = HEAP32[$725>>2]|0;
       $727 = $726;
       $728 = ((($727)) + -4|0);
       $729 = HEAP8[$728>>0]|0;
       $730 = $729&255;
       $731 = ($730|0)==(0);
       if ($731) {
        label = 81;
        break;
       }
      }
      $732 = $9;
      $733 = ((($732)) + 4|0);
      $9 = $733;
     } else {
      label = 81;
     }
    } while(0);
    do {
     if ((label|0) == 81) {
      label = 0;
      $734 = $8;
      $735 = $34;
      $736 = ($734|0)<($735|0);
      if ($736) {
       $737 = $8;
       $738 = (1 + ($737))|0;
       $35 = $738;
       $739 = $35;
       $740 = (($739) + 2)|0;
       $741 = (($740) + 1)|0;
       $742 = $741<<2;
       $743 = HEAP32[_caml_young_ptr>>2]|0;
       $744 = (0 - ($742))|0;
       $745 = (($743) + ($744)|0);
       HEAP32[_caml_young_ptr>>2] = $745;
       $746 = HEAP32[_caml_young_ptr>>2]|0;
       $747 = HEAP32[_caml_young_limit>>2]|0;
       $748 = ($746>>>0)<($747>>>0);
       if ($748) {
        $749 = $35;
        $750 = (($749) + 2)|0;
        $751 = (($750) + 1)|0;
        $752 = $751<<2;
        $753 = HEAP32[_caml_young_ptr>>2]|0;
        $754 = (($753) + ($752)|0);
        HEAP32[_caml_young_ptr>>2] = $754;
        $755 = $10;
        $756 = ((($755)) + -8|0);
        $10 = $756;
        $757 = $11;
        $758 = $10;
        HEAP32[$758>>2] = $757;
        $759 = $7;
        $760 = $10;
        $761 = ((($760)) + 4|0);
        HEAP32[$761>>2] = $759;
        $762 = $10;
        HEAP32[966] = $762;
        _caml_minor_collection();
        $763 = $10;
        $764 = HEAP32[$763>>2]|0;
        $11 = $764;
        $765 = $10;
        $766 = ((($765)) + 4|0);
        $767 = HEAP32[$766>>2]|0;
        $7 = $767;
        $768 = $10;
        $769 = ((($768)) + 8|0);
        $10 = $769;
        $770 = $35;
        $771 = (($770) + 2)|0;
        $772 = (($771) + 1)|0;
        $773 = $772<<2;
        $774 = HEAP32[_caml_young_ptr>>2]|0;
        $775 = (0 - ($773))|0;
        $776 = (($774) + ($775)|0);
        HEAP32[_caml_young_ptr>>2] = $776;
       }
       $777 = $35;
       $778 = (($777) + 2)|0;
       $779 = $778 << 10;
       $780 = (($779) + 768)|0;
       $781 = (($780) + 247)|0;
       $782 = HEAP32[_caml_young_ptr>>2]|0;
       HEAP32[$782>>2] = $781;
       $783 = HEAP32[_caml_young_ptr>>2]|0;
       $784 = ((($783)) + 4|0);
       $785 = $784;
       $11 = $785;
       $786 = $7;
       $787 = $11;
       $788 = $787;
       $789 = ((($788)) + 4|0);
       HEAP32[$789>>2] = $786;
       $36 = 0;
       while(1) {
        $790 = $36;
        $791 = $35;
        $792 = ($790>>>0)<($791>>>0);
        if (!($792)) {
         break;
        }
        $793 = $10;
        $794 = $36;
        $795 = (($793) + ($794<<2)|0);
        $796 = HEAP32[$795>>2]|0;
        $797 = $11;
        $798 = $797;
        $799 = $36;
        $800 = (($799) + 2)|0;
        $801 = (($798) + ($800<<2)|0);
        HEAP32[$801>>2] = $796;
        $802 = $36;
        $803 = (($802) + 1)|0;
        $36 = $803;
       }
       $804 = $9;
       $805 = ((($804)) + -12|0);
       $806 = $11;
       $807 = $806;
       HEAP32[$807>>2] = $805;
       $808 = $35;
       $809 = $10;
       $810 = (($809) + ($808<<2)|0);
       $10 = $810;
       $811 = $10;
       $812 = HEAP32[$811>>2]|0;
       $813 = $812;
       $9 = $813;
       $814 = $10;
       $815 = ((($814)) + 4|0);
       $816 = HEAP32[$815>>2]|0;
       $7 = $816;
       $817 = $10;
       $818 = ((($817)) + 8|0);
       $819 = HEAP32[$818>>2]|0;
       $820 = $819 >> 1;
       $8 = $820;
       $821 = $10;
       $822 = ((($821)) + 12|0);
       $10 = $822;
       break;
      }
      $823 = $34;
      $824 = (($823) + 2)|0;
      $825 = (($824) + 1)|0;
      $826 = $825<<2;
      $827 = HEAP32[_caml_young_ptr>>2]|0;
      $828 = (0 - ($826))|0;
      $829 = (($827) + ($828)|0);
      HEAP32[_caml_young_ptr>>2] = $829;
      $830 = HEAP32[_caml_young_ptr>>2]|0;
      $831 = HEAP32[_caml_young_limit>>2]|0;
      $832 = ($830>>>0)<($831>>>0);
      if ($832) {
       $833 = $34;
       $834 = (($833) + 2)|0;
       $835 = (($834) + 1)|0;
       $836 = $835<<2;
       $837 = HEAP32[_caml_young_ptr>>2]|0;
       $838 = (($837) + ($836)|0);
       HEAP32[_caml_young_ptr>>2] = $838;
       $839 = $10;
       $840 = ((($839)) + -8|0);
       $10 = $840;
       $841 = $11;
       $842 = $10;
       HEAP32[$842>>2] = $841;
       $843 = $7;
       $844 = $10;
       $845 = ((($844)) + 4|0);
       HEAP32[$845>>2] = $843;
       $846 = $10;
       HEAP32[966] = $846;
       _caml_minor_collection();
       $847 = $10;
       $848 = HEAP32[$847>>2]|0;
       $11 = $848;
       $849 = $10;
       $850 = ((($849)) + 4|0);
       $851 = HEAP32[$850>>2]|0;
       $7 = $851;
       $852 = $10;
       $853 = ((($852)) + 8|0);
       $10 = $853;
       $854 = $34;
       $855 = (($854) + 2)|0;
       $856 = (($855) + 1)|0;
       $857 = $856<<2;
       $858 = HEAP32[_caml_young_ptr>>2]|0;
       $859 = (0 - ($857))|0;
       $860 = (($858) + ($859)|0);
       HEAP32[_caml_young_ptr>>2] = $860;
      }
      $861 = $34;
      $862 = (($861) + 2)|0;
      $863 = $862 << 10;
      $864 = (($863) + 768)|0;
      $865 = (($864) + 247)|0;
      $866 = HEAP32[_caml_young_ptr>>2]|0;
      HEAP32[$866>>2] = $865;
      $867 = HEAP32[_caml_young_ptr>>2]|0;
      $868 = ((($867)) + 4|0);
      $869 = $868;
      $11 = $869;
      $870 = $7;
      $871 = $11;
      $872 = $871;
      $873 = ((($872)) + 4|0);
      HEAP32[$873>>2] = $870;
      $38 = 0;
      while(1) {
       $874 = $38;
       $875 = $34;
       $876 = ($874>>>0)<($875>>>0);
       if (!($876)) {
        break;
       }
       $877 = $10;
       $878 = $38;
       $879 = (($877) + ($878<<2)|0);
       $880 = HEAP32[$879>>2]|0;
       $881 = $11;
       $882 = $881;
       $883 = $38;
       $884 = (($883) + 2)|0;
       $885 = (($882) + ($884<<2)|0);
       HEAP32[$885>>2] = $880;
       $886 = $38;
       $887 = (($886) + 1)|0;
       $38 = $887;
      }
      $888 = $9;
      $889 = $11;
      $890 = $889;
      HEAP32[$890>>2] = $888;
      $891 = $34;
      $892 = $10;
      $893 = (($892) + ($891<<2)|0);
      $10 = $893;
      $894 = $11;
      $895 = $10;
      $896 = ((($895)) + -4|0);
      $10 = $896;
      HEAP32[$896>>2] = $894;
      $897 = HEAP32[_caml_young_ptr>>2]|0;
      $898 = ((($897)) + -12|0);
      HEAP32[_caml_young_ptr>>2] = $898;
      $899 = HEAP32[_caml_young_ptr>>2]|0;
      $900 = HEAP32[_caml_young_limit>>2]|0;
      $901 = ($899>>>0)<($900>>>0);
      if ($901) {
       $902 = HEAP32[_caml_young_ptr>>2]|0;
       $903 = ((($902)) + 12|0);
       HEAP32[_caml_young_ptr>>2] = $903;
       $904 = $10;
       $905 = ((($904)) + -8|0);
       $10 = $905;
       $906 = $11;
       $907 = $10;
       HEAP32[$907>>2] = $906;
       $908 = $7;
       $909 = $10;
       $910 = ((($909)) + 4|0);
       HEAP32[$910>>2] = $908;
       $911 = $10;
       HEAP32[966] = $911;
       _caml_minor_collection();
       $912 = $10;
       $913 = HEAP32[$912>>2]|0;
       $11 = $913;
       $914 = $10;
       $915 = ((($914)) + 4|0);
       $916 = HEAP32[$915>>2]|0;
       $7 = $916;
       $917 = $10;
       $918 = ((($917)) + 8|0);
       $10 = $918;
       $919 = HEAP32[_caml_young_ptr>>2]|0;
       $920 = ((($919)) + -12|0);
       HEAP32[_caml_young_ptr>>2] = $920;
      }
      $921 = HEAP32[_caml_young_ptr>>2]|0;
      HEAP32[$921>>2] = 2820;
      $922 = HEAP32[_caml_young_ptr>>2]|0;
      $923 = ((($922)) + 4|0);
      $924 = $923;
      $11 = $924;
      $925 = $10;
      $926 = HEAP32[$925>>2]|0;
      $927 = $11;
      $928 = $927;
      $929 = ((($928)) + 4|0);
      HEAP32[$929>>2] = $926;
      $930 = $10;
      $931 = ((($930)) + 4|0);
      $932 = HEAP32[$931>>2]|0;
      $933 = $11;
      $934 = $933;
      HEAP32[$934>>2] = $932;
      $935 = $10;
      $936 = ((($935)) + 4|0);
      $10 = $936;
      $937 = $11;
      $938 = $10;
      HEAP32[$938>>2] = $937;
      $939 = $8;
      $940 = $34;
      $941 = (($939) - ($940))|0;
      $37 = $941;
      $942 = $37;
      $943 = (2 + ($942))|0;
      $944 = (($943) + 1)|0;
      $945 = $944<<2;
      $946 = HEAP32[_caml_young_ptr>>2]|0;
      $947 = (0 - ($945))|0;
      $948 = (($946) + ($947)|0);
      HEAP32[_caml_young_ptr>>2] = $948;
      $949 = HEAP32[_caml_young_ptr>>2]|0;
      $950 = HEAP32[_caml_young_limit>>2]|0;
      $951 = ($949>>>0)<($950>>>0);
      if ($951) {
       $952 = $37;
       $953 = (2 + ($952))|0;
       $954 = (($953) + 1)|0;
       $955 = $954<<2;
       $956 = HEAP32[_caml_young_ptr>>2]|0;
       $957 = (($956) + ($955)|0);
       HEAP32[_caml_young_ptr>>2] = $957;
       $958 = $10;
       $959 = ((($958)) + -8|0);
       $10 = $959;
       $960 = $11;
       $961 = $10;
       HEAP32[$961>>2] = $960;
       $962 = $7;
       $963 = $10;
       $964 = ((($963)) + 4|0);
       HEAP32[$964>>2] = $962;
       $965 = $10;
       HEAP32[966] = $965;
       _caml_minor_collection();
       $966 = $10;
       $967 = HEAP32[$966>>2]|0;
       $11 = $967;
       $968 = $10;
       $969 = ((($968)) + 4|0);
       $970 = HEAP32[$969>>2]|0;
       $7 = $970;
       $971 = $10;
       $972 = ((($971)) + 8|0);
       $10 = $972;
       $973 = $37;
       $974 = (2 + ($973))|0;
       $975 = (($974) + 1)|0;
       $976 = $975<<2;
       $977 = HEAP32[_caml_young_ptr>>2]|0;
       $978 = (0 - ($976))|0;
       $979 = (($977) + ($978)|0);
       HEAP32[_caml_young_ptr>>2] = $979;
      }
      $980 = $37;
      $981 = (2 + ($980))|0;
      $982 = $981 << 10;
      $983 = (($982) + 768)|0;
      $984 = (($983) + 0)|0;
      $985 = HEAP32[_caml_young_ptr>>2]|0;
      HEAP32[$985>>2] = $984;
      $986 = HEAP32[_caml_young_ptr>>2]|0;
      $987 = ((($986)) + 4|0);
      $988 = $987;
      $11 = $988;
      $989 = HEAP32[963]|0;
      $990 = $11;
      $991 = $990;
      HEAP32[$991>>2] = $989;
      $992 = $10;
      $993 = HEAP32[$992>>2]|0;
      $994 = $11;
      $995 = $994;
      $996 = ((($995)) + 4|0);
      HEAP32[$996>>2] = $993;
      $997 = $10;
      $998 = ((($997)) + 4|0);
      $10 = $998;
      $38 = 0;
      while(1) {
       $999 = $38;
       $1000 = $37;
       $1001 = ($999>>>0)<($1000>>>0);
       if (!($1001)) {
        break;
       }
       $1002 = $10;
       $1003 = $38;
       $1004 = (($1002) + ($1003<<2)|0);
       $1005 = HEAP32[$1004>>2]|0;
       $1006 = $11;
       $1007 = $1006;
       $1008 = $38;
       $1009 = (($1008) + 2)|0;
       $1010 = (($1007) + ($1009<<2)|0);
       HEAP32[$1010>>2] = $1005;
       $1011 = $38;
       $1012 = (($1011) + 1)|0;
       $38 = $1012;
      }
      $1013 = $37;
      $1014 = $10;
      $1015 = (($1014) + ($1013<<2)|0);
      $10 = $1015;
      $1016 = $10;
      $1017 = HEAP32[$1016>>2]|0;
      $1018 = $1017;
      $9 = $1018;
      $1019 = $10;
      $1020 = ((($1019)) + 4|0);
      $1021 = HEAP32[$1020>>2]|0;
      $7 = $1021;
      $1022 = $10;
      $1023 = ((($1022)) + 8|0);
      $1024 = HEAP32[$1023>>2]|0;
      $1025 = $1024 >> 1;
      $8 = $1025;
      $1026 = $10;
      $1027 = ((($1026)) + 12|0);
      $10 = $1027;
     }
    } while(0);
    $1028 = $9;
    $1029 = ((($1028)) + 4|0);
    $9 = $1029;
    $$sink1 = $1028;
    continue L8;
    break;
   }
   case 44:  {
    $1030 = $9;
    $1031 = ((($1030)) + 4|0);
    $9 = $1031;
    $1032 = HEAP32[$1030>>2]|0;
    $39 = $1032;
    $1033 = $39;
    $1034 = ($1033|0)>(0);
    if ($1034) {
     $1035 = $11;
     $1036 = $10;
     $1037 = ((($1036)) + -4|0);
     $10 = $1037;
     HEAP32[$1037>>2] = $1035;
    }
    $1038 = $39;
    $1039 = (1 + ($1038))|0;
    $1040 = (($1039) + 1)|0;
    $1041 = $1040<<2;
    $1042 = HEAP32[_caml_young_ptr>>2]|0;
    $1043 = (0 - ($1041))|0;
    $1044 = (($1042) + ($1043)|0);
    HEAP32[_caml_young_ptr>>2] = $1044;
    $1045 = HEAP32[_caml_young_ptr>>2]|0;
    $1046 = HEAP32[_caml_young_limit>>2]|0;
    $1047 = ($1045>>>0)<($1046>>>0);
    if ($1047) {
     $1048 = $39;
     $1049 = (1 + ($1048))|0;
     $1050 = (($1049) + 1)|0;
     $1051 = $1050<<2;
     $1052 = HEAP32[_caml_young_ptr>>2]|0;
     $1053 = (($1052) + ($1051)|0);
     HEAP32[_caml_young_ptr>>2] = $1053;
     $1054 = $10;
     $1055 = ((($1054)) + -8|0);
     $10 = $1055;
     $1056 = $11;
     $1057 = $10;
     HEAP32[$1057>>2] = $1056;
     $1058 = $7;
     $1059 = $10;
     $1060 = ((($1059)) + 4|0);
     HEAP32[$1060>>2] = $1058;
     $1061 = $10;
     HEAP32[966] = $1061;
     _caml_minor_collection();
     $1062 = $10;
     $1063 = HEAP32[$1062>>2]|0;
     $11 = $1063;
     $1064 = $10;
     $1065 = ((($1064)) + 4|0);
     $1066 = HEAP32[$1065>>2]|0;
     $7 = $1066;
     $1067 = $10;
     $1068 = ((($1067)) + 8|0);
     $10 = $1068;
     $1069 = $39;
     $1070 = (1 + ($1069))|0;
     $1071 = (($1070) + 1)|0;
     $1072 = $1071<<2;
     $1073 = HEAP32[_caml_young_ptr>>2]|0;
     $1074 = (0 - ($1072))|0;
     $1075 = (($1073) + ($1074)|0);
     HEAP32[_caml_young_ptr>>2] = $1075;
    }
    $1076 = $39;
    $1077 = (1 + ($1076))|0;
    $1078 = $1077 << 10;
    $1079 = (($1078) + 768)|0;
    $1080 = (($1079) + 247)|0;
    $1081 = HEAP32[_caml_young_ptr>>2]|0;
    HEAP32[$1081>>2] = $1080;
    $1082 = HEAP32[_caml_young_ptr>>2]|0;
    $1083 = ((($1082)) + 4|0);
    $1084 = $1083;
    $11 = $1084;
    $1085 = $9;
    $1086 = $9;
    $1087 = HEAP32[$1086>>2]|0;
    $1088 = (($1085) + ($1087<<2)|0);
    $1089 = $11;
    $1090 = $1089;
    HEAP32[$1090>>2] = $1088;
    $1091 = $9;
    $1092 = ((($1091)) + 4|0);
    $9 = $1092;
    $40 = 0;
    while(1) {
     $1093 = $40;
     $1094 = $39;
     $1095 = ($1093|0)<($1094|0);
     if (!($1095)) {
      break;
     }
     $1096 = $10;
     $1097 = $40;
     $1098 = (($1096) + ($1097<<2)|0);
     $1099 = HEAP32[$1098>>2]|0;
     $1100 = $11;
     $1101 = $1100;
     $1102 = $40;
     $1103 = (($1102) + 1)|0;
     $1104 = (($1101) + ($1103<<2)|0);
     HEAP32[$1104>>2] = $1099;
     $1105 = $40;
     $1106 = (($1105) + 1)|0;
     $40 = $1106;
    }
    $1107 = $39;
    $1108 = $10;
    $1109 = (($1108) + ($1107<<2)|0);
    $10 = $1109;
    $1110 = $9;
    $1111 = ((($1110)) + 4|0);
    $9 = $1111;
    $$sink1 = $1110;
    continue L8;
    break;
   }
   case 45:  {
    $1112 = $9;
    $1113 = ((($1112)) + 4|0);
    $9 = $1113;
    $1114 = HEAP32[$1112>>2]|0;
    $41 = $1114;
    $1115 = $9;
    $1116 = ((($1115)) + 4|0);
    $9 = $1116;
    $1117 = HEAP32[$1115>>2]|0;
    $42 = $1117;
    $1118 = $9;
    $1119 = ((($1118)) + 4|0);
    $9 = $1119;
    $1120 = HEAP32[$1118>>2]|0;
    $43 = $1120;
    $1121 = $42;
    $1122 = ($1121|0)>(0);
    if ($1122) {
     $1123 = $11;
     $1124 = $10;
     $1125 = ((($1124)) + -4|0);
     $10 = $1125;
     HEAP32[$1125>>2] = $1123;
    }
    $1126 = $41;
    $1127 = (($1126) + 1)|0;
    $1128 = $1127<<2;
    $1129 = HEAP32[_caml_young_ptr>>2]|0;
    $1130 = (0 - ($1128))|0;
    $1131 = (($1129) + ($1130)|0);
    HEAP32[_caml_young_ptr>>2] = $1131;
    $1132 = HEAP32[_caml_young_ptr>>2]|0;
    $1133 = HEAP32[_caml_young_limit>>2]|0;
    $1134 = ($1132>>>0)<($1133>>>0);
    if ($1134) {
     $1135 = $41;
     $1136 = (($1135) + 1)|0;
     $1137 = $1136<<2;
     $1138 = HEAP32[_caml_young_ptr>>2]|0;
     $1139 = (($1138) + ($1137)|0);
     HEAP32[_caml_young_ptr>>2] = $1139;
     $1140 = $10;
     $1141 = ((($1140)) + -8|0);
     $10 = $1141;
     $1142 = $11;
     $1143 = $10;
     HEAP32[$1143>>2] = $1142;
     $1144 = $7;
     $1145 = $10;
     $1146 = ((($1145)) + 4|0);
     HEAP32[$1146>>2] = $1144;
     $1147 = $10;
     HEAP32[966] = $1147;
     _caml_minor_collection();
     $1148 = $10;
     $1149 = HEAP32[$1148>>2]|0;
     $11 = $1149;
     $1150 = $10;
     $1151 = ((($1150)) + 4|0);
     $1152 = HEAP32[$1151>>2]|0;
     $7 = $1152;
     $1153 = $10;
     $1154 = ((($1153)) + 8|0);
     $10 = $1154;
     $1155 = $41;
     $1156 = (($1155) + 1)|0;
     $1157 = $1156<<2;
     $1158 = HEAP32[_caml_young_ptr>>2]|0;
     $1159 = (0 - ($1157))|0;
     $1160 = (($1158) + ($1159)|0);
     HEAP32[_caml_young_ptr>>2] = $1160;
    }
    $1161 = $41;
    $1162 = $1161 << 10;
    $1163 = (($1162) + 768)|0;
    $1164 = (($1163) + 0)|0;
    $1165 = HEAP32[_caml_young_ptr>>2]|0;
    HEAP32[$1165>>2] = $1164;
    $1166 = HEAP32[_caml_young_ptr>>2]|0;
    $1167 = ((($1166)) + 4|0);
    $1168 = $1167;
    $11 = $1168;
    $44 = 0;
    while(1) {
     $1169 = $44;
     $1170 = $41;
     $1171 = ($1169|0)<($1170|0);
     if (!($1171)) {
      break;
     }
     $1172 = $9;
     $1173 = $9;
     $1174 = $44;
     $1175 = (($1173) + ($1174<<2)|0);
     $1176 = HEAP32[$1175>>2]|0;
     $1177 = (($1172) + ($1176<<2)|0);
     $1178 = $1177;
     $1179 = $11;
     $1180 = $1179;
     $1181 = $44;
     $1182 = (($1180) + ($1181<<2)|0);
     HEAP32[$1182>>2] = $1178;
     $1183 = $44;
     $1184 = (($1183) + 1)|0;
     $44 = $1184;
    }
    $1185 = $41;
    $1186 = $9;
    $1187 = (($1186) + ($1185<<2)|0);
    $9 = $1187;
    $1188 = $11;
    $1189 = $10;
    $1190 = ((($1189)) + -4|0);
    $10 = $1190;
    HEAP32[$1190>>2] = $1188;
    $1191 = $41;
    $1192 = $1191<<1;
    $1193 = $42;
    $1194 = (($1192) + ($1193))|0;
    $1195 = (($1194) + 1)|0;
    $1196 = $1195<<2;
    $1197 = HEAP32[_caml_young_ptr>>2]|0;
    $1198 = (0 - ($1196))|0;
    $1199 = (($1197) + ($1198)|0);
    HEAP32[_caml_young_ptr>>2] = $1199;
    $1200 = HEAP32[_caml_young_ptr>>2]|0;
    $1201 = HEAP32[_caml_young_limit>>2]|0;
    $1202 = ($1200>>>0)<($1201>>>0);
    if ($1202) {
     $1203 = $41;
     $1204 = $1203<<1;
     $1205 = $42;
     $1206 = (($1204) + ($1205))|0;
     $1207 = (($1206) + 1)|0;
     $1208 = $1207<<2;
     $1209 = HEAP32[_caml_young_ptr>>2]|0;
     $1210 = (($1209) + ($1208)|0);
     HEAP32[_caml_young_ptr>>2] = $1210;
     $1211 = $10;
     $1212 = ((($1211)) + -8|0);
     $10 = $1212;
     $1213 = $11;
     $1214 = $10;
     HEAP32[$1214>>2] = $1213;
     $1215 = $7;
     $1216 = $10;
     $1217 = ((($1216)) + 4|0);
     HEAP32[$1217>>2] = $1215;
     $1218 = $10;
     HEAP32[966] = $1218;
     _caml_minor_collection();
     $1219 = $10;
     $1220 = HEAP32[$1219>>2]|0;
     $11 = $1220;
     $1221 = $10;
     $1222 = ((($1221)) + 4|0);
     $1223 = HEAP32[$1222>>2]|0;
     $7 = $1223;
     $1224 = $10;
     $1225 = ((($1224)) + 8|0);
     $10 = $1225;
     $1226 = $41;
     $1227 = $1226<<1;
     $1228 = $42;
     $1229 = (($1227) + ($1228))|0;
     $1230 = (($1229) + 1)|0;
     $1231 = $1230<<2;
     $1232 = HEAP32[_caml_young_ptr>>2]|0;
     $1233 = (0 - ($1231))|0;
     $1234 = (($1232) + ($1233)|0);
     HEAP32[_caml_young_ptr>>2] = $1234;
    }
    $1235 = $41;
    $1236 = $1235<<1;
    $1237 = $42;
    $1238 = (($1236) + ($1237))|0;
    $1239 = $1238 << 10;
    $1240 = (($1239) + 768)|0;
    $1241 = (($1240) + 247)|0;
    $1242 = HEAP32[_caml_young_ptr>>2]|0;
    HEAP32[$1242>>2] = $1241;
    $1243 = HEAP32[_caml_young_ptr>>2]|0;
    $1244 = ((($1243)) + 4|0);
    $1245 = $1244;
    $11 = $1245;
    $1246 = $10;
    $1247 = ((($1246)) + 4|0);
    $10 = $1247;
    $1248 = HEAP32[$1246>>2]|0;
    $1249 = $11;
    $1250 = $1249;
    $1251 = $41;
    $1252 = $1251<<1;
    $1253 = $42;
    $1254 = (($1252) + ($1253))|0;
    $1255 = (($1254) - 1)|0;
    $1256 = (($1250) + ($1255<<2)|0);
    HEAP32[$1256>>2] = $1248;
    $1257 = $11;
    $1258 = $1257;
    $1259 = $41;
    $1260 = $1259<<1;
    $1261 = (($1260) - 1)|0;
    $1262 = (($1258) + ($1261<<2)|0);
    $45 = $1262;
    $44 = 0;
    while(1) {
     $1263 = $44;
     $1264 = $42;
     $1265 = ($1263|0)<($1264|0);
     if (!($1265)) {
      break;
     }
     $1266 = $10;
     $1267 = ((($1266)) + 4|0);
     $10 = $1267;
     $1268 = HEAP32[$1266>>2]|0;
     $1269 = $45;
     $1270 = ((($1269)) + 4|0);
     $45 = $1270;
     HEAP32[$1269>>2] = $1268;
     $1271 = $44;
     $1272 = (($1271) + 1)|0;
     $44 = $1272;
    }
    $1273 = $11;
    $1274 = $1273;
    $45 = $1274;
    $1275 = $9;
    $1276 = $9;
    $1277 = HEAP32[$1276>>2]|0;
    $1278 = (($1275) + ($1277<<2)|0);
    $1279 = $1278;
    $1280 = $45;
    HEAP32[$1280>>2] = $1279;
    $1281 = $45;
    $1282 = ((($1281)) + 4|0);
    $45 = $1282;
    $44 = 1;
    while(1) {
     $1283 = $44;
     $1284 = $41;
     $1285 = ($1283|0)<($1284|0);
     if (!($1285)) {
      break;
     }
     $1286 = $44;
     $1287 = $1286<<1;
     $1288 = $1287 << 10;
     $1289 = (($1288) + 0)|0;
     $1290 = (($1289) + 249)|0;
     $1291 = $45;
     HEAP32[$1291>>2] = $1290;
     $1292 = $45;
     $1293 = ((($1292)) + 4|0);
     $45 = $1293;
     $1294 = $9;
     $1295 = $9;
     $1296 = $44;
     $1297 = (($1295) + ($1296<<2)|0);
     $1298 = HEAP32[$1297>>2]|0;
     $1299 = (($1294) + ($1298<<2)|0);
     $1300 = $1299;
     $1301 = $45;
     HEAP32[$1301>>2] = $1300;
     $1302 = $45;
     $1303 = ((($1302)) + 4|0);
     $45 = $1303;
     $1304 = $44;
     $1305 = (($1304) + 1)|0;
     $44 = $1305;
    }
    $1306 = $41;
    $1307 = $9;
    $1308 = (($1307) + ($1306<<2)|0);
    $9 = $1308;
    $1309 = $11;
    $1310 = $43;
    $1311 = $1310<<1;
    $1312 = $1311<<2;
    $1313 = (($1309) + ($1312))|0;
    $11 = $1313;
    $1314 = $9;
    $1315 = ((($1314)) + 4|0);
    $9 = $1315;
    $$sink1 = $1314;
    continue L8;
    break;
   }
   case 46:  {
    $1316 = $9;
    $1317 = ((($1316)) + 4|0);
    $9 = $1317;
    $1318 = HEAP32[$1316>>2]|0;
    $46 = $1318;
    $1319 = $9;
    $1320 = ((($1319)) + 4|0);
    $9 = $1320;
    $1321 = HEAP32[$1319>>2]|0;
    $47 = $1321;
    $1322 = $9;
    $1323 = ((($1322)) + 4|0);
    $9 = $1323;
    $1324 = HEAP32[$1322>>2]|0;
    $48 = $1324;
    $1325 = $47;
    $1326 = ($1325|0)>(0);
    if ($1326) {
     $1327 = $11;
     $1328 = $10;
     $1329 = ((($1328)) + -4|0);
     $10 = $1329;
     HEAP32[$1329>>2] = $1327;
    }
    $1330 = $46;
    $1331 = (($1330) + 1)|0;
    $1332 = $1331<<2;
    $1333 = HEAP32[_caml_young_ptr>>2]|0;
    $1334 = (0 - ($1332))|0;
    $1335 = (($1333) + ($1334)|0);
    HEAP32[_caml_young_ptr>>2] = $1335;
    $1336 = HEAP32[_caml_young_ptr>>2]|0;
    $1337 = HEAP32[_caml_young_limit>>2]|0;
    $1338 = ($1336>>>0)<($1337>>>0);
    if ($1338) {
     $1339 = $46;
     $1340 = (($1339) + 1)|0;
     $1341 = $1340<<2;
     $1342 = HEAP32[_caml_young_ptr>>2]|0;
     $1343 = (($1342) + ($1341)|0);
     HEAP32[_caml_young_ptr>>2] = $1343;
     $1344 = $10;
     $1345 = ((($1344)) + -8|0);
     $10 = $1345;
     $1346 = $11;
     $1347 = $10;
     HEAP32[$1347>>2] = $1346;
     $1348 = $7;
     $1349 = $10;
     $1350 = ((($1349)) + 4|0);
     HEAP32[$1350>>2] = $1348;
     $1351 = $10;
     HEAP32[966] = $1351;
     _caml_minor_collection();
     $1352 = $10;
     $1353 = HEAP32[$1352>>2]|0;
     $11 = $1353;
     $1354 = $10;
     $1355 = ((($1354)) + 4|0);
     $1356 = HEAP32[$1355>>2]|0;
     $7 = $1356;
     $1357 = $10;
     $1358 = ((($1357)) + 8|0);
     $10 = $1358;
     $1359 = $46;
     $1360 = (($1359) + 1)|0;
     $1361 = $1360<<2;
     $1362 = HEAP32[_caml_young_ptr>>2]|0;
     $1363 = (0 - ($1361))|0;
     $1364 = (($1362) + ($1363)|0);
     HEAP32[_caml_young_ptr>>2] = $1364;
    }
    $1365 = $46;
    $1366 = $1365 << 10;
    $1367 = (($1366) + 768)|0;
    $1368 = (($1367) + 0)|0;
    $1369 = HEAP32[_caml_young_ptr>>2]|0;
    HEAP32[$1369>>2] = $1368;
    $1370 = HEAP32[_caml_young_ptr>>2]|0;
    $1371 = ((($1370)) + 4|0);
    $1372 = $1371;
    $11 = $1372;
    $49 = 0;
    while(1) {
     $1373 = $49;
     $1374 = $46;
     $1375 = ($1373|0)<($1374|0);
     if (!($1375)) {
      break;
     }
     $1376 = $9;
     $1377 = $9;
     $1378 = $49;
     $1379 = (($1377) + ($1378<<2)|0);
     $1380 = HEAP32[$1379>>2]|0;
     $1381 = (($1376) + ($1380<<2)|0);
     $1382 = $1381;
     $1383 = $11;
     $1384 = $1383;
     $1385 = $49;
     $1386 = (($1384) + ($1385<<2)|0);
     HEAP32[$1386>>2] = $1382;
     $1387 = $49;
     $1388 = (($1387) + 1)|0;
     $49 = $1388;
    }
    $1389 = $46;
    $1390 = $9;
    $1391 = (($1390) + ($1389<<2)|0);
    $9 = $1391;
    $1392 = $11;
    $1393 = $10;
    $1394 = ((($1393)) + -4|0);
    $10 = $1394;
    HEAP32[$1394>>2] = $1392;
    $49 = 0;
    while(1) {
     $1395 = $49;
     $1396 = $46;
     $1397 = ($1395|0)<($1396|0);
     if (!($1397)) {
      break;
     }
     $1398 = HEAP32[_caml_young_ptr>>2]|0;
     $1399 = ((($1398)) + -12|0);
     HEAP32[_caml_young_ptr>>2] = $1399;
     $1400 = HEAP32[_caml_young_ptr>>2]|0;
     $1401 = HEAP32[_caml_young_limit>>2]|0;
     $1402 = ($1400>>>0)<($1401>>>0);
     if ($1402) {
      $1403 = HEAP32[_caml_young_ptr>>2]|0;
      $1404 = ((($1403)) + 12|0);
      HEAP32[_caml_young_ptr>>2] = $1404;
      $1405 = $10;
      $1406 = ((($1405)) + -8|0);
      $10 = $1406;
      $1407 = $11;
      $1408 = $10;
      HEAP32[$1408>>2] = $1407;
      $1409 = $7;
      $1410 = $10;
      $1411 = ((($1410)) + 4|0);
      HEAP32[$1411>>2] = $1409;
      $1412 = $10;
      HEAP32[966] = $1412;
      _caml_minor_collection();
      $1413 = $10;
      $1414 = HEAP32[$1413>>2]|0;
      $11 = $1414;
      $1415 = $10;
      $1416 = ((($1415)) + 4|0);
      $1417 = HEAP32[$1416>>2]|0;
      $7 = $1417;
      $1418 = $10;
      $1419 = ((($1418)) + 8|0);
      $10 = $1419;
      $1420 = HEAP32[_caml_young_ptr>>2]|0;
      $1421 = ((($1420)) + -12|0);
      HEAP32[_caml_young_ptr>>2] = $1421;
     }
     $1422 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$1422>>2] = 2816;
     $1423 = HEAP32[_caml_young_ptr>>2]|0;
     $1424 = ((($1423)) + 4|0);
     $1425 = $1424;
     $11 = $1425;
     $1426 = HEAP32[963]|0;
     $1427 = $11;
     $1428 = $1427;
     HEAP32[$1428>>2] = $1426;
     $1429 = $11;
     $1430 = $1429;
     $1431 = ((($1430)) + 4|0);
     HEAP32[$1431>>2] = 3;
     $1432 = $11;
     $1433 = $10;
     $1434 = ((($1433)) + -4|0);
     $10 = $1434;
     HEAP32[$1434>>2] = $1432;
     $1435 = $49;
     $1436 = (($1435) + 1)|0;
     $49 = $1436;
    }
    $1437 = $10;
    $52 = $1437;
    $1438 = $46;
    $1439 = $47;
    $1440 = (($1438) + ($1439))|0;
    $1441 = (($1440) + 2)|0;
    $51 = $1441;
    $49 = 0;
    while(1) {
     $1442 = $49;
     $1443 = $46;
     $1444 = ($1442|0)<($1443|0);
     if (!($1444)) {
      break;
     }
     $1445 = $51;
     $1446 = (($1445) + 1)|0;
     $1447 = $1446<<2;
     $1448 = HEAP32[_caml_young_ptr>>2]|0;
     $1449 = (0 - ($1447))|0;
     $1450 = (($1448) + ($1449)|0);
     HEAP32[_caml_young_ptr>>2] = $1450;
     $1451 = HEAP32[_caml_young_ptr>>2]|0;
     $1452 = HEAP32[_caml_young_limit>>2]|0;
     $1453 = ($1451>>>0)<($1452>>>0);
     if ($1453) {
      $1454 = $51;
      $1455 = (($1454) + 1)|0;
      $1456 = $1455<<2;
      $1457 = HEAP32[_caml_young_ptr>>2]|0;
      $1458 = (($1457) + ($1456)|0);
      HEAP32[_caml_young_ptr>>2] = $1458;
      $1459 = $10;
      $1460 = ((($1459)) + -8|0);
      $10 = $1460;
      $1461 = $11;
      $1462 = $10;
      HEAP32[$1462>>2] = $1461;
      $1463 = $7;
      $1464 = $10;
      $1465 = ((($1464)) + 4|0);
      HEAP32[$1465>>2] = $1463;
      $1466 = $10;
      HEAP32[966] = $1466;
      _caml_minor_collection();
      $1467 = $10;
      $1468 = HEAP32[$1467>>2]|0;
      $11 = $1468;
      $1469 = $10;
      $1470 = ((($1469)) + 4|0);
      $1471 = HEAP32[$1470>>2]|0;
      $7 = $1471;
      $1472 = $10;
      $1473 = ((($1472)) + 8|0);
      $10 = $1473;
      $1474 = $51;
      $1475 = (($1474) + 1)|0;
      $1476 = $1475<<2;
      $1477 = HEAP32[_caml_young_ptr>>2]|0;
      $1478 = (0 - ($1476))|0;
      $1479 = (($1477) + ($1478)|0);
      HEAP32[_caml_young_ptr>>2] = $1479;
     }
     $1480 = $51;
     $1481 = $1480 << 10;
     $1482 = (($1481) + 768)|0;
     $1483 = (($1482) + 247)|0;
     $1484 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$1484>>2] = $1483;
     $1485 = HEAP32[_caml_young_ptr>>2]|0;
     $1486 = ((($1485)) + 4|0);
     $1487 = $1486;
     $11 = $1487;
     $1488 = $9;
     $1489 = $9;
     $1490 = $49;
     $1491 = (($1489) + ($1490<<2)|0);
     $1492 = HEAP32[$1491>>2]|0;
     $1493 = (($1488) + ($1492<<2)|0);
     $1494 = $11;
     $1495 = $1494;
     HEAP32[$1495>>2] = $1493;
     $50 = 0;
     while(1) {
      $1496 = $50;
      $1497 = $46;
      $1498 = ($1496|0)<($1497|0);
      $1499 = $52;
      if (!($1498)) {
       break;
      }
      $1500 = $50;
      $1501 = (($1499) + ($1500<<2)|0);
      $1502 = HEAP32[$1501>>2]|0;
      $1503 = $11;
      $1504 = $1503;
      $1505 = $50;
      $1506 = (($1505) + 1)|0;
      $1507 = (($1504) + ($1506<<2)|0);
      HEAP32[$1507>>2] = $1502;
      $1508 = $50;
      $1509 = (($1508) + 1)|0;
      $50 = $1509;
     }
     $1510 = $46;
     $1511 = (($1499) + ($1510<<2)|0);
     $1512 = HEAP32[$1511>>2]|0;
     $1513 = $11;
     $1514 = $1513;
     $1515 = $51;
     $1516 = (($1515) - 1)|0;
     $1517 = (($1514) + ($1516<<2)|0);
     HEAP32[$1517>>2] = $1512;
     $1518 = $46;
     $1519 = (($1518) + 1)|0;
     $50 = $1519;
     while(1) {
      $1520 = $50;
      $1521 = $46;
      $1522 = $47;
      $1523 = (($1521) + ($1522))|0;
      $1524 = ($1520|0)<=($1523|0);
      if (!($1524)) {
       break;
      }
      $1525 = $52;
      $1526 = $50;
      $1527 = (($1525) + ($1526<<2)|0);
      $1528 = HEAP32[$1527>>2]|0;
      $1529 = $11;
      $1530 = $1529;
      $1531 = $50;
      $1532 = (($1530) + ($1531<<2)|0);
      HEAP32[$1532>>2] = $1528;
      $1533 = $50;
      $1534 = (($1533) + 1)|0;
      $50 = $1534;
     }
     $1535 = $11;
     $1536 = $10;
     $1537 = ((($1536)) + -4|0);
     $10 = $1537;
     HEAP32[$1537>>2] = $1535;
     $1538 = HEAP32[_caml_young_ptr>>2]|0;
     $1539 = ((($1538)) + -8|0);
     HEAP32[_caml_young_ptr>>2] = $1539;
     $1540 = HEAP32[_caml_young_ptr>>2]|0;
     $1541 = HEAP32[_caml_young_limit>>2]|0;
     $1542 = ($1540>>>0)<($1541>>>0);
     if ($1542) {
      $1543 = HEAP32[_caml_young_ptr>>2]|0;
      $1544 = ((($1543)) + 8|0);
      HEAP32[_caml_young_ptr>>2] = $1544;
      $1545 = $10;
      $1546 = ((($1545)) + -8|0);
      $10 = $1546;
      $1547 = $11;
      $1548 = $10;
      HEAP32[$1548>>2] = $1547;
      $1549 = $7;
      $1550 = $10;
      $1551 = ((($1550)) + 4|0);
      HEAP32[$1551>>2] = $1549;
      $1552 = $10;
      HEAP32[966] = $1552;
      _caml_minor_collection();
      $1553 = $10;
      $1554 = HEAP32[$1553>>2]|0;
      $11 = $1554;
      $1555 = $10;
      $1556 = ((($1555)) + 4|0);
      $1557 = HEAP32[$1556>>2]|0;
      $7 = $1557;
      $1558 = $10;
      $1559 = ((($1558)) + 8|0);
      $10 = $1559;
      $1560 = HEAP32[_caml_young_ptr>>2]|0;
      $1561 = ((($1560)) + -8|0);
      HEAP32[_caml_young_ptr>>2] = $1561;
     }
     $1562 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$1562>>2] = 1798;
     $1563 = HEAP32[_caml_young_ptr>>2]|0;
     $1564 = ((($1563)) + 4|0);
     $1565 = $1564;
     $11 = $1565;
     $1566 = $10;
     $1567 = HEAP32[$1566>>2]|0;
     $1568 = $11;
     $1569 = $1568;
     HEAP32[$1569>>2] = $1567;
     $1570 = $11;
     $1571 = $10;
     HEAP32[$1571>>2] = $1570;
     $1572 = $52;
     $1573 = $49;
     $1574 = (($1572) + ($1573<<2)|0);
     $1575 = HEAP32[$1574>>2]|0;
     $1576 = $1575;
     $1577 = ((($1576)) + 4|0);
     $1578 = $10;
     $1579 = HEAP32[$1578>>2]|0;
     _caml_modify(($1577|0),($1579|0));
     $1580 = $10;
     $1581 = ((($1580)) + 4|0);
     $10 = $1581;
     $1582 = $49;
     $1583 = (($1582) + 1)|0;
     $49 = $1583;
    }
    $1584 = $46;
    $1585 = $9;
    $1586 = (($1585) + ($1584<<2)|0);
    $9 = $1586;
    $1587 = $52;
    $1588 = $48;
    $1589 = (($1587) + ($1588<<2)|0);
    $1590 = HEAP32[$1589>>2]|0;
    $11 = $1590;
    $1591 = $52;
    $1592 = $46;
    $1593 = (($1591) + ($1592<<2)|0);
    $1594 = ((($1593)) + 4|0);
    $1595 = $47;
    $1596 = (($1594) + ($1595<<2)|0);
    $10 = $1596;
    $1597 = $9;
    $1598 = ((($1597)) + 4|0);
    $9 = $1598;
    $$sink1 = $1597;
    continue L8;
    break;
   }
   case 47:  {
    label = 155;
    break;
   }
   case 48:  {
    label = 157;
    break;
   }
   case 49:  {
    label = 159;
    break;
   }
   case 50:  {
    label = 153;
    break;
   }
   case 51:  {
    $1610 = $11;
    $1611 = $10;
    $1612 = ((($1611)) + -4|0);
    $10 = $1612;
    HEAP32[$1612>>2] = $1610;
    label = 155;
    break;
   }
   case 52:  {
    $1617 = $11;
    $1618 = $10;
    $1619 = ((($1618)) + -4|0);
    $10 = $1619;
    HEAP32[$1619>>2] = $1617;
    label = 157;
    break;
   }
   case 53:  {
    $1623 = $11;
    $1624 = $10;
    $1625 = ((($1624)) + -4|0);
    $10 = $1625;
    HEAP32[$1625>>2] = $1623;
    label = 159;
    break;
   }
   case 54:  {
    $1599 = $11;
    $1600 = $10;
    $1601 = ((($1600)) + -4|0);
    $10 = $1601;
    HEAP32[$1601>>2] = $1599;
    label = 153;
    break;
   }
   case 55:  {
    label = 161;
    break;
   }
   case 56:  {
    $1630 = $11;
    $1631 = $10;
    $1632 = ((($1631)) + -4|0);
    $10 = $1632;
    HEAP32[$1632>>2] = $1630;
    label = 161;
    break;
   }
   case 57:  {
    $1643 = $9;
    $1644 = ((($1643)) + 4|0);
    $9 = $1644;
    $1645 = HEAP32[$1643>>2]|0;
    $53 = $1645;
    $1646 = $9;
    $1647 = ((($1646)) + 4|0);
    $9 = $1647;
    $1648 = HEAP32[$1646>>2]|0;
    $54 = $1648;
    $1649 = $53;
    $1650 = (($1649) + 1)|0;
    $1651 = $1650<<2;
    $1652 = HEAP32[_caml_young_ptr>>2]|0;
    $1653 = (0 - ($1651))|0;
    $1654 = (($1652) + ($1653)|0);
    HEAP32[_caml_young_ptr>>2] = $1654;
    $1655 = HEAP32[_caml_young_ptr>>2]|0;
    $1656 = HEAP32[_caml_young_limit>>2]|0;
    $1657 = ($1655>>>0)<($1656>>>0);
    if ($1657) {
     $1658 = $53;
     $1659 = (($1658) + 1)|0;
     $1660 = $1659<<2;
     $1661 = HEAP32[_caml_young_ptr>>2]|0;
     $1662 = (($1661) + ($1660)|0);
     HEAP32[_caml_young_ptr>>2] = $1662;
     $1663 = $10;
     $1664 = ((($1663)) + -8|0);
     $10 = $1664;
     $1665 = $11;
     $1666 = $10;
     HEAP32[$1666>>2] = $1665;
     $1667 = $7;
     $1668 = $10;
     $1669 = ((($1668)) + 4|0);
     HEAP32[$1669>>2] = $1667;
     $1670 = $10;
     HEAP32[966] = $1670;
     _caml_minor_collection();
     $1671 = $10;
     $1672 = HEAP32[$1671>>2]|0;
     $11 = $1672;
     $1673 = $10;
     $1674 = ((($1673)) + 4|0);
     $1675 = HEAP32[$1674>>2]|0;
     $7 = $1675;
     $1676 = $10;
     $1677 = ((($1676)) + 8|0);
     $10 = $1677;
     $1678 = $53;
     $1679 = (($1678) + 1)|0;
     $1680 = $1679<<2;
     $1681 = HEAP32[_caml_young_ptr>>2]|0;
     $1682 = (0 - ($1680))|0;
     $1683 = (($1681) + ($1682)|0);
     HEAP32[_caml_young_ptr>>2] = $1683;
    }
    $1684 = $53;
    $1685 = $1684 << 10;
    $1686 = (($1685) + 768)|0;
    $1687 = $54;
    $1688 = (($1686) + ($1687))|0;
    $1689 = HEAP32[_caml_young_ptr>>2]|0;
    HEAP32[$1689>>2] = $1688;
    $1690 = HEAP32[_caml_young_ptr>>2]|0;
    $1691 = ((($1690)) + 4|0);
    $1692 = $1691;
    $56 = $1692;
    $1693 = $11;
    $1694 = $56;
    $1695 = $1694;
    HEAP32[$1695>>2] = $1693;
    $55 = 1;
    while(1) {
     $1696 = $55;
     $1697 = $53;
     $1698 = ($1696>>>0)<($1697>>>0);
     if (!($1698)) {
      break;
     }
     $1699 = $10;
     $1700 = ((($1699)) + 4|0);
     $10 = $1700;
     $1701 = HEAP32[$1699>>2]|0;
     $1702 = $56;
     $1703 = $1702;
     $1704 = $55;
     $1705 = (($1703) + ($1704<<2)|0);
     HEAP32[$1705>>2] = $1701;
     $1706 = $55;
     $1707 = (($1706) + 1)|0;
     $55 = $1707;
    }
    $1708 = $56;
    $11 = $1708;
    $1709 = $9;
    $1710 = ((($1709)) + 4|0);
    $9 = $1710;
    $$sink1 = $1709;
    continue L8;
    break;
   }
   case 58:  {
    $1711 = $9;
    $1712 = ((($1711)) + 4|0);
    $9 = $1712;
    $1713 = HEAP32[$1711>>2]|0;
    $57 = $1713;
    $1714 = HEAP32[_caml_young_ptr>>2]|0;
    $1715 = ((($1714)) + -8|0);
    HEAP32[_caml_young_ptr>>2] = $1715;
    $1716 = HEAP32[_caml_young_ptr>>2]|0;
    $1717 = HEAP32[_caml_young_limit>>2]|0;
    $1718 = ($1716>>>0)<($1717>>>0);
    if ($1718) {
     $1719 = HEAP32[_caml_young_ptr>>2]|0;
     $1720 = ((($1719)) + 8|0);
     HEAP32[_caml_young_ptr>>2] = $1720;
     $1721 = $10;
     $1722 = ((($1721)) + -8|0);
     $10 = $1722;
     $1723 = $11;
     $1724 = $10;
     HEAP32[$1724>>2] = $1723;
     $1725 = $7;
     $1726 = $10;
     $1727 = ((($1726)) + 4|0);
     HEAP32[$1727>>2] = $1725;
     $1728 = $10;
     HEAP32[966] = $1728;
     _caml_minor_collection();
     $1729 = $10;
     $1730 = HEAP32[$1729>>2]|0;
     $11 = $1730;
     $1731 = $10;
     $1732 = ((($1731)) + 4|0);
     $1733 = HEAP32[$1732>>2]|0;
     $7 = $1733;
     $1734 = $10;
     $1735 = ((($1734)) + 8|0);
     $10 = $1735;
     $1736 = HEAP32[_caml_young_ptr>>2]|0;
     $1737 = ((($1736)) + -8|0);
     HEAP32[_caml_young_ptr>>2] = $1737;
    }
    $1738 = $57;
    $1739 = (1792 + ($1738))|0;
    $1740 = HEAP32[_caml_young_ptr>>2]|0;
    HEAP32[$1740>>2] = $1739;
    $1741 = HEAP32[_caml_young_ptr>>2]|0;
    $1742 = ((($1741)) + 4|0);
    $1743 = $1742;
    $58 = $1743;
    $1744 = $11;
    $1745 = $58;
    $1746 = $1745;
    HEAP32[$1746>>2] = $1744;
    $1747 = $58;
    $11 = $1747;
    $1748 = $9;
    $1749 = ((($1748)) + 4|0);
    $9 = $1749;
    $$sink1 = $1748;
    continue L8;
    break;
   }
   case 59:  {
    $1750 = $9;
    $1751 = ((($1750)) + 4|0);
    $9 = $1751;
    $1752 = HEAP32[$1750>>2]|0;
    $59 = $1752;
    $1753 = HEAP32[_caml_young_ptr>>2]|0;
    $1754 = ((($1753)) + -12|0);
    HEAP32[_caml_young_ptr>>2] = $1754;
    $1755 = HEAP32[_caml_young_ptr>>2]|0;
    $1756 = HEAP32[_caml_young_limit>>2]|0;
    $1757 = ($1755>>>0)<($1756>>>0);
    if ($1757) {
     $1758 = HEAP32[_caml_young_ptr>>2]|0;
     $1759 = ((($1758)) + 12|0);
     HEAP32[_caml_young_ptr>>2] = $1759;
     $1760 = $10;
     $1761 = ((($1760)) + -8|0);
     $10 = $1761;
     $1762 = $11;
     $1763 = $10;
     HEAP32[$1763>>2] = $1762;
     $1764 = $7;
     $1765 = $10;
     $1766 = ((($1765)) + 4|0);
     HEAP32[$1766>>2] = $1764;
     $1767 = $10;
     HEAP32[966] = $1767;
     _caml_minor_collection();
     $1768 = $10;
     $1769 = HEAP32[$1768>>2]|0;
     $11 = $1769;
     $1770 = $10;
     $1771 = ((($1770)) + 4|0);
     $1772 = HEAP32[$1771>>2]|0;
     $7 = $1772;
     $1773 = $10;
     $1774 = ((($1773)) + 8|0);
     $10 = $1774;
     $1775 = HEAP32[_caml_young_ptr>>2]|0;
     $1776 = ((($1775)) + -12|0);
     HEAP32[_caml_young_ptr>>2] = $1776;
    }
    $1777 = $59;
    $1778 = (2816 + ($1777))|0;
    $1779 = HEAP32[_caml_young_ptr>>2]|0;
    HEAP32[$1779>>2] = $1778;
    $1780 = HEAP32[_caml_young_ptr>>2]|0;
    $1781 = ((($1780)) + 4|0);
    $1782 = $1781;
    $60 = $1782;
    $1783 = $11;
    $1784 = $60;
    $1785 = $1784;
    HEAP32[$1785>>2] = $1783;
    $1786 = $10;
    $1787 = HEAP32[$1786>>2]|0;
    $1788 = $60;
    $1789 = $1788;
    $1790 = ((($1789)) + 4|0);
    HEAP32[$1790>>2] = $1787;
    $1791 = $10;
    $1792 = ((($1791)) + 4|0);
    $10 = $1792;
    $1793 = $60;
    $11 = $1793;
    $1794 = $9;
    $1795 = ((($1794)) + 4|0);
    $9 = $1795;
    $$sink1 = $1794;
    continue L8;
    break;
   }
   case 60:  {
    $1796 = $9;
    $1797 = ((($1796)) + 4|0);
    $9 = $1797;
    $1798 = HEAP32[$1796>>2]|0;
    $61 = $1798;
    $1799 = HEAP32[_caml_young_ptr>>2]|0;
    $1800 = ((($1799)) + -16|0);
    HEAP32[_caml_young_ptr>>2] = $1800;
    $1801 = HEAP32[_caml_young_ptr>>2]|0;
    $1802 = HEAP32[_caml_young_limit>>2]|0;
    $1803 = ($1801>>>0)<($1802>>>0);
    if ($1803) {
     $1804 = HEAP32[_caml_young_ptr>>2]|0;
     $1805 = ((($1804)) + 16|0);
     HEAP32[_caml_young_ptr>>2] = $1805;
     $1806 = $10;
     $1807 = ((($1806)) + -8|0);
     $10 = $1807;
     $1808 = $11;
     $1809 = $10;
     HEAP32[$1809>>2] = $1808;
     $1810 = $7;
     $1811 = $10;
     $1812 = ((($1811)) + 4|0);
     HEAP32[$1812>>2] = $1810;
     $1813 = $10;
     HEAP32[966] = $1813;
     _caml_minor_collection();
     $1814 = $10;
     $1815 = HEAP32[$1814>>2]|0;
     $11 = $1815;
     $1816 = $10;
     $1817 = ((($1816)) + 4|0);
     $1818 = HEAP32[$1817>>2]|0;
     $7 = $1818;
     $1819 = $10;
     $1820 = ((($1819)) + 8|0);
     $10 = $1820;
     $1821 = HEAP32[_caml_young_ptr>>2]|0;
     $1822 = ((($1821)) + -16|0);
     HEAP32[_caml_young_ptr>>2] = $1822;
    }
    $1823 = $61;
    $1824 = (3840 + ($1823))|0;
    $1825 = HEAP32[_caml_young_ptr>>2]|0;
    HEAP32[$1825>>2] = $1824;
    $1826 = HEAP32[_caml_young_ptr>>2]|0;
    $1827 = ((($1826)) + 4|0);
    $1828 = $1827;
    $62 = $1828;
    $1829 = $11;
    $1830 = $62;
    $1831 = $1830;
    HEAP32[$1831>>2] = $1829;
    $1832 = $10;
    $1833 = HEAP32[$1832>>2]|0;
    $1834 = $62;
    $1835 = $1834;
    $1836 = ((($1835)) + 4|0);
    HEAP32[$1836>>2] = $1833;
    $1837 = $10;
    $1838 = ((($1837)) + 4|0);
    $1839 = HEAP32[$1838>>2]|0;
    $1840 = $62;
    $1841 = $1840;
    $1842 = ((($1841)) + 8|0);
    HEAP32[$1842>>2] = $1839;
    $1843 = $10;
    $1844 = ((($1843)) + 8|0);
    $10 = $1844;
    $1845 = $62;
    $11 = $1845;
    $1846 = $9;
    $1847 = ((($1846)) + 4|0);
    $9 = $1847;
    $$sink1 = $1846;
    continue L8;
    break;
   }
   case 61:  {
    $1848 = $9;
    $1849 = ((($1848)) + 4|0);
    $9 = $1849;
    $1850 = HEAP32[$1848>>2]|0;
    $63 = $1850;
    $1851 = HEAP32[_caml_young_ptr>>2]|0;
    $1852 = ((($1851)) + -20|0);
    HEAP32[_caml_young_ptr>>2] = $1852;
    $1853 = HEAP32[_caml_young_ptr>>2]|0;
    $1854 = HEAP32[_caml_young_limit>>2]|0;
    $1855 = ($1853>>>0)<($1854>>>0);
    if ($1855) {
     $1856 = HEAP32[_caml_young_ptr>>2]|0;
     $1857 = ((($1856)) + 20|0);
     HEAP32[_caml_young_ptr>>2] = $1857;
     $1858 = $10;
     $1859 = ((($1858)) + -8|0);
     $10 = $1859;
     $1860 = $11;
     $1861 = $10;
     HEAP32[$1861>>2] = $1860;
     $1862 = $7;
     $1863 = $10;
     $1864 = ((($1863)) + 4|0);
     HEAP32[$1864>>2] = $1862;
     $1865 = $10;
     HEAP32[966] = $1865;
     _caml_minor_collection();
     $1866 = $10;
     $1867 = HEAP32[$1866>>2]|0;
     $11 = $1867;
     $1868 = $10;
     $1869 = ((($1868)) + 4|0);
     $1870 = HEAP32[$1869>>2]|0;
     $7 = $1870;
     $1871 = $10;
     $1872 = ((($1871)) + 8|0);
     $10 = $1872;
     $1873 = HEAP32[_caml_young_ptr>>2]|0;
     $1874 = ((($1873)) + -20|0);
     HEAP32[_caml_young_ptr>>2] = $1874;
    }
    $1875 = $63;
    $1876 = (4864 + ($1875))|0;
    $1877 = HEAP32[_caml_young_ptr>>2]|0;
    HEAP32[$1877>>2] = $1876;
    $1878 = HEAP32[_caml_young_ptr>>2]|0;
    $1879 = ((($1878)) + 4|0);
    $1880 = $1879;
    $64 = $1880;
    $1881 = $11;
    $1882 = $64;
    $1883 = $1882;
    HEAP32[$1883>>2] = $1881;
    $1884 = $10;
    $1885 = HEAP32[$1884>>2]|0;
    $1886 = $64;
    $1887 = $1886;
    $1888 = ((($1887)) + 4|0);
    HEAP32[$1888>>2] = $1885;
    $1889 = $10;
    $1890 = ((($1889)) + 4|0);
    $1891 = HEAP32[$1890>>2]|0;
    $1892 = $64;
    $1893 = $1892;
    $1894 = ((($1893)) + 8|0);
    HEAP32[$1894>>2] = $1891;
    $1895 = $10;
    $1896 = ((($1895)) + 8|0);
    $1897 = HEAP32[$1896>>2]|0;
    $1898 = $64;
    $1899 = $1898;
    $1900 = ((($1899)) + 12|0);
    HEAP32[$1900>>2] = $1897;
    $1901 = $10;
    $1902 = ((($1901)) + 12|0);
    $10 = $1902;
    $1903 = $64;
    $11 = $1903;
    $1904 = $9;
    $1905 = ((($1904)) + 4|0);
    $9 = $1905;
    $$sink1 = $1904;
    continue L8;
    break;
   }
   case 62:  {
    $1906 = $9;
    $1907 = ((($1906)) + 4|0);
    $9 = $1907;
    $1908 = HEAP32[$1906>>2]|0;
    $65 = $1908;
    $1909 = $11;
    $1910 = $1909 & 1;
    $1911 = ($1910|0)==(0);
    $1912 = $11;
    if ($1911) {
     $1913 = $1912;
     $1914 = ((($1913)) + -4|0);
     $1915 = HEAP8[$1914>>0]|0;
     $1916 = $1915&255;
     $66 = $1916;
     $1917 = $9;
     $1918 = $65;
     $1919 = $1918 & 16777215;
     $1920 = $66;
     $1921 = (($1919) + ($1920))|0;
     $1922 = (($1917) + ($1921<<2)|0);
     $1923 = HEAP32[$1922>>2]|0;
     $1924 = $9;
     $1925 = (($1924) + ($1923<<2)|0);
     $9 = $1925;
    } else {
     $1926 = $1912 >> 1;
     $67 = $1926;
     $1927 = $9;
     $1928 = $67;
     $1929 = (($1927) + ($1928<<2)|0);
     $1930 = HEAP32[$1929>>2]|0;
     $1931 = $9;
     $1932 = (($1931) + ($1930<<2)|0);
     $9 = $1932;
    }
    $1933 = $9;
    $1934 = ((($1933)) + 4|0);
    $9 = $1934;
    $$sink1 = $1933;
    continue L8;
    break;
   }
   case 63:  {
    $1935 = $9;
    $1936 = ((($1935)) + 4|0);
    $9 = $1936;
    $1937 = HEAP32[$1935>>2]|0;
    $69 = $1937;
    $1938 = $69;
    $1939 = $10;
    $1940 = (0 - ($1938))|0;
    $1941 = (($1939) + ($1940<<2)|0);
    $10 = $1941;
    $68 = 0;
    while(1) {
     $1942 = $68;
     $1943 = $69;
     $1944 = ($1942|0)<($1943|0);
     if (!($1944)) {
      break;
     }
     $1945 = $11;
     $1946 = $1945;
     $1947 = $68;
     $1948 = (($1946) + ($1947<<2)|0);
     $1949 = HEAP32[$1948>>2]|0;
     $1950 = $10;
     $1951 = $68;
     $1952 = (($1950) + ($1951<<2)|0);
     HEAP32[$1952>>2] = $1949;
     $1953 = $68;
     $1954 = (($1953) + 1)|0;
     $68 = $1954;
    }
    $1955 = $9;
    $1956 = ((($1955)) + 4|0);
    $9 = $1956;
    $$sink1 = $1955;
    continue L8;
    break;
   }
   case 64:  {
    $1957 = $11;
    $1958 = $1957;
    $1959 = HEAP32[$1958>>2]|0;
    $11 = $1959;
    $1960 = $9;
    $1961 = ((($1960)) + 4|0);
    $9 = $1961;
    $$sink1 = $1960;
    continue L8;
    break;
   }
   case 65:  {
    $1962 = $11;
    $1963 = $1962;
    $1964 = ((($1963)) + 4|0);
    $1965 = HEAP32[$1964>>2]|0;
    $11 = $1965;
    $1966 = $9;
    $1967 = ((($1966)) + 4|0);
    $9 = $1967;
    $$sink1 = $1966;
    continue L8;
    break;
   }
   case 66:  {
    $1968 = $11;
    $1969 = $1968;
    $1970 = $9;
    $1971 = HEAP32[$1970>>2]|0;
    $1972 = (($1969) + ($1971<<2)|0);
    $1973 = HEAP32[$1972>>2]|0;
    $11 = $1973;
    $1974 = $9;
    $1975 = ((($1974)) + 4|0);
    $9 = $1975;
    $1976 = $9;
    $1977 = ((($1976)) + 4|0);
    $9 = $1977;
    $$sink1 = $1976;
    continue L8;
    break;
   }
   case 67:  {
    $1978 = $11;
    $1979 = $1978;
    $1980 = $10;
    $1981 = HEAP32[$1980>>2]|0;
    _caml_modify(($1979|0),($1981|0));
    $1982 = $10;
    $1983 = ((($1982)) + 4|0);
    $10 = $1983;
    $1984 = $9;
    $1985 = ((($1984)) + 4|0);
    $9 = $1985;
    $$sink1 = $1984;
    continue L8;
    break;
   }
   case 68:  {
    $1986 = $11;
    $1987 = $1986;
    $1988 = ((($1987)) + 4|0);
    $1989 = $10;
    $1990 = HEAP32[$1989>>2]|0;
    _caml_modify(($1988|0),($1990|0));
    $1991 = $10;
    $1992 = ((($1991)) + 4|0);
    $10 = $1992;
    $1993 = $9;
    $1994 = ((($1993)) + 4|0);
    $9 = $1994;
    $$sink1 = $1993;
    continue L8;
    break;
   }
   case 69:  {
    $1995 = $11;
    $1996 = $1995;
    $1997 = $9;
    $1998 = HEAP32[$1997>>2]|0;
    $1999 = (($1996) + ($1998<<2)|0);
    $2000 = $10;
    $2001 = HEAP32[$2000>>2]|0;
    _caml_modify(($1999|0),($2001|0));
    $2002 = $10;
    $2003 = ((($2002)) + 4|0);
    $10 = $2003;
    $2004 = $9;
    $2005 = ((($2004)) + 4|0);
    $9 = $2005;
    $2006 = $9;
    $2007 = ((($2006)) + 4|0);
    $9 = $2007;
    $$sink1 = $2006;
    continue L8;
    break;
   }
   case 70:  {
    L227: while(1) {
     $2008 = $11;
     $2009 = $2008 & 1;
     $2010 = ($2009|0)==(0);
     if (!($2010)) {
      label = 209;
      break;
     }
     $2011 = $11;
     $2012 = $2011;
     $2013 = ((($2012)) + -4|0);
     $2014 = HEAP8[$2013>>0]|0;
     $2015 = $2014&255;
     $2016 = ($2015|0)==(0);
     if (!($2016)) {
      label = 209;
      break;
     }
     $2017 = $11;
     $2018 = $10;
     $2019 = ((($2018)) + -4|0);
     $10 = $2019;
     HEAP32[$2019>>2] = $2017;
     $2020 = $11;
     $2021 = $2020;
     $2022 = ((($2021)) + 4|0);
     $2023 = HEAP32[$2022>>2]|0;
     $11 = $2023;
     $2024 = $11;
     $2025 = $2024;
     $2026 = ((($2025)) + -4|0);
     $2027 = HEAP8[$2026>>0]|0;
     $2028 = $2027&255;
     switch ($2028|0) {
     case 6:  {
      label = 197;
      break L227;
      break;
     }
     case 7:  {
      break;
     }
     default: {
      label = 204;
      break L227;
     }
     }
     $2091 = $11;
     $2092 = $2091;
     $2093 = ((($2092)) + 4|0);
     $2094 = HEAP32[$2093>>2]|0;
     $11 = $2094;
     $2095 = $10;
     $2096 = ((($2095)) + 4|0);
     $10 = $2096;
    }
    if ((label|0) == 197) {
     label = 0;
     $2029 = $10;
     $2030 = ((($2029)) + -8|0);
     $10 = $2030;
     $2031 = $9;
     $2032 = ((($2031)) + -4|0);
     $2033 = $2032;
     $2034 = $10;
     HEAP32[$2034>>2] = $2033;
     $2035 = $7;
     $2036 = $10;
     $2037 = ((($2036)) + 4|0);
     HEAP32[$2037>>2] = $2035;
     $2038 = $11;
     $2039 = $2038;
     $2040 = HEAP32[$2039>>2]|0;
     $7 = $2040;
     $2041 = $10;
     $2042 = ((($2041)) + 8|0);
     $2043 = HEAP32[$2042>>2]|0;
     $11 = $2043;
     $2044 = $8;
     $2045 = $2044 << 1;
     $2046 = (($2045) + 1)|0;
     $2047 = $10;
     $2048 = ((($2047)) + 8|0);
     HEAP32[$2048>>2] = $2046;
     $2049 = $11;
     $2050 = $2049;
     $2051 = ((($2050)) + -4|0);
     $2052 = HEAP32[$2051>>2]|0;
     $2053 = $2052 >>> 10;
     $2054 = (($2053) - 2)|0;
     $71 = $2054;
     $2055 = $10;
     $2056 = $71;
     $2057 = (0 - ($2056))|0;
     $2058 = (($2055) + ($2057<<2)|0);
     $2059 = ((($2058)) + 4|0);
     $2060 = HEAP32[969]|0;
     $2061 = ($2059>>>0)<($2060>>>0);
     if ($2061) {
      $2062 = $10;
      HEAP32[966] = $2062;
      $2063 = $71;
      $2064 = (($2063) + 1)|0;
      $2065 = (($2064) + 256)|0;
      _realloc_coq_stack($2065);
      $2066 = HEAP32[966]|0;
      $10 = $2066;
     }
     $2067 = $71;
     $2068 = $10;
     $2069 = (0 - ($2067))|0;
     $2070 = (($2068) + ($2069<<2)|0);
     $10 = $2070;
     $70 = 0;
     while(1) {
      $2071 = $70;
      $2072 = $71;
      $2073 = ($2071>>>0)<($2072>>>0);
      $2074 = $11;
      if (!($2073)) {
       break;
      }
      $2075 = $2074;
      $2076 = $70;
      $2077 = (($2076) + 2)|0;
      $2078 = (($2075) + ($2077<<2)|0);
      $2079 = HEAP32[$2078>>2]|0;
      $2080 = $10;
      $2081 = $70;
      $2082 = (($2080) + ($2081<<2)|0);
      HEAP32[$2082>>2] = $2079;
      $2083 = $70;
      $2084 = (($2083) + 1)|0;
      $70 = $2084;
     }
     $2085 = $10;
     $2086 = ((($2085)) + -4|0);
     $10 = $2086;
     HEAP32[$2086>>2] = $2074;
     $2087 = $71;
     $8 = $2087;
     $2088 = $7;
     $2089 = $2088;
     $2090 = HEAP32[$2089>>2]|0;
     $9 = $2090;
     label = 41;
     break L10;
    }
    else if ((label|0) == 204) {
     label = 0;
     $2097 = $9;
     $2098 = ((($2097)) + 4|0);
     $9 = $2098;
     $2099 = HEAP32[_caml_young_ptr>>2]|0;
     $2100 = ((($2099)) + -12|0);
     HEAP32[_caml_young_ptr>>2] = $2100;
     $2101 = HEAP32[_caml_young_ptr>>2]|0;
     $2102 = HEAP32[_caml_young_limit>>2]|0;
     $2103 = ($2101>>>0)<($2102>>>0);
     if ($2103) {
      $2104 = HEAP32[_caml_young_ptr>>2]|0;
      $2105 = ((($2104)) + 12|0);
      HEAP32[_caml_young_ptr>>2] = $2105;
      $2106 = $10;
      $2107 = ((($2106)) + -8|0);
      $10 = $2107;
      $2108 = $11;
      $2109 = $10;
      HEAP32[$2109>>2] = $2108;
      $2110 = $7;
      $2111 = $10;
      $2112 = ((($2111)) + 4|0);
      HEAP32[$2112>>2] = $2110;
      $2113 = $10;
      HEAP32[966] = $2113;
      _caml_minor_collection();
      $2114 = $10;
      $2115 = HEAP32[$2114>>2]|0;
      $11 = $2115;
      $2116 = $10;
      $2117 = ((($2116)) + 4|0);
      $2118 = HEAP32[$2117>>2]|0;
      $7 = $2118;
      $2119 = $10;
      $2120 = ((($2119)) + 8|0);
      $10 = $2120;
      $2121 = HEAP32[_caml_young_ptr>>2]|0;
      $2122 = ((($2121)) + -12|0);
      HEAP32[_caml_young_ptr>>2] = $2122;
     }
     $2123 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$2123>>2] = 2819;
     $2124 = HEAP32[_caml_young_ptr>>2]|0;
     $2125 = ((($2124)) + 4|0);
     $2126 = $2125;
     $11 = $2126;
     $2127 = HEAP32[964]|0;
     $2128 = $2127;
     $2129 = $9;
     $2130 = ((($2129)) + 4|0);
     $9 = $2130;
     $2131 = HEAP32[$2129>>2]|0;
     $2132 = (($2128) + ($2131<<2)|0);
     $2133 = HEAP32[$2132>>2]|0;
     $2134 = $11;
     $2135 = $2134;
     HEAP32[$2135>>2] = $2133;
     $2136 = $10;
     $2137 = ((($2136)) + 4|0);
     $10 = $2137;
     $2138 = HEAP32[$2136>>2]|0;
     $2139 = $11;
     $2140 = $2139;
     $2141 = ((($2140)) + 4|0);
     HEAP32[$2141>>2] = $2138;
     $2142 = HEAP32[_caml_young_ptr>>2]|0;
     $2143 = ((($2142)) + -12|0);
     HEAP32[_caml_young_ptr>>2] = $2143;
     $2144 = HEAP32[_caml_young_ptr>>2]|0;
     $2145 = HEAP32[_caml_young_limit>>2]|0;
     $2146 = ($2144>>>0)<($2145>>>0);
     if ($2146) {
      $2147 = HEAP32[_caml_young_ptr>>2]|0;
      $2148 = ((($2147)) + 12|0);
      HEAP32[_caml_young_ptr>>2] = $2148;
      $2149 = $10;
      $2150 = ((($2149)) + -8|0);
      $10 = $2150;
      $2151 = $11;
      $2152 = $10;
      HEAP32[$2152>>2] = $2151;
      $2153 = $7;
      $2154 = $10;
      $2155 = ((($2154)) + 4|0);
      HEAP32[$2155>>2] = $2153;
      $2156 = $10;
      HEAP32[966] = $2156;
      _caml_minor_collection();
      $2157 = $10;
      $2158 = HEAP32[$2157>>2]|0;
      $11 = $2158;
      $2159 = $10;
      $2160 = ((($2159)) + 4|0);
      $2161 = HEAP32[$2160>>2]|0;
      $7 = $2161;
      $2162 = $10;
      $2163 = ((($2162)) + 8|0);
      $10 = $2163;
      $2164 = HEAP32[_caml_young_ptr>>2]|0;
      $2165 = ((($2164)) + -12|0);
      HEAP32[_caml_young_ptr>>2] = $2165;
     }
     $2166 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$2166>>2] = 2816;
     $2167 = HEAP32[_caml_young_ptr>>2]|0;
     $2168 = ((($2167)) + 4|0);
     $2169 = $2168;
     $72 = $2169;
     $2170 = HEAP32[963]|0;
     $2171 = $72;
     $2172 = $2171;
     HEAP32[$2172>>2] = $2170;
     $2173 = $11;
     $2174 = $72;
     $2175 = $2174;
     $2176 = ((($2175)) + 4|0);
     HEAP32[$2176>>2] = $2173;
     $2177 = $72;
     $11 = $2177;
    }
    else if ((label|0) == 209) {
     label = 0;
     $2178 = $11;
     $2179 = $2178;
     $2180 = $9;
     $2181 = HEAP32[$2180>>2]|0;
     $2182 = (($2179) + ($2181<<2)|0);
     $2183 = HEAP32[$2182>>2]|0;
     $11 = $2183;
     $2184 = $9;
     $2185 = ((($2184)) + 8|0);
     $9 = $2185;
    }
    $2186 = $9;
    $2187 = ((($2186)) + 4|0);
    $9 = $2187;
    $$sink1 = $2186;
    continue L8;
    break;
   }
   case 71:  {
    $437 = $9;
    $438 = ((($437)) + 4|0);
    $9 = $438;
    $439 = HEAP32[$437>>2]|0;
    $18 = $439;
    $440 = $10;
    $441 = $18;
    $442 = (0 - ($441))|0;
    $443 = (($440) + ($442<<2)|0);
    $444 = HEAP32[969]|0;
    $445 = ($443>>>0)<($444>>>0);
    if ($445) {
     $446 = $10;
     HEAP32[966] = $446;
     $447 = $18;
     $448 = (($447) + 256)|0;
     _realloc_coq_stack($448);
     $449 = HEAP32[966]|0;
     $10 = $449;
    }
    $450 = $9;
    $451 = ((($450)) + 4|0);
    $9 = $451;
    $$sink1 = $450;
    continue L8;
    break;
   }
   case 72:  {
    $11 = 1;
    $2188 = $9;
    $2189 = ((($2188)) + 4|0);
    $9 = $2189;
    $$sink1 = $2188;
    continue L8;
    break;
   }
   case 73:  {
    $11 = 3;
    $2190 = $9;
    $2191 = ((($2190)) + 4|0);
    $9 = $2191;
    $$sink1 = $2190;
    continue L8;
    break;
   }
   case 74:  {
    $11 = 5;
    $2192 = $9;
    $2193 = ((($2192)) + 4|0);
    $9 = $2193;
    $$sink1 = $2192;
    continue L8;
    break;
   }
   case 75:  {
    $11 = 7;
    $2194 = $9;
    $2195 = ((($2194)) + 4|0);
    $9 = $2195;
    $$sink1 = $2194;
    continue L8;
    break;
   }
   case 76:  {
    label = 220;
    break;
   }
   case 77:  {
    $2196 = $11;
    $2197 = $10;
    $2198 = ((($2197)) + -4|0);
    $10 = $2198;
    HEAP32[$2198>>2] = $2196;
    $11 = 1;
    $2199 = $9;
    $2200 = ((($2199)) + 4|0);
    $9 = $2200;
    $$sink1 = $2199;
    continue L8;
    break;
   }
   case 78:  {
    $2201 = $11;
    $2202 = $10;
    $2203 = ((($2202)) + -4|0);
    $10 = $2203;
    HEAP32[$2203>>2] = $2201;
    $11 = 3;
    $2204 = $9;
    $2205 = ((($2204)) + 4|0);
    $9 = $2205;
    $$sink1 = $2204;
    continue L8;
    break;
   }
   case 79:  {
    $2206 = $11;
    $2207 = $10;
    $2208 = ((($2207)) + -4|0);
    $10 = $2208;
    HEAP32[$2208>>2] = $2206;
    $11 = 5;
    $2209 = $9;
    $2210 = ((($2209)) + 4|0);
    $9 = $2210;
    $$sink1 = $2209;
    continue L8;
    break;
   }
   case 80:  {
    $2211 = $11;
    $2212 = $10;
    $2213 = ((($2212)) + -4|0);
    $10 = $2213;
    HEAP32[$2213>>2] = $2211;
    $11 = 7;
    $2214 = $9;
    $2215 = ((($2214)) + 4|0);
    $9 = $2215;
    $$sink1 = $2214;
    continue L8;
    break;
   }
   case 81:  {
    $2216 = $11;
    $2217 = $10;
    $2218 = ((($2217)) + -4|0);
    $10 = $2218;
    HEAP32[$2218>>2] = $2216;
    label = 220;
    break;
   }
   case 82:  {
    $2227 = $7;
    $2228 = $2227;
    $2229 = ((($2228)) + -4|0);
    $2230 = HEAP32[$2229>>2]|0;
    $2231 = $2230 >>> 10;
    $74 = $2231;
    $2232 = $74;
    $2233 = $8;
    $2234 = (($2232) + ($2233))|0;
    $2235 = (($2234) + 1)|0;
    $2236 = (($2235) + 1)|0;
    $2237 = $2236<<2;
    $2238 = HEAP32[_caml_young_ptr>>2]|0;
    $2239 = (0 - ($2237))|0;
    $2240 = (($2238) + ($2239)|0);
    HEAP32[_caml_young_ptr>>2] = $2240;
    $2241 = HEAP32[_caml_young_ptr>>2]|0;
    $2242 = HEAP32[_caml_young_limit>>2]|0;
    $2243 = ($2241>>>0)<($2242>>>0);
    if ($2243) {
     $2244 = $74;
     $2245 = $8;
     $2246 = (($2244) + ($2245))|0;
     $2247 = (($2246) + 1)|0;
     $2248 = (($2247) + 1)|0;
     $2249 = $2248<<2;
     $2250 = HEAP32[_caml_young_ptr>>2]|0;
     $2251 = (($2250) + ($2249)|0);
     HEAP32[_caml_young_ptr>>2] = $2251;
     $2252 = $10;
     $2253 = ((($2252)) + -8|0);
     $10 = $2253;
     $2254 = $11;
     $2255 = $10;
     HEAP32[$2255>>2] = $2254;
     $2256 = $7;
     $2257 = $10;
     $2258 = ((($2257)) + 4|0);
     HEAP32[$2258>>2] = $2256;
     $2259 = $10;
     HEAP32[966] = $2259;
     _caml_minor_collection();
     $2260 = $10;
     $2261 = HEAP32[$2260>>2]|0;
     $11 = $2261;
     $2262 = $10;
     $2263 = ((($2262)) + 4|0);
     $2264 = HEAP32[$2263>>2]|0;
     $7 = $2264;
     $2265 = $10;
     $2266 = ((($2265)) + 8|0);
     $10 = $2266;
     $2267 = $74;
     $2268 = $8;
     $2269 = (($2267) + ($2268))|0;
     $2270 = (($2269) + 1)|0;
     $2271 = (($2270) + 1)|0;
     $2272 = $2271<<2;
     $2273 = HEAP32[_caml_young_ptr>>2]|0;
     $2274 = (0 - ($2272))|0;
     $2275 = (($2273) + ($2274)|0);
     HEAP32[_caml_young_ptr>>2] = $2275;
    }
    $2276 = $74;
    $2277 = $8;
    $2278 = (($2276) + ($2277))|0;
    $2279 = (($2278) + 1)|0;
    $2280 = $2279 << 10;
    $2281 = (($2280) + 768)|0;
    $2282 = (($2281) + 0)|0;
    $2283 = HEAP32[_caml_young_ptr>>2]|0;
    HEAP32[$2283>>2] = $2282;
    $2284 = HEAP32[_caml_young_ptr>>2]|0;
    $2285 = ((($2284)) + 4|0);
    $2286 = $2285;
    $11 = $2286;
    $73 = 0;
    while(1) {
     $2287 = $73;
     $2288 = $74;
     $2289 = ($2287>>>0)<($2288>>>0);
     if (!($2289)) {
      break;
     }
     $2290 = $7;
     $2291 = $2290;
     $2292 = $73;
     $2293 = (($2291) + ($2292<<2)|0);
     $2294 = HEAP32[$2293>>2]|0;
     $2295 = $11;
     $2296 = $2295;
     $2297 = $73;
     $2298 = (($2296) + ($2297<<2)|0);
     HEAP32[$2298>>2] = $2294;
     $2299 = $73;
     $2300 = (($2299) + 1)|0;
     $73 = $2300;
    }
    $2301 = $74;
    $73 = $2301;
    while(1) {
     $2302 = $73;
     $2303 = $8;
     $2304 = $74;
     $2305 = (($2303) + ($2304))|0;
     $2306 = ($2302>>>0)<=($2305>>>0);
     $2307 = $10;
     if (!($2306)) {
      break;
     }
     $2308 = ((($2307)) + 4|0);
     $10 = $2308;
     $2309 = HEAP32[$2307>>2]|0;
     $2310 = $11;
     $2311 = $2310;
     $2312 = $73;
     $2313 = (($2311) + ($2312<<2)|0);
     HEAP32[$2313>>2] = $2309;
     $2314 = $73;
     $2315 = (($2314) + 1)|0;
     $73 = $2315;
    }
    $2316 = HEAP32[$2307>>2]|0;
    $2317 = $2316;
    $9 = $2317;
    $2318 = $10;
    $2319 = ((($2318)) + 4|0);
    $2320 = HEAP32[$2319>>2]|0;
    $7 = $2320;
    $2321 = $10;
    $2322 = ((($2321)) + 8|0);
    $2323 = HEAP32[$2322>>2]|0;
    $2324 = $2323 >> 1;
    $8 = $2324;
    $2325 = $10;
    $2326 = ((($2325)) + 12|0);
    $10 = $2326;
    $2327 = $9;
    $2328 = ((($2327)) + 4|0);
    $9 = $2328;
    $$sink1 = $2327;
    continue L8;
    break;
   }
   case 83:  {
    $2329 = $11;
    $2330 = $10;
    $2331 = ((($2330)) + -4|0);
    $10 = $2331;
    HEAP32[$2331>>2] = $2329;
    $2332 = $11;
    $2333 = $2332;
    $2334 = ((($2333)) + 4|0);
    $2335 = HEAP32[$2334>>2]|0;
    $11 = $2335;
    $2336 = $11;
    $2337 = $2336;
    $2338 = ((($2337)) + -4|0);
    $2339 = HEAP8[$2338>>0]|0;
    $2340 = $2339&255;
    switch ($2340|0) {
    case 6:  {
     $2341 = $10;
     $2342 = ((($2341)) + -8|0);
     $10 = $2342;
     $2343 = $9;
     $2344 = ((($2343)) + 4|0);
     $9 = $2344;
     $2345 = $9;
     $2346 = $9;
     $2347 = HEAP32[$2346>>2]|0;
     $2348 = (($2345) + ($2347<<2)|0);
     $2349 = $2348;
     $2350 = $10;
     HEAP32[$2350>>2] = $2349;
     $2351 = $7;
     $2352 = $10;
     $2353 = ((($2352)) + 4|0);
     HEAP32[$2353>>2] = $2351;
     $2354 = $11;
     $2355 = $2354;
     $2356 = HEAP32[$2355>>2]|0;
     $7 = $2356;
     $2357 = $10;
     $2358 = ((($2357)) + 8|0);
     $2359 = HEAP32[$2358>>2]|0;
     $11 = $2359;
     $2360 = $8;
     $2361 = $2360 << 1;
     $2362 = (($2361) + 1)|0;
     $2363 = $10;
     $2364 = ((($2363)) + 8|0);
     HEAP32[$2364>>2] = $2362;
     $2365 = $11;
     $2366 = $2365;
     $2367 = ((($2366)) + -4|0);
     $2368 = HEAP32[$2367>>2]|0;
     $2369 = $2368 >>> 10;
     $2370 = (($2369) - 2)|0;
     $76 = $2370;
     $2371 = $10;
     $2372 = $76;
     $2373 = (0 - ($2372))|0;
     $2374 = (($2371) + ($2373<<2)|0);
     $2375 = ((($2374)) + 4|0);
     $2376 = HEAP32[969]|0;
     $2377 = ($2375>>>0)<($2376>>>0);
     if ($2377) {
      $2378 = $10;
      HEAP32[966] = $2378;
      $2379 = $76;
      $2380 = (($2379) + 1)|0;
      $2381 = (($2380) + 256)|0;
      _realloc_coq_stack($2381);
      $2382 = HEAP32[966]|0;
      $10 = $2382;
     }
     $2383 = $76;
     $2384 = $10;
     $2385 = (0 - ($2383))|0;
     $2386 = (($2384) + ($2385<<2)|0);
     $10 = $2386;
     $75 = 0;
     while(1) {
      $2387 = $75;
      $2388 = $76;
      $2389 = ($2387>>>0)<($2388>>>0);
      $2390 = $11;
      if (!($2389)) {
       break;
      }
      $2391 = $2390;
      $2392 = $75;
      $2393 = (($2392) + 2)|0;
      $2394 = (($2391) + ($2393<<2)|0);
      $2395 = HEAP32[$2394>>2]|0;
      $2396 = $10;
      $2397 = $75;
      $2398 = (($2396) + ($2397<<2)|0);
      HEAP32[$2398>>2] = $2395;
      $2399 = $75;
      $2400 = (($2399) + 1)|0;
      $75 = $2400;
     }
     $2401 = $10;
     $2402 = ((($2401)) + -4|0);
     $10 = $2402;
     HEAP32[$2402>>2] = $2390;
     $2403 = $76;
     $8 = $2403;
     $2404 = $7;
     $2405 = $2404;
     $2406 = HEAP32[$2405>>2]|0;
     $9 = $2406;
     label = 41;
     break L10;
     break;
    }
    case 7:  {
     $2407 = $11;
     $2408 = $2407;
     $2409 = ((($2408)) + 4|0);
     $2410 = HEAP32[$2409>>2]|0;
     $11 = $2410;
     $2411 = $9;
     $2412 = ((($2411)) + 4|0);
     $9 = $2412;
     $2413 = $9;
     $2414 = $9;
     $2415 = HEAP32[$2414>>2]|0;
     $2416 = (($2413) + ($2415<<2)|0);
     $9 = $2416;
     $2417 = $10;
     $2418 = ((($2417)) + 4|0);
     $10 = $2418;
     $2419 = $9;
     $2420 = ((($2419)) + 4|0);
     $9 = $2420;
     $$sink1 = $2419;
     continue L8;
     break;
    }
    default: {
     $2421 = $9;
     $2422 = $9;
     $2423 = HEAP32[$2422>>2]|0;
     $2424 = (($2421) + ($2423<<2)|0);
     $80 = $2424;
     $2425 = $9;
     $2426 = ((($2425)) + 4|0);
     $9 = $2426;
     $2427 = $9;
     $2428 = $9;
     $2429 = HEAP32[$2428>>2]|0;
     $2430 = (($2427) + ($2429<<2)|0);
     $81 = $2430;
     $2431 = $9;
     $2432 = ((($2431)) + 4|0);
     $9 = $2432;
     $2433 = $9;
     $2434 = ((($2433)) + 4|0);
     $9 = $2434;
     $2435 = HEAP32[$2433>>2]|0;
     $79 = $2435;
     $2436 = $9;
     $2437 = ((($2436)) + 4|0);
     $9 = $2437;
     $2438 = HEAP32[$2436>>2]|0;
     $77 = $2438;
     $2439 = HEAP32[964]|0;
     $2440 = $2439;
     $2441 = $79;
     $2442 = (($2440) + ($2441<<2)|0);
     $2443 = HEAP32[$2442>>2]|0;
     $2444 = $10;
     $2445 = ((($2444)) + -4|0);
     $10 = $2445;
     HEAP32[$2445>>2] = $2443;
     $2446 = $77;
     $2447 = ($2446|0)==(0);
     L278: do {
      if ($2447) {
       $11 = ((((_caml_atom_table) + 4|0)));
      } else {
       $2448 = $77;
       $2449 = (($2448) + 1)|0;
       $2450 = $2449<<2;
       $2451 = HEAP32[_caml_young_ptr>>2]|0;
       $2452 = (0 - ($2450))|0;
       $2453 = (($2451) + ($2452)|0);
       HEAP32[_caml_young_ptr>>2] = $2453;
       $2454 = HEAP32[_caml_young_ptr>>2]|0;
       $2455 = HEAP32[_caml_young_limit>>2]|0;
       $2456 = ($2454>>>0)<($2455>>>0);
       if ($2456) {
        $2457 = $77;
        $2458 = (($2457) + 1)|0;
        $2459 = $2458<<2;
        $2460 = HEAP32[_caml_young_ptr>>2]|0;
        $2461 = (($2460) + ($2459)|0);
        HEAP32[_caml_young_ptr>>2] = $2461;
        $2462 = $10;
        $2463 = ((($2462)) + -8|0);
        $10 = $2463;
        $2464 = $11;
        $2465 = $10;
        HEAP32[$2465>>2] = $2464;
        $2466 = $7;
        $2467 = $10;
        $2468 = ((($2467)) + 4|0);
        HEAP32[$2468>>2] = $2466;
        $2469 = $10;
        HEAP32[966] = $2469;
        _caml_minor_collection();
        $2470 = $10;
        $2471 = HEAP32[$2470>>2]|0;
        $11 = $2471;
        $2472 = $10;
        $2473 = ((($2472)) + 4|0);
        $2474 = HEAP32[$2473>>2]|0;
        $7 = $2474;
        $2475 = $10;
        $2476 = ((($2475)) + 8|0);
        $10 = $2476;
        $2477 = $77;
        $2478 = (($2477) + 1)|0;
        $2479 = $2478<<2;
        $2480 = HEAP32[_caml_young_ptr>>2]|0;
        $2481 = (0 - ($2479))|0;
        $2482 = (($2480) + ($2481)|0);
        HEAP32[_caml_young_ptr>>2] = $2482;
       }
       $2483 = $77;
       $2484 = $2483 << 10;
       $2485 = (($2484) + 768)|0;
       $2486 = (($2485) + 0)|0;
       $2487 = HEAP32[_caml_young_ptr>>2]|0;
       HEAP32[$2487>>2] = $2486;
       $2488 = HEAP32[_caml_young_ptr>>2]|0;
       $2489 = ((($2488)) + 4|0);
       $2490 = $2489;
       $11 = $2490;
       $2491 = $10;
       $2492 = HEAP32[$2491>>2]|0;
       $2493 = $2492;
       $2494 = ((($2493)) + 8|0);
       $2495 = HEAP32[$2494>>2]|0;
       $2496 = ($2495|0)==(3);
       $78 = 0;
       if ($2496) {
        while(1) {
         $2497 = $78;
         $2498 = $77;
         $2499 = ($2497>>>0)<($2498>>>0);
         if (!($2499)) {
          break L278;
         }
         $2500 = $10;
         $2501 = $78;
         $2502 = (($2501) + 2)|0;
         $2503 = (($2500) + ($2502<<2)|0);
         $2504 = HEAP32[$2503>>2]|0;
         $2505 = $11;
         $2506 = $2505;
         $2507 = $78;
         $2508 = (($2506) + ($2507<<2)|0);
         HEAP32[$2508>>2] = $2504;
         $2509 = $78;
         $2510 = (($2509) + 1)|0;
         $78 = $2510;
        }
       } else {
        while(1) {
         $2511 = $78;
         $2512 = $77;
         $2513 = ($2511>>>0)<($2512>>>0);
         if (!($2513)) {
          break L278;
         }
         $2514 = $10;
         $2515 = $78;
         $2516 = (($2515) + 5)|0;
         $2517 = (($2514) + ($2516<<2)|0);
         $2518 = HEAP32[$2517>>2]|0;
         $2519 = $11;
         $2520 = $2519;
         $2521 = $78;
         $2522 = (($2520) + ($2521<<2)|0);
         HEAP32[$2522>>2] = $2518;
         $2523 = $78;
         $2524 = (($2523) + 1)|0;
         $78 = $2524;
        }
       }
      }
     } while(0);
     $2525 = $11;
     $2526 = $10;
     $2527 = ((($2526)) + -4|0);
     $10 = $2527;
     HEAP32[$2527>>2] = $2525;
     $2528 = HEAP32[_caml_young_ptr>>2]|0;
     $2529 = ((($2528)) + -24|0);
     HEAP32[_caml_young_ptr>>2] = $2529;
     $2530 = HEAP32[_caml_young_ptr>>2]|0;
     $2531 = HEAP32[_caml_young_limit>>2]|0;
     $2532 = ($2530>>>0)<($2531>>>0);
     if ($2532) {
      $2533 = HEAP32[_caml_young_ptr>>2]|0;
      $2534 = ((($2533)) + 24|0);
      HEAP32[_caml_young_ptr>>2] = $2534;
      $2535 = $10;
      $2536 = ((($2535)) + -8|0);
      $10 = $2536;
      $2537 = $11;
      $2538 = $10;
      HEAP32[$2538>>2] = $2537;
      $2539 = $7;
      $2540 = $10;
      $2541 = ((($2540)) + 4|0);
      HEAP32[$2541>>2] = $2539;
      $2542 = $10;
      HEAP32[966] = $2542;
      _caml_minor_collection();
      $2543 = $10;
      $2544 = HEAP32[$2543>>2]|0;
      $11 = $2544;
      $2545 = $10;
      $2546 = ((($2545)) + 4|0);
      $2547 = HEAP32[$2546>>2]|0;
      $7 = $2547;
      $2548 = $10;
      $2549 = ((($2548)) + 8|0);
      $10 = $2549;
      $2550 = HEAP32[_caml_young_ptr>>2]|0;
      $2551 = ((($2550)) + -24|0);
      HEAP32[_caml_young_ptr>>2] = $2551;
     }
     $2552 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$2552>>2] = 5888;
     $2553 = HEAP32[_caml_young_ptr>>2]|0;
     $2554 = ((($2553)) + 4|0);
     $2555 = $2554;
     $11 = $2555;
     $2556 = $80;
     $2557 = $2556;
     $2558 = $11;
     $2559 = $2558;
     HEAP32[$2559>>2] = $2557;
     $2560 = $81;
     $2561 = $2560;
     $2562 = $11;
     $2563 = $2562;
     $2564 = ((($2563)) + 4|0);
     HEAP32[$2564>>2] = $2561;
     $2565 = $10;
     $2566 = ((($2565)) + 4|0);
     $2567 = HEAP32[$2566>>2]|0;
     $2568 = $11;
     $2569 = $2568;
     $2570 = ((($2569)) + 8|0);
     HEAP32[$2570>>2] = $2567;
     $2571 = $10;
     $2572 = HEAP32[$2571>>2]|0;
     $2573 = $11;
     $2574 = $2573;
     $2575 = ((($2574)) + 12|0);
     HEAP32[$2575>>2] = $2572;
     $2576 = $7;
     $2577 = $11;
     $2578 = $2577;
     $2579 = ((($2578)) + 16|0);
     HEAP32[$2579>>2] = $2576;
     $2580 = $10;
     $2581 = ((($2580)) + 4|0);
     $10 = $2581;
     $2582 = $11;
     $2583 = $10;
     HEAP32[$2583>>2] = $2582;
     $2584 = HEAP32[_caml_young_ptr>>2]|0;
     $2585 = ((($2584)) + -12|0);
     HEAP32[_caml_young_ptr>>2] = $2585;
     $2586 = HEAP32[_caml_young_ptr>>2]|0;
     $2587 = HEAP32[_caml_young_limit>>2]|0;
     $2588 = ($2586>>>0)<($2587>>>0);
     if ($2588) {
      $2589 = HEAP32[_caml_young_ptr>>2]|0;
      $2590 = ((($2589)) + 12|0);
      HEAP32[_caml_young_ptr>>2] = $2590;
      $2591 = $10;
      $2592 = ((($2591)) + -8|0);
      $10 = $2592;
      $2593 = $11;
      $2594 = $10;
      HEAP32[$2594>>2] = $2593;
      $2595 = $7;
      $2596 = $10;
      $2597 = ((($2596)) + 4|0);
      HEAP32[$2597>>2] = $2595;
      $2598 = $10;
      HEAP32[966] = $2598;
      _caml_minor_collection();
      $2599 = $10;
      $2600 = HEAP32[$2599>>2]|0;
      $11 = $2600;
      $2601 = $10;
      $2602 = ((($2601)) + 4|0);
      $2603 = HEAP32[$2602>>2]|0;
      $7 = $2603;
      $2604 = $10;
      $2605 = ((($2604)) + 8|0);
      $10 = $2605;
      $2606 = HEAP32[_caml_young_ptr>>2]|0;
      $2607 = ((($2606)) + -12|0);
      HEAP32[_caml_young_ptr>>2] = $2607;
     }
     $2608 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$2608>>2] = 2821;
     $2609 = HEAP32[_caml_young_ptr>>2]|0;
     $2610 = ((($2609)) + 4|0);
     $2611 = $2610;
     $11 = $2611;
     $2612 = $10;
     $2613 = ((($2612)) + 4|0);
     $2614 = HEAP32[$2613>>2]|0;
     $2615 = $11;
     $2616 = $2615;
     HEAP32[$2616>>2] = $2614;
     $2617 = $10;
     $2618 = HEAP32[$2617>>2]|0;
     $2619 = $11;
     $2620 = $2619;
     $2621 = ((($2620)) + 4|0);
     HEAP32[$2621>>2] = $2618;
     $2622 = $10;
     $2623 = ((($2622)) + 4|0);
     $10 = $2623;
     $2624 = $11;
     $2625 = $10;
     HEAP32[$2625>>2] = $2624;
     $2626 = HEAP32[_caml_young_ptr>>2]|0;
     $2627 = ((($2626)) + -12|0);
     HEAP32[_caml_young_ptr>>2] = $2627;
     $2628 = HEAP32[_caml_young_ptr>>2]|0;
     $2629 = HEAP32[_caml_young_limit>>2]|0;
     $2630 = ($2628>>>0)<($2629>>>0);
     if ($2630) {
      $2631 = HEAP32[_caml_young_ptr>>2]|0;
      $2632 = ((($2631)) + 12|0);
      HEAP32[_caml_young_ptr>>2] = $2632;
      $2633 = $10;
      $2634 = ((($2633)) + -8|0);
      $10 = $2634;
      $2635 = $11;
      $2636 = $10;
      HEAP32[$2636>>2] = $2635;
      $2637 = $7;
      $2638 = $10;
      $2639 = ((($2638)) + 4|0);
      HEAP32[$2639>>2] = $2637;
      $2640 = $10;
      HEAP32[966] = $2640;
      _caml_minor_collection();
      $2641 = $10;
      $2642 = HEAP32[$2641>>2]|0;
      $11 = $2642;
      $2643 = $10;
      $2644 = ((($2643)) + 4|0);
      $2645 = HEAP32[$2644>>2]|0;
      $7 = $2645;
      $2646 = $10;
      $2647 = ((($2646)) + 8|0);
      $10 = $2647;
      $2648 = HEAP32[_caml_young_ptr>>2]|0;
      $2649 = ((($2648)) + -12|0);
      HEAP32[_caml_young_ptr>>2] = $2649;
     }
     $2650 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$2650>>2] = 2816;
     $2651 = HEAP32[_caml_young_ptr>>2]|0;
     $2652 = ((($2651)) + 4|0);
     $2653 = $2652;
     $11 = $2653;
     $2654 = HEAP32[963]|0;
     $2655 = $11;
     $2656 = $2655;
     HEAP32[$2656>>2] = $2654;
     $2657 = $10;
     $2658 = ((($2657)) + 4|0);
     $10 = $2658;
     $2659 = HEAP32[$2657>>2]|0;
     $2660 = $11;
     $2661 = $2660;
     $2662 = ((($2661)) + 4|0);
     HEAP32[$2662>>2] = $2659;
     $2663 = $9;
     $2664 = ((($2663)) + 4|0);
     $9 = $2664;
     $$sink1 = $2663;
     continue L8;
    }
    }
    break;
   }
   case 84:  {
    $2665 = $8;
    $2666 = (($2665) + 3)|0;
    $2667 = (($2666) + 1)|0;
    $2668 = $2667<<2;
    $2669 = HEAP32[_caml_young_ptr>>2]|0;
    $2670 = (0 - ($2668))|0;
    $2671 = (($2669) + ($2670)|0);
    HEAP32[_caml_young_ptr>>2] = $2671;
    $2672 = HEAP32[_caml_young_ptr>>2]|0;
    $2673 = HEAP32[_caml_young_limit>>2]|0;
    $2674 = ($2672>>>0)<($2673>>>0);
    if ($2674) {
     $2675 = $8;
     $2676 = (($2675) + 3)|0;
     $2677 = (($2676) + 1)|0;
     $2678 = $2677<<2;
     $2679 = HEAP32[_caml_young_ptr>>2]|0;
     $2680 = (($2679) + ($2678)|0);
     HEAP32[_caml_young_ptr>>2] = $2680;
     $2681 = $10;
     $2682 = ((($2681)) + -8|0);
     $10 = $2682;
     $2683 = $11;
     $2684 = $10;
     HEAP32[$2684>>2] = $2683;
     $2685 = $7;
     $2686 = $10;
     $2687 = ((($2686)) + 4|0);
     HEAP32[$2687>>2] = $2685;
     $2688 = $10;
     HEAP32[966] = $2688;
     _caml_minor_collection();
     $2689 = $10;
     $2690 = HEAP32[$2689>>2]|0;
     $11 = $2690;
     $2691 = $10;
     $2692 = ((($2691)) + 4|0);
     $2693 = HEAP32[$2692>>2]|0;
     $7 = $2693;
     $2694 = $10;
     $2695 = ((($2694)) + 8|0);
     $10 = $2695;
     $2696 = $8;
     $2697 = (($2696) + 3)|0;
     $2698 = (($2697) + 1)|0;
     $2699 = $2698<<2;
     $2700 = HEAP32[_caml_young_ptr>>2]|0;
     $2701 = (0 - ($2699))|0;
     $2702 = (($2700) + ($2701)|0);
     HEAP32[_caml_young_ptr>>2] = $2702;
    }
    $2703 = $8;
    $2704 = (($2703) + 3)|0;
    $2705 = $2704 << 10;
    $2706 = (($2705) + 768)|0;
    $2707 = (($2706) + 0)|0;
    $2708 = HEAP32[_caml_young_ptr>>2]|0;
    HEAP32[$2708>>2] = $2707;
    $2709 = HEAP32[_caml_young_ptr>>2]|0;
    $2710 = ((($2709)) + 4|0);
    $2711 = $2710;
    $11 = $2711;
    $2712 = HEAP32[963]|0;
    $2713 = $11;
    $2714 = $2713;
    HEAP32[$2714>>2] = $2712;
    $2715 = HEAP32[965]|0;
    $2716 = $2715;
    $2717 = $9;
    $2718 = HEAP32[$2717>>2]|0;
    $2719 = (($2716) + ($2718<<2)|0);
    $2720 = HEAP32[$2719>>2]|0;
    $2721 = $11;
    $2722 = $2721;
    $2723 = ((($2722)) + 4|0);
    HEAP32[$2723>>2] = $2720;
    $82 = 2;
    while(1) {
     $2724 = $82;
     $2725 = $8;
     $2726 = (($2725) + 3)|0;
     $2727 = ($2724|0)<($2726|0);
     $2728 = $10;
     if (!($2727)) {
      break;
     }
     $2729 = ((($2728)) + 4|0);
     $10 = $2729;
     $2730 = HEAP32[$2728>>2]|0;
     $2731 = $11;
     $2732 = $2731;
     $2733 = $82;
     $2734 = (($2732) + ($2733<<2)|0);
     HEAP32[$2734>>2] = $2730;
     $2735 = $82;
     $2736 = (($2735) + 1)|0;
     $82 = $2736;
    }
    $2737 = HEAP32[$2728>>2]|0;
    $2738 = $2737;
    $9 = $2738;
    $2739 = $10;
    $2740 = ((($2739)) + 4|0);
    $2741 = HEAP32[$2740>>2]|0;
    $7 = $2741;
    $2742 = $10;
    $2743 = ((($2742)) + 8|0);
    $2744 = HEAP32[$2743>>2]|0;
    $2745 = $2744 >> 1;
    $8 = $2745;
    $2746 = $10;
    $2747 = ((($2746)) + 12|0);
    $10 = $2747;
    $2748 = $9;
    $2749 = ((($2748)) + 4|0);
    $9 = $2749;
    $$sink1 = $2748;
    continue L8;
    break;
   }
   case 85:  {
    $2750 = $11;
    $2751 = $10;
    $2752 = ((($2751)) + -4|0);
    $10 = $2752;
    HEAP32[$2752>>2] = $2750;
    $2753 = HEAP32[_caml_young_ptr>>2]|0;
    $2754 = ((($2753)) + -12|0);
    HEAP32[_caml_young_ptr>>2] = $2754;
    $2755 = HEAP32[_caml_young_ptr>>2]|0;
    $2756 = HEAP32[_caml_young_limit>>2]|0;
    $2757 = ($2755>>>0)<($2756>>>0);
    if ($2757) {
     $2758 = HEAP32[_caml_young_ptr>>2]|0;
     $2759 = ((($2758)) + 12|0);
     HEAP32[_caml_young_ptr>>2] = $2759;
     $2760 = $10;
     $2761 = ((($2760)) + -8|0);
     $10 = $2761;
     $2762 = $11;
     $2763 = $10;
     HEAP32[$2763>>2] = $2762;
     $2764 = $7;
     $2765 = $10;
     $2766 = ((($2765)) + 4|0);
     HEAP32[$2766>>2] = $2764;
     $2767 = $10;
     HEAP32[966] = $2767;
     _caml_minor_collection();
     $2768 = $10;
     $2769 = HEAP32[$2768>>2]|0;
     $11 = $2769;
     $2770 = $10;
     $2771 = ((($2770)) + 4|0);
     $2772 = HEAP32[$2771>>2]|0;
     $7 = $2772;
     $2773 = $10;
     $2774 = ((($2773)) + 8|0);
     $10 = $2774;
     $2775 = HEAP32[_caml_young_ptr>>2]|0;
     $2776 = ((($2775)) + -12|0);
     HEAP32[_caml_young_ptr>>2] = $2776;
    }
    $2777 = HEAP32[_caml_young_ptr>>2]|0;
    HEAP32[$2777>>2] = 2816;
    $2778 = HEAP32[_caml_young_ptr>>2]|0;
    $2779 = ((($2778)) + 4|0);
    $2780 = $2779;
    $11 = $2780;
    $2781 = $10;
    $2782 = HEAP32[$2781>>2]|0;
    $2783 = $11;
    $2784 = $2783;
    HEAP32[$2784>>2] = $2782;
    $2785 = $10;
    $2786 = ((($2785)) + 4|0);
    $2787 = HEAP32[$2786>>2]|0;
    $2788 = $11;
    $2789 = $2788;
    $2790 = ((($2789)) + 4|0);
    HEAP32[$2790>>2] = $2787;
    $2791 = $10;
    $2792 = ((($2791)) + 8|0);
    $10 = $2792;
    $2793 = $9;
    $2794 = ((($2793)) + 4|0);
    $9 = $2794;
    $$sink1 = $2793;
    continue L8;
    break;
   }
   case 86:  {
    $2795 = $9;
    $2796 = HEAP32[$2795>>2]|0;
    $2797 = $9;
    $2798 = (($2797) + ($2796<<2)|0);
    $9 = $2798;
    $2799 = $9;
    $2800 = ((($2799)) + 4|0);
    $9 = $2800;
    $$sink1 = $2799;
    continue L8;
    break;
   }
   case 87:  {
    $2801 = $11;
    $2802 = $10;
    $2803 = ((($2802)) + 4|0);
    $10 = $2803;
    $2804 = HEAP32[$2802>>2]|0;
    $2805 = (($2801) + ($2804))|0;
    $2806 = (($2805) - 1)|0;
    $11 = $2806;
    $2807 = $9;
    $2808 = ((($2807)) + 4|0);
    $9 = $2808;
    $$sink1 = $2807;
    continue L8;
    break;
   }
   case 88:  {
    $2809 = $11;
    $2810 = $10;
    $2811 = ((($2810)) + 4|0);
    $10 = $2811;
    $2812 = HEAP32[$2810>>2]|0;
    $2813 = (($2809) + ($2812))|0;
    $2814 = (($2813) - 1)|0;
    $83 = $2814;
    $2815 = $83;
    $2816 = $11;
    $2817 = ($2815>>>0)<($2816>>>0);
    $2818 = HEAP32[_caml_young_ptr>>2]|0;
    $2819 = ((($2818)) + -8|0);
    HEAP32[_caml_young_ptr>>2] = $2819;
    $2820 = HEAP32[_caml_young_ptr>>2]|0;
    $2821 = HEAP32[_caml_young_limit>>2]|0;
    $2822 = ($2820>>>0)<($2821>>>0);
    if ($2817) {
     if ($2822) {
      $2823 = HEAP32[_caml_young_ptr>>2]|0;
      $2824 = ((($2823)) + 8|0);
      HEAP32[_caml_young_ptr>>2] = $2824;
      $2825 = $10;
      $2826 = ((($2825)) + -8|0);
      $10 = $2826;
      $2827 = $11;
      $2828 = $10;
      HEAP32[$2828>>2] = $2827;
      $2829 = $7;
      $2830 = $10;
      $2831 = ((($2830)) + 4|0);
      HEAP32[$2831>>2] = $2829;
      $2832 = $10;
      HEAP32[966] = $2832;
      _caml_minor_collection();
      $2833 = $10;
      $2834 = HEAP32[$2833>>2]|0;
      $11 = $2834;
      $2835 = $10;
      $2836 = ((($2835)) + 4|0);
      $2837 = HEAP32[$2836>>2]|0;
      $7 = $2837;
      $2838 = $10;
      $2839 = ((($2838)) + 8|0);
      $10 = $2839;
      $2840 = HEAP32[_caml_young_ptr>>2]|0;
      $2841 = ((($2840)) + -8|0);
      HEAP32[_caml_young_ptr>>2] = $2841;
     }
     $2842 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$2842>>2] = 1794;
     $2843 = HEAP32[_caml_young_ptr>>2]|0;
     $2844 = ((($2843)) + 4|0);
     $2845 = $2844;
     $11 = $2845;
    } else {
     if ($2822) {
      $2846 = HEAP32[_caml_young_ptr>>2]|0;
      $2847 = ((($2846)) + 8|0);
      HEAP32[_caml_young_ptr>>2] = $2847;
      $2848 = $10;
      $2849 = ((($2848)) + -8|0);
      $10 = $2849;
      $2850 = $11;
      $2851 = $10;
      HEAP32[$2851>>2] = $2850;
      $2852 = $7;
      $2853 = $10;
      $2854 = ((($2853)) + 4|0);
      HEAP32[$2854>>2] = $2852;
      $2855 = $10;
      HEAP32[966] = $2855;
      _caml_minor_collection();
      $2856 = $10;
      $2857 = HEAP32[$2856>>2]|0;
      $11 = $2857;
      $2858 = $10;
      $2859 = ((($2858)) + 4|0);
      $2860 = HEAP32[$2859>>2]|0;
      $7 = $2860;
      $2861 = $10;
      $2862 = ((($2861)) + 8|0);
      $10 = $2862;
      $2863 = HEAP32[_caml_young_ptr>>2]|0;
      $2864 = ((($2863)) + -8|0);
      HEAP32[_caml_young_ptr>>2] = $2864;
     }
     $2865 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$2865>>2] = 1793;
     $2866 = HEAP32[_caml_young_ptr>>2]|0;
     $2867 = ((($2866)) + 4|0);
     $2868 = $2867;
     $11 = $2868;
    }
    $2869 = $83;
    $2870 = $11;
    $2871 = $2870;
    HEAP32[$2871>>2] = $2869;
    $2872 = $9;
    $2873 = ((($2872)) + 4|0);
    $9 = $2873;
    $$sink1 = $2872;
    continue L8;
    break;
   }
   case 89:  {
    $2874 = $11;
    $2875 = $10;
    $2876 = ((($2875)) + 4|0);
    $10 = $2876;
    $2877 = HEAP32[$2875>>2]|0;
    $2878 = (($2874) + ($2877))|0;
    $2879 = (($2878) + 1)|0;
    $84 = $2879;
    $2880 = $84;
    $2881 = $11;
    $2882 = ($2880>>>0)<=($2881>>>0);
    $2883 = HEAP32[_caml_young_ptr>>2]|0;
    $2884 = ((($2883)) + -8|0);
    HEAP32[_caml_young_ptr>>2] = $2884;
    $2885 = HEAP32[_caml_young_ptr>>2]|0;
    $2886 = HEAP32[_caml_young_limit>>2]|0;
    $2887 = ($2885>>>0)<($2886>>>0);
    if ($2882) {
     if ($2887) {
      $2888 = HEAP32[_caml_young_ptr>>2]|0;
      $2889 = ((($2888)) + 8|0);
      HEAP32[_caml_young_ptr>>2] = $2889;
      $2890 = $10;
      $2891 = ((($2890)) + -8|0);
      $10 = $2891;
      $2892 = $11;
      $2893 = $10;
      HEAP32[$2893>>2] = $2892;
      $2894 = $7;
      $2895 = $10;
      $2896 = ((($2895)) + 4|0);
      HEAP32[$2896>>2] = $2894;
      $2897 = $10;
      HEAP32[966] = $2897;
      _caml_minor_collection();
      $2898 = $10;
      $2899 = HEAP32[$2898>>2]|0;
      $11 = $2899;
      $2900 = $10;
      $2901 = ((($2900)) + 4|0);
      $2902 = HEAP32[$2901>>2]|0;
      $7 = $2902;
      $2903 = $10;
      $2904 = ((($2903)) + 8|0);
      $10 = $2904;
      $2905 = HEAP32[_caml_young_ptr>>2]|0;
      $2906 = ((($2905)) + -8|0);
      HEAP32[_caml_young_ptr>>2] = $2906;
     }
     $2907 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$2907>>2] = 1794;
     $2908 = HEAP32[_caml_young_ptr>>2]|0;
     $2909 = ((($2908)) + 4|0);
     $2910 = $2909;
     $11 = $2910;
    } else {
     if ($2887) {
      $2911 = HEAP32[_caml_young_ptr>>2]|0;
      $2912 = ((($2911)) + 8|0);
      HEAP32[_caml_young_ptr>>2] = $2912;
      $2913 = $10;
      $2914 = ((($2913)) + -8|0);
      $10 = $2914;
      $2915 = $11;
      $2916 = $10;
      HEAP32[$2916>>2] = $2915;
      $2917 = $7;
      $2918 = $10;
      $2919 = ((($2918)) + 4|0);
      HEAP32[$2919>>2] = $2917;
      $2920 = $10;
      HEAP32[966] = $2920;
      _caml_minor_collection();
      $2921 = $10;
      $2922 = HEAP32[$2921>>2]|0;
      $11 = $2922;
      $2923 = $10;
      $2924 = ((($2923)) + 4|0);
      $2925 = HEAP32[$2924>>2]|0;
      $7 = $2925;
      $2926 = $10;
      $2927 = ((($2926)) + 8|0);
      $10 = $2927;
      $2928 = HEAP32[_caml_young_ptr>>2]|0;
      $2929 = ((($2928)) + -8|0);
      HEAP32[_caml_young_ptr>>2] = $2929;
     }
     $2930 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$2930>>2] = 1793;
     $2931 = HEAP32[_caml_young_ptr>>2]|0;
     $2932 = ((($2931)) + 4|0);
     $2933 = $2932;
     $11 = $2933;
    }
    $2934 = $84;
    $2935 = $11;
    $2936 = $2935;
    HEAP32[$2936>>2] = $2934;
    $2937 = $9;
    $2938 = ((($2937)) + 4|0);
    $9 = $2938;
    $$sink1 = $2937;
    continue L8;
    break;
   }
   case 90:  {
    $2939 = $11;
    $2940 = $10;
    $2941 = ((($2940)) + 4|0);
    $10 = $2941;
    $2942 = HEAP32[$2940>>2]|0;
    $2943 = (($2939) - ($2942))|0;
    $2944 = (($2943) + 1)|0;
    $11 = $2944;
    $2945 = $9;
    $2946 = ((($2945)) + 4|0);
    $9 = $2946;
    $$sink1 = $2945;
    continue L8;
    break;
   }
   case 91:  {
    $2947 = $10;
    $2948 = ((($2947)) + 4|0);
    $10 = $2948;
    $2949 = HEAP32[$2947>>2]|0;
    $85 = $2949;
    $2950 = $11;
    $2951 = $85;
    $2952 = (($2950) - ($2951))|0;
    $2953 = (($2952) + 1)|0;
    $86 = $2953;
    $2954 = $11;
    $2955 = $85;
    $2956 = ($2954>>>0)<($2955>>>0);
    $2957 = HEAP32[_caml_young_ptr>>2]|0;
    $2958 = ((($2957)) + -8|0);
    HEAP32[_caml_young_ptr>>2] = $2958;
    $2959 = HEAP32[_caml_young_ptr>>2]|0;
    $2960 = HEAP32[_caml_young_limit>>2]|0;
    $2961 = ($2959>>>0)<($2960>>>0);
    if ($2956) {
     if ($2961) {
      $2962 = HEAP32[_caml_young_ptr>>2]|0;
      $2963 = ((($2962)) + 8|0);
      HEAP32[_caml_young_ptr>>2] = $2963;
      $2964 = $10;
      $2965 = ((($2964)) + -8|0);
      $10 = $2965;
      $2966 = $11;
      $2967 = $10;
      HEAP32[$2967>>2] = $2966;
      $2968 = $7;
      $2969 = $10;
      $2970 = ((($2969)) + 4|0);
      HEAP32[$2970>>2] = $2968;
      $2971 = $10;
      HEAP32[966] = $2971;
      _caml_minor_collection();
      $2972 = $10;
      $2973 = HEAP32[$2972>>2]|0;
      $11 = $2973;
      $2974 = $10;
      $2975 = ((($2974)) + 4|0);
      $2976 = HEAP32[$2975>>2]|0;
      $7 = $2976;
      $2977 = $10;
      $2978 = ((($2977)) + 8|0);
      $10 = $2978;
      $2979 = HEAP32[_caml_young_ptr>>2]|0;
      $2980 = ((($2979)) + -8|0);
      HEAP32[_caml_young_ptr>>2] = $2980;
     }
     $2981 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$2981>>2] = 1794;
     $2982 = HEAP32[_caml_young_ptr>>2]|0;
     $2983 = ((($2982)) + 4|0);
     $2984 = $2983;
     $11 = $2984;
    } else {
     if ($2961) {
      $2985 = HEAP32[_caml_young_ptr>>2]|0;
      $2986 = ((($2985)) + 8|0);
      HEAP32[_caml_young_ptr>>2] = $2986;
      $2987 = $10;
      $2988 = ((($2987)) + -8|0);
      $10 = $2988;
      $2989 = $11;
      $2990 = $10;
      HEAP32[$2990>>2] = $2989;
      $2991 = $7;
      $2992 = $10;
      $2993 = ((($2992)) + 4|0);
      HEAP32[$2993>>2] = $2991;
      $2994 = $10;
      HEAP32[966] = $2994;
      _caml_minor_collection();
      $2995 = $10;
      $2996 = HEAP32[$2995>>2]|0;
      $11 = $2996;
      $2997 = $10;
      $2998 = ((($2997)) + 4|0);
      $2999 = HEAP32[$2998>>2]|0;
      $7 = $2999;
      $3000 = $10;
      $3001 = ((($3000)) + 8|0);
      $10 = $3001;
      $3002 = HEAP32[_caml_young_ptr>>2]|0;
      $3003 = ((($3002)) + -8|0);
      HEAP32[_caml_young_ptr>>2] = $3003;
     }
     $3004 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$3004>>2] = 1793;
     $3005 = HEAP32[_caml_young_ptr>>2]|0;
     $3006 = ((($3005)) + 4|0);
     $3007 = $3006;
     $11 = $3007;
    }
    $3008 = $86;
    $3009 = $11;
    $3010 = $3009;
    HEAP32[$3010>>2] = $3008;
    $3011 = $9;
    $3012 = ((($3011)) + 4|0);
    $9 = $3012;
    $$sink1 = $3011;
    continue L8;
    break;
   }
   case 92:  {
    $3013 = $10;
    $3014 = ((($3013)) + 4|0);
    $10 = $3014;
    $3015 = HEAP32[$3013>>2]|0;
    $87 = $3015;
    $3016 = $11;
    $3017 = $87;
    $3018 = (($3016) - ($3017))|0;
    $3019 = (($3018) - 1)|0;
    $88 = $3019;
    $3020 = $11;
    $3021 = $87;
    $3022 = ($3020>>>0)<=($3021>>>0);
    $3023 = HEAP32[_caml_young_ptr>>2]|0;
    $3024 = ((($3023)) + -8|0);
    HEAP32[_caml_young_ptr>>2] = $3024;
    $3025 = HEAP32[_caml_young_ptr>>2]|0;
    $3026 = HEAP32[_caml_young_limit>>2]|0;
    $3027 = ($3025>>>0)<($3026>>>0);
    if ($3022) {
     if ($3027) {
      $3028 = HEAP32[_caml_young_ptr>>2]|0;
      $3029 = ((($3028)) + 8|0);
      HEAP32[_caml_young_ptr>>2] = $3029;
      $3030 = $10;
      $3031 = ((($3030)) + -8|0);
      $10 = $3031;
      $3032 = $11;
      $3033 = $10;
      HEAP32[$3033>>2] = $3032;
      $3034 = $7;
      $3035 = $10;
      $3036 = ((($3035)) + 4|0);
      HEAP32[$3036>>2] = $3034;
      $3037 = $10;
      HEAP32[966] = $3037;
      _caml_minor_collection();
      $3038 = $10;
      $3039 = HEAP32[$3038>>2]|0;
      $11 = $3039;
      $3040 = $10;
      $3041 = ((($3040)) + 4|0);
      $3042 = HEAP32[$3041>>2]|0;
      $7 = $3042;
      $3043 = $10;
      $3044 = ((($3043)) + 8|0);
      $10 = $3044;
      $3045 = HEAP32[_caml_young_ptr>>2]|0;
      $3046 = ((($3045)) + -8|0);
      HEAP32[_caml_young_ptr>>2] = $3046;
     }
     $3047 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$3047>>2] = 1794;
     $3048 = HEAP32[_caml_young_ptr>>2]|0;
     $3049 = ((($3048)) + 4|0);
     $3050 = $3049;
     $11 = $3050;
    } else {
     if ($3027) {
      $3051 = HEAP32[_caml_young_ptr>>2]|0;
      $3052 = ((($3051)) + 8|0);
      HEAP32[_caml_young_ptr>>2] = $3052;
      $3053 = $10;
      $3054 = ((($3053)) + -8|0);
      $10 = $3054;
      $3055 = $11;
      $3056 = $10;
      HEAP32[$3056>>2] = $3055;
      $3057 = $7;
      $3058 = $10;
      $3059 = ((($3058)) + 4|0);
      HEAP32[$3059>>2] = $3057;
      $3060 = $10;
      HEAP32[966] = $3060;
      _caml_minor_collection();
      $3061 = $10;
      $3062 = HEAP32[$3061>>2]|0;
      $11 = $3062;
      $3063 = $10;
      $3064 = ((($3063)) + 4|0);
      $3065 = HEAP32[$3064>>2]|0;
      $7 = $3065;
      $3066 = $10;
      $3067 = ((($3066)) + 8|0);
      $10 = $3067;
      $3068 = HEAP32[_caml_young_ptr>>2]|0;
      $3069 = ((($3068)) + -8|0);
      HEAP32[_caml_young_ptr>>2] = $3069;
     }
     $3070 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$3070>>2] = 1793;
     $3071 = HEAP32[_caml_young_ptr>>2]|0;
     $3072 = ((($3071)) + 4|0);
     $3073 = $3072;
     $11 = $3073;
    }
    $3074 = $88;
    $3075 = $11;
    $3076 = $3075;
    HEAP32[$3076>>2] = $3074;
    $3077 = $9;
    $3078 = ((($3077)) + 4|0);
    $9 = $3078;
    $$sink1 = $3077;
    continue L8;
    break;
   }
   case 93:  {
    $3090 = $11;
    $3091 = $3090 >>> 1;
    $3092 = $10;
    $3093 = ((($3092)) + 4|0);
    $10 = $3093;
    $3094 = HEAP32[$3092>>2]|0;
    $3095 = $3094 ^ 1;
    $3096 = (___muldi3(($3091|0),0,($3095|0),0)|0);
    $3097 = tempRet0;
    $3098 = $89;
    $3099 = $3098;
    HEAP32[$3099>>2] = $3096;
    $3100 = (($3098) + 4)|0;
    $3101 = $3100;
    HEAP32[$3101>>2] = $3097;
    $3102 = $89;
    $3103 = $3102;
    $3104 = HEAP32[$3103>>2]|0;
    $3105 = (($3102) + 4)|0;
    $3106 = $3105;
    $3107 = HEAP32[$3106>>2]|0;
    $3108 = ($3104|0)==(0);
    $3109 = ($3107|0)==(0);
    $3110 = $3108 & $3109;
    if ($3110) {
     $11 = 1;
    } else {
     $3111 = HEAP32[_caml_young_ptr>>2]|0;
     $3112 = ((($3111)) + -12|0);
     HEAP32[_caml_young_ptr>>2] = $3112;
     $3113 = HEAP32[_caml_young_ptr>>2]|0;
     $3114 = HEAP32[_caml_young_limit>>2]|0;
     $3115 = ($3113>>>0)<($3114>>>0);
     if ($3115) {
      $3116 = HEAP32[_caml_young_ptr>>2]|0;
      $3117 = ((($3116)) + 12|0);
      HEAP32[_caml_young_ptr>>2] = $3117;
      $3118 = $10;
      $3119 = ((($3118)) + -8|0);
      $10 = $3119;
      $3120 = $11;
      $3121 = $10;
      HEAP32[$3121>>2] = $3120;
      $3122 = $7;
      $3123 = $10;
      $3124 = ((($3123)) + 4|0);
      HEAP32[$3124>>2] = $3122;
      $3125 = $10;
      HEAP32[966] = $3125;
      _caml_minor_collection();
      $3126 = $10;
      $3127 = HEAP32[$3126>>2]|0;
      $11 = $3127;
      $3128 = $10;
      $3129 = ((($3128)) + 4|0);
      $3130 = HEAP32[$3129>>2]|0;
      $7 = $3130;
      $3131 = $10;
      $3132 = ((($3131)) + 8|0);
      $10 = $3132;
      $3133 = HEAP32[_caml_young_ptr>>2]|0;
      $3134 = ((($3133)) + -12|0);
      HEAP32[_caml_young_ptr>>2] = $3134;
     }
     $3135 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$3135>>2] = 2817;
     $3136 = HEAP32[_caml_young_ptr>>2]|0;
     $3137 = ((($3136)) + 4|0);
     $3138 = $3137;
     $11 = $3138;
     $3139 = $89;
     $3140 = $3139;
     $3141 = HEAP32[$3140>>2]|0;
     $3142 = (($3139) + 4)|0;
     $3143 = $3142;
     $3144 = HEAP32[$3143>>2]|0;
     $3145 = (_bitshift64Lshr(($3141|0),($3144|0),31)|0);
     $3146 = tempRet0;
     $3147 = $3145 | 1;
     $3148 = $11;
     $3149 = $3148;
     HEAP32[$3149>>2] = $3147;
     $3150 = $89;
     $3151 = $3150;
     $3152 = HEAP32[$3151>>2]|0;
     $3153 = (($3150) + 4)|0;
     $3154 = $3153;
     $3155 = HEAP32[$3154>>2]|0;
     $3156 = $3152 | 1;
     $3157 = $11;
     $3158 = $3157;
     $3159 = ((($3158)) + 4|0);
     HEAP32[$3159>>2] = $3156;
    }
    $3160 = $9;
    $3161 = ((($3160)) + 4|0);
    $9 = $3161;
    $$sink1 = $3160;
    continue L8;
    break;
   }
   case 94:  {
    $3079 = $11;
    $3080 = $3079 >>> 1;
    $3081 = $10;
    $3082 = ((($3081)) + 4|0);
    $10 = $3082;
    $3083 = HEAP32[$3081>>2]|0;
    $3084 = $3083 >>> 1;
    $3085 = Math_imul($3080, $3084)|0;
    $3086 = $3085 << 1;
    $3087 = $3086 | 1;
    $11 = $3087;
    $3088 = $9;
    $3089 = ((($3088)) + 4|0);
    $9 = $3089;
    $$sink1 = $3088;
    continue L8;
    break;
   }
   case 95:  {
    $3162 = $11;
    $3163 = $3162 >>> 1;
    $3164 = $90;
    $3165 = $3164;
    HEAP32[$3165>>2] = $3163;
    $3166 = (($3164) + 4)|0;
    $3167 = $3166;
    HEAP32[$3167>>2] = 0;
    $3168 = $90;
    $3169 = $3168;
    $3170 = HEAP32[$3169>>2]|0;
    $3171 = (($3168) + 4)|0;
    $3172 = $3171;
    $3173 = HEAP32[$3172>>2]|0;
    $3174 = (_bitshift64Shl(($3170|0),($3173|0),31)|0);
    $3175 = tempRet0;
    $3176 = $10;
    $3177 = ((($3176)) + 4|0);
    $10 = $3177;
    $3178 = HEAP32[$3176>>2]|0;
    $3179 = $3178 >>> 1;
    $3180 = $3174 | $3179;
    $3181 = $90;
    $3182 = $3181;
    HEAP32[$3182>>2] = $3180;
    $3183 = (($3181) + 4)|0;
    $3184 = $3183;
    HEAP32[$3184>>2] = $3175;
    $3185 = $10;
    $3186 = ((($3185)) + 4|0);
    $10 = $3186;
    $3187 = HEAP32[$3185>>2]|0;
    $3188 = $3187 >>> 1;
    $3189 = $91;
    $3190 = $3189;
    HEAP32[$3190>>2] = $3188;
    $3191 = (($3189) + 4)|0;
    $3192 = $3191;
    HEAP32[$3192>>2] = 0;
    $3193 = HEAP32[_caml_young_ptr>>2]|0;
    $3194 = ((($3193)) + -12|0);
    HEAP32[_caml_young_ptr>>2] = $3194;
    $3195 = HEAP32[_caml_young_ptr>>2]|0;
    $3196 = HEAP32[_caml_young_limit>>2]|0;
    $3197 = ($3195>>>0)<($3196>>>0);
    if ($3197) {
     $3198 = HEAP32[_caml_young_ptr>>2]|0;
     $3199 = ((($3198)) + 12|0);
     HEAP32[_caml_young_ptr>>2] = $3199;
     $3200 = $10;
     $3201 = ((($3200)) + -8|0);
     $10 = $3201;
     $3202 = $11;
     $3203 = $10;
     HEAP32[$3203>>2] = $3202;
     $3204 = $7;
     $3205 = $10;
     $3206 = ((($3205)) + 4|0);
     HEAP32[$3206>>2] = $3204;
     $3207 = $10;
     HEAP32[966] = $3207;
     _caml_minor_collection();
     $3208 = $10;
     $3209 = HEAP32[$3208>>2]|0;
     $11 = $3209;
     $3210 = $10;
     $3211 = ((($3210)) + 4|0);
     $3212 = HEAP32[$3211>>2]|0;
     $7 = $3212;
     $3213 = $10;
     $3214 = ((($3213)) + 8|0);
     $10 = $3214;
     $3215 = HEAP32[_caml_young_ptr>>2]|0;
     $3216 = ((($3215)) + -12|0);
     HEAP32[_caml_young_ptr>>2] = $3216;
    }
    $3217 = HEAP32[_caml_young_ptr>>2]|0;
    HEAP32[$3217>>2] = 2817;
    $3218 = HEAP32[_caml_young_ptr>>2]|0;
    $3219 = ((($3218)) + 4|0);
    $3220 = $3219;
    $11 = $3220;
    $3221 = $91;
    $3222 = $3221;
    $3223 = HEAP32[$3222>>2]|0;
    $3224 = (($3221) + 4)|0;
    $3225 = $3224;
    $3226 = HEAP32[$3225>>2]|0;
    $3227 = ($3223|0)==(0);
    $3228 = ($3226|0)==(0);
    $3229 = $3227 & $3228;
    if ($3229) {
     $3230 = $11;
     $3231 = $3230;
     HEAP32[$3231>>2] = 1;
     $3232 = $11;
     $$sink = 1;$$sink4 = $3232;
    } else {
     $3233 = $90;
     $3234 = $3233;
     $3235 = HEAP32[$3234>>2]|0;
     $3236 = (($3233) + 4)|0;
     $3237 = $3236;
     $3238 = HEAP32[$3237>>2]|0;
     $3239 = $91;
     $3240 = $3239;
     $3241 = HEAP32[$3240>>2]|0;
     $3242 = (($3239) + 4)|0;
     $3243 = $3242;
     $3244 = HEAP32[$3243>>2]|0;
     $3245 = (___udivdi3(($3235|0),($3238|0),($3241|0),($3244|0))|0);
     $3246 = tempRet0;
     $3247 = $92;
     $3248 = $3247;
     HEAP32[$3248>>2] = $3245;
     $3249 = (($3247) + 4)|0;
     $3250 = $3249;
     HEAP32[$3250>>2] = $3246;
     $3251 = $90;
     $3252 = $3251;
     $3253 = HEAP32[$3252>>2]|0;
     $3254 = (($3251) + 4)|0;
     $3255 = $3254;
     $3256 = HEAP32[$3255>>2]|0;
     $3257 = $91;
     $3258 = $3257;
     $3259 = HEAP32[$3258>>2]|0;
     $3260 = (($3257) + 4)|0;
     $3261 = $3260;
     $3262 = HEAP32[$3261>>2]|0;
     $3263 = (___uremdi3(($3253|0),($3256|0),($3259|0),($3262|0))|0);
     $3264 = tempRet0;
     $3265 = $93;
     $3266 = $3265;
     HEAP32[$3266>>2] = $3263;
     $3267 = (($3265) + 4)|0;
     $3268 = $3267;
     HEAP32[$3268>>2] = $3264;
     $3269 = $92;
     $3270 = $3269;
     $3271 = HEAP32[$3270>>2]|0;
     $3272 = (($3269) + 4)|0;
     $3273 = $3272;
     $3274 = HEAP32[$3273>>2]|0;
     $3275 = $3271 << 1;
     $3276 = $3275 | 1;
     $3277 = $11;
     $3278 = $3277;
     HEAP32[$3278>>2] = $3276;
     $3279 = $93;
     $3280 = $3279;
     $3281 = HEAP32[$3280>>2]|0;
     $3282 = (($3279) + 4)|0;
     $3283 = $3282;
     $3284 = HEAP32[$3283>>2]|0;
     $3285 = $3281 << 1;
     $3286 = $3285 | 1;
     $3287 = $11;
     $$sink = $3286;$$sink4 = $3287;
    }
    $3288 = $$sink4;
    $3289 = ((($3288)) + 4|0);
    HEAP32[$3289>>2] = $$sink;
    $3290 = $9;
    $3291 = ((($3290)) + 4|0);
    $9 = $3291;
    $$sink1 = $3290;
    continue L8;
    break;
   }
   case 96:  {
    $3292 = $10;
    $3293 = ((($3292)) + 4|0);
    $10 = $3293;
    $3294 = HEAP32[$3292>>2]|0;
    $3295 = $3294 >>> 1;
    $94 = $3295;
    $3296 = $94;
    $3297 = ($3296|0)==(0);
    if ($3297) {
     $3298 = HEAP32[_caml_young_ptr>>2]|0;
     $3299 = ((($3298)) + -12|0);
     HEAP32[_caml_young_ptr>>2] = $3299;
     $3300 = HEAP32[_caml_young_ptr>>2]|0;
     $3301 = HEAP32[_caml_young_limit>>2]|0;
     $3302 = ($3300>>>0)<($3301>>>0);
     if ($3302) {
      $3303 = HEAP32[_caml_young_ptr>>2]|0;
      $3304 = ((($3303)) + 12|0);
      HEAP32[_caml_young_ptr>>2] = $3304;
      $3305 = $10;
      $3306 = ((($3305)) + -8|0);
      $10 = $3306;
      $3307 = $11;
      $3308 = $10;
      HEAP32[$3308>>2] = $3307;
      $3309 = $7;
      $3310 = $10;
      $3311 = ((($3310)) + 4|0);
      HEAP32[$3311>>2] = $3309;
      $3312 = $10;
      HEAP32[966] = $3312;
      _caml_minor_collection();
      $3313 = $10;
      $3314 = HEAP32[$3313>>2]|0;
      $11 = $3314;
      $3315 = $10;
      $3316 = ((($3315)) + 4|0);
      $3317 = HEAP32[$3316>>2]|0;
      $7 = $3317;
      $3318 = $10;
      $3319 = ((($3318)) + 8|0);
      $10 = $3319;
      $3320 = HEAP32[_caml_young_ptr>>2]|0;
      $3321 = ((($3320)) + -12|0);
      HEAP32[_caml_young_ptr>>2] = $3321;
     }
     $3322 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$3322>>2] = 2817;
     $3323 = HEAP32[_caml_young_ptr>>2]|0;
     $3324 = ((($3323)) + 4|0);
     $3325 = $3324;
     $11 = $3325;
     $3326 = $11;
     $3327 = $3326;
     HEAP32[$3327>>2] = 1;
     $3328 = $11;
     $$sink5 = 1;$$sink8 = $3328;
    } else {
     $3329 = $11;
     $3330 = $3329 >>> 1;
     $95 = $3330;
     $3331 = HEAP32[_caml_young_ptr>>2]|0;
     $3332 = ((($3331)) + -12|0);
     HEAP32[_caml_young_ptr>>2] = $3332;
     $3333 = HEAP32[_caml_young_ptr>>2]|0;
     $3334 = HEAP32[_caml_young_limit>>2]|0;
     $3335 = ($3333>>>0)<($3334>>>0);
     if ($3335) {
      $3336 = HEAP32[_caml_young_ptr>>2]|0;
      $3337 = ((($3336)) + 12|0);
      HEAP32[_caml_young_ptr>>2] = $3337;
      $3338 = $10;
      $3339 = ((($3338)) + -8|0);
      $10 = $3339;
      $3340 = $11;
      $3341 = $10;
      HEAP32[$3341>>2] = $3340;
      $3342 = $7;
      $3343 = $10;
      $3344 = ((($3343)) + 4|0);
      HEAP32[$3344>>2] = $3342;
      $3345 = $10;
      HEAP32[966] = $3345;
      _caml_minor_collection();
      $3346 = $10;
      $3347 = HEAP32[$3346>>2]|0;
      $11 = $3347;
      $3348 = $10;
      $3349 = ((($3348)) + 4|0);
      $3350 = HEAP32[$3349>>2]|0;
      $7 = $3350;
      $3351 = $10;
      $3352 = ((($3351)) + 8|0);
      $10 = $3352;
      $3353 = HEAP32[_caml_young_ptr>>2]|0;
      $3354 = ((($3353)) + -12|0);
      HEAP32[_caml_young_ptr>>2] = $3354;
     }
     $3355 = HEAP32[_caml_young_ptr>>2]|0;
     HEAP32[$3355>>2] = 2817;
     $3356 = HEAP32[_caml_young_ptr>>2]|0;
     $3357 = ((($3356)) + 4|0);
     $3358 = $3357;
     $11 = $3358;
     $3359 = $95;
     $3360 = $94;
     $3361 = (($3359>>>0) / ($3360>>>0))&-1;
     $3362 = $3361 << 1;
     $3363 = $3362 | 1;
     $3364 = $11;
     $3365 = $3364;
     HEAP32[$3365>>2] = $3363;
     $3366 = $95;
     $3367 = $94;
     $3368 = (($3366>>>0) % ($3367>>>0))&-1;
     $3369 = $3368 << 1;
     $3370 = $3369 | 1;
     $3371 = $11;
     $$sink5 = $3370;$$sink8 = $3371;
    }
    $3372 = $$sink8;
    $3373 = ((($3372)) + 4|0);
    HEAP32[$3373>>2] = $$sink5;
    $3374 = $9;
    $3375 = ((($3374)) + 4|0);
    $9 = $3375;
    $$sink1 = $3374;
    continue L8;
    break;
   }
   case 97:  {
    $3376 = $11;
    $3377 = $3376 >>> 1;
    $96 = $3377;
    $3378 = $96;
    $3379 = ($3378>>>0)>(31);
    do {
     if ($3379) {
      $3380 = $96;
      $3381 = ($3380>>>0)<(62);
      $3382 = $10;
      if ($3381) {
       $3383 = ((($3382)) + 4|0);
       $10 = $3383;
       $3384 = $10;
       $3385 = ((($3384)) + 4|0);
       $10 = $3385;
       $3386 = HEAP32[$3384>>2]|0;
       $3387 = $3386 ^ 1;
       $3388 = $96;
       $3389 = (($3388) - 31)|0;
       $3390 = $3387 << $3389;
       $3391 = $3390 | 1;
       $11 = $3391;
       break;
      } else {
       $3392 = ((($3382)) + 8|0);
       $10 = $3392;
       $11 = 1;
       break;
      }
     } else {
      $3393 = $10;
      $3394 = ((($3393)) + 4|0);
      $10 = $3394;
      $3395 = HEAP32[$3393>>2]|0;
      $3396 = $3395 ^ 1;
      $3397 = $96;
      $3398 = $3396 << $3397;
      $11 = $3398;
      $3399 = $11;
      $3400 = $10;
      $3401 = ((($3400)) + 4|0);
      $10 = $3401;
      $3402 = HEAP32[$3400>>2]|0;
      $3403 = $96;
      $3404 = (31 - ($3403))|0;
      $3405 = $3402 >>> $3404;
      $3406 = $3399 | $3405;
      $3407 = $3406 | 1;
      $11 = $3407;
     }
    } while(0);
    $3408 = $9;
    $3409 = ((($3408)) + 4|0);
    $9 = $3409;
    $$sink1 = $3408;
    continue L8;
    break;
   }
   case 98:  {
    $3410 = $11;
    $3411 = $10;
    $3412 = HEAP32[$3411>>2]|0;
    $3413 = ($3410|0)==($3412|0);
    do {
     if ($3413) {
      $11 = 1;
      $3414 = $10;
      $3415 = ((($3414)) + 4|0);
      $10 = $3415;
     } else {
      $3416 = $11;
      $3417 = $10;
      $3418 = ((($3417)) + 4|0);
      $10 = $3418;
      $3419 = HEAP32[$3417>>2]|0;
      $3420 = ($3416>>>0)<($3419>>>0);
      if ($3420) {
       $11 = 3;
       break;
      } else {
       $11 = 5;
       break;
      }
     }
    } while(0);
    $3421 = $9;
    $3422 = ((($3421)) + 4|0);
    $9 = $3422;
    $$sink1 = $3421;
    continue L8;
    break;
   }
   case 99:  {
    $97 = 0;
    $3423 = $11;
    $98 = $3423;
    $3424 = $98;
    $3425 = $3424 & -65536;
    $3426 = ($3425|0)!=(0);
    if (!($3426)) {
     $3427 = $98;
     $3428 = $3427 << 16;
     $98 = $3428;
     $3429 = $97;
     $3430 = (($3429) + 16)|0;
     $97 = $3430;
    }
    $3431 = $98;
    $3432 = $3431 & -16777216;
    $3433 = ($3432|0)!=(0);
    if (!($3433)) {
     $3434 = $98;
     $3435 = $3434 << 8;
     $98 = $3435;
     $3436 = $97;
     $3437 = (($3436) + 8)|0;
     $97 = $3437;
    }
    $3438 = $98;
    $3439 = $3438 & -268435456;
    $3440 = ($3439|0)!=(0);
    if (!($3440)) {
     $3441 = $98;
     $3442 = $3441 << 4;
     $98 = $3442;
     $3443 = $97;
     $3444 = (($3443) + 4)|0;
     $97 = $3444;
    }
    $3445 = $98;
    $3446 = $3445 & -1073741824;
    $3447 = ($3446|0)!=(0);
    if (!($3447)) {
     $3448 = $98;
     $3449 = $3448 << 2;
     $98 = $3449;
     $3450 = $97;
     $3451 = (($3450) + 2)|0;
     $97 = $3451;
    }
    $3452 = $98;
    $3453 = $3452 & -2147483648;
    $3454 = ($3453|0)!=(0);
    if (!($3454)) {
     $3455 = $98;
     $3456 = $3455 << 1;
     $98 = $3456;
     $3457 = $97;
     $3458 = (($3457) + 1)|0;
     $97 = $3458;
    }
    $3459 = $98;
    $3460 = $3459 & -2147483648;
    $3461 = ($3460|0)!=(0);
    if (!($3461)) {
     $3462 = $97;
     $3463 = (($3462) + 1)|0;
     $97 = $3463;
    }
    $3464 = $97;
    $3465 = $3464 << 1;
    $3466 = $3465 | 1;
    $11 = $3466;
    $3467 = $9;
    $3468 = ((($3467)) + 4|0);
    $9 = $3468;
    $$sink1 = $3467;
    continue L8;
    break;
   }
   case 100:  {
    $99 = 0;
    $3469 = $11;
    $3470 = $3469 >>> 1;
    $3471 = $3470 | -2147483648;
    $100 = $3471;
    $3472 = $100;
    $3473 = $3472 & 65535;
    $3474 = ($3473|0)!=(0);
    if (!($3474)) {
     $3475 = $100;
     $3476 = $3475 >>> 16;
     $100 = $3476;
     $3477 = $99;
     $3478 = (($3477) + 16)|0;
     $99 = $3478;
    }
    $3479 = $100;
    $3480 = $3479 & 255;
    $3481 = ($3480|0)!=(0);
    if (!($3481)) {
     $3482 = $100;
     $3483 = $3482 >>> 8;
     $100 = $3483;
     $3484 = $99;
     $3485 = (($3484) + 8)|0;
     $99 = $3485;
    }
    $3486 = $100;
    $3487 = $3486 & 15;
    $3488 = ($3487|0)!=(0);
    if (!($3488)) {
     $3489 = $100;
     $3490 = $3489 >>> 4;
     $100 = $3490;
     $3491 = $99;
     $3492 = (($3491) + 4)|0;
     $99 = $3492;
    }
    $3493 = $100;
    $3494 = $3493 & 3;
    $3495 = ($3494|0)!=(0);
    if (!($3495)) {
     $3496 = $100;
     $3497 = $3496 >>> 2;
     $100 = $3497;
     $3498 = $99;
     $3499 = (($3498) + 2)|0;
     $99 = $3499;
    }
    $3500 = $100;
    $3501 = $3500 & 1;
    $3502 = ($3501|0)!=(0);
    if (!($3502)) {
     $3503 = $100;
     $3504 = $3503 >>> 1;
     $100 = $3504;
     $3505 = $99;
     $3506 = (($3505) + 1)|0;
     $99 = $3506;
    }
    $3507 = $100;
    $3508 = $3507 & 1;
    $3509 = ($3508|0)!=(0);
    if (!($3509)) {
     $3510 = $99;
     $3511 = (($3510) + 1)|0;
     $99 = $3511;
    }
    $3512 = $99;
    $3513 = $3512 << 1;
    $3514 = $3513 | 1;
    $11 = $3514;
    $3515 = $9;
    $3516 = ((($3515)) + 4|0);
    $9 = $3516;
    $$sink1 = $3515;
    continue L8;
    break;
   }
   case 101:  {
    $3517 = $11;
    $3518 = $3517 & 1;
    $3519 = ($3518|0)==(0);
    $3520 = $9;
    if ($3519) {
     $3521 = HEAP32[$3520>>2]|0;
     $3522 = $9;
     $3523 = (($3522) + ($3521<<2)|0);
     $9 = $3523;
    } else {
     $3524 = ((($3520)) + 4|0);
     $9 = $3524;
    }
    $3525 = $9;
    $3526 = ((($3525)) + 4|0);
    $9 = $3526;
    $$sink1 = $3525;
    continue L8;
    break;
   }
   case 102:  {
    $103 = 1;
    $3527 = $9;
    $3528 = ((($3527)) + 4|0);
    $9 = $3528;
    $3529 = HEAP32[$3527>>2]|0;
    $102 = $3529;
    $101 = 0;
    while(1) {
     $3530 = $101;
     $3531 = $102;
     $3532 = ($3530|0)<($3531|0);
     if (!($3532)) {
      break;
     }
     $3533 = $10;
     $3534 = $101;
     $3535 = (($3533) + ($3534<<2)|0);
     $3536 = HEAP32[$3535>>2]|0;
     $3537 = $3536 & 1;
     $3538 = ($3537|0)==(0);
     if ($3538) {
      label = 364;
      break;
     }
     $3539 = $101;
     $3540 = (($3539) + 1)|0;
     $101 = $3540;
    }
    if ((label|0) == 364) {
     label = 0;
     $103 = 0;
    }
    $3541 = $103;
    $3542 = ($3541|0)!=(0);
    $3543 = $9;
    if ($3542) {
     $3544 = ((($3543)) + 4|0);
     $9 = $3544;
    } else {
     $3545 = HEAP32[$3543>>2]|0;
     $3546 = $9;
     $3547 = (($3546) + ($3545<<2)|0);
     $9 = $3547;
    }
    $3548 = $9;
    $3549 = ((($3548)) + 4|0);
    $9 = $3549;
    $$sink1 = $3548;
    continue L8;
    break;
   }
   case 103:  {
    $104 = 0;
    while(1) {
     $3550 = $104;
     $3551 = ($3550|0)<(30);
     if (!($3551)) {
      break;
     }
     $3552 = $11;
     $3553 = (($3552) - 1)|0;
     $3554 = $3553 << 1;
     $3555 = $10;
     $3556 = ((($3555)) + 4|0);
     $10 = $3556;
     $3557 = HEAP32[$3555>>2]|0;
     $3558 = $3554 | $3557;
     $11 = $3558;
     $3559 = $104;
     $3560 = (($3559) + 1)|0;
     $104 = $3560;
    }
    $3561 = $9;
    $3562 = ((($3561)) + 4|0);
    $9 = $3562;
    $$sink1 = $3561;
    continue L8;
    break;
   }
   case 104:  {
    $3563 = HEAP32[_caml_young_ptr>>2]|0;
    $3564 = ((($3563)) + -128|0);
    HEAP32[_caml_young_ptr>>2] = $3564;
    $3565 = HEAP32[_caml_young_ptr>>2]|0;
    $3566 = HEAP32[_caml_young_limit>>2]|0;
    $3567 = ($3565>>>0)<($3566>>>0);
    if ($3567) {
     $3568 = HEAP32[_caml_young_ptr>>2]|0;
     $3569 = ((($3568)) + 128|0);
     HEAP32[_caml_young_ptr>>2] = $3569;
     $3570 = $10;
     $3571 = ((($3570)) + -8|0);
     $10 = $3571;
     $3572 = $11;
     $3573 = $10;
     HEAP32[$3573>>2] = $3572;
     $3574 = $7;
     $3575 = $10;
     $3576 = ((($3575)) + 4|0);
     HEAP32[$3576>>2] = $3574;
     $3577 = $10;
     HEAP32[966] = $3577;
     _caml_minor_collection();
     $3578 = $10;
     $3579 = HEAP32[$3578>>2]|0;
     $11 = $3579;
     $3580 = $10;
     $3581 = ((($3580)) + 4|0);
     $3582 = HEAP32[$3581>>2]|0;
     $7 = $3582;
     $3583 = $10;
     $3584 = ((($3583)) + 8|0);
     $10 = $3584;
     $3585 = HEAP32[_caml_young_ptr>>2]|0;
     $3586 = ((($3585)) + -128|0);
     HEAP32[_caml_young_ptr>>2] = $3586;
    }
    $3587 = HEAP32[_caml_young_ptr>>2]|0;
    HEAP32[$3587>>2] = 32513;
    $3588 = HEAP32[_caml_young_ptr>>2]|0;
    $3589 = ((($3588)) + 4|0);
    $3590 = $3589;
    $106 = $3590;
    $105 = 30;
    while(1) {
     $3591 = $105;
     $3592 = ($3591|0)>=(0);
     if (!($3592)) {
      break;
     }
     $3593 = $11;
     $3594 = $3593 & 3;
     $3595 = $106;
     $3596 = $3595;
     $3597 = $105;
     $3598 = (($3596) + ($3597<<2)|0);
     HEAP32[$3598>>2] = $3594;
     $3599 = $11;
     $3600 = $3599 >>> 1;
     $3601 = $3600 | 1;
     $11 = $3601;
     $3602 = $105;
     $3603 = (($3602) + -1)|0;
     $105 = $3603;
    }
    $3604 = $106;
    $11 = $3604;
    $3605 = $9;
    $3606 = ((($3605)) + 4|0);
    $9 = $3606;
    $$sink1 = $3605;
    continue L8;
    break;
   }
   case 105:  {
    $3607 = $11;
    $3608 = $3607 >>> 1;
    $3609 = $10;
    $3610 = ((($3609)) + 4|0);
    $10 = $3610;
    $3611 = HEAP32[$3609>>2]|0;
    $3612 = $3611 >>> 1;
    $3613 = $3608 | $3612;
    $3614 = $3613 << 1;
    $3615 = $3614 | 1;
    $11 = $3615;
    $3616 = $9;
    $3617 = ((($3616)) + 4|0);
    $9 = $3617;
    $$sink1 = $3616;
    continue L8;
    break;
   }
   case 106:  {
    $3618 = $11;
    $3619 = $3618 >>> 1;
    $3620 = $10;
    $3621 = ((($3620)) + 4|0);
    $10 = $3621;
    $3622 = HEAP32[$3620>>2]|0;
    $3623 = $3622 >>> 1;
    $3624 = $3619 & $3623;
    $3625 = $3624 << 1;
    $3626 = $3625 | 1;
    $11 = $3626;
    $3627 = $9;
    $3628 = ((($3627)) + 4|0);
    $9 = $3628;
    $$sink1 = $3627;
    continue L8;
    break;
   }
   case 107:  {
    $3629 = $11;
    $3630 = $3629 >>> 1;
    $3631 = $10;
    $3632 = ((($3631)) + 4|0);
    $10 = $3632;
    $3633 = HEAP32[$3631>>2]|0;
    $3634 = $3633 >>> 1;
    $3635 = $3630 ^ $3634;
    $3636 = $3635 << 1;
    $3637 = $3636 | 1;
    $11 = $3637;
    $3638 = $9;
    $3639 = ((($3638)) + 4|0);
    $9 = $3639;
    $$sink1 = $3638;
    continue L8;
    break;
   }
   default: {
    label = 386;
    break L8;
   }
   }
  } while(0);
  if ((label|0) == 24) {
   label = 0;
   $227 = $10;
   $228 = $9;
   $229 = ((($228)) + 4|0);
   $9 = $229;
   $230 = HEAP32[$228>>2]|0;
   $231 = (($227) + ($230<<2)|0);
   $232 = HEAP32[$231>>2]|0;
   $11 = $232;
   $233 = $9;
   $234 = ((($233)) + 4|0);
   $9 = $234;
   $$sink1 = $233;
   continue;
  }
  else if ((label|0) == 35) {
   label = 0;
   $305 = $7;
   $306 = $305;
   $307 = $9;
   $308 = ((($307)) + 4|0);
   $9 = $308;
   $309 = HEAP32[$307>>2]|0;
   $310 = (($306) + ($309<<2)|0);
   $311 = HEAP32[$310>>2]|0;
   $11 = $311;
   $312 = $9;
   $313 = ((($312)) + 4|0);
   $9 = $313;
   $$sink1 = $312;
   continue;
  }
  else if ((label|0) == 41) {
   label = 0;
   $425 = $10;
   $426 = HEAP32[969]|0;
   $427 = ($425>>>0)<($426>>>0);
   if ($427) {
    $428 = $10;
    HEAP32[966] = $428;
    _realloc_coq_stack(256);
    $429 = HEAP32[966]|0;
    $10 = $429;
   }
   $430 = HEAP32[_caml_signals_are_pending>>2]|0;
   $431 = ($430|0)!=(0);
   if ($431) {
    $432 = HEAP32[(((_caml_pending_signals) + 8|0))>>2]|0;
    $433 = ($432|0)!=(0);
    if ($433) {
     $434 = HEAP32[967]|0;
     HEAP32[966] = $434;
    }
    _caml_process_pending_signals();
   }
   $435 = $9;
   $436 = ((($435)) + 4|0);
   $9 = $436;
   $$sink1 = $435;
   continue;
  }
  else if ((label|0) == 153) {
   label = 0;
   $1602 = $7;
   $1603 = $9;
   $1604 = ((($1603)) + 4|0);
   $9 = $1604;
   $1605 = HEAP32[$1603>>2]|0;
   $1606 = $1605<<2;
   $1607 = (($1602) + ($1606))|0;
   $11 = $1607;
   $1608 = $9;
   $1609 = ((($1608)) + 4|0);
   $9 = $1609;
   $$sink1 = $1608;
   continue;
  }
  else if ((label|0) == 155) {
   label = 0;
   $1613 = $7;
   $1614 = (($1613) - 8)|0;
   $11 = $1614;
   $1615 = $9;
   $1616 = ((($1615)) + 4|0);
   $9 = $1616;
   $$sink1 = $1615;
   continue;
  }
  else if ((label|0) == 157) {
   label = 0;
   $1620 = $7;
   $11 = $1620;
   $1621 = $9;
   $1622 = ((($1621)) + 4|0);
   $9 = $1622;
   $$sink1 = $1621;
   continue;
  }
  else if ((label|0) == 159) {
   label = 0;
   $1626 = $7;
   $1627 = (($1626) + 8)|0;
   $11 = $1627;
   $1628 = $9;
   $1629 = ((($1628)) + 4|0);
   $9 = $1629;
   $$sink1 = $1628;
   continue;
  }
  else if ((label|0) == 161) {
   label = 0;
   $1633 = HEAP32[964]|0;
   $1634 = $1633;
   $1635 = $9;
   $1636 = HEAP32[$1635>>2]|0;
   $1637 = (($1634) + ($1636<<2)|0);
   $1638 = HEAP32[$1637>>2]|0;
   $11 = $1638;
   $1639 = $9;
   $1640 = ((($1639)) + 4|0);
   $9 = $1640;
   $1641 = $9;
   $1642 = ((($1641)) + 4|0);
   $9 = $1642;
   $$sink1 = $1641;
   continue;
  }
  else if ((label|0) == 220) {
   label = 0;
   $2219 = $9;
   $2220 = HEAP32[$2219>>2]|0;
   $2221 = $2220 << 1;
   $2222 = (($2221) + 1)|0;
   $11 = $2222;
   $2223 = $9;
   $2224 = ((($2223)) + 4|0);
   $9 = $2224;
   $2225 = $9;
   $2226 = ((($2225)) + 4|0);
   $9 = $2226;
   $$sink1 = $2225;
   continue;
  }
 }
 if ((label|0) == 386) {
  // unreachable;
 }
 $3640 = $10;
 HEAP32[966] = $3640;
 $3641 = $11;
 $4 = $3641;
 $3642 = $4;
 STACKTOP = sp;return ($3642|0);
}
function _coq_push_ra($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = HEAP32[966]|0;
 $3 = ((($2)) + -12|0);
 HEAP32[966] = $3;
 $4 = $1;
 $5 = HEAP32[966]|0;
 HEAP32[$5>>2] = $4;
 $6 = HEAP32[966]|0;
 $7 = ((($6)) + 4|0);
 HEAP32[$7>>2] = 1;
 $8 = HEAP32[966]|0;
 $9 = ((($8)) + 8|0);
 HEAP32[$9>>2] = 1;
 STACKTOP = sp;return 1;
}
function _coq_push_arguments($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $5 = HEAP32[966]|0;
 $4 = $5;
 $6 = $1;
 $7 = $6;
 $8 = ((($7)) + -4|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = $9 >>> 10;
 $11 = (($10) - 2)|0;
 $2 = $11;
 $12 = $4;
 $13 = $2;
 $14 = (0 - ($13))|0;
 $15 = (($12) + ($14<<2)|0);
 $16 = HEAP32[969]|0;
 $17 = ($15>>>0)<($16>>>0);
 if ($17) {
  $18 = $4;
  HEAP32[966] = $18;
  $19 = $2;
  $20 = (($19) + 256)|0;
  _realloc_coq_stack($20);
  $21 = HEAP32[966]|0;
  $4 = $21;
 }
 $22 = $2;
 $23 = HEAP32[966]|0;
 $24 = (0 - ($22))|0;
 $25 = (($23) + ($24<<2)|0);
 HEAP32[966] = $25;
 $3 = 0;
 while(1) {
  $26 = $3;
  $27 = $2;
  $28 = ($26|0)<($27|0);
  if (!($28)) {
   break;
  }
  $29 = $1;
  $30 = $29;
  $31 = $3;
  $32 = (($31) + 2)|0;
  $33 = (($30) + ($32<<2)|0);
  $34 = HEAP32[$33>>2]|0;
  $35 = HEAP32[966]|0;
  $36 = $3;
  $37 = (($35) + ($36<<2)|0);
  HEAP32[$37>>2] = $34;
  $38 = $3;
  $39 = (($38) + 1)|0;
  $3 = $39;
 }
 STACKTOP = sp;return 1;
}
function _coq_push_vstack($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $2 = $0;
 $3 = $1;
 $7 = HEAP32[966]|0;
 $6 = $7;
 $8 = $2;
 $9 = $8;
 $10 = ((($9)) + -4|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = $11 >>> 10;
 $4 = $12;
 $13 = $6;
 $14 = $4;
 $15 = (0 - ($14))|0;
 $16 = (($13) + ($15<<2)|0);
 $17 = HEAP32[969]|0;
 $18 = ($16>>>0)<($17>>>0);
 if ($18) {
  $19 = $6;
  HEAP32[966] = $19;
  $20 = $4;
  $21 = (($20) + 256)|0;
  _realloc_coq_stack($21);
  $22 = HEAP32[966]|0;
  $6 = $22;
 }
 $23 = $4;
 $24 = HEAP32[966]|0;
 $25 = (0 - ($23))|0;
 $26 = (($24) + ($25<<2)|0);
 HEAP32[966] = $26;
 $5 = 0;
 while(1) {
  $27 = $5;
  $28 = $4;
  $29 = ($27|0)<($28|0);
  if (!($29)) {
   break;
  }
  $30 = $2;
  $31 = $30;
  $32 = $5;
  $33 = (($31) + ($32<<2)|0);
  $34 = HEAP32[$33>>2]|0;
  $35 = HEAP32[966]|0;
  $36 = $5;
  $37 = (($35) + ($36<<2)|0);
  HEAP32[$37>>2] = $34;
  $38 = $5;
  $39 = (($38) + 1)|0;
  $5 = $39;
 }
 $40 = HEAP32[966]|0;
 $6 = $40;
 $41 = $6;
 $42 = $3;
 $43 = $42 >>> 1;
 $44 = (0 - ($43))|0;
 $45 = (($41) + ($44<<2)|0);
 $46 = HEAP32[969]|0;
 $47 = ($45>>>0)<($46>>>0);
 if (!($47)) {
  STACKTOP = sp;return 1;
 }
 $48 = $6;
 HEAP32[966] = $48;
 $49 = $3;
 $50 = $49 >>> 1;
 $51 = (($50) + 256)|0;
 _realloc_coq_stack($51);
 $52 = HEAP32[966]|0;
 $6 = $52;
 STACKTOP = sp;return 1;
}
function _coq_interprete_ml($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $4 = $0;
 $5 = $1;
 $6 = $2;
 $7 = $3;
 $8 = $4;
 $9 = $8;
 $10 = $5;
 $11 = $6;
 $12 = $7;
 $13 = $12 >> 1;
 $14 = (_coq_interprete($9,$10,$11,$13)|0);
 STACKTOP = sp;return ($14|0);
}
function _coq_eval_tcode($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $2;
 $5 = $3;
 $6 = (_coq_interprete_ml($4,1,$5,0)|0);
 STACKTOP = sp;return ($6|0);
}
function _coq_stat_free($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 _free($2);
 STACKTOP = sp;return;
}
function _coq_static_alloc($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = $1;
 $3 = $2 >> 1;
 $4 = (_coq_stat_alloc($3)|0);
 $5 = $4;
 STACKTOP = sp;return ($5|0);
}
function _coq_scan_roots($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $3 = $1;
 $4 = HEAP32[964]|0;
 FUNCTION_TABLE_vii[$3 & 0]($4,3856);
 $5 = $1;
 $6 = HEAP32[965]|0;
 FUNCTION_TABLE_vii[$5 & 0]($6,3860);
 $7 = HEAP32[966]|0;
 $2 = $7;
 while(1) {
  $8 = $2;
  $9 = HEAP32[967]|0;
  $10 = ($8>>>0)<($9>>>0);
  if (!($10)) {
   break;
  }
  $11 = $1;
  $12 = $2;
  $13 = HEAP32[$12>>2]|0;
  $14 = $2;
  FUNCTION_TABLE_vii[$11 & 0]($13,$14);
  $15 = $2;
  $16 = ((($15)) + 4|0);
  $2 = $16;
 }
 $17 = HEAP32[972]|0;
 $18 = ($17|0)!=(0|0);
 if (!($18)) {
  STACKTOP = sp;return;
 }
 $19 = HEAP32[972]|0;
 $20 = $1;
 FUNCTION_TABLE_vi[$19 & 7]($20);
 STACKTOP = sp;return;
}
function _init_coq_stack() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_coq_stat_alloc(16384)|0);
 HEAP32[968] = $0;
 $1 = HEAP32[968]|0;
 $2 = ((($1)) + 16384|0);
 HEAP32[967] = $2;
 $3 = HEAP32[968]|0;
 $4 = ((($3)) + 1024|0);
 HEAP32[969] = $4;
 HEAP32[110] = 262144;
 return;
}
function _init_coq_global_data($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $3 = $1;
 $4 = (_caml_alloc_shr(($3|0),0)|0);
 HEAP32[964] = $4;
 $2 = 0;
 while(1) {
  $5 = $2;
  $6 = $1;
  $7 = ($5|0)<($6|0);
  if (!($7)) {
   break;
  }
  $8 = HEAP32[964]|0;
  $9 = $8;
  $10 = $2;
  $11 = (($9) + ($10<<2)|0);
  HEAP32[$11>>2] = 1;
  $12 = $2;
  $13 = (($12) + 1)|0;
  $2 = $13;
 }
 STACKTOP = sp;return;
}
function _init_coq_atom_tbl($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $3 = $1;
 $4 = (_caml_alloc_shr(($3|0),0)|0);
 HEAP32[965] = $4;
 $2 = 0;
 while(1) {
  $5 = $2;
  $6 = $1;
  $7 = ($5|0)<($6|0);
  if (!($7)) {
   break;
  }
  $8 = HEAP32[965]|0;
  $9 = $8;
  $10 = $2;
  $11 = (($9) + ($10<<2)|0);
  HEAP32[$11>>2] = 1;
  $12 = $2;
  $13 = (($12) + 1)|0;
  $2 = $13;
 }
 STACKTOP = sp;return;
}
function _init_coq_interpreter() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[967]|0;
 HEAP32[966] = $0;
 (_coq_interprete(0,1,1,0)|0);
 return;
}
function _init_coq_vm($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $vararg_buffer = sp;
 $1 = $0;
 $2 = HEAP32[971]|0;
 $3 = ($2|0)==(1);
 if ($3) {
  $4 = HEAP32[111]|0;
  (_fprintf($4,944,$vararg_buffer)|0);
  $5 = HEAP32[111]|0;
  (_fflush($5)|0);
  STACKTOP = sp;return 1;
 }
 _init_arity();
 _init_coq_stack();
 _init_coq_global_data(16384);
 _init_coq_atom_tbl(40);
 _init_coq_interpreter();
 $6 = (_coq_stat_alloc(4)|0);
 HEAP32[963] = $6;
 $7 = HEAP32[(332)>>2]|0;
 $8 = $7;
 $9 = 0;
 $10 = (($8) - ($9))|0;
 $11 = HEAP32[963]|0;
 HEAP32[$11>>2] = $10;
 $12 = HEAP32[972]|0;
 $13 = ($12|0)==(0|0);
 if ($13) {
  $14 = HEAP32[_caml_scan_roots_hook>>2]|0;
  HEAP32[972] = $14;
 }
 HEAP32[_caml_scan_roots_hook>>2] = 5;
 HEAP32[971] = 1;
 STACKTOP = sp;return 1;
}
function _realloc_coq_stack($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $1 = $0;
 $6 = HEAP32[967]|0;
 $7 = HEAP32[968]|0;
 $8 = $6;
 $9 = $7;
 $10 = (($8) - ($9))|0;
 $11 = (($10|0) / 4)&-1;
 $2 = $11;
 while(1) {
  $12 = $2;
  $13 = $12<<1;
  $2 = $13;
  $14 = $2;
  $15 = HEAP32[967]|0;
  $16 = HEAP32[966]|0;
  $17 = $15;
  $18 = $16;
  $19 = (($17) - ($18))|0;
  $20 = (($19|0) / 4)&-1;
  $21 = $1;
  $22 = (($20) + ($21))|0;
  $23 = ($14>>>0)<($22>>>0);
  if (!($23)) {
   break;
  }
 }
 $24 = $2;
 $25 = $24<<2;
 $26 = (_coq_stat_alloc($25)|0);
 $3 = $26;
 $27 = $3;
 $28 = $2;
 $29 = (($27) + ($28<<2)|0);
 $4 = $29;
 $30 = $4;
 $31 = HEAP32[967]|0;
 $32 = HEAP32[966]|0;
 $33 = $31;
 $34 = $32;
 $35 = (($33) - ($34))|0;
 $36 = (0 - ($35))|0;
 $37 = (($30) + ($36)|0);
 $5 = $37;
 $38 = $5;
 $39 = HEAP32[966]|0;
 $40 = HEAP32[967]|0;
 $41 = HEAP32[966]|0;
 $42 = $40;
 $43 = $41;
 $44 = (($42) - ($43))|0;
 $45 = (($44|0) / 4)&-1;
 $46 = $45<<2;
 _memmove(($38|0),($39|0),($46|0))|0;
 $47 = HEAP32[968]|0;
 _coq_stat_free($47);
 $48 = $3;
 HEAP32[968] = $48;
 $49 = $4;
 HEAP32[967] = $49;
 $50 = HEAP32[968]|0;
 $51 = ((($50)) + 1024|0);
 HEAP32[969] = $51;
 $52 = $5;
 HEAP32[966] = $52;
 STACKTOP = sp;return;
}
function _get_coq_global_data($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = HEAP32[964]|0;
 STACKTOP = sp;return ($2|0);
}
function _get_coq_atom_tbl($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 $2 = HEAP32[965]|0;
 STACKTOP = sp;return ($2|0);
}
function _realloc_coq_global_data($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $1 = $0;
 $6 = $1;
 $7 = $6 >> 1;
 $2 = $7;
 $8 = HEAP32[964]|0;
 $9 = $8;
 $10 = ((($9)) + -4|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = $11 >>> 10;
 $3 = $12;
 $13 = $2;
 $14 = $3;
 $15 = ($13>>>0)>=($14>>>0);
 if (!($15)) {
  STACKTOP = sp;return 1;
 }
 $16 = $2;
 $17 = (($16) + 256)|0;
 $18 = $17 & -256;
 $2 = $18;
 $19 = $2;
 $20 = (_caml_alloc_shr(($19|0),0)|0);
 $5 = $20;
 $4 = 0;
 while(1) {
  $21 = $4;
  $22 = $3;
  $23 = ($21>>>0)<($22>>>0);
  if (!($23)) {
   break;
  }
  $24 = $5;
  $25 = $24;
  $26 = $4;
  $27 = (($25) + ($26<<2)|0);
  $28 = HEAP32[964]|0;
  $29 = $28;
  $30 = $4;
  $31 = (($29) + ($30<<2)|0);
  $32 = HEAP32[$31>>2]|0;
  _caml_initialize(($27|0),($32|0));
  $33 = $4;
  $34 = (($33) + 1)|0;
  $4 = $34;
 }
 $35 = $3;
 $4 = $35;
 while(1) {
  $36 = $4;
  $37 = $2;
  $38 = ($36>>>0)<($37>>>0);
  $39 = $5;
  if (!($38)) {
   break;
  }
  $40 = $39;
  $41 = $4;
  $42 = (($40) + ($41<<2)|0);
  HEAP32[$42>>2] = 1;
  $43 = $4;
  $44 = (($43) + 1)|0;
  $4 = $44;
 }
 HEAP32[964] = $39;
 STACKTOP = sp;return 1;
}
function _realloc_coq_atom_tbl($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $1 = $0;
 $6 = $1;
 $7 = $6 >> 1;
 $2 = $7;
 $8 = HEAP32[965]|0;
 $9 = $8;
 $10 = ((($9)) + -4|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = $11 >>> 10;
 $3 = $12;
 $13 = $2;
 $14 = $3;
 $15 = ($13>>>0)>=($14>>>0);
 if (!($15)) {
  STACKTOP = sp;return 1;
 }
 $16 = $2;
 $17 = (($16) + 256)|0;
 $18 = $17 & -256;
 $2 = $18;
 $19 = $2;
 $20 = (_caml_alloc_shr(($19|0),0)|0);
 $5 = $20;
 $4 = 0;
 while(1) {
  $21 = $4;
  $22 = $3;
  $23 = ($21>>>0)<($22>>>0);
  if (!($23)) {
   break;
  }
  $24 = $5;
  $25 = $24;
  $26 = $4;
  $27 = (($25) + ($26<<2)|0);
  $28 = HEAP32[965]|0;
  $29 = $28;
  $30 = $4;
  $31 = (($29) + ($30<<2)|0);
  $32 = HEAP32[$31>>2]|0;
  _caml_initialize(($27|0),($32|0));
  $33 = $4;
  $34 = (($33) + 1)|0;
  $4 = $34;
 }
 $35 = $3;
 $4 = $35;
 while(1) {
  $36 = $4;
  $37 = $2;
  $38 = ($36>>>0)<($37>>>0);
  $39 = $5;
  if (!($38)) {
   break;
  }
  $40 = $39;
  $41 = $4;
  $42 = (($40) + ($41<<2)|0);
  HEAP32[$42>>2] = 1;
  $43 = $4;
  $44 = (($43) + 1)|0;
  $4 = $44;
 }
 HEAP32[965] = $39;
 STACKTOP = sp;return 1;
}
function _coq_set_drawinstr($0) {
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = $0;
 STACKTOP = sp;return 1;
}
function _coq_kind_of_closure($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $4 = 0;
 $5 = $2;
 $6 = $5;
 $7 = HEAP32[$6>>2]|0;
 $3 = $7;
 $8 = $3;
 $9 = HEAP32[$8>>2]|0;
 $10 = HEAP32[(172)>>2]|0;
 $11 = $10;
 $12 = 0;
 $13 = (($11) - ($12))|0;
 $14 = ($9|0)==($13|0);
 if ($14) {
  $1 = 1;
  $42 = $1;
  STACKTOP = sp;return ($42|0);
 }
 $15 = $3;
 $16 = HEAP32[$15>>2]|0;
 $17 = HEAP32[(168)>>2]|0;
 $18 = $17;
 $19 = 0;
 $20 = (($18) - ($19))|0;
 $21 = ($16|0)==($20|0);
 if ($21) {
  $4 = 1;
  $22 = $3;
  $23 = ((($22)) + 4|0);
  $3 = $23;
 }
 $24 = $3;
 $25 = HEAP32[$24>>2]|0;
 $26 = HEAP32[(176)>>2]|0;
 $27 = $26;
 $28 = 0;
 $29 = (($27) - ($28))|0;
 $30 = ($25|0)==($29|0);
 if ($30) {
  $31 = $4;
  $32 = (1 + ($31))|0;
  $33 = $32 << 1;
  $34 = (($33) + 1)|0;
  $1 = $34;
  $42 = $1;
  STACKTOP = sp;return ($42|0);
 }
 $35 = $3;
 $36 = HEAP32[$35>>2]|0;
 $37 = HEAP32[(340)>>2]|0;
 $38 = $37;
 $39 = 0;
 $40 = (($38) - ($39))|0;
 $41 = ($36|0)==($40|0);
 if ($41) {
  $1 = 7;
  $42 = $1;
  STACKTOP = sp;return ($42|0);
 } else {
  $1 = 1;
  $42 = $1;
  STACKTOP = sp;return ($42|0);
 }
 return (0)|0;
}
function _coq_closure_arity($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $4 = $2;
 $5 = $4;
 $6 = HEAP32[$5>>2]|0;
 $3 = $6;
 $7 = $3;
 $8 = HEAP32[$7>>2]|0;
 $9 = HEAP32[(168)>>2]|0;
 $10 = $9;
 $11 = 0;
 $12 = (($10) - ($11))|0;
 $13 = ($8|0)==($12|0);
 $14 = $3;
 if (!($13)) {
  $41 = HEAP32[$14>>2]|0;
  $42 = HEAP32[(172)>>2]|0;
  $43 = $42;
  $44 = 0;
  $45 = (($43) - ($44))|0;
  $46 = ($41|0)==($45|0);
  if ($46) {
   $47 = $3;
   $48 = ((($47)) + 4|0);
   $49 = HEAP32[$48>>2]|0;
   $50 = (1 + ($49))|0;
   $51 = $50 << 1;
   $52 = (($51) + 1)|0;
   $1 = $52;
   $53 = $1;
   STACKTOP = sp;return ($53|0);
  } else {
   $1 = 3;
   $53 = $1;
   STACKTOP = sp;return ($53|0);
  }
 }
 $15 = ((($14)) + 4|0);
 $3 = $15;
 $16 = $3;
 $17 = HEAP32[$16>>2]|0;
 $18 = HEAP32[(172)>>2]|0;
 $19 = $18;
 $20 = 0;
 $21 = (($19) - ($20))|0;
 $22 = ($17|0)==($21|0);
 if ($22) {
  $23 = $3;
  $24 = ((($23)) + 4|0);
  $25 = HEAP32[$24>>2]|0;
  $26 = (3 + ($25))|0;
  $27 = $2;
  $28 = $27;
  $29 = ((($28)) + -4|0);
  $30 = HEAP32[$29>>2]|0;
  $31 = $30 >>> 10;
  $32 = (($26) - ($31))|0;
  $33 = $32 << 1;
  $34 = (($33) + 1)|0;
  $1 = $34;
  $53 = $1;
  STACKTOP = sp;return ($53|0);
 }
 $35 = $2;
 $36 = $35;
 $37 = ((($36)) + -4|0);
 $38 = HEAP32[$37>>2]|0;
 $39 = $38 >>> 10;
 $40 = ($39|0)!=(2);
 if ($40) {
  _caml_failwith((959|0));
  // unreachable;
 }
 $1 = 3;
 $53 = $1;
 STACKTOP = sp;return ($53|0);
}
function _coq_offset($0) {
 $0 = $0|0;
 var $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $2;
 $4 = $3;
 $5 = ((($4)) + -4|0);
 $6 = HEAP8[$5>>0]|0;
 $7 = $6&255;
 $8 = ($7|0)==(247);
 if ($8) {
  $1 = 1;
  $19 = $1;
  STACKTOP = sp;return ($19|0);
 } else {
  $9 = $2;
  $10 = $9;
  $11 = ((($10)) + -4|0);
  $12 = HEAP32[$11>>2]|0;
  $13 = $12 >>> 10;
  $14 = $13<<2;
  $15 = (($14>>>0) / 4)&-1;
  $16 = (0 - ($15))|0;
  $17 = $16 << 1;
  $18 = (($17) + 1)|0;
  $1 = $18;
  $19 = $1;
  STACKTOP = sp;return ($19|0);
 }
 return (0)|0;
}
function _coq_offset_closure($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $2;
 $5 = $4;
 $6 = $3;
 $7 = $6 >> 1;
 $8 = (($5) + ($7<<2)|0);
 $9 = $8;
 STACKTOP = sp;return ($9|0);
}
function _coq_offset_tcode($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $2;
 $5 = $4;
 $6 = $3;
 $7 = $6 >> 1;
 $8 = (($5) + ($7<<2)|0);
 $9 = $8;
 STACKTOP = sp;return ($9|0);
}
function _coq_int_tcode($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = $0;
 $3 = $1;
 $4 = $2;
 $5 = $4;
 $6 = $3;
 $7 = $6 >> 1;
 $8 = (($5) + ($7<<2)|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = $9 << 1;
 $11 = (($10) + 1)|0;
 STACKTOP = sp;return ($11|0);
}
function _malloc($0) {
 $0 = $0|0;
 var $$$0172$i = 0, $$$0173$i = 0, $$$4236$i = 0, $$$4329$i = 0, $$$i = 0, $$0 = 0, $$0$i = 0, $$0$i$i = 0, $$0$i$i$i = 0, $$0$i20$i = 0, $$0172$lcssa$i = 0, $$01724$i = 0, $$0173$lcssa$i = 0, $$01733$i = 0, $$0192 = 0, $$0194 = 0, $$0201$i$i = 0, $$0202$i$i = 0, $$0206$i$i = 0, $$0207$i$i = 0;
 var $$024367$i = 0, $$0260$i$i = 0, $$0261$i$i = 0, $$0262$i$i = 0, $$0268$i$i = 0, $$0269$i$i = 0, $$0320$i = 0, $$0322$i = 0, $$0323$i = 0, $$0325$i = 0, $$0331$i = 0, $$0336$i = 0, $$0337$$i = 0, $$0337$i = 0, $$0339$i = 0, $$0340$i = 0, $$0345$i = 0, $$1176$i = 0, $$1178$i = 0, $$124466$i = 0;
 var $$1264$i$i = 0, $$1266$i$i = 0, $$1321$i = 0, $$1326$i = 0, $$1341$i = 0, $$1347$i = 0, $$1351$i = 0, $$2234243136$i = 0, $$2247$ph$i = 0, $$2253$ph$i = 0, $$2333$i = 0, $$3$i = 0, $$3$i$i = 0, $$3$i199 = 0, $$3328$i = 0, $$3349$i = 0, $$4$lcssa$i = 0, $$4$ph$i = 0, $$4236$i = 0, $$4329$lcssa$i = 0;
 var $$43298$i = 0, $$4335$$4$i = 0, $$4335$ph$i = 0, $$43357$i = 0, $$49$i = 0, $$723947$i = 0, $$748$i = 0, $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i17$i = 0, $$pre$i195 = 0, $$pre$i207 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i18$iZ2D = 0, $$pre$phi$i208Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phiZ2D = 0, $$sink1$i = 0, $$sink1$i$i = 0;
 var $$sink12$i = 0, $$sink2$i = 0, $$sink2$i202 = 0, $$sink3$i = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0;
 var $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0;
 var $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0;
 var $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0;
 var $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0;
 var $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0;
 var $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0;
 var $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0;
 var $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0;
 var $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0;
 var $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0;
 var $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0;
 var $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0;
 var $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0;
 var $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0;
 var $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0;
 var $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0;
 var $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0;
 var $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0;
 var $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0;
 var $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0;
 var $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0;
 var $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0;
 var $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0;
 var $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0;
 var $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0;
 var $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0;
 var $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0;
 var $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0;
 var $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0;
 var $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0;
 var $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0;
 var $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0;
 var $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0;
 var $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0;
 var $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0;
 var $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0;
 var $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0;
 var $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0;
 var $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0;
 var $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0;
 var $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0;
 var $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0;
 var $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0;
 var $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0;
 var $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0;
 var $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0;
 var $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0;
 var $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $98 = 0, $99 = 0, $cond$i = 0, $cond$i$i = 0, $cond$i206 = 0, $not$$i = 0, $not$3$i = 0;
 var $or$cond$i = 0, $or$cond$i200 = 0, $or$cond1$i = 0, $or$cond1$i198 = 0, $or$cond10$i = 0, $or$cond11$i = 0, $or$cond11$not$i = 0, $or$cond12$i = 0, $or$cond2$i = 0, $or$cond49$i = 0, $or$cond5$i = 0, $or$cond50$i = 0, $or$cond7$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $1 = sp;
 $2 = ($0>>>0)<(245);
 do {
  if ($2) {
   $3 = ($0>>>0)<(11);
   $4 = (($0) + 11)|0;
   $5 = $4 & -8;
   $6 = $3 ? 16 : $5;
   $7 = $6 >>> 3;
   $8 = HEAP32[973]|0;
   $9 = $8 >>> $7;
   $10 = $9 & 3;
   $11 = ($10|0)==(0);
   if (!($11)) {
    $12 = $9 & 1;
    $13 = $12 ^ 1;
    $14 = (($13) + ($7))|0;
    $15 = $14 << 1;
    $16 = (3932 + ($15<<2)|0);
    $17 = ((($16)) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ((($18)) + 8|0);
    $20 = HEAP32[$19>>2]|0;
    $21 = ($20|0)==($16|0);
    if ($21) {
     $22 = 1 << $14;
     $23 = $22 ^ -1;
     $24 = $8 & $23;
     HEAP32[973] = $24;
    } else {
     $25 = ((($20)) + 12|0);
     HEAP32[$25>>2] = $16;
     HEAP32[$17>>2] = $20;
    }
    $26 = $14 << 3;
    $27 = $26 | 3;
    $28 = ((($18)) + 4|0);
    HEAP32[$28>>2] = $27;
    $29 = (($18) + ($26)|0);
    $30 = ((($29)) + 4|0);
    $31 = HEAP32[$30>>2]|0;
    $32 = $31 | 1;
    HEAP32[$30>>2] = $32;
    $$0 = $19;
    STACKTOP = sp;return ($$0|0);
   }
   $33 = HEAP32[(3900)>>2]|0;
   $34 = ($6>>>0)>($33>>>0);
   if ($34) {
    $35 = ($9|0)==(0);
    if (!($35)) {
     $36 = $9 << $7;
     $37 = 2 << $7;
     $38 = (0 - ($37))|0;
     $39 = $37 | $38;
     $40 = $36 & $39;
     $41 = (0 - ($40))|0;
     $42 = $40 & $41;
     $43 = (($42) + -1)|0;
     $44 = $43 >>> 12;
     $45 = $44 & 16;
     $46 = $43 >>> $45;
     $47 = $46 >>> 5;
     $48 = $47 & 8;
     $49 = $48 | $45;
     $50 = $46 >>> $48;
     $51 = $50 >>> 2;
     $52 = $51 & 4;
     $53 = $49 | $52;
     $54 = $50 >>> $52;
     $55 = $54 >>> 1;
     $56 = $55 & 2;
     $57 = $53 | $56;
     $58 = $54 >>> $56;
     $59 = $58 >>> 1;
     $60 = $59 & 1;
     $61 = $57 | $60;
     $62 = $58 >>> $60;
     $63 = (($61) + ($62))|0;
     $64 = $63 << 1;
     $65 = (3932 + ($64<<2)|0);
     $66 = ((($65)) + 8|0);
     $67 = HEAP32[$66>>2]|0;
     $68 = ((($67)) + 8|0);
     $69 = HEAP32[$68>>2]|0;
     $70 = ($69|0)==($65|0);
     if ($70) {
      $71 = 1 << $63;
      $72 = $71 ^ -1;
      $73 = $8 & $72;
      HEAP32[973] = $73;
      $90 = $73;
     } else {
      $74 = ((($69)) + 12|0);
      HEAP32[$74>>2] = $65;
      HEAP32[$66>>2] = $69;
      $90 = $8;
     }
     $75 = $63 << 3;
     $76 = (($75) - ($6))|0;
     $77 = $6 | 3;
     $78 = ((($67)) + 4|0);
     HEAP32[$78>>2] = $77;
     $79 = (($67) + ($6)|0);
     $80 = $76 | 1;
     $81 = ((($79)) + 4|0);
     HEAP32[$81>>2] = $80;
     $82 = (($67) + ($75)|0);
     HEAP32[$82>>2] = $76;
     $83 = ($33|0)==(0);
     if (!($83)) {
      $84 = HEAP32[(3912)>>2]|0;
      $85 = $33 >>> 3;
      $86 = $85 << 1;
      $87 = (3932 + ($86<<2)|0);
      $88 = 1 << $85;
      $89 = $90 & $88;
      $91 = ($89|0)==(0);
      if ($91) {
       $92 = $90 | $88;
       HEAP32[973] = $92;
       $$pre = ((($87)) + 8|0);
       $$0194 = $87;$$pre$phiZ2D = $$pre;
      } else {
       $93 = ((($87)) + 8|0);
       $94 = HEAP32[$93>>2]|0;
       $$0194 = $94;$$pre$phiZ2D = $93;
      }
      HEAP32[$$pre$phiZ2D>>2] = $84;
      $95 = ((($$0194)) + 12|0);
      HEAP32[$95>>2] = $84;
      $96 = ((($84)) + 8|0);
      HEAP32[$96>>2] = $$0194;
      $97 = ((($84)) + 12|0);
      HEAP32[$97>>2] = $87;
     }
     HEAP32[(3900)>>2] = $76;
     HEAP32[(3912)>>2] = $79;
     $$0 = $68;
     STACKTOP = sp;return ($$0|0);
    }
    $98 = HEAP32[(3896)>>2]|0;
    $99 = ($98|0)==(0);
    if ($99) {
     $$0192 = $6;
    } else {
     $100 = (0 - ($98))|0;
     $101 = $98 & $100;
     $102 = (($101) + -1)|0;
     $103 = $102 >>> 12;
     $104 = $103 & 16;
     $105 = $102 >>> $104;
     $106 = $105 >>> 5;
     $107 = $106 & 8;
     $108 = $107 | $104;
     $109 = $105 >>> $107;
     $110 = $109 >>> 2;
     $111 = $110 & 4;
     $112 = $108 | $111;
     $113 = $109 >>> $111;
     $114 = $113 >>> 1;
     $115 = $114 & 2;
     $116 = $112 | $115;
     $117 = $113 >>> $115;
     $118 = $117 >>> 1;
     $119 = $118 & 1;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = (($120) + ($121))|0;
     $123 = (4196 + ($122<<2)|0);
     $124 = HEAP32[$123>>2]|0;
     $125 = ((($124)) + 4|0);
     $126 = HEAP32[$125>>2]|0;
     $127 = $126 & -8;
     $128 = (($127) - ($6))|0;
     $129 = ((($124)) + 16|0);
     $130 = HEAP32[$129>>2]|0;
     $131 = ($130|0)==(0|0);
     $$sink12$i = $131&1;
     $132 = (((($124)) + 16|0) + ($$sink12$i<<2)|0);
     $133 = HEAP32[$132>>2]|0;
     $134 = ($133|0)==(0|0);
     if ($134) {
      $$0172$lcssa$i = $124;$$0173$lcssa$i = $128;
     } else {
      $$01724$i = $124;$$01733$i = $128;$136 = $133;
      while(1) {
       $135 = ((($136)) + 4|0);
       $137 = HEAP32[$135>>2]|0;
       $138 = $137 & -8;
       $139 = (($138) - ($6))|0;
       $140 = ($139>>>0)<($$01733$i>>>0);
       $$$0173$i = $140 ? $139 : $$01733$i;
       $$$0172$i = $140 ? $136 : $$01724$i;
       $141 = ((($136)) + 16|0);
       $142 = HEAP32[$141>>2]|0;
       $143 = ($142|0)==(0|0);
       $$sink1$i = $143&1;
       $144 = (((($136)) + 16|0) + ($$sink1$i<<2)|0);
       $145 = HEAP32[$144>>2]|0;
       $146 = ($145|0)==(0|0);
       if ($146) {
        $$0172$lcssa$i = $$$0172$i;$$0173$lcssa$i = $$$0173$i;
        break;
       } else {
        $$01724$i = $$$0172$i;$$01733$i = $$$0173$i;$136 = $145;
       }
      }
     }
     $147 = (($$0172$lcssa$i) + ($6)|0);
     $148 = ($147>>>0)>($$0172$lcssa$i>>>0);
     if ($148) {
      $149 = ((($$0172$lcssa$i)) + 24|0);
      $150 = HEAP32[$149>>2]|0;
      $151 = ((($$0172$lcssa$i)) + 12|0);
      $152 = HEAP32[$151>>2]|0;
      $153 = ($152|0)==($$0172$lcssa$i|0);
      do {
       if ($153) {
        $158 = ((($$0172$lcssa$i)) + 20|0);
        $159 = HEAP32[$158>>2]|0;
        $160 = ($159|0)==(0|0);
        if ($160) {
         $161 = ((($$0172$lcssa$i)) + 16|0);
         $162 = HEAP32[$161>>2]|0;
         $163 = ($162|0)==(0|0);
         if ($163) {
          $$3$i = 0;
          break;
         } else {
          $$1176$i = $162;$$1178$i = $161;
         }
        } else {
         $$1176$i = $159;$$1178$i = $158;
        }
        while(1) {
         $164 = ((($$1176$i)) + 20|0);
         $165 = HEAP32[$164>>2]|0;
         $166 = ($165|0)==(0|0);
         if (!($166)) {
          $$1176$i = $165;$$1178$i = $164;
          continue;
         }
         $167 = ((($$1176$i)) + 16|0);
         $168 = HEAP32[$167>>2]|0;
         $169 = ($168|0)==(0|0);
         if ($169) {
          break;
         } else {
          $$1176$i = $168;$$1178$i = $167;
         }
        }
        HEAP32[$$1178$i>>2] = 0;
        $$3$i = $$1176$i;
       } else {
        $154 = ((($$0172$lcssa$i)) + 8|0);
        $155 = HEAP32[$154>>2]|0;
        $156 = ((($155)) + 12|0);
        HEAP32[$156>>2] = $152;
        $157 = ((($152)) + 8|0);
        HEAP32[$157>>2] = $155;
        $$3$i = $152;
       }
      } while(0);
      $170 = ($150|0)==(0|0);
      do {
       if (!($170)) {
        $171 = ((($$0172$lcssa$i)) + 28|0);
        $172 = HEAP32[$171>>2]|0;
        $173 = (4196 + ($172<<2)|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($$0172$lcssa$i|0)==($174|0);
        if ($175) {
         HEAP32[$173>>2] = $$3$i;
         $cond$i = ($$3$i|0)==(0|0);
         if ($cond$i) {
          $176 = 1 << $172;
          $177 = $176 ^ -1;
          $178 = $98 & $177;
          HEAP32[(3896)>>2] = $178;
          break;
         }
        } else {
         $179 = ((($150)) + 16|0);
         $180 = HEAP32[$179>>2]|0;
         $181 = ($180|0)!=($$0172$lcssa$i|0);
         $$sink2$i = $181&1;
         $182 = (((($150)) + 16|0) + ($$sink2$i<<2)|0);
         HEAP32[$182>>2] = $$3$i;
         $183 = ($$3$i|0)==(0|0);
         if ($183) {
          break;
         }
        }
        $184 = ((($$3$i)) + 24|0);
        HEAP32[$184>>2] = $150;
        $185 = ((($$0172$lcssa$i)) + 16|0);
        $186 = HEAP32[$185>>2]|0;
        $187 = ($186|0)==(0|0);
        if (!($187)) {
         $188 = ((($$3$i)) + 16|0);
         HEAP32[$188>>2] = $186;
         $189 = ((($186)) + 24|0);
         HEAP32[$189>>2] = $$3$i;
        }
        $190 = ((($$0172$lcssa$i)) + 20|0);
        $191 = HEAP32[$190>>2]|0;
        $192 = ($191|0)==(0|0);
        if (!($192)) {
         $193 = ((($$3$i)) + 20|0);
         HEAP32[$193>>2] = $191;
         $194 = ((($191)) + 24|0);
         HEAP32[$194>>2] = $$3$i;
        }
       }
      } while(0);
      $195 = ($$0173$lcssa$i>>>0)<(16);
      if ($195) {
       $196 = (($$0173$lcssa$i) + ($6))|0;
       $197 = $196 | 3;
       $198 = ((($$0172$lcssa$i)) + 4|0);
       HEAP32[$198>>2] = $197;
       $199 = (($$0172$lcssa$i) + ($196)|0);
       $200 = ((($199)) + 4|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = $201 | 1;
       HEAP32[$200>>2] = $202;
      } else {
       $203 = $6 | 3;
       $204 = ((($$0172$lcssa$i)) + 4|0);
       HEAP32[$204>>2] = $203;
       $205 = $$0173$lcssa$i | 1;
       $206 = ((($147)) + 4|0);
       HEAP32[$206>>2] = $205;
       $207 = (($147) + ($$0173$lcssa$i)|0);
       HEAP32[$207>>2] = $$0173$lcssa$i;
       $208 = ($33|0)==(0);
       if (!($208)) {
        $209 = HEAP32[(3912)>>2]|0;
        $210 = $33 >>> 3;
        $211 = $210 << 1;
        $212 = (3932 + ($211<<2)|0);
        $213 = 1 << $210;
        $214 = $8 & $213;
        $215 = ($214|0)==(0);
        if ($215) {
         $216 = $8 | $213;
         HEAP32[973] = $216;
         $$pre$i = ((($212)) + 8|0);
         $$0$i = $212;$$pre$phi$iZ2D = $$pre$i;
        } else {
         $217 = ((($212)) + 8|0);
         $218 = HEAP32[$217>>2]|0;
         $$0$i = $218;$$pre$phi$iZ2D = $217;
        }
        HEAP32[$$pre$phi$iZ2D>>2] = $209;
        $219 = ((($$0$i)) + 12|0);
        HEAP32[$219>>2] = $209;
        $220 = ((($209)) + 8|0);
        HEAP32[$220>>2] = $$0$i;
        $221 = ((($209)) + 12|0);
        HEAP32[$221>>2] = $212;
       }
       HEAP32[(3900)>>2] = $$0173$lcssa$i;
       HEAP32[(3912)>>2] = $147;
      }
      $222 = ((($$0172$lcssa$i)) + 8|0);
      $$0 = $222;
      STACKTOP = sp;return ($$0|0);
     } else {
      $$0192 = $6;
     }
    }
   } else {
    $$0192 = $6;
   }
  } else {
   $223 = ($0>>>0)>(4294967231);
   if ($223) {
    $$0192 = -1;
   } else {
    $224 = (($0) + 11)|0;
    $225 = $224 & -8;
    $226 = HEAP32[(3896)>>2]|0;
    $227 = ($226|0)==(0);
    if ($227) {
     $$0192 = $225;
    } else {
     $228 = (0 - ($225))|0;
     $229 = $224 >>> 8;
     $230 = ($229|0)==(0);
     if ($230) {
      $$0336$i = 0;
     } else {
      $231 = ($225>>>0)>(16777215);
      if ($231) {
       $$0336$i = 31;
      } else {
       $232 = (($229) + 1048320)|0;
       $233 = $232 >>> 16;
       $234 = $233 & 8;
       $235 = $229 << $234;
       $236 = (($235) + 520192)|0;
       $237 = $236 >>> 16;
       $238 = $237 & 4;
       $239 = $238 | $234;
       $240 = $235 << $238;
       $241 = (($240) + 245760)|0;
       $242 = $241 >>> 16;
       $243 = $242 & 2;
       $244 = $239 | $243;
       $245 = (14 - ($244))|0;
       $246 = $240 << $243;
       $247 = $246 >>> 15;
       $248 = (($245) + ($247))|0;
       $249 = $248 << 1;
       $250 = (($248) + 7)|0;
       $251 = $225 >>> $250;
       $252 = $251 & 1;
       $253 = $252 | $249;
       $$0336$i = $253;
      }
     }
     $254 = (4196 + ($$0336$i<<2)|0);
     $255 = HEAP32[$254>>2]|0;
     $256 = ($255|0)==(0|0);
     L74: do {
      if ($256) {
       $$2333$i = 0;$$3$i199 = 0;$$3328$i = $228;
       label = 57;
      } else {
       $257 = ($$0336$i|0)==(31);
       $258 = $$0336$i >>> 1;
       $259 = (25 - ($258))|0;
       $260 = $257 ? 0 : $259;
       $261 = $225 << $260;
       $$0320$i = 0;$$0325$i = $228;$$0331$i = $255;$$0337$i = $261;$$0340$i = 0;
       while(1) {
        $262 = ((($$0331$i)) + 4|0);
        $263 = HEAP32[$262>>2]|0;
        $264 = $263 & -8;
        $265 = (($264) - ($225))|0;
        $266 = ($265>>>0)<($$0325$i>>>0);
        if ($266) {
         $267 = ($265|0)==(0);
         if ($267) {
          $$43298$i = 0;$$43357$i = $$0331$i;$$49$i = $$0331$i;
          label = 61;
          break L74;
         } else {
          $$1321$i = $$0331$i;$$1326$i = $265;
         }
        } else {
         $$1321$i = $$0320$i;$$1326$i = $$0325$i;
        }
        $268 = ((($$0331$i)) + 20|0);
        $269 = HEAP32[$268>>2]|0;
        $270 = $$0337$i >>> 31;
        $271 = (((($$0331$i)) + 16|0) + ($270<<2)|0);
        $272 = HEAP32[$271>>2]|0;
        $273 = ($269|0)==(0|0);
        $274 = ($269|0)==($272|0);
        $or$cond1$i198 = $273 | $274;
        $$1341$i = $or$cond1$i198 ? $$0340$i : $269;
        $275 = ($272|0)==(0|0);
        $not$3$i = $275 ^ 1;
        $276 = $not$3$i&1;
        $$0337$$i = $$0337$i << $276;
        if ($275) {
         $$2333$i = $$1341$i;$$3$i199 = $$1321$i;$$3328$i = $$1326$i;
         label = 57;
         break;
        } else {
         $$0320$i = $$1321$i;$$0325$i = $$1326$i;$$0331$i = $272;$$0337$i = $$0337$$i;$$0340$i = $$1341$i;
        }
       }
      }
     } while(0);
     if ((label|0) == 57) {
      $277 = ($$2333$i|0)==(0|0);
      $278 = ($$3$i199|0)==(0|0);
      $or$cond$i200 = $277 & $278;
      if ($or$cond$i200) {
       $279 = 2 << $$0336$i;
       $280 = (0 - ($279))|0;
       $281 = $279 | $280;
       $282 = $226 & $281;
       $283 = ($282|0)==(0);
       if ($283) {
        $$0192 = $225;
        break;
       }
       $284 = (0 - ($282))|0;
       $285 = $282 & $284;
       $286 = (($285) + -1)|0;
       $287 = $286 >>> 12;
       $288 = $287 & 16;
       $289 = $286 >>> $288;
       $290 = $289 >>> 5;
       $291 = $290 & 8;
       $292 = $291 | $288;
       $293 = $289 >>> $291;
       $294 = $293 >>> 2;
       $295 = $294 & 4;
       $296 = $292 | $295;
       $297 = $293 >>> $295;
       $298 = $297 >>> 1;
       $299 = $298 & 2;
       $300 = $296 | $299;
       $301 = $297 >>> $299;
       $302 = $301 >>> 1;
       $303 = $302 & 1;
       $304 = $300 | $303;
       $305 = $301 >>> $303;
       $306 = (($304) + ($305))|0;
       $307 = (4196 + ($306<<2)|0);
       $308 = HEAP32[$307>>2]|0;
       $$4$ph$i = 0;$$4335$ph$i = $308;
      } else {
       $$4$ph$i = $$3$i199;$$4335$ph$i = $$2333$i;
      }
      $309 = ($$4335$ph$i|0)==(0|0);
      if ($309) {
       $$4$lcssa$i = $$4$ph$i;$$4329$lcssa$i = $$3328$i;
      } else {
       $$43298$i = $$3328$i;$$43357$i = $$4335$ph$i;$$49$i = $$4$ph$i;
       label = 61;
      }
     }
     if ((label|0) == 61) {
      while(1) {
       label = 0;
       $310 = ((($$43357$i)) + 4|0);
       $311 = HEAP32[$310>>2]|0;
       $312 = $311 & -8;
       $313 = (($312) - ($225))|0;
       $314 = ($313>>>0)<($$43298$i>>>0);
       $$$4329$i = $314 ? $313 : $$43298$i;
       $$4335$$4$i = $314 ? $$43357$i : $$49$i;
       $315 = ((($$43357$i)) + 16|0);
       $316 = HEAP32[$315>>2]|0;
       $317 = ($316|0)==(0|0);
       $$sink2$i202 = $317&1;
       $318 = (((($$43357$i)) + 16|0) + ($$sink2$i202<<2)|0);
       $319 = HEAP32[$318>>2]|0;
       $320 = ($319|0)==(0|0);
       if ($320) {
        $$4$lcssa$i = $$4335$$4$i;$$4329$lcssa$i = $$$4329$i;
        break;
       } else {
        $$43298$i = $$$4329$i;$$43357$i = $319;$$49$i = $$4335$$4$i;
        label = 61;
       }
      }
     }
     $321 = ($$4$lcssa$i|0)==(0|0);
     if ($321) {
      $$0192 = $225;
     } else {
      $322 = HEAP32[(3900)>>2]|0;
      $323 = (($322) - ($225))|0;
      $324 = ($$4329$lcssa$i>>>0)<($323>>>0);
      if ($324) {
       $325 = (($$4$lcssa$i) + ($225)|0);
       $326 = ($325>>>0)>($$4$lcssa$i>>>0);
       if (!($326)) {
        $$0 = 0;
        STACKTOP = sp;return ($$0|0);
       }
       $327 = ((($$4$lcssa$i)) + 24|0);
       $328 = HEAP32[$327>>2]|0;
       $329 = ((($$4$lcssa$i)) + 12|0);
       $330 = HEAP32[$329>>2]|0;
       $331 = ($330|0)==($$4$lcssa$i|0);
       do {
        if ($331) {
         $336 = ((($$4$lcssa$i)) + 20|0);
         $337 = HEAP32[$336>>2]|0;
         $338 = ($337|0)==(0|0);
         if ($338) {
          $339 = ((($$4$lcssa$i)) + 16|0);
          $340 = HEAP32[$339>>2]|0;
          $341 = ($340|0)==(0|0);
          if ($341) {
           $$3349$i = 0;
           break;
          } else {
           $$1347$i = $340;$$1351$i = $339;
          }
         } else {
          $$1347$i = $337;$$1351$i = $336;
         }
         while(1) {
          $342 = ((($$1347$i)) + 20|0);
          $343 = HEAP32[$342>>2]|0;
          $344 = ($343|0)==(0|0);
          if (!($344)) {
           $$1347$i = $343;$$1351$i = $342;
           continue;
          }
          $345 = ((($$1347$i)) + 16|0);
          $346 = HEAP32[$345>>2]|0;
          $347 = ($346|0)==(0|0);
          if ($347) {
           break;
          } else {
           $$1347$i = $346;$$1351$i = $345;
          }
         }
         HEAP32[$$1351$i>>2] = 0;
         $$3349$i = $$1347$i;
        } else {
         $332 = ((($$4$lcssa$i)) + 8|0);
         $333 = HEAP32[$332>>2]|0;
         $334 = ((($333)) + 12|0);
         HEAP32[$334>>2] = $330;
         $335 = ((($330)) + 8|0);
         HEAP32[$335>>2] = $333;
         $$3349$i = $330;
        }
       } while(0);
       $348 = ($328|0)==(0|0);
       do {
        if ($348) {
         $431 = $226;
        } else {
         $349 = ((($$4$lcssa$i)) + 28|0);
         $350 = HEAP32[$349>>2]|0;
         $351 = (4196 + ($350<<2)|0);
         $352 = HEAP32[$351>>2]|0;
         $353 = ($$4$lcssa$i|0)==($352|0);
         if ($353) {
          HEAP32[$351>>2] = $$3349$i;
          $cond$i206 = ($$3349$i|0)==(0|0);
          if ($cond$i206) {
           $354 = 1 << $350;
           $355 = $354 ^ -1;
           $356 = $226 & $355;
           HEAP32[(3896)>>2] = $356;
           $431 = $356;
           break;
          }
         } else {
          $357 = ((($328)) + 16|0);
          $358 = HEAP32[$357>>2]|0;
          $359 = ($358|0)!=($$4$lcssa$i|0);
          $$sink3$i = $359&1;
          $360 = (((($328)) + 16|0) + ($$sink3$i<<2)|0);
          HEAP32[$360>>2] = $$3349$i;
          $361 = ($$3349$i|0)==(0|0);
          if ($361) {
           $431 = $226;
           break;
          }
         }
         $362 = ((($$3349$i)) + 24|0);
         HEAP32[$362>>2] = $328;
         $363 = ((($$4$lcssa$i)) + 16|0);
         $364 = HEAP32[$363>>2]|0;
         $365 = ($364|0)==(0|0);
         if (!($365)) {
          $366 = ((($$3349$i)) + 16|0);
          HEAP32[$366>>2] = $364;
          $367 = ((($364)) + 24|0);
          HEAP32[$367>>2] = $$3349$i;
         }
         $368 = ((($$4$lcssa$i)) + 20|0);
         $369 = HEAP32[$368>>2]|0;
         $370 = ($369|0)==(0|0);
         if ($370) {
          $431 = $226;
         } else {
          $371 = ((($$3349$i)) + 20|0);
          HEAP32[$371>>2] = $369;
          $372 = ((($369)) + 24|0);
          HEAP32[$372>>2] = $$3349$i;
          $431 = $226;
         }
        }
       } while(0);
       $373 = ($$4329$lcssa$i>>>0)<(16);
       do {
        if ($373) {
         $374 = (($$4329$lcssa$i) + ($225))|0;
         $375 = $374 | 3;
         $376 = ((($$4$lcssa$i)) + 4|0);
         HEAP32[$376>>2] = $375;
         $377 = (($$4$lcssa$i) + ($374)|0);
         $378 = ((($377)) + 4|0);
         $379 = HEAP32[$378>>2]|0;
         $380 = $379 | 1;
         HEAP32[$378>>2] = $380;
        } else {
         $381 = $225 | 3;
         $382 = ((($$4$lcssa$i)) + 4|0);
         HEAP32[$382>>2] = $381;
         $383 = $$4329$lcssa$i | 1;
         $384 = ((($325)) + 4|0);
         HEAP32[$384>>2] = $383;
         $385 = (($325) + ($$4329$lcssa$i)|0);
         HEAP32[$385>>2] = $$4329$lcssa$i;
         $386 = $$4329$lcssa$i >>> 3;
         $387 = ($$4329$lcssa$i>>>0)<(256);
         if ($387) {
          $388 = $386 << 1;
          $389 = (3932 + ($388<<2)|0);
          $390 = HEAP32[973]|0;
          $391 = 1 << $386;
          $392 = $390 & $391;
          $393 = ($392|0)==(0);
          if ($393) {
           $394 = $390 | $391;
           HEAP32[973] = $394;
           $$pre$i207 = ((($389)) + 8|0);
           $$0345$i = $389;$$pre$phi$i208Z2D = $$pre$i207;
          } else {
           $395 = ((($389)) + 8|0);
           $396 = HEAP32[$395>>2]|0;
           $$0345$i = $396;$$pre$phi$i208Z2D = $395;
          }
          HEAP32[$$pre$phi$i208Z2D>>2] = $325;
          $397 = ((($$0345$i)) + 12|0);
          HEAP32[$397>>2] = $325;
          $398 = ((($325)) + 8|0);
          HEAP32[$398>>2] = $$0345$i;
          $399 = ((($325)) + 12|0);
          HEAP32[$399>>2] = $389;
          break;
         }
         $400 = $$4329$lcssa$i >>> 8;
         $401 = ($400|0)==(0);
         if ($401) {
          $$0339$i = 0;
         } else {
          $402 = ($$4329$lcssa$i>>>0)>(16777215);
          if ($402) {
           $$0339$i = 31;
          } else {
           $403 = (($400) + 1048320)|0;
           $404 = $403 >>> 16;
           $405 = $404 & 8;
           $406 = $400 << $405;
           $407 = (($406) + 520192)|0;
           $408 = $407 >>> 16;
           $409 = $408 & 4;
           $410 = $409 | $405;
           $411 = $406 << $409;
           $412 = (($411) + 245760)|0;
           $413 = $412 >>> 16;
           $414 = $413 & 2;
           $415 = $410 | $414;
           $416 = (14 - ($415))|0;
           $417 = $411 << $414;
           $418 = $417 >>> 15;
           $419 = (($416) + ($418))|0;
           $420 = $419 << 1;
           $421 = (($419) + 7)|0;
           $422 = $$4329$lcssa$i >>> $421;
           $423 = $422 & 1;
           $424 = $423 | $420;
           $$0339$i = $424;
          }
         }
         $425 = (4196 + ($$0339$i<<2)|0);
         $426 = ((($325)) + 28|0);
         HEAP32[$426>>2] = $$0339$i;
         $427 = ((($325)) + 16|0);
         $428 = ((($427)) + 4|0);
         HEAP32[$428>>2] = 0;
         HEAP32[$427>>2] = 0;
         $429 = 1 << $$0339$i;
         $430 = $431 & $429;
         $432 = ($430|0)==(0);
         if ($432) {
          $433 = $431 | $429;
          HEAP32[(3896)>>2] = $433;
          HEAP32[$425>>2] = $325;
          $434 = ((($325)) + 24|0);
          HEAP32[$434>>2] = $425;
          $435 = ((($325)) + 12|0);
          HEAP32[$435>>2] = $325;
          $436 = ((($325)) + 8|0);
          HEAP32[$436>>2] = $325;
          break;
         }
         $437 = HEAP32[$425>>2]|0;
         $438 = ($$0339$i|0)==(31);
         $439 = $$0339$i >>> 1;
         $440 = (25 - ($439))|0;
         $441 = $438 ? 0 : $440;
         $442 = $$4329$lcssa$i << $441;
         $$0322$i = $442;$$0323$i = $437;
         while(1) {
          $443 = ((($$0323$i)) + 4|0);
          $444 = HEAP32[$443>>2]|0;
          $445 = $444 & -8;
          $446 = ($445|0)==($$4329$lcssa$i|0);
          if ($446) {
           label = 97;
           break;
          }
          $447 = $$0322$i >>> 31;
          $448 = (((($$0323$i)) + 16|0) + ($447<<2)|0);
          $449 = $$0322$i << 1;
          $450 = HEAP32[$448>>2]|0;
          $451 = ($450|0)==(0|0);
          if ($451) {
           label = 96;
           break;
          } else {
           $$0322$i = $449;$$0323$i = $450;
          }
         }
         if ((label|0) == 96) {
          HEAP32[$448>>2] = $325;
          $452 = ((($325)) + 24|0);
          HEAP32[$452>>2] = $$0323$i;
          $453 = ((($325)) + 12|0);
          HEAP32[$453>>2] = $325;
          $454 = ((($325)) + 8|0);
          HEAP32[$454>>2] = $325;
          break;
         }
         else if ((label|0) == 97) {
          $455 = ((($$0323$i)) + 8|0);
          $456 = HEAP32[$455>>2]|0;
          $457 = ((($456)) + 12|0);
          HEAP32[$457>>2] = $325;
          HEAP32[$455>>2] = $325;
          $458 = ((($325)) + 8|0);
          HEAP32[$458>>2] = $456;
          $459 = ((($325)) + 12|0);
          HEAP32[$459>>2] = $$0323$i;
          $460 = ((($325)) + 24|0);
          HEAP32[$460>>2] = 0;
          break;
         }
        }
       } while(0);
       $461 = ((($$4$lcssa$i)) + 8|0);
       $$0 = $461;
       STACKTOP = sp;return ($$0|0);
      } else {
       $$0192 = $225;
      }
     }
    }
   }
  }
 } while(0);
 $462 = HEAP32[(3900)>>2]|0;
 $463 = ($462>>>0)<($$0192>>>0);
 if (!($463)) {
  $464 = (($462) - ($$0192))|0;
  $465 = HEAP32[(3912)>>2]|0;
  $466 = ($464>>>0)>(15);
  if ($466) {
   $467 = (($465) + ($$0192)|0);
   HEAP32[(3912)>>2] = $467;
   HEAP32[(3900)>>2] = $464;
   $468 = $464 | 1;
   $469 = ((($467)) + 4|0);
   HEAP32[$469>>2] = $468;
   $470 = (($465) + ($462)|0);
   HEAP32[$470>>2] = $464;
   $471 = $$0192 | 3;
   $472 = ((($465)) + 4|0);
   HEAP32[$472>>2] = $471;
  } else {
   HEAP32[(3900)>>2] = 0;
   HEAP32[(3912)>>2] = 0;
   $473 = $462 | 3;
   $474 = ((($465)) + 4|0);
   HEAP32[$474>>2] = $473;
   $475 = (($465) + ($462)|0);
   $476 = ((($475)) + 4|0);
   $477 = HEAP32[$476>>2]|0;
   $478 = $477 | 1;
   HEAP32[$476>>2] = $478;
  }
  $479 = ((($465)) + 8|0);
  $$0 = $479;
  STACKTOP = sp;return ($$0|0);
 }
 $480 = HEAP32[(3904)>>2]|0;
 $481 = ($480>>>0)>($$0192>>>0);
 if ($481) {
  $482 = (($480) - ($$0192))|0;
  HEAP32[(3904)>>2] = $482;
  $483 = HEAP32[(3916)>>2]|0;
  $484 = (($483) + ($$0192)|0);
  HEAP32[(3916)>>2] = $484;
  $485 = $482 | 1;
  $486 = ((($484)) + 4|0);
  HEAP32[$486>>2] = $485;
  $487 = $$0192 | 3;
  $488 = ((($483)) + 4|0);
  HEAP32[$488>>2] = $487;
  $489 = ((($483)) + 8|0);
  $$0 = $489;
  STACKTOP = sp;return ($$0|0);
 }
 $490 = HEAP32[1091]|0;
 $491 = ($490|0)==(0);
 if ($491) {
  HEAP32[(4372)>>2] = 4096;
  HEAP32[(4368)>>2] = 4096;
  HEAP32[(4376)>>2] = -1;
  HEAP32[(4380)>>2] = -1;
  HEAP32[(4384)>>2] = 0;
  HEAP32[(4336)>>2] = 0;
  $492 = $1;
  $493 = $492 & -16;
  $494 = $493 ^ 1431655768;
  HEAP32[1091] = $494;
  $498 = 4096;
 } else {
  $$pre$i195 = HEAP32[(4372)>>2]|0;
  $498 = $$pre$i195;
 }
 $495 = (($$0192) + 48)|0;
 $496 = (($$0192) + 47)|0;
 $497 = (($498) + ($496))|0;
 $499 = (0 - ($498))|0;
 $500 = $497 & $499;
 $501 = ($500>>>0)>($$0192>>>0);
 if (!($501)) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 $502 = HEAP32[(4332)>>2]|0;
 $503 = ($502|0)==(0);
 if (!($503)) {
  $504 = HEAP32[(4324)>>2]|0;
  $505 = (($504) + ($500))|0;
  $506 = ($505>>>0)<=($504>>>0);
  $507 = ($505>>>0)>($502>>>0);
  $or$cond1$i = $506 | $507;
  if ($or$cond1$i) {
   $$0 = 0;
   STACKTOP = sp;return ($$0|0);
  }
 }
 $508 = HEAP32[(4336)>>2]|0;
 $509 = $508 & 4;
 $510 = ($509|0)==(0);
 L167: do {
  if ($510) {
   $511 = HEAP32[(3916)>>2]|0;
   $512 = ($511|0)==(0|0);
   L169: do {
    if ($512) {
     label = 118;
    } else {
     $$0$i20$i = (4340);
     while(1) {
      $513 = HEAP32[$$0$i20$i>>2]|0;
      $514 = ($513>>>0)>($511>>>0);
      if (!($514)) {
       $515 = ((($$0$i20$i)) + 4|0);
       $516 = HEAP32[$515>>2]|0;
       $517 = (($513) + ($516)|0);
       $518 = ($517>>>0)>($511>>>0);
       if ($518) {
        break;
       }
      }
      $519 = ((($$0$i20$i)) + 8|0);
      $520 = HEAP32[$519>>2]|0;
      $521 = ($520|0)==(0|0);
      if ($521) {
       label = 118;
       break L169;
      } else {
       $$0$i20$i = $520;
      }
     }
     $544 = (($497) - ($480))|0;
     $545 = $544 & $499;
     $546 = ($545>>>0)<(2147483647);
     if ($546) {
      $547 = (_sbrk(($545|0))|0);
      $548 = HEAP32[$$0$i20$i>>2]|0;
      $549 = HEAP32[$515>>2]|0;
      $550 = (($548) + ($549)|0);
      $551 = ($547|0)==($550|0);
      if ($551) {
       $552 = ($547|0)==((-1)|0);
       if ($552) {
        $$2234243136$i = $545;
       } else {
        $$723947$i = $545;$$748$i = $547;
        label = 135;
        break L167;
       }
      } else {
       $$2247$ph$i = $547;$$2253$ph$i = $545;
       label = 126;
      }
     } else {
      $$2234243136$i = 0;
     }
    }
   } while(0);
   do {
    if ((label|0) == 118) {
     $522 = (_sbrk(0)|0);
     $523 = ($522|0)==((-1)|0);
     if ($523) {
      $$2234243136$i = 0;
     } else {
      $524 = $522;
      $525 = HEAP32[(4368)>>2]|0;
      $526 = (($525) + -1)|0;
      $527 = $526 & $524;
      $528 = ($527|0)==(0);
      $529 = (($526) + ($524))|0;
      $530 = (0 - ($525))|0;
      $531 = $529 & $530;
      $532 = (($531) - ($524))|0;
      $533 = $528 ? 0 : $532;
      $$$i = (($533) + ($500))|0;
      $534 = HEAP32[(4324)>>2]|0;
      $535 = (($$$i) + ($534))|0;
      $536 = ($$$i>>>0)>($$0192>>>0);
      $537 = ($$$i>>>0)<(2147483647);
      $or$cond$i = $536 & $537;
      if ($or$cond$i) {
       $538 = HEAP32[(4332)>>2]|0;
       $539 = ($538|0)==(0);
       if (!($539)) {
        $540 = ($535>>>0)<=($534>>>0);
        $541 = ($535>>>0)>($538>>>0);
        $or$cond2$i = $540 | $541;
        if ($or$cond2$i) {
         $$2234243136$i = 0;
         break;
        }
       }
       $542 = (_sbrk(($$$i|0))|0);
       $543 = ($542|0)==($522|0);
       if ($543) {
        $$723947$i = $$$i;$$748$i = $522;
        label = 135;
        break L167;
       } else {
        $$2247$ph$i = $542;$$2253$ph$i = $$$i;
        label = 126;
       }
      } else {
       $$2234243136$i = 0;
      }
     }
    }
   } while(0);
   do {
    if ((label|0) == 126) {
     $553 = (0 - ($$2253$ph$i))|0;
     $554 = ($$2247$ph$i|0)!=((-1)|0);
     $555 = ($$2253$ph$i>>>0)<(2147483647);
     $or$cond7$i = $555 & $554;
     $556 = ($495>>>0)>($$2253$ph$i>>>0);
     $or$cond10$i = $556 & $or$cond7$i;
     if (!($or$cond10$i)) {
      $566 = ($$2247$ph$i|0)==((-1)|0);
      if ($566) {
       $$2234243136$i = 0;
       break;
      } else {
       $$723947$i = $$2253$ph$i;$$748$i = $$2247$ph$i;
       label = 135;
       break L167;
      }
     }
     $557 = HEAP32[(4372)>>2]|0;
     $558 = (($496) - ($$2253$ph$i))|0;
     $559 = (($558) + ($557))|0;
     $560 = (0 - ($557))|0;
     $561 = $559 & $560;
     $562 = ($561>>>0)<(2147483647);
     if (!($562)) {
      $$723947$i = $$2253$ph$i;$$748$i = $$2247$ph$i;
      label = 135;
      break L167;
     }
     $563 = (_sbrk(($561|0))|0);
     $564 = ($563|0)==((-1)|0);
     if ($564) {
      (_sbrk(($553|0))|0);
      $$2234243136$i = 0;
      break;
     } else {
      $565 = (($561) + ($$2253$ph$i))|0;
      $$723947$i = $565;$$748$i = $$2247$ph$i;
      label = 135;
      break L167;
     }
    }
   } while(0);
   $567 = HEAP32[(4336)>>2]|0;
   $568 = $567 | 4;
   HEAP32[(4336)>>2] = $568;
   $$4236$i = $$2234243136$i;
   label = 133;
  } else {
   $$4236$i = 0;
   label = 133;
  }
 } while(0);
 if ((label|0) == 133) {
  $569 = ($500>>>0)<(2147483647);
  if ($569) {
   $570 = (_sbrk(($500|0))|0);
   $571 = (_sbrk(0)|0);
   $572 = ($570|0)!=((-1)|0);
   $573 = ($571|0)!=((-1)|0);
   $or$cond5$i = $572 & $573;
   $574 = ($570>>>0)<($571>>>0);
   $or$cond11$i = $574 & $or$cond5$i;
   $575 = $571;
   $576 = $570;
   $577 = (($575) - ($576))|0;
   $578 = (($$0192) + 40)|0;
   $579 = ($577>>>0)>($578>>>0);
   $$$4236$i = $579 ? $577 : $$4236$i;
   $or$cond11$not$i = $or$cond11$i ^ 1;
   $580 = ($570|0)==((-1)|0);
   $not$$i = $579 ^ 1;
   $581 = $580 | $not$$i;
   $or$cond49$i = $581 | $or$cond11$not$i;
   if (!($or$cond49$i)) {
    $$723947$i = $$$4236$i;$$748$i = $570;
    label = 135;
   }
  }
 }
 if ((label|0) == 135) {
  $582 = HEAP32[(4324)>>2]|0;
  $583 = (($582) + ($$723947$i))|0;
  HEAP32[(4324)>>2] = $583;
  $584 = HEAP32[(4328)>>2]|0;
  $585 = ($583>>>0)>($584>>>0);
  if ($585) {
   HEAP32[(4328)>>2] = $583;
  }
  $586 = HEAP32[(3916)>>2]|0;
  $587 = ($586|0)==(0|0);
  do {
   if ($587) {
    $588 = HEAP32[(3908)>>2]|0;
    $589 = ($588|0)==(0|0);
    $590 = ($$748$i>>>0)<($588>>>0);
    $or$cond12$i = $589 | $590;
    if ($or$cond12$i) {
     HEAP32[(3908)>>2] = $$748$i;
    }
    HEAP32[(4340)>>2] = $$748$i;
    HEAP32[(4344)>>2] = $$723947$i;
    HEAP32[(4352)>>2] = 0;
    $591 = HEAP32[1091]|0;
    HEAP32[(3928)>>2] = $591;
    HEAP32[(3924)>>2] = -1;
    HEAP32[(3944)>>2] = (3932);
    HEAP32[(3940)>>2] = (3932);
    HEAP32[(3952)>>2] = (3940);
    HEAP32[(3948)>>2] = (3940);
    HEAP32[(3960)>>2] = (3948);
    HEAP32[(3956)>>2] = (3948);
    HEAP32[(3968)>>2] = (3956);
    HEAP32[(3964)>>2] = (3956);
    HEAP32[(3976)>>2] = (3964);
    HEAP32[(3972)>>2] = (3964);
    HEAP32[(3984)>>2] = (3972);
    HEAP32[(3980)>>2] = (3972);
    HEAP32[(3992)>>2] = (3980);
    HEAP32[(3988)>>2] = (3980);
    HEAP32[(4000)>>2] = (3988);
    HEAP32[(3996)>>2] = (3988);
    HEAP32[(4008)>>2] = (3996);
    HEAP32[(4004)>>2] = (3996);
    HEAP32[(4016)>>2] = (4004);
    HEAP32[(4012)>>2] = (4004);
    HEAP32[(4024)>>2] = (4012);
    HEAP32[(4020)>>2] = (4012);
    HEAP32[(4032)>>2] = (4020);
    HEAP32[(4028)>>2] = (4020);
    HEAP32[(4040)>>2] = (4028);
    HEAP32[(4036)>>2] = (4028);
    HEAP32[(4048)>>2] = (4036);
    HEAP32[(4044)>>2] = (4036);
    HEAP32[(4056)>>2] = (4044);
    HEAP32[(4052)>>2] = (4044);
    HEAP32[(4064)>>2] = (4052);
    HEAP32[(4060)>>2] = (4052);
    HEAP32[(4072)>>2] = (4060);
    HEAP32[(4068)>>2] = (4060);
    HEAP32[(4080)>>2] = (4068);
    HEAP32[(4076)>>2] = (4068);
    HEAP32[(4088)>>2] = (4076);
    HEAP32[(4084)>>2] = (4076);
    HEAP32[(4096)>>2] = (4084);
    HEAP32[(4092)>>2] = (4084);
    HEAP32[(4104)>>2] = (4092);
    HEAP32[(4100)>>2] = (4092);
    HEAP32[(4112)>>2] = (4100);
    HEAP32[(4108)>>2] = (4100);
    HEAP32[(4120)>>2] = (4108);
    HEAP32[(4116)>>2] = (4108);
    HEAP32[(4128)>>2] = (4116);
    HEAP32[(4124)>>2] = (4116);
    HEAP32[(4136)>>2] = (4124);
    HEAP32[(4132)>>2] = (4124);
    HEAP32[(4144)>>2] = (4132);
    HEAP32[(4140)>>2] = (4132);
    HEAP32[(4152)>>2] = (4140);
    HEAP32[(4148)>>2] = (4140);
    HEAP32[(4160)>>2] = (4148);
    HEAP32[(4156)>>2] = (4148);
    HEAP32[(4168)>>2] = (4156);
    HEAP32[(4164)>>2] = (4156);
    HEAP32[(4176)>>2] = (4164);
    HEAP32[(4172)>>2] = (4164);
    HEAP32[(4184)>>2] = (4172);
    HEAP32[(4180)>>2] = (4172);
    HEAP32[(4192)>>2] = (4180);
    HEAP32[(4188)>>2] = (4180);
    $592 = (($$723947$i) + -40)|0;
    $593 = ((($$748$i)) + 8|0);
    $594 = $593;
    $595 = $594 & 7;
    $596 = ($595|0)==(0);
    $597 = (0 - ($594))|0;
    $598 = $597 & 7;
    $599 = $596 ? 0 : $598;
    $600 = (($$748$i) + ($599)|0);
    $601 = (($592) - ($599))|0;
    HEAP32[(3916)>>2] = $600;
    HEAP32[(3904)>>2] = $601;
    $602 = $601 | 1;
    $603 = ((($600)) + 4|0);
    HEAP32[$603>>2] = $602;
    $604 = (($$748$i) + ($592)|0);
    $605 = ((($604)) + 4|0);
    HEAP32[$605>>2] = 40;
    $606 = HEAP32[(4380)>>2]|0;
    HEAP32[(3920)>>2] = $606;
   } else {
    $$024367$i = (4340);
    while(1) {
     $607 = HEAP32[$$024367$i>>2]|0;
     $608 = ((($$024367$i)) + 4|0);
     $609 = HEAP32[$608>>2]|0;
     $610 = (($607) + ($609)|0);
     $611 = ($$748$i|0)==($610|0);
     if ($611) {
      label = 143;
      break;
     }
     $612 = ((($$024367$i)) + 8|0);
     $613 = HEAP32[$612>>2]|0;
     $614 = ($613|0)==(0|0);
     if ($614) {
      break;
     } else {
      $$024367$i = $613;
     }
    }
    if ((label|0) == 143) {
     $615 = ((($$024367$i)) + 12|0);
     $616 = HEAP32[$615>>2]|0;
     $617 = $616 & 8;
     $618 = ($617|0)==(0);
     if ($618) {
      $619 = ($607>>>0)<=($586>>>0);
      $620 = ($$748$i>>>0)>($586>>>0);
      $or$cond50$i = $620 & $619;
      if ($or$cond50$i) {
       $621 = (($609) + ($$723947$i))|0;
       HEAP32[$608>>2] = $621;
       $622 = HEAP32[(3904)>>2]|0;
       $623 = (($622) + ($$723947$i))|0;
       $624 = ((($586)) + 8|0);
       $625 = $624;
       $626 = $625 & 7;
       $627 = ($626|0)==(0);
       $628 = (0 - ($625))|0;
       $629 = $628 & 7;
       $630 = $627 ? 0 : $629;
       $631 = (($586) + ($630)|0);
       $632 = (($623) - ($630))|0;
       HEAP32[(3916)>>2] = $631;
       HEAP32[(3904)>>2] = $632;
       $633 = $632 | 1;
       $634 = ((($631)) + 4|0);
       HEAP32[$634>>2] = $633;
       $635 = (($586) + ($623)|0);
       $636 = ((($635)) + 4|0);
       HEAP32[$636>>2] = 40;
       $637 = HEAP32[(4380)>>2]|0;
       HEAP32[(3920)>>2] = $637;
       break;
      }
     }
    }
    $638 = HEAP32[(3908)>>2]|0;
    $639 = ($$748$i>>>0)<($638>>>0);
    if ($639) {
     HEAP32[(3908)>>2] = $$748$i;
    }
    $640 = (($$748$i) + ($$723947$i)|0);
    $$124466$i = (4340);
    while(1) {
     $641 = HEAP32[$$124466$i>>2]|0;
     $642 = ($641|0)==($640|0);
     if ($642) {
      label = 151;
      break;
     }
     $643 = ((($$124466$i)) + 8|0);
     $644 = HEAP32[$643>>2]|0;
     $645 = ($644|0)==(0|0);
     if ($645) {
      $$0$i$i$i = (4340);
      break;
     } else {
      $$124466$i = $644;
     }
    }
    if ((label|0) == 151) {
     $646 = ((($$124466$i)) + 12|0);
     $647 = HEAP32[$646>>2]|0;
     $648 = $647 & 8;
     $649 = ($648|0)==(0);
     if ($649) {
      HEAP32[$$124466$i>>2] = $$748$i;
      $650 = ((($$124466$i)) + 4|0);
      $651 = HEAP32[$650>>2]|0;
      $652 = (($651) + ($$723947$i))|0;
      HEAP32[$650>>2] = $652;
      $653 = ((($$748$i)) + 8|0);
      $654 = $653;
      $655 = $654 & 7;
      $656 = ($655|0)==(0);
      $657 = (0 - ($654))|0;
      $658 = $657 & 7;
      $659 = $656 ? 0 : $658;
      $660 = (($$748$i) + ($659)|0);
      $661 = ((($640)) + 8|0);
      $662 = $661;
      $663 = $662 & 7;
      $664 = ($663|0)==(0);
      $665 = (0 - ($662))|0;
      $666 = $665 & 7;
      $667 = $664 ? 0 : $666;
      $668 = (($640) + ($667)|0);
      $669 = $668;
      $670 = $660;
      $671 = (($669) - ($670))|0;
      $672 = (($660) + ($$0192)|0);
      $673 = (($671) - ($$0192))|0;
      $674 = $$0192 | 3;
      $675 = ((($660)) + 4|0);
      HEAP32[$675>>2] = $674;
      $676 = ($586|0)==($668|0);
      do {
       if ($676) {
        $677 = HEAP32[(3904)>>2]|0;
        $678 = (($677) + ($673))|0;
        HEAP32[(3904)>>2] = $678;
        HEAP32[(3916)>>2] = $672;
        $679 = $678 | 1;
        $680 = ((($672)) + 4|0);
        HEAP32[$680>>2] = $679;
       } else {
        $681 = HEAP32[(3912)>>2]|0;
        $682 = ($681|0)==($668|0);
        if ($682) {
         $683 = HEAP32[(3900)>>2]|0;
         $684 = (($683) + ($673))|0;
         HEAP32[(3900)>>2] = $684;
         HEAP32[(3912)>>2] = $672;
         $685 = $684 | 1;
         $686 = ((($672)) + 4|0);
         HEAP32[$686>>2] = $685;
         $687 = (($672) + ($684)|0);
         HEAP32[$687>>2] = $684;
         break;
        }
        $688 = ((($668)) + 4|0);
        $689 = HEAP32[$688>>2]|0;
        $690 = $689 & 3;
        $691 = ($690|0)==(1);
        if ($691) {
         $692 = $689 & -8;
         $693 = $689 >>> 3;
         $694 = ($689>>>0)<(256);
         L234: do {
          if ($694) {
           $695 = ((($668)) + 8|0);
           $696 = HEAP32[$695>>2]|0;
           $697 = ((($668)) + 12|0);
           $698 = HEAP32[$697>>2]|0;
           $699 = ($698|0)==($696|0);
           if ($699) {
            $700 = 1 << $693;
            $701 = $700 ^ -1;
            $702 = HEAP32[973]|0;
            $703 = $702 & $701;
            HEAP32[973] = $703;
            break;
           } else {
            $704 = ((($696)) + 12|0);
            HEAP32[$704>>2] = $698;
            $705 = ((($698)) + 8|0);
            HEAP32[$705>>2] = $696;
            break;
           }
          } else {
           $706 = ((($668)) + 24|0);
           $707 = HEAP32[$706>>2]|0;
           $708 = ((($668)) + 12|0);
           $709 = HEAP32[$708>>2]|0;
           $710 = ($709|0)==($668|0);
           do {
            if ($710) {
             $715 = ((($668)) + 16|0);
             $716 = ((($715)) + 4|0);
             $717 = HEAP32[$716>>2]|0;
             $718 = ($717|0)==(0|0);
             if ($718) {
              $719 = HEAP32[$715>>2]|0;
              $720 = ($719|0)==(0|0);
              if ($720) {
               $$3$i$i = 0;
               break;
              } else {
               $$1264$i$i = $719;$$1266$i$i = $715;
              }
             } else {
              $$1264$i$i = $717;$$1266$i$i = $716;
             }
             while(1) {
              $721 = ((($$1264$i$i)) + 20|0);
              $722 = HEAP32[$721>>2]|0;
              $723 = ($722|0)==(0|0);
              if (!($723)) {
               $$1264$i$i = $722;$$1266$i$i = $721;
               continue;
              }
              $724 = ((($$1264$i$i)) + 16|0);
              $725 = HEAP32[$724>>2]|0;
              $726 = ($725|0)==(0|0);
              if ($726) {
               break;
              } else {
               $$1264$i$i = $725;$$1266$i$i = $724;
              }
             }
             HEAP32[$$1266$i$i>>2] = 0;
             $$3$i$i = $$1264$i$i;
            } else {
             $711 = ((($668)) + 8|0);
             $712 = HEAP32[$711>>2]|0;
             $713 = ((($712)) + 12|0);
             HEAP32[$713>>2] = $709;
             $714 = ((($709)) + 8|0);
             HEAP32[$714>>2] = $712;
             $$3$i$i = $709;
            }
           } while(0);
           $727 = ($707|0)==(0|0);
           if ($727) {
            break;
           }
           $728 = ((($668)) + 28|0);
           $729 = HEAP32[$728>>2]|0;
           $730 = (4196 + ($729<<2)|0);
           $731 = HEAP32[$730>>2]|0;
           $732 = ($731|0)==($668|0);
           do {
            if ($732) {
             HEAP32[$730>>2] = $$3$i$i;
             $cond$i$i = ($$3$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $733 = 1 << $729;
             $734 = $733 ^ -1;
             $735 = HEAP32[(3896)>>2]|0;
             $736 = $735 & $734;
             HEAP32[(3896)>>2] = $736;
             break L234;
            } else {
             $737 = ((($707)) + 16|0);
             $738 = HEAP32[$737>>2]|0;
             $739 = ($738|0)!=($668|0);
             $$sink1$i$i = $739&1;
             $740 = (((($707)) + 16|0) + ($$sink1$i$i<<2)|0);
             HEAP32[$740>>2] = $$3$i$i;
             $741 = ($$3$i$i|0)==(0|0);
             if ($741) {
              break L234;
             }
            }
           } while(0);
           $742 = ((($$3$i$i)) + 24|0);
           HEAP32[$742>>2] = $707;
           $743 = ((($668)) + 16|0);
           $744 = HEAP32[$743>>2]|0;
           $745 = ($744|0)==(0|0);
           if (!($745)) {
            $746 = ((($$3$i$i)) + 16|0);
            HEAP32[$746>>2] = $744;
            $747 = ((($744)) + 24|0);
            HEAP32[$747>>2] = $$3$i$i;
           }
           $748 = ((($743)) + 4|0);
           $749 = HEAP32[$748>>2]|0;
           $750 = ($749|0)==(0|0);
           if ($750) {
            break;
           }
           $751 = ((($$3$i$i)) + 20|0);
           HEAP32[$751>>2] = $749;
           $752 = ((($749)) + 24|0);
           HEAP32[$752>>2] = $$3$i$i;
          }
         } while(0);
         $753 = (($668) + ($692)|0);
         $754 = (($692) + ($673))|0;
         $$0$i$i = $753;$$0260$i$i = $754;
        } else {
         $$0$i$i = $668;$$0260$i$i = $673;
        }
        $755 = ((($$0$i$i)) + 4|0);
        $756 = HEAP32[$755>>2]|0;
        $757 = $756 & -2;
        HEAP32[$755>>2] = $757;
        $758 = $$0260$i$i | 1;
        $759 = ((($672)) + 4|0);
        HEAP32[$759>>2] = $758;
        $760 = (($672) + ($$0260$i$i)|0);
        HEAP32[$760>>2] = $$0260$i$i;
        $761 = $$0260$i$i >>> 3;
        $762 = ($$0260$i$i>>>0)<(256);
        if ($762) {
         $763 = $761 << 1;
         $764 = (3932 + ($763<<2)|0);
         $765 = HEAP32[973]|0;
         $766 = 1 << $761;
         $767 = $765 & $766;
         $768 = ($767|0)==(0);
         if ($768) {
          $769 = $765 | $766;
          HEAP32[973] = $769;
          $$pre$i17$i = ((($764)) + 8|0);
          $$0268$i$i = $764;$$pre$phi$i18$iZ2D = $$pre$i17$i;
         } else {
          $770 = ((($764)) + 8|0);
          $771 = HEAP32[$770>>2]|0;
          $$0268$i$i = $771;$$pre$phi$i18$iZ2D = $770;
         }
         HEAP32[$$pre$phi$i18$iZ2D>>2] = $672;
         $772 = ((($$0268$i$i)) + 12|0);
         HEAP32[$772>>2] = $672;
         $773 = ((($672)) + 8|0);
         HEAP32[$773>>2] = $$0268$i$i;
         $774 = ((($672)) + 12|0);
         HEAP32[$774>>2] = $764;
         break;
        }
        $775 = $$0260$i$i >>> 8;
        $776 = ($775|0)==(0);
        do {
         if ($776) {
          $$0269$i$i = 0;
         } else {
          $777 = ($$0260$i$i>>>0)>(16777215);
          if ($777) {
           $$0269$i$i = 31;
           break;
          }
          $778 = (($775) + 1048320)|0;
          $779 = $778 >>> 16;
          $780 = $779 & 8;
          $781 = $775 << $780;
          $782 = (($781) + 520192)|0;
          $783 = $782 >>> 16;
          $784 = $783 & 4;
          $785 = $784 | $780;
          $786 = $781 << $784;
          $787 = (($786) + 245760)|0;
          $788 = $787 >>> 16;
          $789 = $788 & 2;
          $790 = $785 | $789;
          $791 = (14 - ($790))|0;
          $792 = $786 << $789;
          $793 = $792 >>> 15;
          $794 = (($791) + ($793))|0;
          $795 = $794 << 1;
          $796 = (($794) + 7)|0;
          $797 = $$0260$i$i >>> $796;
          $798 = $797 & 1;
          $799 = $798 | $795;
          $$0269$i$i = $799;
         }
        } while(0);
        $800 = (4196 + ($$0269$i$i<<2)|0);
        $801 = ((($672)) + 28|0);
        HEAP32[$801>>2] = $$0269$i$i;
        $802 = ((($672)) + 16|0);
        $803 = ((($802)) + 4|0);
        HEAP32[$803>>2] = 0;
        HEAP32[$802>>2] = 0;
        $804 = HEAP32[(3896)>>2]|0;
        $805 = 1 << $$0269$i$i;
        $806 = $804 & $805;
        $807 = ($806|0)==(0);
        if ($807) {
         $808 = $804 | $805;
         HEAP32[(3896)>>2] = $808;
         HEAP32[$800>>2] = $672;
         $809 = ((($672)) + 24|0);
         HEAP32[$809>>2] = $800;
         $810 = ((($672)) + 12|0);
         HEAP32[$810>>2] = $672;
         $811 = ((($672)) + 8|0);
         HEAP32[$811>>2] = $672;
         break;
        }
        $812 = HEAP32[$800>>2]|0;
        $813 = ($$0269$i$i|0)==(31);
        $814 = $$0269$i$i >>> 1;
        $815 = (25 - ($814))|0;
        $816 = $813 ? 0 : $815;
        $817 = $$0260$i$i << $816;
        $$0261$i$i = $817;$$0262$i$i = $812;
        while(1) {
         $818 = ((($$0262$i$i)) + 4|0);
         $819 = HEAP32[$818>>2]|0;
         $820 = $819 & -8;
         $821 = ($820|0)==($$0260$i$i|0);
         if ($821) {
          label = 192;
          break;
         }
         $822 = $$0261$i$i >>> 31;
         $823 = (((($$0262$i$i)) + 16|0) + ($822<<2)|0);
         $824 = $$0261$i$i << 1;
         $825 = HEAP32[$823>>2]|0;
         $826 = ($825|0)==(0|0);
         if ($826) {
          label = 191;
          break;
         } else {
          $$0261$i$i = $824;$$0262$i$i = $825;
         }
        }
        if ((label|0) == 191) {
         HEAP32[$823>>2] = $672;
         $827 = ((($672)) + 24|0);
         HEAP32[$827>>2] = $$0262$i$i;
         $828 = ((($672)) + 12|0);
         HEAP32[$828>>2] = $672;
         $829 = ((($672)) + 8|0);
         HEAP32[$829>>2] = $672;
         break;
        }
        else if ((label|0) == 192) {
         $830 = ((($$0262$i$i)) + 8|0);
         $831 = HEAP32[$830>>2]|0;
         $832 = ((($831)) + 12|0);
         HEAP32[$832>>2] = $672;
         HEAP32[$830>>2] = $672;
         $833 = ((($672)) + 8|0);
         HEAP32[$833>>2] = $831;
         $834 = ((($672)) + 12|0);
         HEAP32[$834>>2] = $$0262$i$i;
         $835 = ((($672)) + 24|0);
         HEAP32[$835>>2] = 0;
         break;
        }
       }
      } while(0);
      $960 = ((($660)) + 8|0);
      $$0 = $960;
      STACKTOP = sp;return ($$0|0);
     } else {
      $$0$i$i$i = (4340);
     }
    }
    while(1) {
     $836 = HEAP32[$$0$i$i$i>>2]|0;
     $837 = ($836>>>0)>($586>>>0);
     if (!($837)) {
      $838 = ((($$0$i$i$i)) + 4|0);
      $839 = HEAP32[$838>>2]|0;
      $840 = (($836) + ($839)|0);
      $841 = ($840>>>0)>($586>>>0);
      if ($841) {
       break;
      }
     }
     $842 = ((($$0$i$i$i)) + 8|0);
     $843 = HEAP32[$842>>2]|0;
     $$0$i$i$i = $843;
    }
    $844 = ((($840)) + -47|0);
    $845 = ((($844)) + 8|0);
    $846 = $845;
    $847 = $846 & 7;
    $848 = ($847|0)==(0);
    $849 = (0 - ($846))|0;
    $850 = $849 & 7;
    $851 = $848 ? 0 : $850;
    $852 = (($844) + ($851)|0);
    $853 = ((($586)) + 16|0);
    $854 = ($852>>>0)<($853>>>0);
    $855 = $854 ? $586 : $852;
    $856 = ((($855)) + 8|0);
    $857 = ((($855)) + 24|0);
    $858 = (($$723947$i) + -40)|0;
    $859 = ((($$748$i)) + 8|0);
    $860 = $859;
    $861 = $860 & 7;
    $862 = ($861|0)==(0);
    $863 = (0 - ($860))|0;
    $864 = $863 & 7;
    $865 = $862 ? 0 : $864;
    $866 = (($$748$i) + ($865)|0);
    $867 = (($858) - ($865))|0;
    HEAP32[(3916)>>2] = $866;
    HEAP32[(3904)>>2] = $867;
    $868 = $867 | 1;
    $869 = ((($866)) + 4|0);
    HEAP32[$869>>2] = $868;
    $870 = (($$748$i) + ($858)|0);
    $871 = ((($870)) + 4|0);
    HEAP32[$871>>2] = 40;
    $872 = HEAP32[(4380)>>2]|0;
    HEAP32[(3920)>>2] = $872;
    $873 = ((($855)) + 4|0);
    HEAP32[$873>>2] = 27;
    ;HEAP32[$856>>2]=HEAP32[(4340)>>2]|0;HEAP32[$856+4>>2]=HEAP32[(4340)+4>>2]|0;HEAP32[$856+8>>2]=HEAP32[(4340)+8>>2]|0;HEAP32[$856+12>>2]=HEAP32[(4340)+12>>2]|0;
    HEAP32[(4340)>>2] = $$748$i;
    HEAP32[(4344)>>2] = $$723947$i;
    HEAP32[(4352)>>2] = 0;
    HEAP32[(4348)>>2] = $856;
    $875 = $857;
    while(1) {
     $874 = ((($875)) + 4|0);
     HEAP32[$874>>2] = 7;
     $876 = ((($875)) + 8|0);
     $877 = ($876>>>0)<($840>>>0);
     if ($877) {
      $875 = $874;
     } else {
      break;
     }
    }
    $878 = ($855|0)==($586|0);
    if (!($878)) {
     $879 = $855;
     $880 = $586;
     $881 = (($879) - ($880))|0;
     $882 = HEAP32[$873>>2]|0;
     $883 = $882 & -2;
     HEAP32[$873>>2] = $883;
     $884 = $881 | 1;
     $885 = ((($586)) + 4|0);
     HEAP32[$885>>2] = $884;
     HEAP32[$855>>2] = $881;
     $886 = $881 >>> 3;
     $887 = ($881>>>0)<(256);
     if ($887) {
      $888 = $886 << 1;
      $889 = (3932 + ($888<<2)|0);
      $890 = HEAP32[973]|0;
      $891 = 1 << $886;
      $892 = $890 & $891;
      $893 = ($892|0)==(0);
      if ($893) {
       $894 = $890 | $891;
       HEAP32[973] = $894;
       $$pre$i$i = ((($889)) + 8|0);
       $$0206$i$i = $889;$$pre$phi$i$iZ2D = $$pre$i$i;
      } else {
       $895 = ((($889)) + 8|0);
       $896 = HEAP32[$895>>2]|0;
       $$0206$i$i = $896;$$pre$phi$i$iZ2D = $895;
      }
      HEAP32[$$pre$phi$i$iZ2D>>2] = $586;
      $897 = ((($$0206$i$i)) + 12|0);
      HEAP32[$897>>2] = $586;
      $898 = ((($586)) + 8|0);
      HEAP32[$898>>2] = $$0206$i$i;
      $899 = ((($586)) + 12|0);
      HEAP32[$899>>2] = $889;
      break;
     }
     $900 = $881 >>> 8;
     $901 = ($900|0)==(0);
     if ($901) {
      $$0207$i$i = 0;
     } else {
      $902 = ($881>>>0)>(16777215);
      if ($902) {
       $$0207$i$i = 31;
      } else {
       $903 = (($900) + 1048320)|0;
       $904 = $903 >>> 16;
       $905 = $904 & 8;
       $906 = $900 << $905;
       $907 = (($906) + 520192)|0;
       $908 = $907 >>> 16;
       $909 = $908 & 4;
       $910 = $909 | $905;
       $911 = $906 << $909;
       $912 = (($911) + 245760)|0;
       $913 = $912 >>> 16;
       $914 = $913 & 2;
       $915 = $910 | $914;
       $916 = (14 - ($915))|0;
       $917 = $911 << $914;
       $918 = $917 >>> 15;
       $919 = (($916) + ($918))|0;
       $920 = $919 << 1;
       $921 = (($919) + 7)|0;
       $922 = $881 >>> $921;
       $923 = $922 & 1;
       $924 = $923 | $920;
       $$0207$i$i = $924;
      }
     }
     $925 = (4196 + ($$0207$i$i<<2)|0);
     $926 = ((($586)) + 28|0);
     HEAP32[$926>>2] = $$0207$i$i;
     $927 = ((($586)) + 20|0);
     HEAP32[$927>>2] = 0;
     HEAP32[$853>>2] = 0;
     $928 = HEAP32[(3896)>>2]|0;
     $929 = 1 << $$0207$i$i;
     $930 = $928 & $929;
     $931 = ($930|0)==(0);
     if ($931) {
      $932 = $928 | $929;
      HEAP32[(3896)>>2] = $932;
      HEAP32[$925>>2] = $586;
      $933 = ((($586)) + 24|0);
      HEAP32[$933>>2] = $925;
      $934 = ((($586)) + 12|0);
      HEAP32[$934>>2] = $586;
      $935 = ((($586)) + 8|0);
      HEAP32[$935>>2] = $586;
      break;
     }
     $936 = HEAP32[$925>>2]|0;
     $937 = ($$0207$i$i|0)==(31);
     $938 = $$0207$i$i >>> 1;
     $939 = (25 - ($938))|0;
     $940 = $937 ? 0 : $939;
     $941 = $881 << $940;
     $$0201$i$i = $941;$$0202$i$i = $936;
     while(1) {
      $942 = ((($$0202$i$i)) + 4|0);
      $943 = HEAP32[$942>>2]|0;
      $944 = $943 & -8;
      $945 = ($944|0)==($881|0);
      if ($945) {
       label = 213;
       break;
      }
      $946 = $$0201$i$i >>> 31;
      $947 = (((($$0202$i$i)) + 16|0) + ($946<<2)|0);
      $948 = $$0201$i$i << 1;
      $949 = HEAP32[$947>>2]|0;
      $950 = ($949|0)==(0|0);
      if ($950) {
       label = 212;
       break;
      } else {
       $$0201$i$i = $948;$$0202$i$i = $949;
      }
     }
     if ((label|0) == 212) {
      HEAP32[$947>>2] = $586;
      $951 = ((($586)) + 24|0);
      HEAP32[$951>>2] = $$0202$i$i;
      $952 = ((($586)) + 12|0);
      HEAP32[$952>>2] = $586;
      $953 = ((($586)) + 8|0);
      HEAP32[$953>>2] = $586;
      break;
     }
     else if ((label|0) == 213) {
      $954 = ((($$0202$i$i)) + 8|0);
      $955 = HEAP32[$954>>2]|0;
      $956 = ((($955)) + 12|0);
      HEAP32[$956>>2] = $586;
      HEAP32[$954>>2] = $586;
      $957 = ((($586)) + 8|0);
      HEAP32[$957>>2] = $955;
      $958 = ((($586)) + 12|0);
      HEAP32[$958>>2] = $$0202$i$i;
      $959 = ((($586)) + 24|0);
      HEAP32[$959>>2] = 0;
      break;
     }
    }
   }
  } while(0);
  $961 = HEAP32[(3904)>>2]|0;
  $962 = ($961>>>0)>($$0192>>>0);
  if ($962) {
   $963 = (($961) - ($$0192))|0;
   HEAP32[(3904)>>2] = $963;
   $964 = HEAP32[(3916)>>2]|0;
   $965 = (($964) + ($$0192)|0);
   HEAP32[(3916)>>2] = $965;
   $966 = $963 | 1;
   $967 = ((($965)) + 4|0);
   HEAP32[$967>>2] = $966;
   $968 = $$0192 | 3;
   $969 = ((($964)) + 4|0);
   HEAP32[$969>>2] = $968;
   $970 = ((($964)) + 8|0);
   $$0 = $970;
   STACKTOP = sp;return ($$0|0);
  }
 }
 $971 = (___errno_location()|0);
 HEAP32[$971>>2] = 12;
 $$0 = 0;
 STACKTOP = sp;return ($$0|0);
}
function _free($0) {
 $0 = $0|0;
 var $$0195$i = 0, $$0195$in$i = 0, $$0348 = 0, $$0349 = 0, $$0361 = 0, $$0368 = 0, $$1 = 0, $$1347 = 0, $$1352 = 0, $$1355 = 0, $$1363 = 0, $$1367 = 0, $$2 = 0, $$3 = 0, $$3365 = 0, $$pre = 0, $$pre$phiZ2D = 0, $$sink3 = 0, $$sink5 = 0, $1 = 0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0;
 var $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0;
 var $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0;
 var $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0;
 var $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0;
 var $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0;
 var $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0;
 var $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0;
 var $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $cond373 = 0;
 var $cond374 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = ($0|0)==(0|0);
 if ($1) {
  return;
 }
 $2 = ((($0)) + -8|0);
 $3 = HEAP32[(3908)>>2]|0;
 $4 = ((($0)) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & -8;
 $7 = (($2) + ($6)|0);
 $8 = $5 & 1;
 $9 = ($8|0)==(0);
 do {
  if ($9) {
   $10 = HEAP32[$2>>2]|0;
   $11 = $5 & 3;
   $12 = ($11|0)==(0);
   if ($12) {
    return;
   }
   $13 = (0 - ($10))|0;
   $14 = (($2) + ($13)|0);
   $15 = (($10) + ($6))|0;
   $16 = ($14>>>0)<($3>>>0);
   if ($16) {
    return;
   }
   $17 = HEAP32[(3912)>>2]|0;
   $18 = ($17|0)==($14|0);
   if ($18) {
    $79 = ((($7)) + 4|0);
    $80 = HEAP32[$79>>2]|0;
    $81 = $80 & 3;
    $82 = ($81|0)==(3);
    if (!($82)) {
     $$1 = $14;$$1347 = $15;$88 = $14;
     break;
    }
    HEAP32[(3900)>>2] = $15;
    $83 = $80 & -2;
    HEAP32[$79>>2] = $83;
    $84 = $15 | 1;
    $85 = ((($14)) + 4|0);
    HEAP32[$85>>2] = $84;
    $86 = (($14) + ($15)|0);
    HEAP32[$86>>2] = $15;
    return;
   }
   $19 = $10 >>> 3;
   $20 = ($10>>>0)<(256);
   if ($20) {
    $21 = ((($14)) + 8|0);
    $22 = HEAP32[$21>>2]|0;
    $23 = ((($14)) + 12|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = ($24|0)==($22|0);
    if ($25) {
     $26 = 1 << $19;
     $27 = $26 ^ -1;
     $28 = HEAP32[973]|0;
     $29 = $28 & $27;
     HEAP32[973] = $29;
     $$1 = $14;$$1347 = $15;$88 = $14;
     break;
    } else {
     $30 = ((($22)) + 12|0);
     HEAP32[$30>>2] = $24;
     $31 = ((($24)) + 8|0);
     HEAP32[$31>>2] = $22;
     $$1 = $14;$$1347 = $15;$88 = $14;
     break;
    }
   }
   $32 = ((($14)) + 24|0);
   $33 = HEAP32[$32>>2]|0;
   $34 = ((($14)) + 12|0);
   $35 = HEAP32[$34>>2]|0;
   $36 = ($35|0)==($14|0);
   do {
    if ($36) {
     $41 = ((($14)) + 16|0);
     $42 = ((($41)) + 4|0);
     $43 = HEAP32[$42>>2]|0;
     $44 = ($43|0)==(0|0);
     if ($44) {
      $45 = HEAP32[$41>>2]|0;
      $46 = ($45|0)==(0|0);
      if ($46) {
       $$3 = 0;
       break;
      } else {
       $$1352 = $45;$$1355 = $41;
      }
     } else {
      $$1352 = $43;$$1355 = $42;
     }
     while(1) {
      $47 = ((($$1352)) + 20|0);
      $48 = HEAP32[$47>>2]|0;
      $49 = ($48|0)==(0|0);
      if (!($49)) {
       $$1352 = $48;$$1355 = $47;
       continue;
      }
      $50 = ((($$1352)) + 16|0);
      $51 = HEAP32[$50>>2]|0;
      $52 = ($51|0)==(0|0);
      if ($52) {
       break;
      } else {
       $$1352 = $51;$$1355 = $50;
      }
     }
     HEAP32[$$1355>>2] = 0;
     $$3 = $$1352;
    } else {
     $37 = ((($14)) + 8|0);
     $38 = HEAP32[$37>>2]|0;
     $39 = ((($38)) + 12|0);
     HEAP32[$39>>2] = $35;
     $40 = ((($35)) + 8|0);
     HEAP32[$40>>2] = $38;
     $$3 = $35;
    }
   } while(0);
   $53 = ($33|0)==(0|0);
   if ($53) {
    $$1 = $14;$$1347 = $15;$88 = $14;
   } else {
    $54 = ((($14)) + 28|0);
    $55 = HEAP32[$54>>2]|0;
    $56 = (4196 + ($55<<2)|0);
    $57 = HEAP32[$56>>2]|0;
    $58 = ($57|0)==($14|0);
    if ($58) {
     HEAP32[$56>>2] = $$3;
     $cond373 = ($$3|0)==(0|0);
     if ($cond373) {
      $59 = 1 << $55;
      $60 = $59 ^ -1;
      $61 = HEAP32[(3896)>>2]|0;
      $62 = $61 & $60;
      HEAP32[(3896)>>2] = $62;
      $$1 = $14;$$1347 = $15;$88 = $14;
      break;
     }
    } else {
     $63 = ((($33)) + 16|0);
     $64 = HEAP32[$63>>2]|0;
     $65 = ($64|0)!=($14|0);
     $$sink3 = $65&1;
     $66 = (((($33)) + 16|0) + ($$sink3<<2)|0);
     HEAP32[$66>>2] = $$3;
     $67 = ($$3|0)==(0|0);
     if ($67) {
      $$1 = $14;$$1347 = $15;$88 = $14;
      break;
     }
    }
    $68 = ((($$3)) + 24|0);
    HEAP32[$68>>2] = $33;
    $69 = ((($14)) + 16|0);
    $70 = HEAP32[$69>>2]|0;
    $71 = ($70|0)==(0|0);
    if (!($71)) {
     $72 = ((($$3)) + 16|0);
     HEAP32[$72>>2] = $70;
     $73 = ((($70)) + 24|0);
     HEAP32[$73>>2] = $$3;
    }
    $74 = ((($69)) + 4|0);
    $75 = HEAP32[$74>>2]|0;
    $76 = ($75|0)==(0|0);
    if ($76) {
     $$1 = $14;$$1347 = $15;$88 = $14;
    } else {
     $77 = ((($$3)) + 20|0);
     HEAP32[$77>>2] = $75;
     $78 = ((($75)) + 24|0);
     HEAP32[$78>>2] = $$3;
     $$1 = $14;$$1347 = $15;$88 = $14;
    }
   }
  } else {
   $$1 = $2;$$1347 = $6;$88 = $2;
  }
 } while(0);
 $87 = ($88>>>0)<($7>>>0);
 if (!($87)) {
  return;
 }
 $89 = ((($7)) + 4|0);
 $90 = HEAP32[$89>>2]|0;
 $91 = $90 & 1;
 $92 = ($91|0)==(0);
 if ($92) {
  return;
 }
 $93 = $90 & 2;
 $94 = ($93|0)==(0);
 if ($94) {
  $95 = HEAP32[(3916)>>2]|0;
  $96 = ($95|0)==($7|0);
  if ($96) {
   $97 = HEAP32[(3904)>>2]|0;
   $98 = (($97) + ($$1347))|0;
   HEAP32[(3904)>>2] = $98;
   HEAP32[(3916)>>2] = $$1;
   $99 = $98 | 1;
   $100 = ((($$1)) + 4|0);
   HEAP32[$100>>2] = $99;
   $101 = HEAP32[(3912)>>2]|0;
   $102 = ($$1|0)==($101|0);
   if (!($102)) {
    return;
   }
   HEAP32[(3912)>>2] = 0;
   HEAP32[(3900)>>2] = 0;
   return;
  }
  $103 = HEAP32[(3912)>>2]|0;
  $104 = ($103|0)==($7|0);
  if ($104) {
   $105 = HEAP32[(3900)>>2]|0;
   $106 = (($105) + ($$1347))|0;
   HEAP32[(3900)>>2] = $106;
   HEAP32[(3912)>>2] = $88;
   $107 = $106 | 1;
   $108 = ((($$1)) + 4|0);
   HEAP32[$108>>2] = $107;
   $109 = (($88) + ($106)|0);
   HEAP32[$109>>2] = $106;
   return;
  }
  $110 = $90 & -8;
  $111 = (($110) + ($$1347))|0;
  $112 = $90 >>> 3;
  $113 = ($90>>>0)<(256);
  do {
   if ($113) {
    $114 = ((($7)) + 8|0);
    $115 = HEAP32[$114>>2]|0;
    $116 = ((($7)) + 12|0);
    $117 = HEAP32[$116>>2]|0;
    $118 = ($117|0)==($115|0);
    if ($118) {
     $119 = 1 << $112;
     $120 = $119 ^ -1;
     $121 = HEAP32[973]|0;
     $122 = $121 & $120;
     HEAP32[973] = $122;
     break;
    } else {
     $123 = ((($115)) + 12|0);
     HEAP32[$123>>2] = $117;
     $124 = ((($117)) + 8|0);
     HEAP32[$124>>2] = $115;
     break;
    }
   } else {
    $125 = ((($7)) + 24|0);
    $126 = HEAP32[$125>>2]|0;
    $127 = ((($7)) + 12|0);
    $128 = HEAP32[$127>>2]|0;
    $129 = ($128|0)==($7|0);
    do {
     if ($129) {
      $134 = ((($7)) + 16|0);
      $135 = ((($134)) + 4|0);
      $136 = HEAP32[$135>>2]|0;
      $137 = ($136|0)==(0|0);
      if ($137) {
       $138 = HEAP32[$134>>2]|0;
       $139 = ($138|0)==(0|0);
       if ($139) {
        $$3365 = 0;
        break;
       } else {
        $$1363 = $138;$$1367 = $134;
       }
      } else {
       $$1363 = $136;$$1367 = $135;
      }
      while(1) {
       $140 = ((($$1363)) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if (!($142)) {
        $$1363 = $141;$$1367 = $140;
        continue;
       }
       $143 = ((($$1363)) + 16|0);
       $144 = HEAP32[$143>>2]|0;
       $145 = ($144|0)==(0|0);
       if ($145) {
        break;
       } else {
        $$1363 = $144;$$1367 = $143;
       }
      }
      HEAP32[$$1367>>2] = 0;
      $$3365 = $$1363;
     } else {
      $130 = ((($7)) + 8|0);
      $131 = HEAP32[$130>>2]|0;
      $132 = ((($131)) + 12|0);
      HEAP32[$132>>2] = $128;
      $133 = ((($128)) + 8|0);
      HEAP32[$133>>2] = $131;
      $$3365 = $128;
     }
    } while(0);
    $146 = ($126|0)==(0|0);
    if (!($146)) {
     $147 = ((($7)) + 28|0);
     $148 = HEAP32[$147>>2]|0;
     $149 = (4196 + ($148<<2)|0);
     $150 = HEAP32[$149>>2]|0;
     $151 = ($150|0)==($7|0);
     if ($151) {
      HEAP32[$149>>2] = $$3365;
      $cond374 = ($$3365|0)==(0|0);
      if ($cond374) {
       $152 = 1 << $148;
       $153 = $152 ^ -1;
       $154 = HEAP32[(3896)>>2]|0;
       $155 = $154 & $153;
       HEAP32[(3896)>>2] = $155;
       break;
      }
     } else {
      $156 = ((($126)) + 16|0);
      $157 = HEAP32[$156>>2]|0;
      $158 = ($157|0)!=($7|0);
      $$sink5 = $158&1;
      $159 = (((($126)) + 16|0) + ($$sink5<<2)|0);
      HEAP32[$159>>2] = $$3365;
      $160 = ($$3365|0)==(0|0);
      if ($160) {
       break;
      }
     }
     $161 = ((($$3365)) + 24|0);
     HEAP32[$161>>2] = $126;
     $162 = ((($7)) + 16|0);
     $163 = HEAP32[$162>>2]|0;
     $164 = ($163|0)==(0|0);
     if (!($164)) {
      $165 = ((($$3365)) + 16|0);
      HEAP32[$165>>2] = $163;
      $166 = ((($163)) + 24|0);
      HEAP32[$166>>2] = $$3365;
     }
     $167 = ((($162)) + 4|0);
     $168 = HEAP32[$167>>2]|0;
     $169 = ($168|0)==(0|0);
     if (!($169)) {
      $170 = ((($$3365)) + 20|0);
      HEAP32[$170>>2] = $168;
      $171 = ((($168)) + 24|0);
      HEAP32[$171>>2] = $$3365;
     }
    }
   }
  } while(0);
  $172 = $111 | 1;
  $173 = ((($$1)) + 4|0);
  HEAP32[$173>>2] = $172;
  $174 = (($88) + ($111)|0);
  HEAP32[$174>>2] = $111;
  $175 = HEAP32[(3912)>>2]|0;
  $176 = ($$1|0)==($175|0);
  if ($176) {
   HEAP32[(3900)>>2] = $111;
   return;
  } else {
   $$2 = $111;
  }
 } else {
  $177 = $90 & -2;
  HEAP32[$89>>2] = $177;
  $178 = $$1347 | 1;
  $179 = ((($$1)) + 4|0);
  HEAP32[$179>>2] = $178;
  $180 = (($88) + ($$1347)|0);
  HEAP32[$180>>2] = $$1347;
  $$2 = $$1347;
 }
 $181 = $$2 >>> 3;
 $182 = ($$2>>>0)<(256);
 if ($182) {
  $183 = $181 << 1;
  $184 = (3932 + ($183<<2)|0);
  $185 = HEAP32[973]|0;
  $186 = 1 << $181;
  $187 = $185 & $186;
  $188 = ($187|0)==(0);
  if ($188) {
   $189 = $185 | $186;
   HEAP32[973] = $189;
   $$pre = ((($184)) + 8|0);
   $$0368 = $184;$$pre$phiZ2D = $$pre;
  } else {
   $190 = ((($184)) + 8|0);
   $191 = HEAP32[$190>>2]|0;
   $$0368 = $191;$$pre$phiZ2D = $190;
  }
  HEAP32[$$pre$phiZ2D>>2] = $$1;
  $192 = ((($$0368)) + 12|0);
  HEAP32[$192>>2] = $$1;
  $193 = ((($$1)) + 8|0);
  HEAP32[$193>>2] = $$0368;
  $194 = ((($$1)) + 12|0);
  HEAP32[$194>>2] = $184;
  return;
 }
 $195 = $$2 >>> 8;
 $196 = ($195|0)==(0);
 if ($196) {
  $$0361 = 0;
 } else {
  $197 = ($$2>>>0)>(16777215);
  if ($197) {
   $$0361 = 31;
  } else {
   $198 = (($195) + 1048320)|0;
   $199 = $198 >>> 16;
   $200 = $199 & 8;
   $201 = $195 << $200;
   $202 = (($201) + 520192)|0;
   $203 = $202 >>> 16;
   $204 = $203 & 4;
   $205 = $204 | $200;
   $206 = $201 << $204;
   $207 = (($206) + 245760)|0;
   $208 = $207 >>> 16;
   $209 = $208 & 2;
   $210 = $205 | $209;
   $211 = (14 - ($210))|0;
   $212 = $206 << $209;
   $213 = $212 >>> 15;
   $214 = (($211) + ($213))|0;
   $215 = $214 << 1;
   $216 = (($214) + 7)|0;
   $217 = $$2 >>> $216;
   $218 = $217 & 1;
   $219 = $218 | $215;
   $$0361 = $219;
  }
 }
 $220 = (4196 + ($$0361<<2)|0);
 $221 = ((($$1)) + 28|0);
 HEAP32[$221>>2] = $$0361;
 $222 = ((($$1)) + 16|0);
 $223 = ((($$1)) + 20|0);
 HEAP32[$223>>2] = 0;
 HEAP32[$222>>2] = 0;
 $224 = HEAP32[(3896)>>2]|0;
 $225 = 1 << $$0361;
 $226 = $224 & $225;
 $227 = ($226|0)==(0);
 do {
  if ($227) {
   $228 = $224 | $225;
   HEAP32[(3896)>>2] = $228;
   HEAP32[$220>>2] = $$1;
   $229 = ((($$1)) + 24|0);
   HEAP32[$229>>2] = $220;
   $230 = ((($$1)) + 12|0);
   HEAP32[$230>>2] = $$1;
   $231 = ((($$1)) + 8|0);
   HEAP32[$231>>2] = $$1;
  } else {
   $232 = HEAP32[$220>>2]|0;
   $233 = ($$0361|0)==(31);
   $234 = $$0361 >>> 1;
   $235 = (25 - ($234))|0;
   $236 = $233 ? 0 : $235;
   $237 = $$2 << $236;
   $$0348 = $237;$$0349 = $232;
   while(1) {
    $238 = ((($$0349)) + 4|0);
    $239 = HEAP32[$238>>2]|0;
    $240 = $239 & -8;
    $241 = ($240|0)==($$2|0);
    if ($241) {
     label = 73;
     break;
    }
    $242 = $$0348 >>> 31;
    $243 = (((($$0349)) + 16|0) + ($242<<2)|0);
    $244 = $$0348 << 1;
    $245 = HEAP32[$243>>2]|0;
    $246 = ($245|0)==(0|0);
    if ($246) {
     label = 72;
     break;
    } else {
     $$0348 = $244;$$0349 = $245;
    }
   }
   if ((label|0) == 72) {
    HEAP32[$243>>2] = $$1;
    $247 = ((($$1)) + 24|0);
    HEAP32[$247>>2] = $$0349;
    $248 = ((($$1)) + 12|0);
    HEAP32[$248>>2] = $$1;
    $249 = ((($$1)) + 8|0);
    HEAP32[$249>>2] = $$1;
    break;
   }
   else if ((label|0) == 73) {
    $250 = ((($$0349)) + 8|0);
    $251 = HEAP32[$250>>2]|0;
    $252 = ((($251)) + 12|0);
    HEAP32[$252>>2] = $$1;
    HEAP32[$250>>2] = $$1;
    $253 = ((($$1)) + 8|0);
    HEAP32[$253>>2] = $251;
    $254 = ((($$1)) + 12|0);
    HEAP32[$254>>2] = $$0349;
    $255 = ((($$1)) + 24|0);
    HEAP32[$255>>2] = 0;
    break;
   }
  }
 } while(0);
 $256 = HEAP32[(3924)>>2]|0;
 $257 = (($256) + -1)|0;
 HEAP32[(3924)>>2] = $257;
 $258 = ($257|0)==(0);
 if ($258) {
  $$0195$in$i = (4348);
 } else {
  return;
 }
 while(1) {
  $$0195$i = HEAP32[$$0195$in$i>>2]|0;
  $259 = ($$0195$i|0)==(0|0);
  $260 = ((($$0195$i)) + 8|0);
  if ($259) {
   break;
  } else {
   $$0195$in$i = $260;
  }
 }
 HEAP32[(3924)>>2] = -1;
 return;
}
function ___stdio_close($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $vararg_buffer = sp;
 $1 = ((($0)) + 60|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = (_dummy($2)|0);
 HEAP32[$vararg_buffer>>2] = $3;
 $4 = (___syscall6(6,($vararg_buffer|0))|0);
 $5 = (___syscall_ret($4)|0);
 STACKTOP = sp;return ($5|0);
}
function ___stdio_write($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$0 = 0, $$04756 = 0, $$04855 = 0, $$04954 = 0, $$051 = 0, $$1 = 0, $$150 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0;
 var $vararg_ptr6 = 0, $vararg_ptr7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(48|0);
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer = sp;
 $3 = sp + 32|0;
 $4 = ((($0)) + 28|0);
 $5 = HEAP32[$4>>2]|0;
 HEAP32[$3>>2] = $5;
 $6 = ((($3)) + 4|0);
 $7 = ((($0)) + 20|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = (($8) - ($5))|0;
 HEAP32[$6>>2] = $9;
 $10 = ((($3)) + 8|0);
 HEAP32[$10>>2] = $1;
 $11 = ((($3)) + 12|0);
 HEAP32[$11>>2] = $2;
 $12 = (($9) + ($2))|0;
 $13 = ((($0)) + 60|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = $3;
 HEAP32[$vararg_buffer>>2] = $14;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = $15;
 $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
 HEAP32[$vararg_ptr2>>2] = 2;
 $16 = (___syscall146(146,($vararg_buffer|0))|0);
 $17 = (___syscall_ret($16)|0);
 $18 = ($12|0)==($17|0);
 L1: do {
  if ($18) {
   label = 3;
  } else {
   $$04756 = 2;$$04855 = $12;$$04954 = $3;$27 = $17;
   while(1) {
    $26 = ($27|0)<(0);
    if ($26) {
     break;
    }
    $35 = (($$04855) - ($27))|0;
    $36 = ((($$04954)) + 4|0);
    $37 = HEAP32[$36>>2]|0;
    $38 = ($27>>>0)>($37>>>0);
    $39 = ((($$04954)) + 8|0);
    $$150 = $38 ? $39 : $$04954;
    $40 = $38 << 31 >> 31;
    $$1 = (($$04756) + ($40))|0;
    $41 = $38 ? $37 : 0;
    $$0 = (($27) - ($41))|0;
    $42 = HEAP32[$$150>>2]|0;
    $43 = (($42) + ($$0)|0);
    HEAP32[$$150>>2] = $43;
    $44 = ((($$150)) + 4|0);
    $45 = HEAP32[$44>>2]|0;
    $46 = (($45) - ($$0))|0;
    HEAP32[$44>>2] = $46;
    $47 = HEAP32[$13>>2]|0;
    $48 = $$150;
    HEAP32[$vararg_buffer3>>2] = $47;
    $vararg_ptr6 = ((($vararg_buffer3)) + 4|0);
    HEAP32[$vararg_ptr6>>2] = $48;
    $vararg_ptr7 = ((($vararg_buffer3)) + 8|0);
    HEAP32[$vararg_ptr7>>2] = $$1;
    $49 = (___syscall146(146,($vararg_buffer3|0))|0);
    $50 = (___syscall_ret($49)|0);
    $51 = ($35|0)==($50|0);
    if ($51) {
     label = 3;
     break L1;
    } else {
     $$04756 = $$1;$$04855 = $35;$$04954 = $$150;$27 = $50;
    }
   }
   $28 = ((($0)) + 16|0);
   HEAP32[$28>>2] = 0;
   HEAP32[$4>>2] = 0;
   HEAP32[$7>>2] = 0;
   $29 = HEAP32[$0>>2]|0;
   $30 = $29 | 32;
   HEAP32[$0>>2] = $30;
   $31 = ($$04756|0)==(2);
   if ($31) {
    $$051 = 0;
   } else {
    $32 = ((($$04954)) + 4|0);
    $33 = HEAP32[$32>>2]|0;
    $34 = (($2) - ($33))|0;
    $$051 = $34;
   }
  }
 } while(0);
 if ((label|0) == 3) {
  $19 = ((($0)) + 44|0);
  $20 = HEAP32[$19>>2]|0;
  $21 = ((($0)) + 48|0);
  $22 = HEAP32[$21>>2]|0;
  $23 = (($20) + ($22)|0);
  $24 = ((($0)) + 16|0);
  HEAP32[$24>>2] = $23;
  $25 = $20;
  HEAP32[$4>>2] = $25;
  HEAP32[$7>>2] = $25;
  $$051 = $2;
 }
 STACKTOP = sp;return ($$051|0);
}
function ___stdio_seek($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$pre = 0, $10 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, $vararg_ptr3 = 0, $vararg_ptr4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $vararg_buffer = sp;
 $3 = sp + 20|0;
 $4 = ((($0)) + 60|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $3;
 HEAP32[$vararg_buffer>>2] = $5;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = 0;
 $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
 HEAP32[$vararg_ptr2>>2] = $1;
 $vararg_ptr3 = ((($vararg_buffer)) + 12|0);
 HEAP32[$vararg_ptr3>>2] = $6;
 $vararg_ptr4 = ((($vararg_buffer)) + 16|0);
 HEAP32[$vararg_ptr4>>2] = $2;
 $7 = (___syscall140(140,($vararg_buffer|0))|0);
 $8 = (___syscall_ret($7)|0);
 $9 = ($8|0)<(0);
 if ($9) {
  HEAP32[$3>>2] = -1;
  $10 = -1;
 } else {
  $$pre = HEAP32[$3>>2]|0;
  $10 = $$pre;
 }
 STACKTOP = sp;return ($10|0);
}
function ___syscall_ret($0) {
 $0 = $0|0;
 var $$0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = ($0>>>0)>(4294963200);
 if ($1) {
  $2 = (0 - ($0))|0;
  $3 = (___errno_location()|0);
  HEAP32[$3>>2] = $2;
  $$0 = -1;
 } else {
  $$0 = $0;
 }
 return ($$0|0);
}
function ___errno_location() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (4452|0);
}
function _dummy($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return ($0|0);
}
function ___stdout_write($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(32|0);
 $vararg_buffer = sp;
 $3 = sp + 16|0;
 $4 = ((($0)) + 36|0);
 HEAP32[$4>>2] = 2;
 $5 = HEAP32[$0>>2]|0;
 $6 = $5 & 64;
 $7 = ($6|0)==(0);
 if ($7) {
  $8 = ((($0)) + 60|0);
  $9 = HEAP32[$8>>2]|0;
  $10 = $3;
  HEAP32[$vararg_buffer>>2] = $9;
  $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
  HEAP32[$vararg_ptr1>>2] = 21523;
  $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
  HEAP32[$vararg_ptr2>>2] = $10;
  $11 = (___syscall54(54,($vararg_buffer|0))|0);
  $12 = ($11|0)==(0);
  if (!($12)) {
   $13 = ((($0)) + 75|0);
   HEAP8[$13>>0] = -1;
  }
 }
 $14 = (___stdio_write($0,$1,$2)|0);
 STACKTOP = sp;return ($14|0);
}
function _isdigit($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = (($0) + -48)|0;
 $2 = ($1>>>0)<(10);
 $3 = $2&1;
 return ($3|0);
}
function _pthread_self() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (700|0);
}
function _strcmp($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$011 = 0, $$0710 = 0, $$lcssa = 0, $$lcssa8 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $2 = HEAP8[$0>>0]|0;
 $3 = HEAP8[$1>>0]|0;
 $4 = ($2<<24>>24)!=($3<<24>>24);
 $5 = ($2<<24>>24)==(0);
 $or$cond9 = $5 | $4;
 if ($or$cond9) {
  $$lcssa = $3;$$lcssa8 = $2;
 } else {
  $$011 = $1;$$0710 = $0;
  while(1) {
   $6 = ((($$0710)) + 1|0);
   $7 = ((($$011)) + 1|0);
   $8 = HEAP8[$6>>0]|0;
   $9 = HEAP8[$7>>0]|0;
   $10 = ($8<<24>>24)!=($9<<24>>24);
   $11 = ($8<<24>>24)==(0);
   $or$cond = $11 | $10;
   if ($or$cond) {
    $$lcssa = $9;$$lcssa8 = $8;
    break;
   } else {
    $$011 = $7;$$0710 = $6;
   }
  }
 }
 $12 = $$lcssa8&255;
 $13 = $$lcssa&255;
 $14 = (($12) - ($13))|0;
 return ($14|0);
}
function ___unlockfile($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function ___lockfile($0) {
 $0 = $0|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function ___towrite($0) {
 $0 = $0|0;
 var $$0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = ((($0)) + 74|0);
 $2 = HEAP8[$1>>0]|0;
 $3 = $2 << 24 >> 24;
 $4 = (($3) + 255)|0;
 $5 = $4 | $3;
 $6 = $5&255;
 HEAP8[$1>>0] = $6;
 $7 = HEAP32[$0>>2]|0;
 $8 = $7 & 8;
 $9 = ($8|0)==(0);
 if ($9) {
  $11 = ((($0)) + 8|0);
  HEAP32[$11>>2] = 0;
  $12 = ((($0)) + 4|0);
  HEAP32[$12>>2] = 0;
  $13 = ((($0)) + 44|0);
  $14 = HEAP32[$13>>2]|0;
  $15 = ((($0)) + 28|0);
  HEAP32[$15>>2] = $14;
  $16 = ((($0)) + 20|0);
  HEAP32[$16>>2] = $14;
  $17 = $14;
  $18 = ((($0)) + 48|0);
  $19 = HEAP32[$18>>2]|0;
  $20 = (($17) + ($19)|0);
  $21 = ((($0)) + 16|0);
  HEAP32[$21>>2] = $20;
  $$0 = 0;
 } else {
  $10 = $7 | 32;
  HEAP32[$0>>2] = $10;
  $$0 = -1;
 }
 return ($$0|0);
}
function ___fwritex($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$038 = 0, $$042 = 0, $$1 = 0, $$139 = 0, $$141 = 0, $$143 = 0, $$pre = 0, $$pre47 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $3 = ((($2)) + 16|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($4|0)==(0|0);
 if ($5) {
  $7 = (___towrite($2)|0);
  $8 = ($7|0)==(0);
  if ($8) {
   $$pre = HEAP32[$3>>2]|0;
   $12 = $$pre;
   label = 5;
  } else {
   $$1 = 0;
  }
 } else {
  $6 = $4;
  $12 = $6;
  label = 5;
 }
 L5: do {
  if ((label|0) == 5) {
   $9 = ((($2)) + 20|0);
   $10 = HEAP32[$9>>2]|0;
   $11 = (($12) - ($10))|0;
   $13 = ($11>>>0)<($1>>>0);
   $14 = $10;
   if ($13) {
    $15 = ((($2)) + 36|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = (FUNCTION_TABLE_iiii[$16 & 7]($2,$0,$1)|0);
    $$1 = $17;
    break;
   }
   $18 = ((($2)) + 75|0);
   $19 = HEAP8[$18>>0]|0;
   $20 = ($19<<24>>24)>(-1);
   L10: do {
    if ($20) {
     $$038 = $1;
     while(1) {
      $21 = ($$038|0)==(0);
      if ($21) {
       $$139 = 0;$$141 = $0;$$143 = $1;$31 = $14;
       break L10;
      }
      $22 = (($$038) + -1)|0;
      $23 = (($0) + ($22)|0);
      $24 = HEAP8[$23>>0]|0;
      $25 = ($24<<24>>24)==(10);
      if ($25) {
       break;
      } else {
       $$038 = $22;
      }
     }
     $26 = ((($2)) + 36|0);
     $27 = HEAP32[$26>>2]|0;
     $28 = (FUNCTION_TABLE_iiii[$27 & 7]($2,$0,$$038)|0);
     $29 = ($28>>>0)<($$038>>>0);
     if ($29) {
      $$1 = $28;
      break L5;
     }
     $30 = (($0) + ($$038)|0);
     $$042 = (($1) - ($$038))|0;
     $$pre47 = HEAP32[$9>>2]|0;
     $$139 = $$038;$$141 = $30;$$143 = $$042;$31 = $$pre47;
    } else {
     $$139 = 0;$$141 = $0;$$143 = $1;$31 = $14;
    }
   } while(0);
   (_memcpy(($31|0),($$141|0),($$143|0))|0);
   $32 = HEAP32[$9>>2]|0;
   $33 = (($32) + ($$143)|0);
   HEAP32[$9>>2] = $33;
   $34 = (($$139) + ($$143))|0;
   $$1 = $34;
  }
 } while(0);
 return ($$1|0);
}
function ___lctrans_impl($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$0 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ($1|0)==(0|0);
 if ($2) {
  $$0 = 0;
 } else {
  $3 = HEAP32[$1>>2]|0;
  $4 = ((($1)) + 4|0);
  $5 = HEAP32[$4>>2]|0;
  $6 = (___mo_lookup($3,$5,$0)|0);
  $$0 = $6;
 }
 $7 = ($$0|0)!=(0|0);
 $8 = $7 ? $$0 : $0;
 return ($8|0);
}
function ___mo_lookup($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$ = 0, $$090 = 0, $$094 = 0, $$191 = 0, $$195 = 0, $$4 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond102 = 0, $or$cond104 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = HEAP32[$0>>2]|0;
 $4 = (($3) + 1794895138)|0;
 $5 = ((($0)) + 8|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = (_swapc($6,$4)|0);
 $8 = ((($0)) + 12|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = (_swapc($9,$4)|0);
 $11 = ((($0)) + 16|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = (_swapc($12,$4)|0);
 $14 = $1 >>> 2;
 $15 = ($7>>>0)<($14>>>0);
 L1: do {
  if ($15) {
   $16 = $7 << 2;
   $17 = (($1) - ($16))|0;
   $18 = ($10>>>0)<($17>>>0);
   $19 = ($13>>>0)<($17>>>0);
   $or$cond = $18 & $19;
   if ($or$cond) {
    $20 = $13 | $10;
    $21 = $20 & 3;
    $22 = ($21|0)==(0);
    if ($22) {
     $23 = $10 >>> 2;
     $24 = $13 >>> 2;
     $$090 = 0;$$094 = $7;
     while(1) {
      $25 = $$094 >>> 1;
      $26 = (($$090) + ($25))|0;
      $27 = $26 << 1;
      $28 = (($27) + ($23))|0;
      $29 = (($0) + ($28<<2)|0);
      $30 = HEAP32[$29>>2]|0;
      $31 = (_swapc($30,$4)|0);
      $32 = (($28) + 1)|0;
      $33 = (($0) + ($32<<2)|0);
      $34 = HEAP32[$33>>2]|0;
      $35 = (_swapc($34,$4)|0);
      $36 = ($35>>>0)<($1>>>0);
      $37 = (($1) - ($35))|0;
      $38 = ($31>>>0)<($37>>>0);
      $or$cond102 = $36 & $38;
      if (!($or$cond102)) {
       $$4 = 0;
       break L1;
      }
      $39 = (($35) + ($31))|0;
      $40 = (($0) + ($39)|0);
      $41 = HEAP8[$40>>0]|0;
      $42 = ($41<<24>>24)==(0);
      if (!($42)) {
       $$4 = 0;
       break L1;
      }
      $43 = (($0) + ($35)|0);
      $44 = (_strcmp($2,$43)|0);
      $45 = ($44|0)==(0);
      if ($45) {
       break;
      }
      $62 = ($$094|0)==(1);
      $63 = ($44|0)<(0);
      $64 = (($$094) - ($25))|0;
      $$195 = $63 ? $25 : $64;
      $$191 = $63 ? $$090 : $26;
      if ($62) {
       $$4 = 0;
       break L1;
      } else {
       $$090 = $$191;$$094 = $$195;
      }
     }
     $46 = (($27) + ($24))|0;
     $47 = (($0) + ($46<<2)|0);
     $48 = HEAP32[$47>>2]|0;
     $49 = (_swapc($48,$4)|0);
     $50 = (($46) + 1)|0;
     $51 = (($0) + ($50<<2)|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = (_swapc($52,$4)|0);
     $54 = ($53>>>0)<($1>>>0);
     $55 = (($1) - ($53))|0;
     $56 = ($49>>>0)<($55>>>0);
     $or$cond104 = $54 & $56;
     if ($or$cond104) {
      $57 = (($0) + ($53)|0);
      $58 = (($53) + ($49))|0;
      $59 = (($0) + ($58)|0);
      $60 = HEAP8[$59>>0]|0;
      $61 = ($60<<24>>24)==(0);
      $$ = $61 ? $57 : 0;
      $$4 = $$;
     } else {
      $$4 = 0;
     }
    } else {
     $$4 = 0;
    }
   } else {
    $$4 = 0;
   }
  } else {
   $$4 = 0;
  }
 } while(0);
 return ($$4|0);
}
function _swapc($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$ = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ($1|0)==(0);
 $3 = (_llvm_bswap_i32(($0|0))|0);
 $$ = $2 ? $0 : $3;
 return ($$|0);
}
function ___ofl_lock() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 ___lock((4456|0));
 return (4464|0);
}
function ___ofl_unlock() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 ___unlock((4456|0));
 return;
}
function _fflush($0) {
 $0 = $0|0;
 var $$0 = 0, $$023 = 0, $$02325 = 0, $$02327 = 0, $$024$lcssa = 0, $$02426 = 0, $$1 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0;
 var $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $phitmp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = ($0|0)==(0|0);
 do {
  if ($1) {
   $8 = HEAP32[174]|0;
   $9 = ($8|0)==(0|0);
   if ($9) {
    $29 = 0;
   } else {
    $10 = HEAP32[174]|0;
    $11 = (_fflush($10)|0);
    $29 = $11;
   }
   $12 = (___ofl_lock()|0);
   $$02325 = HEAP32[$12>>2]|0;
   $13 = ($$02325|0)==(0|0);
   if ($13) {
    $$024$lcssa = $29;
   } else {
    $$02327 = $$02325;$$02426 = $29;
    while(1) {
     $14 = ((($$02327)) + 76|0);
     $15 = HEAP32[$14>>2]|0;
     $16 = ($15|0)>(-1);
     if ($16) {
      $17 = (___lockfile($$02327)|0);
      $26 = $17;
     } else {
      $26 = 0;
     }
     $18 = ((($$02327)) + 20|0);
     $19 = HEAP32[$18>>2]|0;
     $20 = ((($$02327)) + 28|0);
     $21 = HEAP32[$20>>2]|0;
     $22 = ($19>>>0)>($21>>>0);
     if ($22) {
      $23 = (___fflush_unlocked($$02327)|0);
      $24 = $23 | $$02426;
      $$1 = $24;
     } else {
      $$1 = $$02426;
     }
     $25 = ($26|0)==(0);
     if (!($25)) {
      ___unlockfile($$02327);
     }
     $27 = ((($$02327)) + 56|0);
     $$023 = HEAP32[$27>>2]|0;
     $28 = ($$023|0)==(0|0);
     if ($28) {
      $$024$lcssa = $$1;
      break;
     } else {
      $$02327 = $$023;$$02426 = $$1;
     }
    }
   }
   ___ofl_unlock();
   $$0 = $$024$lcssa;
  } else {
   $2 = ((($0)) + 76|0);
   $3 = HEAP32[$2>>2]|0;
   $4 = ($3|0)>(-1);
   if (!($4)) {
    $5 = (___fflush_unlocked($0)|0);
    $$0 = $5;
    break;
   }
   $6 = (___lockfile($0)|0);
   $phitmp = ($6|0)==(0);
   $7 = (___fflush_unlocked($0)|0);
   if ($phitmp) {
    $$0 = $7;
   } else {
    ___unlockfile($0);
    $$0 = $7;
   }
  }
 } while(0);
 return ($$0|0);
}
function ___fflush_unlocked($0) {
 $0 = $0|0;
 var $$0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = ((($0)) + 20|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($0)) + 28|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($2>>>0)>($4>>>0);
 if ($5) {
  $6 = ((($0)) + 36|0);
  $7 = HEAP32[$6>>2]|0;
  (FUNCTION_TABLE_iiii[$7 & 7]($0,0,0)|0);
  $8 = HEAP32[$1>>2]|0;
  $9 = ($8|0)==(0|0);
  if ($9) {
   $$0 = -1;
  } else {
   label = 3;
  }
 } else {
  label = 3;
 }
 if ((label|0) == 3) {
  $10 = ((($0)) + 4|0);
  $11 = HEAP32[$10>>2]|0;
  $12 = ((($0)) + 8|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = ($11>>>0)<($13>>>0);
  if ($14) {
   $15 = $11;
   $16 = $13;
   $17 = (($15) - ($16))|0;
   $18 = ((($0)) + 40|0);
   $19 = HEAP32[$18>>2]|0;
   (FUNCTION_TABLE_iiii[$19 & 7]($0,$17,1)|0);
  }
  $20 = ((($0)) + 16|0);
  HEAP32[$20>>2] = 0;
  HEAP32[$3>>2] = 0;
  HEAP32[$1>>2] = 0;
  HEAP32[$12>>2] = 0;
  HEAP32[$10>>2] = 0;
  $$0 = 0;
 }
 return ($$0|0);
}
function _memchr($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$0$lcssa = 0, $$035$lcssa = 0, $$035$lcssa65 = 0, $$03555 = 0, $$036$lcssa = 0, $$036$lcssa64 = 0, $$03654 = 0, $$046 = 0, $$137$lcssa = 0, $$13745 = 0, $$140 = 0, $$2 = 0, $$23839 = 0, $$3 = 0, $$lcssa = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0;
 var $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0;
 var $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond53 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = $1 & 255;
 $4 = $0;
 $5 = $4 & 3;
 $6 = ($5|0)!=(0);
 $7 = ($2|0)!=(0);
 $or$cond53 = $7 & $6;
 L1: do {
  if ($or$cond53) {
   $8 = $1&255;
   $$03555 = $0;$$03654 = $2;
   while(1) {
    $9 = HEAP8[$$03555>>0]|0;
    $10 = ($9<<24>>24)==($8<<24>>24);
    if ($10) {
     $$035$lcssa65 = $$03555;$$036$lcssa64 = $$03654;
     label = 6;
     break L1;
    }
    $11 = ((($$03555)) + 1|0);
    $12 = (($$03654) + -1)|0;
    $13 = $11;
    $14 = $13 & 3;
    $15 = ($14|0)!=(0);
    $16 = ($12|0)!=(0);
    $or$cond = $16 & $15;
    if ($or$cond) {
     $$03555 = $11;$$03654 = $12;
    } else {
     $$035$lcssa = $11;$$036$lcssa = $12;$$lcssa = $16;
     label = 5;
     break;
    }
   }
  } else {
   $$035$lcssa = $0;$$036$lcssa = $2;$$lcssa = $7;
   label = 5;
  }
 } while(0);
 if ((label|0) == 5) {
  if ($$lcssa) {
   $$035$lcssa65 = $$035$lcssa;$$036$lcssa64 = $$036$lcssa;
   label = 6;
  } else {
   $$2 = $$035$lcssa;$$3 = 0;
  }
 }
 L8: do {
  if ((label|0) == 6) {
   $17 = HEAP8[$$035$lcssa65>>0]|0;
   $18 = $1&255;
   $19 = ($17<<24>>24)==($18<<24>>24);
   if ($19) {
    $$2 = $$035$lcssa65;$$3 = $$036$lcssa64;
   } else {
    $20 = Math_imul($3, 16843009)|0;
    $21 = ($$036$lcssa64>>>0)>(3);
    L11: do {
     if ($21) {
      $$046 = $$035$lcssa65;$$13745 = $$036$lcssa64;
      while(1) {
       $22 = HEAP32[$$046>>2]|0;
       $23 = $22 ^ $20;
       $24 = (($23) + -16843009)|0;
       $25 = $23 & -2139062144;
       $26 = $25 ^ -2139062144;
       $27 = $26 & $24;
       $28 = ($27|0)==(0);
       if (!($28)) {
        break;
       }
       $29 = ((($$046)) + 4|0);
       $30 = (($$13745) + -4)|0;
       $31 = ($30>>>0)>(3);
       if ($31) {
        $$046 = $29;$$13745 = $30;
       } else {
        $$0$lcssa = $29;$$137$lcssa = $30;
        label = 11;
        break L11;
       }
      }
      $$140 = $$046;$$23839 = $$13745;
     } else {
      $$0$lcssa = $$035$lcssa65;$$137$lcssa = $$036$lcssa64;
      label = 11;
     }
    } while(0);
    if ((label|0) == 11) {
     $32 = ($$137$lcssa|0)==(0);
     if ($32) {
      $$2 = $$0$lcssa;$$3 = 0;
      break;
     } else {
      $$140 = $$0$lcssa;$$23839 = $$137$lcssa;
     }
    }
    while(1) {
     $33 = HEAP8[$$140>>0]|0;
     $34 = ($33<<24>>24)==($18<<24>>24);
     if ($34) {
      $$2 = $$140;$$3 = $$23839;
      break L8;
     }
     $35 = ((($$140)) + 1|0);
     $36 = (($$23839) + -1)|0;
     $37 = ($36|0)==(0);
     if ($37) {
      $$2 = $35;$$3 = 0;
      break;
     } else {
      $$140 = $35;$$23839 = $36;
     }
    }
   }
  }
 } while(0);
 $38 = ($$3|0)!=(0);
 $39 = $38 ? $$2 : 0;
 return ($39|0);
}
function _fprintf($0,$1,$varargs) {
 $0 = $0|0;
 $1 = $1|0;
 $varargs = $varargs|0;
 var $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(16|0);
 $2 = sp;
 HEAP32[$2>>2] = $varargs;
 $3 = (_vfprintf($0,$1,$2)|0);
 STACKTOP = sp;return ($3|0);
}
function _vfprintf($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$ = 0, $$0 = 0, $$1 = 0, $$1$ = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $vacopy_currentptr = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 224|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(224|0);
 $3 = sp + 120|0;
 $4 = sp + 80|0;
 $5 = sp;
 $6 = sp + 136|0;
 dest=$4; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $vacopy_currentptr = HEAP32[$2>>2]|0;
 HEAP32[$3>>2] = $vacopy_currentptr;
 $7 = (_printf_core(0,$1,$3,$5,$4)|0);
 $8 = ($7|0)<(0);
 if ($8) {
  $$0 = -1;
 } else {
  $9 = ((($0)) + 76|0);
  $10 = HEAP32[$9>>2]|0;
  $11 = ($10|0)>(-1);
  if ($11) {
   $12 = (___lockfile($0)|0);
   $40 = $12;
  } else {
   $40 = 0;
  }
  $13 = HEAP32[$0>>2]|0;
  $14 = $13 & 32;
  $15 = ((($0)) + 74|0);
  $16 = HEAP8[$15>>0]|0;
  $17 = ($16<<24>>24)<(1);
  if ($17) {
   $18 = $13 & -33;
   HEAP32[$0>>2] = $18;
  }
  $19 = ((($0)) + 48|0);
  $20 = HEAP32[$19>>2]|0;
  $21 = ($20|0)==(0);
  if ($21) {
   $23 = ((($0)) + 44|0);
   $24 = HEAP32[$23>>2]|0;
   HEAP32[$23>>2] = $6;
   $25 = ((($0)) + 28|0);
   HEAP32[$25>>2] = $6;
   $26 = ((($0)) + 20|0);
   HEAP32[$26>>2] = $6;
   HEAP32[$19>>2] = 80;
   $27 = ((($6)) + 80|0);
   $28 = ((($0)) + 16|0);
   HEAP32[$28>>2] = $27;
   $29 = (_printf_core($0,$1,$3,$5,$4)|0);
   $30 = ($24|0)==(0|0);
   if ($30) {
    $$1 = $29;
   } else {
    $31 = ((($0)) + 36|0);
    $32 = HEAP32[$31>>2]|0;
    (FUNCTION_TABLE_iiii[$32 & 7]($0,0,0)|0);
    $33 = HEAP32[$26>>2]|0;
    $34 = ($33|0)==(0|0);
    $$ = $34 ? -1 : $29;
    HEAP32[$23>>2] = $24;
    HEAP32[$19>>2] = 0;
    HEAP32[$28>>2] = 0;
    HEAP32[$25>>2] = 0;
    HEAP32[$26>>2] = 0;
    $$1 = $$;
   }
  } else {
   $22 = (_printf_core($0,$1,$3,$5,$4)|0);
   $$1 = $22;
  }
  $35 = HEAP32[$0>>2]|0;
  $36 = $35 & 32;
  $37 = ($36|0)==(0);
  $$1$ = $37 ? $$1 : -1;
  $38 = $35 | $14;
  HEAP32[$0>>2] = $38;
  $39 = ($40|0)==(0);
  if (!($39)) {
   ___unlockfile($0);
  }
  $$0 = $$1$;
 }
 STACKTOP = sp;return ($$0|0);
}
function _printf_core($0,$1,$2,$3,$4) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 var $$ = 0, $$$ = 0, $$$0259 = 0, $$$0262 = 0, $$$4266 = 0, $$$5 = 0, $$0 = 0, $$0228 = 0, $$0228$ = 0, $$0229316 = 0, $$0232 = 0, $$0235 = 0, $$0237 = 0, $$0240$lcssa = 0, $$0240$lcssa356 = 0, $$0240315 = 0, $$0243 = 0, $$0247 = 0, $$0249$lcssa = 0, $$0249303 = 0;
 var $$0252 = 0, $$0253 = 0, $$0254 = 0, $$0254$$0254$ = 0, $$0259 = 0, $$0262$lcssa = 0, $$0262309 = 0, $$0269 = 0, $$0269$phi = 0, $$1 = 0, $$1230327 = 0, $$1233 = 0, $$1236 = 0, $$1238 = 0, $$1241326 = 0, $$1244314 = 0, $$1248 = 0, $$1250 = 0, $$1255 = 0, $$1260 = 0;
 var $$1263 = 0, $$1263$ = 0, $$1270 = 0, $$2 = 0, $$2234 = 0, $$2239 = 0, $$2242$lcssa = 0, $$2242302 = 0, $$2245 = 0, $$2251 = 0, $$2256 = 0, $$2256$ = 0, $$2256$$$2256 = 0, $$2261 = 0, $$2271 = 0, $$279$ = 0, $$286 = 0, $$287 = 0, $$3257 = 0, $$3265 = 0;
 var $$3272 = 0, $$3300 = 0, $$4258354 = 0, $$4266 = 0, $$5 = 0, $$6268 = 0, $$lcssa291 = 0, $$lcssa292 = 0, $$pre = 0, $$pre342 = 0, $$pre344 = 0, $$pre345 = 0, $$pre345$pre = 0, $$pre346 = 0, $$pre348 = 0, $$sink = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0;
 var $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0;
 var $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0;
 var $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0;
 var $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0;
 var $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0;
 var $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0;
 var $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0;
 var $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0;
 var $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0;
 var $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0;
 var $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0;
 var $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0;
 var $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0.0;
 var $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0;
 var $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $37 = 0, $38 = 0, $39 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0;
 var $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0;
 var $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0;
 var $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $arglist_current = 0, $arglist_current2 = 0, $arglist_next = 0;
 var $arglist_next3 = 0, $brmerge = 0, $brmerge308 = 0, $expanded = 0, $expanded10 = 0, $expanded11 = 0, $expanded13 = 0, $expanded14 = 0, $expanded15 = 0, $expanded4 = 0, $expanded6 = 0, $expanded7 = 0, $expanded8 = 0, $or$cond = 0, $or$cond276 = 0, $or$cond278 = 0, $or$cond281 = 0, $storemerge274 = 0, $trunc = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(64|0);
 $5 = sp + 16|0;
 $6 = sp;
 $7 = sp + 24|0;
 $8 = sp + 8|0;
 $9 = sp + 20|0;
 HEAP32[$5>>2] = $1;
 $10 = ($0|0)!=(0|0);
 $11 = ((($7)) + 40|0);
 $12 = $11;
 $13 = ((($7)) + 39|0);
 $14 = ((($8)) + 4|0);
 $$0243 = 0;$$0247 = 0;$$0269 = 0;
 L1: while(1) {
  $15 = ($$0247|0)>(-1);
  do {
   if ($15) {
    $16 = (2147483647 - ($$0247))|0;
    $17 = ($$0243|0)>($16|0);
    if ($17) {
     $18 = (___errno_location()|0);
     HEAP32[$18>>2] = 75;
     $$1248 = -1;
     break;
    } else {
     $19 = (($$0243) + ($$0247))|0;
     $$1248 = $19;
     break;
    }
   } else {
    $$1248 = $$0247;
   }
  } while(0);
  $20 = HEAP32[$5>>2]|0;
  $21 = HEAP8[$20>>0]|0;
  $22 = ($21<<24>>24)==(0);
  if ($22) {
   label = 88;
   break;
  } else {
   $23 = $21;$25 = $20;
  }
  L9: while(1) {
   switch ($23<<24>>24) {
   case 37:  {
    $$0249303 = $25;$27 = $25;
    label = 9;
    break L9;
    break;
   }
   case 0:  {
    $$0249$lcssa = $25;
    break L9;
    break;
   }
   default: {
   }
   }
   $24 = ((($25)) + 1|0);
   HEAP32[$5>>2] = $24;
   $$pre = HEAP8[$24>>0]|0;
   $23 = $$pre;$25 = $24;
  }
  L12: do {
   if ((label|0) == 9) {
    while(1) {
     label = 0;
     $26 = ((($27)) + 1|0);
     $28 = HEAP8[$26>>0]|0;
     $29 = ($28<<24>>24)==(37);
     if (!($29)) {
      $$0249$lcssa = $$0249303;
      break L12;
     }
     $30 = ((($$0249303)) + 1|0);
     $31 = ((($27)) + 2|0);
     HEAP32[$5>>2] = $31;
     $32 = HEAP8[$31>>0]|0;
     $33 = ($32<<24>>24)==(37);
     if ($33) {
      $$0249303 = $30;$27 = $31;
      label = 9;
     } else {
      $$0249$lcssa = $30;
      break;
     }
    }
   }
  } while(0);
  $34 = $$0249$lcssa;
  $35 = $20;
  $36 = (($34) - ($35))|0;
  if ($10) {
   _out_670($0,$20,$36);
  }
  $37 = ($36|0)==(0);
  if (!($37)) {
   $$0269$phi = $$0269;$$0243 = $36;$$0247 = $$1248;$$0269 = $$0269$phi;
   continue;
  }
  $38 = HEAP32[$5>>2]|0;
  $39 = ((($38)) + 1|0);
  $40 = HEAP8[$39>>0]|0;
  $41 = $40 << 24 >> 24;
  $42 = (_isdigit($41)|0);
  $43 = ($42|0)==(0);
  $$pre342 = HEAP32[$5>>2]|0;
  if ($43) {
   $$0253 = -1;$$1270 = $$0269;$$sink = 1;
  } else {
   $44 = ((($$pre342)) + 2|0);
   $45 = HEAP8[$44>>0]|0;
   $46 = ($45<<24>>24)==(36);
   if ($46) {
    $47 = ((($$pre342)) + 1|0);
    $48 = HEAP8[$47>>0]|0;
    $49 = $48 << 24 >> 24;
    $50 = (($49) + -48)|0;
    $$0253 = $50;$$1270 = 1;$$sink = 3;
   } else {
    $$0253 = -1;$$1270 = $$0269;$$sink = 1;
   }
  }
  $51 = (($$pre342) + ($$sink)|0);
  HEAP32[$5>>2] = $51;
  $52 = HEAP8[$51>>0]|0;
  $53 = $52 << 24 >> 24;
  $54 = (($53) + -32)|0;
  $55 = ($54>>>0)>(31);
  $56 = 1 << $54;
  $57 = $56 & 75913;
  $58 = ($57|0)==(0);
  $brmerge308 = $55 | $58;
  if ($brmerge308) {
   $$0262$lcssa = 0;$$lcssa291 = $52;$$lcssa292 = $51;
  } else {
   $$0262309 = 0;$60 = $52;$65 = $51;
   while(1) {
    $59 = $60 << 24 >> 24;
    $61 = (($59) + -32)|0;
    $62 = 1 << $61;
    $63 = $62 | $$0262309;
    $64 = ((($65)) + 1|0);
    HEAP32[$5>>2] = $64;
    $66 = HEAP8[$64>>0]|0;
    $67 = $66 << 24 >> 24;
    $68 = (($67) + -32)|0;
    $69 = ($68>>>0)>(31);
    $70 = 1 << $68;
    $71 = $70 & 75913;
    $72 = ($71|0)==(0);
    $brmerge = $69 | $72;
    if ($brmerge) {
     $$0262$lcssa = $63;$$lcssa291 = $66;$$lcssa292 = $64;
     break;
    } else {
     $$0262309 = $63;$60 = $66;$65 = $64;
    }
   }
  }
  $73 = ($$lcssa291<<24>>24)==(42);
  if ($73) {
   $74 = ((($$lcssa292)) + 1|0);
   $75 = HEAP8[$74>>0]|0;
   $76 = $75 << 24 >> 24;
   $77 = (_isdigit($76)|0);
   $78 = ($77|0)==(0);
   if ($78) {
    label = 23;
   } else {
    $79 = HEAP32[$5>>2]|0;
    $80 = ((($79)) + 2|0);
    $81 = HEAP8[$80>>0]|0;
    $82 = ($81<<24>>24)==(36);
    if ($82) {
     $83 = ((($79)) + 1|0);
     $84 = HEAP8[$83>>0]|0;
     $85 = $84 << 24 >> 24;
     $86 = (($85) + -48)|0;
     $87 = (($4) + ($86<<2)|0);
     HEAP32[$87>>2] = 10;
     $88 = HEAP8[$83>>0]|0;
     $89 = $88 << 24 >> 24;
     $90 = (($89) + -48)|0;
     $91 = (($3) + ($90<<3)|0);
     $92 = $91;
     $93 = $92;
     $94 = HEAP32[$93>>2]|0;
     $95 = (($92) + 4)|0;
     $96 = $95;
     $97 = HEAP32[$96>>2]|0;
     $98 = ((($79)) + 3|0);
     $$0259 = $94;$$2271 = 1;$storemerge274 = $98;
    } else {
     label = 23;
    }
   }
   if ((label|0) == 23) {
    label = 0;
    $99 = ($$1270|0)==(0);
    if (!($99)) {
     $$0 = -1;
     break;
    }
    if ($10) {
     $arglist_current = HEAP32[$2>>2]|0;
     $100 = $arglist_current;
     $101 = ((0) + 4|0);
     $expanded4 = $101;
     $expanded = (($expanded4) - 1)|0;
     $102 = (($100) + ($expanded))|0;
     $103 = ((0) + 4|0);
     $expanded8 = $103;
     $expanded7 = (($expanded8) - 1)|0;
     $expanded6 = $expanded7 ^ -1;
     $104 = $102 & $expanded6;
     $105 = $104;
     $106 = HEAP32[$105>>2]|0;
     $arglist_next = ((($105)) + 4|0);
     HEAP32[$2>>2] = $arglist_next;
     $363 = $106;
    } else {
     $363 = 0;
    }
    $107 = HEAP32[$5>>2]|0;
    $108 = ((($107)) + 1|0);
    $$0259 = $363;$$2271 = 0;$storemerge274 = $108;
   }
   HEAP32[$5>>2] = $storemerge274;
   $109 = ($$0259|0)<(0);
   $110 = $$0262$lcssa | 8192;
   $111 = (0 - ($$0259))|0;
   $$$0262 = $109 ? $110 : $$0262$lcssa;
   $$$0259 = $109 ? $111 : $$0259;
   $$1260 = $$$0259;$$1263 = $$$0262;$$3272 = $$2271;$115 = $storemerge274;
  } else {
   $112 = (_getint_671($5)|0);
   $113 = ($112|0)<(0);
   if ($113) {
    $$0 = -1;
    break;
   }
   $$pre344 = HEAP32[$5>>2]|0;
   $$1260 = $112;$$1263 = $$0262$lcssa;$$3272 = $$1270;$115 = $$pre344;
  }
  $114 = HEAP8[$115>>0]|0;
  $116 = ($114<<24>>24)==(46);
  do {
   if ($116) {
    $117 = ((($115)) + 1|0);
    $118 = HEAP8[$117>>0]|0;
    $119 = ($118<<24>>24)==(42);
    if (!($119)) {
     $155 = ((($115)) + 1|0);
     HEAP32[$5>>2] = $155;
     $156 = (_getint_671($5)|0);
     $$pre345$pre = HEAP32[$5>>2]|0;
     $$0254 = $156;$$pre345 = $$pre345$pre;
     break;
    }
    $120 = ((($115)) + 2|0);
    $121 = HEAP8[$120>>0]|0;
    $122 = $121 << 24 >> 24;
    $123 = (_isdigit($122)|0);
    $124 = ($123|0)==(0);
    if (!($124)) {
     $125 = HEAP32[$5>>2]|0;
     $126 = ((($125)) + 3|0);
     $127 = HEAP8[$126>>0]|0;
     $128 = ($127<<24>>24)==(36);
     if ($128) {
      $129 = ((($125)) + 2|0);
      $130 = HEAP8[$129>>0]|0;
      $131 = $130 << 24 >> 24;
      $132 = (($131) + -48)|0;
      $133 = (($4) + ($132<<2)|0);
      HEAP32[$133>>2] = 10;
      $134 = HEAP8[$129>>0]|0;
      $135 = $134 << 24 >> 24;
      $136 = (($135) + -48)|0;
      $137 = (($3) + ($136<<3)|0);
      $138 = $137;
      $139 = $138;
      $140 = HEAP32[$139>>2]|0;
      $141 = (($138) + 4)|0;
      $142 = $141;
      $143 = HEAP32[$142>>2]|0;
      $144 = ((($125)) + 4|0);
      HEAP32[$5>>2] = $144;
      $$0254 = $140;$$pre345 = $144;
      break;
     }
    }
    $145 = ($$3272|0)==(0);
    if (!($145)) {
     $$0 = -1;
     break L1;
    }
    if ($10) {
     $arglist_current2 = HEAP32[$2>>2]|0;
     $146 = $arglist_current2;
     $147 = ((0) + 4|0);
     $expanded11 = $147;
     $expanded10 = (($expanded11) - 1)|0;
     $148 = (($146) + ($expanded10))|0;
     $149 = ((0) + 4|0);
     $expanded15 = $149;
     $expanded14 = (($expanded15) - 1)|0;
     $expanded13 = $expanded14 ^ -1;
     $150 = $148 & $expanded13;
     $151 = $150;
     $152 = HEAP32[$151>>2]|0;
     $arglist_next3 = ((($151)) + 4|0);
     HEAP32[$2>>2] = $arglist_next3;
     $364 = $152;
    } else {
     $364 = 0;
    }
    $153 = HEAP32[$5>>2]|0;
    $154 = ((($153)) + 2|0);
    HEAP32[$5>>2] = $154;
    $$0254 = $364;$$pre345 = $154;
   } else {
    $$0254 = -1;$$pre345 = $115;
   }
  } while(0);
  $$0252 = 0;$158 = $$pre345;
  while(1) {
   $157 = HEAP8[$158>>0]|0;
   $159 = $157 << 24 >> 24;
   $160 = (($159) + -65)|0;
   $161 = ($160>>>0)>(57);
   if ($161) {
    $$0 = -1;
    break L1;
   }
   $162 = ((($158)) + 1|0);
   HEAP32[$5>>2] = $162;
   $163 = HEAP8[$158>>0]|0;
   $164 = $163 << 24 >> 24;
   $165 = (($164) + -65)|0;
   $166 = ((990 + (($$0252*58)|0)|0) + ($165)|0);
   $167 = HEAP8[$166>>0]|0;
   $168 = $167&255;
   $169 = (($168) + -1)|0;
   $170 = ($169>>>0)<(8);
   if ($170) {
    $$0252 = $168;$158 = $162;
   } else {
    break;
   }
  }
  $171 = ($167<<24>>24)==(0);
  if ($171) {
   $$0 = -1;
   break;
  }
  $172 = ($167<<24>>24)==(19);
  $173 = ($$0253|0)>(-1);
  do {
   if ($172) {
    if ($173) {
     $$0 = -1;
     break L1;
    } else {
     label = 50;
    }
   } else {
    if ($173) {
     $174 = (($4) + ($$0253<<2)|0);
     HEAP32[$174>>2] = $168;
     $175 = (($3) + ($$0253<<3)|0);
     $176 = $175;
     $177 = $176;
     $178 = HEAP32[$177>>2]|0;
     $179 = (($176) + 4)|0;
     $180 = $179;
     $181 = HEAP32[$180>>2]|0;
     $182 = $6;
     $183 = $182;
     HEAP32[$183>>2] = $178;
     $184 = (($182) + 4)|0;
     $185 = $184;
     HEAP32[$185>>2] = $181;
     label = 50;
     break;
    }
    if (!($10)) {
     $$0 = 0;
     break L1;
    }
    _pop_arg_673($6,$168,$2);
    $$pre346 = HEAP32[$5>>2]|0;
    $187 = $$pre346;
   }
  } while(0);
  if ((label|0) == 50) {
   label = 0;
   if ($10) {
    $187 = $162;
   } else {
    $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
    continue;
   }
  }
  $186 = ((($187)) + -1|0);
  $188 = HEAP8[$186>>0]|0;
  $189 = $188 << 24 >> 24;
  $190 = ($$0252|0)!=(0);
  $191 = $189 & 15;
  $192 = ($191|0)==(3);
  $or$cond276 = $190 & $192;
  $193 = $189 & -33;
  $$0235 = $or$cond276 ? $193 : $189;
  $194 = $$1263 & 8192;
  $195 = ($194|0)==(0);
  $196 = $$1263 & -65537;
  $$1263$ = $195 ? $$1263 : $196;
  L73: do {
   switch ($$0235|0) {
   case 110:  {
    $trunc = $$0252&255;
    switch ($trunc<<24>>24) {
    case 0:  {
     $203 = HEAP32[$6>>2]|0;
     HEAP32[$203>>2] = $$1248;
     $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
     continue L1;
     break;
    }
    case 1:  {
     $204 = HEAP32[$6>>2]|0;
     HEAP32[$204>>2] = $$1248;
     $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
     continue L1;
     break;
    }
    case 2:  {
     $205 = ($$1248|0)<(0);
     $206 = $205 << 31 >> 31;
     $207 = HEAP32[$6>>2]|0;
     $208 = $207;
     $209 = $208;
     HEAP32[$209>>2] = $$1248;
     $210 = (($208) + 4)|0;
     $211 = $210;
     HEAP32[$211>>2] = $206;
     $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
     continue L1;
     break;
    }
    case 3:  {
     $212 = $$1248&65535;
     $213 = HEAP32[$6>>2]|0;
     HEAP16[$213>>1] = $212;
     $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
     continue L1;
     break;
    }
    case 4:  {
     $214 = $$1248&255;
     $215 = HEAP32[$6>>2]|0;
     HEAP8[$215>>0] = $214;
     $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
     continue L1;
     break;
    }
    case 6:  {
     $216 = HEAP32[$6>>2]|0;
     HEAP32[$216>>2] = $$1248;
     $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
     continue L1;
     break;
    }
    case 7:  {
     $217 = ($$1248|0)<(0);
     $218 = $217 << 31 >> 31;
     $219 = HEAP32[$6>>2]|0;
     $220 = $219;
     $221 = $220;
     HEAP32[$221>>2] = $$1248;
     $222 = (($220) + 4)|0;
     $223 = $222;
     HEAP32[$223>>2] = $218;
     $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
     continue L1;
     break;
    }
    default: {
     $$0243 = 0;$$0247 = $$1248;$$0269 = $$3272;
     continue L1;
    }
    }
    break;
   }
   case 112:  {
    $224 = ($$0254>>>0)>(8);
    $225 = $224 ? $$0254 : 8;
    $226 = $$1263$ | 8;
    $$1236 = 120;$$1255 = $225;$$3265 = $226;
    label = 62;
    break;
   }
   case 88: case 120:  {
    $$1236 = $$0235;$$1255 = $$0254;$$3265 = $$1263$;
    label = 62;
    break;
   }
   case 111:  {
    $242 = $6;
    $243 = $242;
    $244 = HEAP32[$243>>2]|0;
    $245 = (($242) + 4)|0;
    $246 = $245;
    $247 = HEAP32[$246>>2]|0;
    $248 = (_fmt_o($244,$247,$11)|0);
    $249 = $$1263$ & 8;
    $250 = ($249|0)==(0);
    $251 = $248;
    $252 = (($12) - ($251))|0;
    $253 = ($$0254|0)>($252|0);
    $254 = (($252) + 1)|0;
    $255 = $250 | $253;
    $$0254$$0254$ = $255 ? $$0254 : $254;
    $$0228 = $248;$$1233 = 0;$$1238 = 1454;$$2256 = $$0254$$0254$;$$4266 = $$1263$;$281 = $244;$283 = $247;
    label = 68;
    break;
   }
   case 105: case 100:  {
    $256 = $6;
    $257 = $256;
    $258 = HEAP32[$257>>2]|0;
    $259 = (($256) + 4)|0;
    $260 = $259;
    $261 = HEAP32[$260>>2]|0;
    $262 = ($261|0)<(0);
    if ($262) {
     $263 = (_i64Subtract(0,0,($258|0),($261|0))|0);
     $264 = tempRet0;
     $265 = $6;
     $266 = $265;
     HEAP32[$266>>2] = $263;
     $267 = (($265) + 4)|0;
     $268 = $267;
     HEAP32[$268>>2] = $264;
     $$0232 = 1;$$0237 = 1454;$275 = $263;$276 = $264;
     label = 67;
     break L73;
    } else {
     $269 = $$1263$ & 2048;
     $270 = ($269|0)==(0);
     $271 = $$1263$ & 1;
     $272 = ($271|0)==(0);
     $$ = $272 ? 1454 : (1456);
     $$$ = $270 ? $$ : (1455);
     $273 = $$1263$ & 2049;
     $274 = ($273|0)!=(0);
     $$279$ = $274&1;
     $$0232 = $$279$;$$0237 = $$$;$275 = $258;$276 = $261;
     label = 67;
     break L73;
    }
    break;
   }
   case 117:  {
    $197 = $6;
    $198 = $197;
    $199 = HEAP32[$198>>2]|0;
    $200 = (($197) + 4)|0;
    $201 = $200;
    $202 = HEAP32[$201>>2]|0;
    $$0232 = 0;$$0237 = 1454;$275 = $199;$276 = $202;
    label = 67;
    break;
   }
   case 99:  {
    $292 = $6;
    $293 = $292;
    $294 = HEAP32[$293>>2]|0;
    $295 = (($292) + 4)|0;
    $296 = $295;
    $297 = HEAP32[$296>>2]|0;
    $298 = $294&255;
    HEAP8[$13>>0] = $298;
    $$2 = $13;$$2234 = 0;$$2239 = 1454;$$2251 = $11;$$5 = 1;$$6268 = $196;
    break;
   }
   case 109:  {
    $299 = (___errno_location()|0);
    $300 = HEAP32[$299>>2]|0;
    $301 = (_strerror($300)|0);
    $$1 = $301;
    label = 72;
    break;
   }
   case 115:  {
    $302 = HEAP32[$6>>2]|0;
    $303 = ($302|0)!=(0|0);
    $304 = $303 ? $302 : 1464;
    $$1 = $304;
    label = 72;
    break;
   }
   case 67:  {
    $311 = $6;
    $312 = $311;
    $313 = HEAP32[$312>>2]|0;
    $314 = (($311) + 4)|0;
    $315 = $314;
    $316 = HEAP32[$315>>2]|0;
    HEAP32[$8>>2] = $313;
    HEAP32[$14>>2] = 0;
    HEAP32[$6>>2] = $8;
    $$4258354 = -1;$365 = $8;
    label = 76;
    break;
   }
   case 83:  {
    $$pre348 = HEAP32[$6>>2]|0;
    $317 = ($$0254|0)==(0);
    if ($317) {
     _pad_676($0,32,$$1260,0,$$1263$);
     $$0240$lcssa356 = 0;
     label = 85;
    } else {
     $$4258354 = $$0254;$365 = $$pre348;
     label = 76;
    }
    break;
   }
   case 65: case 71: case 70: case 69: case 97: case 103: case 102: case 101:  {
    $339 = +HEAPF64[$6>>3];
    $340 = (_fmt_fp($0,$339,$$1260,$$0254,$$1263$,$$0235)|0);
    $$0243 = $340;$$0247 = $$1248;$$0269 = $$3272;
    continue L1;
    break;
   }
   default: {
    $$2 = $20;$$2234 = 0;$$2239 = 1454;$$2251 = $11;$$5 = $$0254;$$6268 = $$1263$;
   }
   }
  } while(0);
  L97: do {
   if ((label|0) == 62) {
    label = 0;
    $227 = $6;
    $228 = $227;
    $229 = HEAP32[$228>>2]|0;
    $230 = (($227) + 4)|0;
    $231 = $230;
    $232 = HEAP32[$231>>2]|0;
    $233 = $$1236 & 32;
    $234 = (_fmt_x($229,$232,$11,$233)|0);
    $235 = ($229|0)==(0);
    $236 = ($232|0)==(0);
    $237 = $235 & $236;
    $238 = $$3265 & 8;
    $239 = ($238|0)==(0);
    $or$cond278 = $239 | $237;
    $240 = $$1236 >> 4;
    $241 = (1454 + ($240)|0);
    $$286 = $or$cond278 ? 1454 : $241;
    $$287 = $or$cond278 ? 0 : 2;
    $$0228 = $234;$$1233 = $$287;$$1238 = $$286;$$2256 = $$1255;$$4266 = $$3265;$281 = $229;$283 = $232;
    label = 68;
   }
   else if ((label|0) == 67) {
    label = 0;
    $277 = (_fmt_u($275,$276,$11)|0);
    $$0228 = $277;$$1233 = $$0232;$$1238 = $$0237;$$2256 = $$0254;$$4266 = $$1263$;$281 = $275;$283 = $276;
    label = 68;
   }
   else if ((label|0) == 72) {
    label = 0;
    $305 = (_memchr($$1,0,$$0254)|0);
    $306 = ($305|0)==(0|0);
    $307 = $305;
    $308 = $$1;
    $309 = (($307) - ($308))|0;
    $310 = (($$1) + ($$0254)|0);
    $$3257 = $306 ? $$0254 : $309;
    $$1250 = $306 ? $310 : $305;
    $$2 = $$1;$$2234 = 0;$$2239 = 1454;$$2251 = $$1250;$$5 = $$3257;$$6268 = $196;
   }
   else if ((label|0) == 76) {
    label = 0;
    $$0229316 = $365;$$0240315 = 0;$$1244314 = 0;
    while(1) {
     $318 = HEAP32[$$0229316>>2]|0;
     $319 = ($318|0)==(0);
     if ($319) {
      $$0240$lcssa = $$0240315;$$2245 = $$1244314;
      break;
     }
     $320 = (_wctomb($9,$318)|0);
     $321 = ($320|0)<(0);
     $322 = (($$4258354) - ($$0240315))|0;
     $323 = ($320>>>0)>($322>>>0);
     $or$cond281 = $321 | $323;
     if ($or$cond281) {
      $$0240$lcssa = $$0240315;$$2245 = $320;
      break;
     }
     $324 = ((($$0229316)) + 4|0);
     $325 = (($320) + ($$0240315))|0;
     $326 = ($$4258354>>>0)>($325>>>0);
     if ($326) {
      $$0229316 = $324;$$0240315 = $325;$$1244314 = $320;
     } else {
      $$0240$lcssa = $325;$$2245 = $320;
      break;
     }
    }
    $327 = ($$2245|0)<(0);
    if ($327) {
     $$0 = -1;
     break L1;
    }
    _pad_676($0,32,$$1260,$$0240$lcssa,$$1263$);
    $328 = ($$0240$lcssa|0)==(0);
    if ($328) {
     $$0240$lcssa356 = 0;
     label = 85;
    } else {
     $$1230327 = $365;$$1241326 = 0;
     while(1) {
      $329 = HEAP32[$$1230327>>2]|0;
      $330 = ($329|0)==(0);
      if ($330) {
       $$0240$lcssa356 = $$0240$lcssa;
       label = 85;
       break L97;
      }
      $331 = (_wctomb($9,$329)|0);
      $332 = (($331) + ($$1241326))|0;
      $333 = ($332|0)>($$0240$lcssa|0);
      if ($333) {
       $$0240$lcssa356 = $$0240$lcssa;
       label = 85;
       break L97;
      }
      $334 = ((($$1230327)) + 4|0);
      _out_670($0,$9,$331);
      $335 = ($332>>>0)<($$0240$lcssa>>>0);
      if ($335) {
       $$1230327 = $334;$$1241326 = $332;
      } else {
       $$0240$lcssa356 = $$0240$lcssa;
       label = 85;
       break;
      }
     }
    }
   }
  } while(0);
  if ((label|0) == 68) {
   label = 0;
   $278 = ($$2256|0)>(-1);
   $279 = $$4266 & -65537;
   $$$4266 = $278 ? $279 : $$4266;
   $280 = ($281|0)!=(0);
   $282 = ($283|0)!=(0);
   $284 = $280 | $282;
   $285 = ($$2256|0)!=(0);
   $or$cond = $285 | $284;
   $286 = $$0228;
   $287 = (($12) - ($286))|0;
   $288 = $284 ^ 1;
   $289 = $288&1;
   $290 = (($287) + ($289))|0;
   $291 = ($$2256|0)>($290|0);
   $$2256$ = $291 ? $$2256 : $290;
   $$2256$$$2256 = $or$cond ? $$2256$ : $$2256;
   $$0228$ = $or$cond ? $$0228 : $11;
   $$2 = $$0228$;$$2234 = $$1233;$$2239 = $$1238;$$2251 = $11;$$5 = $$2256$$$2256;$$6268 = $$$4266;
  }
  else if ((label|0) == 85) {
   label = 0;
   $336 = $$1263$ ^ 8192;
   _pad_676($0,32,$$1260,$$0240$lcssa356,$336);
   $337 = ($$1260|0)>($$0240$lcssa356|0);
   $338 = $337 ? $$1260 : $$0240$lcssa356;
   $$0243 = $338;$$0247 = $$1248;$$0269 = $$3272;
   continue;
  }
  $341 = $$2251;
  $342 = $$2;
  $343 = (($341) - ($342))|0;
  $344 = ($$5|0)<($343|0);
  $$$5 = $344 ? $343 : $$5;
  $345 = (($$$5) + ($$2234))|0;
  $346 = ($$1260|0)<($345|0);
  $$2261 = $346 ? $345 : $$1260;
  _pad_676($0,32,$$2261,$345,$$6268);
  _out_670($0,$$2239,$$2234);
  $347 = $$6268 ^ 65536;
  _pad_676($0,48,$$2261,$345,$347);
  _pad_676($0,48,$$$5,$343,0);
  _out_670($0,$$2,$343);
  $348 = $$6268 ^ 8192;
  _pad_676($0,32,$$2261,$345,$348);
  $$0243 = $$2261;$$0247 = $$1248;$$0269 = $$3272;
 }
 L116: do {
  if ((label|0) == 88) {
   $349 = ($0|0)==(0|0);
   if ($349) {
    $350 = ($$0269|0)==(0);
    if ($350) {
     $$0 = 0;
    } else {
     $$2242302 = 1;
     while(1) {
      $351 = (($4) + ($$2242302<<2)|0);
      $352 = HEAP32[$351>>2]|0;
      $353 = ($352|0)==(0);
      if ($353) {
       $$2242$lcssa = $$2242302;
       break;
      }
      $355 = (($3) + ($$2242302<<3)|0);
      _pop_arg_673($355,$352,$2);
      $356 = (($$2242302) + 1)|0;
      $357 = ($$2242302|0)<(9);
      if ($357) {
       $$2242302 = $356;
      } else {
       $$2242$lcssa = $356;
       break;
      }
     }
     $354 = ($$2242$lcssa|0)<(10);
     if ($354) {
      $$3300 = $$2242$lcssa;
      while(1) {
       $360 = (($4) + ($$3300<<2)|0);
       $361 = HEAP32[$360>>2]|0;
       $362 = ($361|0)==(0);
       if (!($362)) {
        $$0 = -1;
        break L116;
       }
       $358 = (($$3300) + 1)|0;
       $359 = ($$3300|0)<(9);
       if ($359) {
        $$3300 = $358;
       } else {
        $$0 = 1;
        break;
       }
      }
     } else {
      $$0 = 1;
     }
    }
   } else {
    $$0 = $$1248;
   }
  }
 } while(0);
 STACKTOP = sp;return ($$0|0);
}
function _out_670($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = HEAP32[$0>>2]|0;
 $4 = $3 & 32;
 $5 = ($4|0)==(0);
 if ($5) {
  (___fwritex($1,$2,$0)|0);
 }
 return;
}
function _getint_671($0) {
 $0 = $0|0;
 var $$0$lcssa = 0, $$04 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = HEAP32[$0>>2]|0;
 $2 = HEAP8[$1>>0]|0;
 $3 = $2 << 24 >> 24;
 $4 = (_isdigit($3)|0);
 $5 = ($4|0)==(0);
 if ($5) {
  $$0$lcssa = 0;
 } else {
  $$04 = 0;
  while(1) {
   $6 = ($$04*10)|0;
   $7 = HEAP32[$0>>2]|0;
   $8 = HEAP8[$7>>0]|0;
   $9 = $8 << 24 >> 24;
   $10 = (($6) + -48)|0;
   $11 = (($10) + ($9))|0;
   $12 = ((($7)) + 1|0);
   HEAP32[$0>>2] = $12;
   $13 = HEAP8[$12>>0]|0;
   $14 = $13 << 24 >> 24;
   $15 = (_isdigit($14)|0);
   $16 = ($15|0)==(0);
   if ($16) {
    $$0$lcssa = $11;
    break;
   } else {
    $$04 = $11;
   }
  }
 }
 return ($$0$lcssa|0);
}
function _pop_arg_673($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$mask = 0, $$mask31 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0.0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0.0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0;
 var $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0;
 var $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $arglist_current = 0, $arglist_current11 = 0, $arglist_current14 = 0, $arglist_current17 = 0;
 var $arglist_current2 = 0, $arglist_current20 = 0, $arglist_current23 = 0, $arglist_current26 = 0, $arglist_current5 = 0, $arglist_current8 = 0, $arglist_next = 0, $arglist_next12 = 0, $arglist_next15 = 0, $arglist_next18 = 0, $arglist_next21 = 0, $arglist_next24 = 0, $arglist_next27 = 0, $arglist_next3 = 0, $arglist_next6 = 0, $arglist_next9 = 0, $expanded = 0, $expanded28 = 0, $expanded30 = 0, $expanded31 = 0;
 var $expanded32 = 0, $expanded34 = 0, $expanded35 = 0, $expanded37 = 0, $expanded38 = 0, $expanded39 = 0, $expanded41 = 0, $expanded42 = 0, $expanded44 = 0, $expanded45 = 0, $expanded46 = 0, $expanded48 = 0, $expanded49 = 0, $expanded51 = 0, $expanded52 = 0, $expanded53 = 0, $expanded55 = 0, $expanded56 = 0, $expanded58 = 0, $expanded59 = 0;
 var $expanded60 = 0, $expanded62 = 0, $expanded63 = 0, $expanded65 = 0, $expanded66 = 0, $expanded67 = 0, $expanded69 = 0, $expanded70 = 0, $expanded72 = 0, $expanded73 = 0, $expanded74 = 0, $expanded76 = 0, $expanded77 = 0, $expanded79 = 0, $expanded80 = 0, $expanded81 = 0, $expanded83 = 0, $expanded84 = 0, $expanded86 = 0, $expanded87 = 0;
 var $expanded88 = 0, $expanded90 = 0, $expanded91 = 0, $expanded93 = 0, $expanded94 = 0, $expanded95 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = ($1>>>0)>(20);
 L1: do {
  if (!($3)) {
   do {
    switch ($1|0) {
    case 9:  {
     $arglist_current = HEAP32[$2>>2]|0;
     $4 = $arglist_current;
     $5 = ((0) + 4|0);
     $expanded28 = $5;
     $expanded = (($expanded28) - 1)|0;
     $6 = (($4) + ($expanded))|0;
     $7 = ((0) + 4|0);
     $expanded32 = $7;
     $expanded31 = (($expanded32) - 1)|0;
     $expanded30 = $expanded31 ^ -1;
     $8 = $6 & $expanded30;
     $9 = $8;
     $10 = HEAP32[$9>>2]|0;
     $arglist_next = ((($9)) + 4|0);
     HEAP32[$2>>2] = $arglist_next;
     HEAP32[$0>>2] = $10;
     break L1;
     break;
    }
    case 10:  {
     $arglist_current2 = HEAP32[$2>>2]|0;
     $11 = $arglist_current2;
     $12 = ((0) + 4|0);
     $expanded35 = $12;
     $expanded34 = (($expanded35) - 1)|0;
     $13 = (($11) + ($expanded34))|0;
     $14 = ((0) + 4|0);
     $expanded39 = $14;
     $expanded38 = (($expanded39) - 1)|0;
     $expanded37 = $expanded38 ^ -1;
     $15 = $13 & $expanded37;
     $16 = $15;
     $17 = HEAP32[$16>>2]|0;
     $arglist_next3 = ((($16)) + 4|0);
     HEAP32[$2>>2] = $arglist_next3;
     $18 = ($17|0)<(0);
     $19 = $18 << 31 >> 31;
     $20 = $0;
     $21 = $20;
     HEAP32[$21>>2] = $17;
     $22 = (($20) + 4)|0;
     $23 = $22;
     HEAP32[$23>>2] = $19;
     break L1;
     break;
    }
    case 11:  {
     $arglist_current5 = HEAP32[$2>>2]|0;
     $24 = $arglist_current5;
     $25 = ((0) + 4|0);
     $expanded42 = $25;
     $expanded41 = (($expanded42) - 1)|0;
     $26 = (($24) + ($expanded41))|0;
     $27 = ((0) + 4|0);
     $expanded46 = $27;
     $expanded45 = (($expanded46) - 1)|0;
     $expanded44 = $expanded45 ^ -1;
     $28 = $26 & $expanded44;
     $29 = $28;
     $30 = HEAP32[$29>>2]|0;
     $arglist_next6 = ((($29)) + 4|0);
     HEAP32[$2>>2] = $arglist_next6;
     $31 = $0;
     $32 = $31;
     HEAP32[$32>>2] = $30;
     $33 = (($31) + 4)|0;
     $34 = $33;
     HEAP32[$34>>2] = 0;
     break L1;
     break;
    }
    case 12:  {
     $arglist_current8 = HEAP32[$2>>2]|0;
     $35 = $arglist_current8;
     $36 = ((0) + 8|0);
     $expanded49 = $36;
     $expanded48 = (($expanded49) - 1)|0;
     $37 = (($35) + ($expanded48))|0;
     $38 = ((0) + 8|0);
     $expanded53 = $38;
     $expanded52 = (($expanded53) - 1)|0;
     $expanded51 = $expanded52 ^ -1;
     $39 = $37 & $expanded51;
     $40 = $39;
     $41 = $40;
     $42 = $41;
     $43 = HEAP32[$42>>2]|0;
     $44 = (($41) + 4)|0;
     $45 = $44;
     $46 = HEAP32[$45>>2]|0;
     $arglist_next9 = ((($40)) + 8|0);
     HEAP32[$2>>2] = $arglist_next9;
     $47 = $0;
     $48 = $47;
     HEAP32[$48>>2] = $43;
     $49 = (($47) + 4)|0;
     $50 = $49;
     HEAP32[$50>>2] = $46;
     break L1;
     break;
    }
    case 13:  {
     $arglist_current11 = HEAP32[$2>>2]|0;
     $51 = $arglist_current11;
     $52 = ((0) + 4|0);
     $expanded56 = $52;
     $expanded55 = (($expanded56) - 1)|0;
     $53 = (($51) + ($expanded55))|0;
     $54 = ((0) + 4|0);
     $expanded60 = $54;
     $expanded59 = (($expanded60) - 1)|0;
     $expanded58 = $expanded59 ^ -1;
     $55 = $53 & $expanded58;
     $56 = $55;
     $57 = HEAP32[$56>>2]|0;
     $arglist_next12 = ((($56)) + 4|0);
     HEAP32[$2>>2] = $arglist_next12;
     $58 = $57&65535;
     $59 = $58 << 16 >> 16;
     $60 = ($59|0)<(0);
     $61 = $60 << 31 >> 31;
     $62 = $0;
     $63 = $62;
     HEAP32[$63>>2] = $59;
     $64 = (($62) + 4)|0;
     $65 = $64;
     HEAP32[$65>>2] = $61;
     break L1;
     break;
    }
    case 14:  {
     $arglist_current14 = HEAP32[$2>>2]|0;
     $66 = $arglist_current14;
     $67 = ((0) + 4|0);
     $expanded63 = $67;
     $expanded62 = (($expanded63) - 1)|0;
     $68 = (($66) + ($expanded62))|0;
     $69 = ((0) + 4|0);
     $expanded67 = $69;
     $expanded66 = (($expanded67) - 1)|0;
     $expanded65 = $expanded66 ^ -1;
     $70 = $68 & $expanded65;
     $71 = $70;
     $72 = HEAP32[$71>>2]|0;
     $arglist_next15 = ((($71)) + 4|0);
     HEAP32[$2>>2] = $arglist_next15;
     $$mask31 = $72 & 65535;
     $73 = $0;
     $74 = $73;
     HEAP32[$74>>2] = $$mask31;
     $75 = (($73) + 4)|0;
     $76 = $75;
     HEAP32[$76>>2] = 0;
     break L1;
     break;
    }
    case 15:  {
     $arglist_current17 = HEAP32[$2>>2]|0;
     $77 = $arglist_current17;
     $78 = ((0) + 4|0);
     $expanded70 = $78;
     $expanded69 = (($expanded70) - 1)|0;
     $79 = (($77) + ($expanded69))|0;
     $80 = ((0) + 4|0);
     $expanded74 = $80;
     $expanded73 = (($expanded74) - 1)|0;
     $expanded72 = $expanded73 ^ -1;
     $81 = $79 & $expanded72;
     $82 = $81;
     $83 = HEAP32[$82>>2]|0;
     $arglist_next18 = ((($82)) + 4|0);
     HEAP32[$2>>2] = $arglist_next18;
     $84 = $83&255;
     $85 = $84 << 24 >> 24;
     $86 = ($85|0)<(0);
     $87 = $86 << 31 >> 31;
     $88 = $0;
     $89 = $88;
     HEAP32[$89>>2] = $85;
     $90 = (($88) + 4)|0;
     $91 = $90;
     HEAP32[$91>>2] = $87;
     break L1;
     break;
    }
    case 16:  {
     $arglist_current20 = HEAP32[$2>>2]|0;
     $92 = $arglist_current20;
     $93 = ((0) + 4|0);
     $expanded77 = $93;
     $expanded76 = (($expanded77) - 1)|0;
     $94 = (($92) + ($expanded76))|0;
     $95 = ((0) + 4|0);
     $expanded81 = $95;
     $expanded80 = (($expanded81) - 1)|0;
     $expanded79 = $expanded80 ^ -1;
     $96 = $94 & $expanded79;
     $97 = $96;
     $98 = HEAP32[$97>>2]|0;
     $arglist_next21 = ((($97)) + 4|0);
     HEAP32[$2>>2] = $arglist_next21;
     $$mask = $98 & 255;
     $99 = $0;
     $100 = $99;
     HEAP32[$100>>2] = $$mask;
     $101 = (($99) + 4)|0;
     $102 = $101;
     HEAP32[$102>>2] = 0;
     break L1;
     break;
    }
    case 17:  {
     $arglist_current23 = HEAP32[$2>>2]|0;
     $103 = $arglist_current23;
     $104 = ((0) + 8|0);
     $expanded84 = $104;
     $expanded83 = (($expanded84) - 1)|0;
     $105 = (($103) + ($expanded83))|0;
     $106 = ((0) + 8|0);
     $expanded88 = $106;
     $expanded87 = (($expanded88) - 1)|0;
     $expanded86 = $expanded87 ^ -1;
     $107 = $105 & $expanded86;
     $108 = $107;
     $109 = +HEAPF64[$108>>3];
     $arglist_next24 = ((($108)) + 8|0);
     HEAP32[$2>>2] = $arglist_next24;
     HEAPF64[$0>>3] = $109;
     break L1;
     break;
    }
    case 18:  {
     $arglist_current26 = HEAP32[$2>>2]|0;
     $110 = $arglist_current26;
     $111 = ((0) + 8|0);
     $expanded91 = $111;
     $expanded90 = (($expanded91) - 1)|0;
     $112 = (($110) + ($expanded90))|0;
     $113 = ((0) + 8|0);
     $expanded95 = $113;
     $expanded94 = (($expanded95) - 1)|0;
     $expanded93 = $expanded94 ^ -1;
     $114 = $112 & $expanded93;
     $115 = $114;
     $116 = +HEAPF64[$115>>3];
     $arglist_next27 = ((($115)) + 8|0);
     HEAP32[$2>>2] = $arglist_next27;
     HEAPF64[$0>>3] = $116;
     break L1;
     break;
    }
    default: {
     break L1;
    }
    }
   } while(0);
  }
 } while(0);
 return;
}
function _fmt_x($0,$1,$2,$3) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 var $$05$lcssa = 0, $$056 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $4 = ($0|0)==(0);
 $5 = ($1|0)==(0);
 $6 = $4 & $5;
 if ($6) {
  $$05$lcssa = $2;
 } else {
  $$056 = $2;$15 = $1;$8 = $0;
  while(1) {
   $7 = $8 & 15;
   $9 = (1506 + ($7)|0);
   $10 = HEAP8[$9>>0]|0;
   $11 = $10&255;
   $12 = $11 | $3;
   $13 = $12&255;
   $14 = ((($$056)) + -1|0);
   HEAP8[$14>>0] = $13;
   $16 = (_bitshift64Lshr(($8|0),($15|0),4)|0);
   $17 = tempRet0;
   $18 = ($16|0)==(0);
   $19 = ($17|0)==(0);
   $20 = $18 & $19;
   if ($20) {
    $$05$lcssa = $14;
    break;
   } else {
    $$056 = $14;$15 = $17;$8 = $16;
   }
  }
 }
 return ($$05$lcssa|0);
}
function _fmt_o($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$0$lcssa = 0, $$06 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = ($0|0)==(0);
 $4 = ($1|0)==(0);
 $5 = $3 & $4;
 if ($5) {
  $$0$lcssa = $2;
 } else {
  $$06 = $2;$11 = $1;$7 = $0;
  while(1) {
   $6 = $7&255;
   $8 = $6 & 7;
   $9 = $8 | 48;
   $10 = ((($$06)) + -1|0);
   HEAP8[$10>>0] = $9;
   $12 = (_bitshift64Lshr(($7|0),($11|0),3)|0);
   $13 = tempRet0;
   $14 = ($12|0)==(0);
   $15 = ($13|0)==(0);
   $16 = $14 & $15;
   if ($16) {
    $$0$lcssa = $10;
    break;
   } else {
    $$06 = $10;$11 = $13;$7 = $12;
   }
  }
 }
 return ($$0$lcssa|0);
}
function _fmt_u($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$010$lcssa$off0 = 0, $$012 = 0, $$09$lcssa = 0, $$0914 = 0, $$1$lcssa = 0, $$111 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = ($1>>>0)>(0);
 $4 = ($0>>>0)>(4294967295);
 $5 = ($1|0)==(0);
 $6 = $5 & $4;
 $7 = $3 | $6;
 if ($7) {
  $$0914 = $2;$8 = $0;$9 = $1;
  while(1) {
   $10 = (___uremdi3(($8|0),($9|0),10,0)|0);
   $11 = tempRet0;
   $12 = $10&255;
   $13 = $12 | 48;
   $14 = ((($$0914)) + -1|0);
   HEAP8[$14>>0] = $13;
   $15 = (___udivdi3(($8|0),($9|0),10,0)|0);
   $16 = tempRet0;
   $17 = ($9>>>0)>(9);
   $18 = ($8>>>0)>(4294967295);
   $19 = ($9|0)==(9);
   $20 = $19 & $18;
   $21 = $17 | $20;
   if ($21) {
    $$0914 = $14;$8 = $15;$9 = $16;
   } else {
    break;
   }
  }
  $$010$lcssa$off0 = $15;$$09$lcssa = $14;
 } else {
  $$010$lcssa$off0 = $0;$$09$lcssa = $2;
 }
 $22 = ($$010$lcssa$off0|0)==(0);
 if ($22) {
  $$1$lcssa = $$09$lcssa;
 } else {
  $$012 = $$010$lcssa$off0;$$111 = $$09$lcssa;
  while(1) {
   $23 = (($$012>>>0) % 10)&-1;
   $24 = $23 | 48;
   $25 = $24&255;
   $26 = ((($$111)) + -1|0);
   HEAP8[$26>>0] = $25;
   $27 = (($$012>>>0) / 10)&-1;
   $28 = ($$012>>>0)<(10);
   if ($28) {
    $$1$lcssa = $26;
    break;
   } else {
    $$012 = $27;$$111 = $26;
   }
  }
 }
 return ($$1$lcssa|0);
}
function _strerror($0) {
 $0 = $0|0;
 var $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = (___pthread_self_85()|0);
 $2 = ((($1)) + 188|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = (___strerror_l($0,$3)|0);
 return ($4|0);
}
function _pad_676($0,$1,$2,$3,$4) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 var $$0$lcssa = 0, $$011 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 256|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(256|0);
 $5 = sp;
 $6 = $4 & 73728;
 $7 = ($6|0)==(0);
 $8 = ($2|0)>($3|0);
 $or$cond = $8 & $7;
 if ($or$cond) {
  $9 = (($2) - ($3))|0;
  $10 = $1 << 24 >> 24;
  $11 = ($9>>>0)<(256);
  $12 = $11 ? $9 : 256;
  (_memset(($5|0),($10|0),($12|0))|0);
  $13 = ($9>>>0)>(255);
  if ($13) {
   $14 = (($2) - ($3))|0;
   $$011 = $9;
   while(1) {
    _out_670($0,$5,256);
    $15 = (($$011) + -256)|0;
    $16 = ($15>>>0)>(255);
    if ($16) {
     $$011 = $15;
    } else {
     break;
    }
   }
   $17 = $14 & 255;
   $$0$lcssa = $17;
  } else {
   $$0$lcssa = $9;
  }
  _out_670($0,$5,$$0$lcssa);
 }
 STACKTOP = sp;return;
}
function _wctomb($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$0 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ($0|0)==(0|0);
 if ($2) {
  $$0 = 0;
 } else {
  $3 = (_wcrtomb($0,$1,0)|0);
  $$0 = $3;
 }
 return ($$0|0);
}
function _fmt_fp($0,$1,$2,$3,$4,$5) {
 $0 = $0|0;
 $1 = +$1;
 $2 = $2|0;
 $3 = $3|0;
 $4 = $4|0;
 $5 = $5|0;
 var $$ = 0, $$$ = 0, $$$$564 = 0.0, $$$3484 = 0, $$$3484699 = 0, $$$3484700 = 0, $$$3501 = 0, $$$4502 = 0, $$$543 = 0.0, $$$564 = 0.0, $$0 = 0, $$0463$lcssa = 0, $$0463587 = 0, $$0464597 = 0, $$0471 = 0.0, $$0479 = 0, $$0487644 = 0, $$0488 = 0, $$0488655 = 0, $$0488657 = 0;
 var $$0496$$9 = 0, $$0497656 = 0, $$0498 = 0, $$0509585 = 0.0, $$0510 = 0, $$0511 = 0, $$0514639 = 0, $$0520 = 0, $$0521 = 0, $$0521$ = 0, $$0523 = 0, $$0527 = 0, $$0527$in633 = 0, $$0530638 = 0, $$1465 = 0, $$1467 = 0.0, $$1469 = 0.0, $$1472 = 0.0, $$1480 = 0, $$1482$lcssa = 0;
 var $$1482663 = 0, $$1489643 = 0, $$1499$lcssa = 0, $$1499662 = 0, $$1508586 = 0, $$1512$lcssa = 0, $$1512610 = 0, $$1515 = 0, $$1524 = 0, $$1526 = 0, $$1528617 = 0, $$1531$lcssa = 0, $$1531632 = 0, $$1601 = 0, $$2 = 0, $$2473 = 0.0, $$2476 = 0, $$2476$$549 = 0, $$2476$$551 = 0, $$2483$ph = 0;
 var $$2500 = 0, $$2513 = 0, $$2516621 = 0, $$2529 = 0, $$2532620 = 0, $$3 = 0.0, $$3477 = 0, $$3484$lcssa = 0, $$3484650 = 0, $$3501$lcssa = 0, $$3501649 = 0, $$3533616 = 0, $$4 = 0.0, $$4478$lcssa = 0, $$4478593 = 0, $$4492 = 0, $$4502 = 0, $$4518 = 0, $$5$lcssa = 0, $$534$ = 0;
 var $$540 = 0, $$540$ = 0, $$543 = 0.0, $$548 = 0, $$5486$lcssa = 0, $$5486626 = 0, $$5493600 = 0, $$550 = 0, $$5519$ph = 0, $$557 = 0, $$5605 = 0, $$561 = 0, $$564 = 0.0, $$6 = 0, $$6494592 = 0, $$7495604 = 0, $$7505 = 0, $$7505$ = 0, $$7505$ph = 0, $$8 = 0;
 var $$9$ph = 0, $$lcssa675 = 0, $$neg = 0, $$neg568 = 0, $$pn = 0, $$pr = 0, $$pr566 = 0, $$pre = 0, $$pre$phi691Z2D = 0, $$pre$phi698Z2D = 0, $$pre690 = 0, $$pre693 = 0, $$pre697 = 0, $$sink = 0, $$sink547$lcssa = 0, $$sink547625 = 0, $$sink560 = 0, $10 = 0, $100 = 0, $101 = 0;
 var $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0.0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0.0, $119 = 0.0, $12 = 0;
 var $120 = 0.0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0;
 var $139 = 0, $14 = 0.0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0;
 var $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0;
 var $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0;
 var $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0;
 var $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0;
 var $23 = 0, $230 = 0, $231 = 0.0, $232 = 0.0, $233 = 0, $234 = 0.0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0;
 var $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0;
 var $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0;
 var $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $30 = 0, $300 = 0, $301 = 0;
 var $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0;
 var $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0;
 var $339 = 0, $34 = 0.0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0.0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0;
 var $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0;
 var $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $50 = 0.0, $51 = 0, $52 = 0, $53 = 0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0;
 var $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0.0, $88 = 0.0, $89 = 0.0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0;
 var $97 = 0, $98 = 0, $99 = 0, $not$ = 0, $or$cond = 0, $or$cond3$not = 0, $or$cond542 = 0, $or$cond545 = 0, $or$cond556 = 0, $or$cond6 = 0, $scevgep686 = 0, $scevgep686687 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 560|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abortStackOverflow(560|0);
 $6 = sp + 8|0;
 $7 = sp;
 $8 = sp + 524|0;
 $9 = $8;
 $10 = sp + 512|0;
 HEAP32[$7>>2] = 0;
 $11 = ((($10)) + 12|0);
 (___DOUBLE_BITS_677($1)|0);
 $12 = tempRet0;
 $13 = ($12|0)<(0);
 if ($13) {
  $14 = - $1;
  $$0471 = $14;$$0520 = 1;$$0521 = 1471;
 } else {
  $15 = $4 & 2048;
  $16 = ($15|0)==(0);
  $17 = $4 & 1;
  $18 = ($17|0)==(0);
  $$ = $18 ? (1472) : (1477);
  $$$ = $16 ? $$ : (1474);
  $19 = $4 & 2049;
  $20 = ($19|0)!=(0);
  $$534$ = $20&1;
  $$0471 = $1;$$0520 = $$534$;$$0521 = $$$;
 }
 (___DOUBLE_BITS_677($$0471)|0);
 $21 = tempRet0;
 $22 = $21 & 2146435072;
 $23 = (0)==(0);
 $24 = ($22|0)==(2146435072);
 $25 = $23 & $24;
 do {
  if ($25) {
   $26 = $5 & 32;
   $27 = ($26|0)!=(0);
   $28 = $27 ? 1490 : 1494;
   $29 = ($$0471 != $$0471) | (0.0 != 0.0);
   $30 = $27 ? 1498 : 1502;
   $$0510 = $29 ? $30 : $28;
   $31 = (($$0520) + 3)|0;
   $32 = $4 & -65537;
   _pad_676($0,32,$2,$31,$32);
   _out_670($0,$$0521,$$0520);
   _out_670($0,$$0510,3);
   $33 = $4 ^ 8192;
   _pad_676($0,32,$2,$31,$33);
   $$sink560 = $31;
  } else {
   $34 = (+_frexpl($$0471,$7));
   $35 = $34 * 2.0;
   $36 = $35 != 0.0;
   if ($36) {
    $37 = HEAP32[$7>>2]|0;
    $38 = (($37) + -1)|0;
    HEAP32[$7>>2] = $38;
   }
   $39 = $5 | 32;
   $40 = ($39|0)==(97);
   if ($40) {
    $41 = $5 & 32;
    $42 = ($41|0)==(0);
    $43 = ((($$0521)) + 9|0);
    $$0521$ = $42 ? $$0521 : $43;
    $44 = $$0520 | 2;
    $45 = ($3>>>0)>(11);
    $46 = (12 - ($3))|0;
    $47 = ($46|0)==(0);
    $48 = $45 | $47;
    do {
     if ($48) {
      $$1472 = $35;
     } else {
      $$0509585 = 8.0;$$1508586 = $46;
      while(1) {
       $49 = (($$1508586) + -1)|0;
       $50 = $$0509585 * 16.0;
       $51 = ($49|0)==(0);
       if ($51) {
        break;
       } else {
        $$0509585 = $50;$$1508586 = $49;
       }
      }
      $52 = HEAP8[$$0521$>>0]|0;
      $53 = ($52<<24>>24)==(45);
      if ($53) {
       $54 = - $35;
       $55 = $54 - $50;
       $56 = $50 + $55;
       $57 = - $56;
       $$1472 = $57;
       break;
      } else {
       $58 = $35 + $50;
       $59 = $58 - $50;
       $$1472 = $59;
       break;
      }
     }
    } while(0);
    $60 = HEAP32[$7>>2]|0;
    $61 = ($60|0)<(0);
    $62 = (0 - ($60))|0;
    $63 = $61 ? $62 : $60;
    $64 = ($63|0)<(0);
    $65 = $64 << 31 >> 31;
    $66 = (_fmt_u($63,$65,$11)|0);
    $67 = ($66|0)==($11|0);
    if ($67) {
     $68 = ((($10)) + 11|0);
     HEAP8[$68>>0] = 48;
     $$0511 = $68;
    } else {
     $$0511 = $66;
    }
    $69 = $60 >> 31;
    $70 = $69 & 2;
    $71 = (($70) + 43)|0;
    $72 = $71&255;
    $73 = ((($$0511)) + -1|0);
    HEAP8[$73>>0] = $72;
    $74 = (($5) + 15)|0;
    $75 = $74&255;
    $76 = ((($$0511)) + -2|0);
    HEAP8[$76>>0] = $75;
    $77 = ($3|0)<(1);
    $78 = $4 & 8;
    $79 = ($78|0)==(0);
    $$0523 = $8;$$2473 = $$1472;
    while(1) {
     $80 = (~~(($$2473)));
     $81 = (1506 + ($80)|0);
     $82 = HEAP8[$81>>0]|0;
     $83 = $82&255;
     $84 = $41 | $83;
     $85 = $84&255;
     $86 = ((($$0523)) + 1|0);
     HEAP8[$$0523>>0] = $85;
     $87 = (+($80|0));
     $88 = $$2473 - $87;
     $89 = $88 * 16.0;
     $90 = $86;
     $91 = (($90) - ($9))|0;
     $92 = ($91|0)==(1);
     if ($92) {
      $93 = $89 == 0.0;
      $or$cond3$not = $77 & $93;
      $or$cond = $79 & $or$cond3$not;
      if ($or$cond) {
       $$1524 = $86;
      } else {
       $94 = ((($$0523)) + 2|0);
       HEAP8[$86>>0] = 46;
       $$1524 = $94;
      }
     } else {
      $$1524 = $86;
     }
     $95 = $89 != 0.0;
     if ($95) {
      $$0523 = $$1524;$$2473 = $89;
     } else {
      break;
     }
    }
    $96 = ($3|0)==(0);
    $$pre693 = $$1524;
    if ($96) {
     label = 24;
    } else {
     $97 = (-2 - ($9))|0;
     $98 = (($97) + ($$pre693))|0;
     $99 = ($98|0)<($3|0);
     if ($99) {
      $100 = (($3) + 2)|0;
      $$pre690 = (($$pre693) - ($9))|0;
      $$pre$phi691Z2D = $$pre690;$$sink = $100;
     } else {
      label = 24;
     }
    }
    if ((label|0) == 24) {
     $101 = (($$pre693) - ($9))|0;
     $$pre$phi691Z2D = $101;$$sink = $101;
    }
    $102 = $11;
    $103 = $76;
    $104 = (($102) - ($103))|0;
    $105 = (($104) + ($44))|0;
    $106 = (($105) + ($$sink))|0;
    _pad_676($0,32,$2,$106,$4);
    _out_670($0,$$0521$,$44);
    $107 = $4 ^ 65536;
    _pad_676($0,48,$2,$106,$107);
    _out_670($0,$8,$$pre$phi691Z2D);
    $108 = (($$sink) - ($$pre$phi691Z2D))|0;
    _pad_676($0,48,$108,0,0);
    _out_670($0,$76,$104);
    $109 = $4 ^ 8192;
    _pad_676($0,32,$2,$106,$109);
    $$sink560 = $106;
    break;
   }
   $110 = ($3|0)<(0);
   $$540 = $110 ? 6 : $3;
   if ($36) {
    $111 = $35 * 268435456.0;
    $112 = HEAP32[$7>>2]|0;
    $113 = (($112) + -28)|0;
    HEAP32[$7>>2] = $113;
    $$3 = $111;$$pr = $113;
   } else {
    $$pre = HEAP32[$7>>2]|0;
    $$3 = $35;$$pr = $$pre;
   }
   $114 = ($$pr|0)<(0);
   $115 = ((($6)) + 288|0);
   $$561 = $114 ? $6 : $115;
   $$0498 = $$561;$$4 = $$3;
   while(1) {
    $116 = (~~(($$4))>>>0);
    HEAP32[$$0498>>2] = $116;
    $117 = ((($$0498)) + 4|0);
    $118 = (+($116>>>0));
    $119 = $$4 - $118;
    $120 = $119 * 1.0E+9;
    $121 = $120 != 0.0;
    if ($121) {
     $$0498 = $117;$$4 = $120;
    } else {
     break;
    }
   }
   $122 = ($$pr|0)>(0);
   if ($122) {
    $$1482663 = $$561;$$1499662 = $117;$124 = $$pr;
    while(1) {
     $123 = ($124|0)<(29);
     $125 = $123 ? $124 : 29;
     $$0488655 = ((($$1499662)) + -4|0);
     $126 = ($$0488655>>>0)<($$1482663>>>0);
     if ($126) {
      $$2483$ph = $$1482663;
     } else {
      $$0488657 = $$0488655;$$0497656 = 0;
      while(1) {
       $127 = HEAP32[$$0488657>>2]|0;
       $128 = (_bitshift64Shl(($127|0),0,($125|0))|0);
       $129 = tempRet0;
       $130 = (_i64Add(($128|0),($129|0),($$0497656|0),0)|0);
       $131 = tempRet0;
       $132 = (___uremdi3(($130|0),($131|0),1000000000,0)|0);
       $133 = tempRet0;
       HEAP32[$$0488657>>2] = $132;
       $134 = (___udivdi3(($130|0),($131|0),1000000000,0)|0);
       $135 = tempRet0;
       $$0488 = ((($$0488657)) + -4|0);
       $136 = ($$0488>>>0)<($$1482663>>>0);
       if ($136) {
        break;
       } else {
        $$0488657 = $$0488;$$0497656 = $134;
       }
      }
      $137 = ($134|0)==(0);
      if ($137) {
       $$2483$ph = $$1482663;
      } else {
       $138 = ((($$1482663)) + -4|0);
       HEAP32[$138>>2] = $134;
       $$2483$ph = $138;
      }
     }
     $$2500 = $$1499662;
     while(1) {
      $139 = ($$2500>>>0)>($$2483$ph>>>0);
      if (!($139)) {
       break;
      }
      $140 = ((($$2500)) + -4|0);
      $141 = HEAP32[$140>>2]|0;
      $142 = ($141|0)==(0);
      if ($142) {
       $$2500 = $140;
      } else {
       break;
      }
     }
     $143 = HEAP32[$7>>2]|0;
     $144 = (($143) - ($125))|0;
     HEAP32[$7>>2] = $144;
     $145 = ($144|0)>(0);
     if ($145) {
      $$1482663 = $$2483$ph;$$1499662 = $$2500;$124 = $144;
     } else {
      $$1482$lcssa = $$2483$ph;$$1499$lcssa = $$2500;$$pr566 = $144;
      break;
     }
    }
   } else {
    $$1482$lcssa = $$561;$$1499$lcssa = $117;$$pr566 = $$pr;
   }
   $146 = ($$pr566|0)<(0);
   if ($146) {
    $147 = (($$540) + 25)|0;
    $148 = (($147|0) / 9)&-1;
    $149 = (($148) + 1)|0;
    $150 = ($39|0)==(102);
    $$3484650 = $$1482$lcssa;$$3501649 = $$1499$lcssa;$152 = $$pr566;
    while(1) {
     $151 = (0 - ($152))|0;
     $153 = ($151|0)<(9);
     $154 = $153 ? $151 : 9;
     $155 = ($$3484650>>>0)<($$3501649>>>0);
     if ($155) {
      $159 = 1 << $154;
      $160 = (($159) + -1)|0;
      $161 = 1000000000 >>> $154;
      $$0487644 = 0;$$1489643 = $$3484650;
      while(1) {
       $162 = HEAP32[$$1489643>>2]|0;
       $163 = $162 & $160;
       $164 = $162 >>> $154;
       $165 = (($164) + ($$0487644))|0;
       HEAP32[$$1489643>>2] = $165;
       $166 = Math_imul($163, $161)|0;
       $167 = ((($$1489643)) + 4|0);
       $168 = ($167>>>0)<($$3501649>>>0);
       if ($168) {
        $$0487644 = $166;$$1489643 = $167;
       } else {
        break;
       }
      }
      $169 = HEAP32[$$3484650>>2]|0;
      $170 = ($169|0)==(0);
      $171 = ((($$3484650)) + 4|0);
      $$$3484 = $170 ? $171 : $$3484650;
      $172 = ($166|0)==(0);
      if ($172) {
       $$$3484700 = $$$3484;$$4502 = $$3501649;
      } else {
       $173 = ((($$3501649)) + 4|0);
       HEAP32[$$3501649>>2] = $166;
       $$$3484700 = $$$3484;$$4502 = $173;
      }
     } else {
      $156 = HEAP32[$$3484650>>2]|0;
      $157 = ($156|0)==(0);
      $158 = ((($$3484650)) + 4|0);
      $$$3484699 = $157 ? $158 : $$3484650;
      $$$3484700 = $$$3484699;$$4502 = $$3501649;
     }
     $174 = $150 ? $$561 : $$$3484700;
     $175 = $$4502;
     $176 = $174;
     $177 = (($175) - ($176))|0;
     $178 = $177 >> 2;
     $179 = ($178|0)>($149|0);
     $180 = (($174) + ($149<<2)|0);
     $$$4502 = $179 ? $180 : $$4502;
     $181 = HEAP32[$7>>2]|0;
     $182 = (($181) + ($154))|0;
     HEAP32[$7>>2] = $182;
     $183 = ($182|0)<(0);
     if ($183) {
      $$3484650 = $$$3484700;$$3501649 = $$$4502;$152 = $182;
     } else {
      $$3484$lcssa = $$$3484700;$$3501$lcssa = $$$4502;
      break;
     }
    }
   } else {
    $$3484$lcssa = $$1482$lcssa;$$3501$lcssa = $$1499$lcssa;
   }
   $184 = ($$3484$lcssa>>>0)<($$3501$lcssa>>>0);
   $185 = $$561;
   if ($184) {
    $186 = $$3484$lcssa;
    $187 = (($185) - ($186))|0;
    $188 = $187 >> 2;
    $189 = ($188*9)|0;
    $190 = HEAP32[$$3484$lcssa>>2]|0;
    $191 = ($190>>>0)<(10);
    if ($191) {
     $$1515 = $189;
    } else {
     $$0514639 = $189;$$0530638 = 10;
     while(1) {
      $192 = ($$0530638*10)|0;
      $193 = (($$0514639) + 1)|0;
      $194 = ($190>>>0)<($192>>>0);
      if ($194) {
       $$1515 = $193;
       break;
      } else {
       $$0514639 = $193;$$0530638 = $192;
      }
     }
    }
   } else {
    $$1515 = 0;
   }
   $195 = ($39|0)!=(102);
   $196 = $195 ? $$1515 : 0;
   $197 = (($$540) - ($196))|0;
   $198 = ($39|0)==(103);
   $199 = ($$540|0)!=(0);
   $200 = $199 & $198;
   $$neg = $200 << 31 >> 31;
   $201 = (($197) + ($$neg))|0;
   $202 = $$3501$lcssa;
   $203 = (($202) - ($185))|0;
   $204 = $203 >> 2;
   $205 = ($204*9)|0;
   $206 = (($205) + -9)|0;
   $207 = ($201|0)<($206|0);
   if ($207) {
    $208 = ((($$561)) + 4|0);
    $209 = (($201) + 9216)|0;
    $210 = (($209|0) / 9)&-1;
    $211 = (($210) + -1024)|0;
    $212 = (($208) + ($211<<2)|0);
    $213 = (($209|0) % 9)&-1;
    $214 = ($213|0)<(8);
    if ($214) {
     $$0527$in633 = $213;$$1531632 = 10;
     while(1) {
      $$0527 = (($$0527$in633) + 1)|0;
      $215 = ($$1531632*10)|0;
      $216 = ($$0527$in633|0)<(7);
      if ($216) {
       $$0527$in633 = $$0527;$$1531632 = $215;
      } else {
       $$1531$lcssa = $215;
       break;
      }
     }
    } else {
     $$1531$lcssa = 10;
    }
    $217 = HEAP32[$212>>2]|0;
    $218 = (($217>>>0) % ($$1531$lcssa>>>0))&-1;
    $219 = ($218|0)==(0);
    $220 = ((($212)) + 4|0);
    $221 = ($220|0)==($$3501$lcssa|0);
    $or$cond542 = $221 & $219;
    if ($or$cond542) {
     $$4492 = $212;$$4518 = $$1515;$$8 = $$3484$lcssa;
    } else {
     $222 = (($217>>>0) / ($$1531$lcssa>>>0))&-1;
     $223 = $222 & 1;
     $224 = ($223|0)==(0);
     $$543 = $224 ? 9007199254740992.0 : 9007199254740994.0;
     $225 = (($$1531$lcssa|0) / 2)&-1;
     $226 = ($218>>>0)<($225>>>0);
     $227 = ($218|0)==($225|0);
     $or$cond545 = $221 & $227;
     $$564 = $or$cond545 ? 1.0 : 1.5;
     $$$564 = $226 ? 0.5 : $$564;
     $228 = ($$0520|0)==(0);
     if ($228) {
      $$1467 = $$$564;$$1469 = $$543;
     } else {
      $229 = HEAP8[$$0521>>0]|0;
      $230 = ($229<<24>>24)==(45);
      $231 = - $$543;
      $232 = - $$$564;
      $$$543 = $230 ? $231 : $$543;
      $$$$564 = $230 ? $232 : $$$564;
      $$1467 = $$$$564;$$1469 = $$$543;
     }
     $233 = (($217) - ($218))|0;
     HEAP32[$212>>2] = $233;
     $234 = $$1469 + $$1467;
     $235 = $234 != $$1469;
     if ($235) {
      $236 = (($233) + ($$1531$lcssa))|0;
      HEAP32[$212>>2] = $236;
      $237 = ($236>>>0)>(999999999);
      if ($237) {
       $$5486626 = $$3484$lcssa;$$sink547625 = $212;
       while(1) {
        $238 = ((($$sink547625)) + -4|0);
        HEAP32[$$sink547625>>2] = 0;
        $239 = ($238>>>0)<($$5486626>>>0);
        if ($239) {
         $240 = ((($$5486626)) + -4|0);
         HEAP32[$240>>2] = 0;
         $$6 = $240;
        } else {
         $$6 = $$5486626;
        }
        $241 = HEAP32[$238>>2]|0;
        $242 = (($241) + 1)|0;
        HEAP32[$238>>2] = $242;
        $243 = ($242>>>0)>(999999999);
        if ($243) {
         $$5486626 = $$6;$$sink547625 = $238;
        } else {
         $$5486$lcssa = $$6;$$sink547$lcssa = $238;
         break;
        }
       }
      } else {
       $$5486$lcssa = $$3484$lcssa;$$sink547$lcssa = $212;
      }
      $244 = $$5486$lcssa;
      $245 = (($185) - ($244))|0;
      $246 = $245 >> 2;
      $247 = ($246*9)|0;
      $248 = HEAP32[$$5486$lcssa>>2]|0;
      $249 = ($248>>>0)<(10);
      if ($249) {
       $$4492 = $$sink547$lcssa;$$4518 = $247;$$8 = $$5486$lcssa;
      } else {
       $$2516621 = $247;$$2532620 = 10;
       while(1) {
        $250 = ($$2532620*10)|0;
        $251 = (($$2516621) + 1)|0;
        $252 = ($248>>>0)<($250>>>0);
        if ($252) {
         $$4492 = $$sink547$lcssa;$$4518 = $251;$$8 = $$5486$lcssa;
         break;
        } else {
         $$2516621 = $251;$$2532620 = $250;
        }
       }
      }
     } else {
      $$4492 = $212;$$4518 = $$1515;$$8 = $$3484$lcssa;
     }
    }
    $253 = ((($$4492)) + 4|0);
    $254 = ($$3501$lcssa>>>0)>($253>>>0);
    $$$3501 = $254 ? $253 : $$3501$lcssa;
    $$5519$ph = $$4518;$$7505$ph = $$$3501;$$9$ph = $$8;
   } else {
    $$5519$ph = $$1515;$$7505$ph = $$3501$lcssa;$$9$ph = $$3484$lcssa;
   }
   $$7505 = $$7505$ph;
   while(1) {
    $255 = ($$7505>>>0)>($$9$ph>>>0);
    if (!($255)) {
     $$lcssa675 = 0;
     break;
    }
    $256 = ((($$7505)) + -4|0);
    $257 = HEAP32[$256>>2]|0;
    $258 = ($257|0)==(0);
    if ($258) {
     $$7505 = $256;
    } else {
     $$lcssa675 = 1;
     break;
    }
   }
   $259 = (0 - ($$5519$ph))|0;
   do {
    if ($198) {
     $not$ = $199 ^ 1;
     $260 = $not$&1;
     $$540$ = (($$540) + ($260))|0;
     $261 = ($$540$|0)>($$5519$ph|0);
     $262 = ($$5519$ph|0)>(-5);
     $or$cond6 = $261 & $262;
     if ($or$cond6) {
      $263 = (($5) + -1)|0;
      $$neg568 = (($$540$) + -1)|0;
      $264 = (($$neg568) - ($$5519$ph))|0;
      $$0479 = $263;$$2476 = $264;
     } else {
      $265 = (($5) + -2)|0;
      $266 = (($$540$) + -1)|0;
      $$0479 = $265;$$2476 = $266;
     }
     $267 = $4 & 8;
     $268 = ($267|0)==(0);
     if ($268) {
      if ($$lcssa675) {
       $269 = ((($$7505)) + -4|0);
       $270 = HEAP32[$269>>2]|0;
       $271 = ($270|0)==(0);
       if ($271) {
        $$2529 = 9;
       } else {
        $272 = (($270>>>0) % 10)&-1;
        $273 = ($272|0)==(0);
        if ($273) {
         $$1528617 = 0;$$3533616 = 10;
         while(1) {
          $274 = ($$3533616*10)|0;
          $275 = (($$1528617) + 1)|0;
          $276 = (($270>>>0) % ($274>>>0))&-1;
          $277 = ($276|0)==(0);
          if ($277) {
           $$1528617 = $275;$$3533616 = $274;
          } else {
           $$2529 = $275;
           break;
          }
         }
        } else {
         $$2529 = 0;
        }
       }
      } else {
       $$2529 = 9;
      }
      $278 = $$0479 | 32;
      $279 = ($278|0)==(102);
      $280 = $$7505;
      $281 = (($280) - ($185))|0;
      $282 = $281 >> 2;
      $283 = ($282*9)|0;
      $284 = (($283) + -9)|0;
      if ($279) {
       $285 = (($284) - ($$2529))|0;
       $286 = ($285|0)>(0);
       $$548 = $286 ? $285 : 0;
       $287 = ($$2476|0)<($$548|0);
       $$2476$$549 = $287 ? $$2476 : $$548;
       $$1480 = $$0479;$$3477 = $$2476$$549;$$pre$phi698Z2D = 0;
       break;
      } else {
       $288 = (($284) + ($$5519$ph))|0;
       $289 = (($288) - ($$2529))|0;
       $290 = ($289|0)>(0);
       $$550 = $290 ? $289 : 0;
       $291 = ($$2476|0)<($$550|0);
       $$2476$$551 = $291 ? $$2476 : $$550;
       $$1480 = $$0479;$$3477 = $$2476$$551;$$pre$phi698Z2D = 0;
       break;
      }
     } else {
      $$1480 = $$0479;$$3477 = $$2476;$$pre$phi698Z2D = $267;
     }
    } else {
     $$pre697 = $4 & 8;
     $$1480 = $5;$$3477 = $$540;$$pre$phi698Z2D = $$pre697;
    }
   } while(0);
   $292 = $$3477 | $$pre$phi698Z2D;
   $293 = ($292|0)!=(0);
   $294 = $293&1;
   $295 = $$1480 | 32;
   $296 = ($295|0)==(102);
   if ($296) {
    $297 = ($$5519$ph|0)>(0);
    $298 = $297 ? $$5519$ph : 0;
    $$2513 = 0;$$pn = $298;
   } else {
    $299 = ($$5519$ph|0)<(0);
    $300 = $299 ? $259 : $$5519$ph;
    $301 = ($300|0)<(0);
    $302 = $301 << 31 >> 31;
    $303 = (_fmt_u($300,$302,$11)|0);
    $304 = $11;
    $305 = $303;
    $306 = (($304) - ($305))|0;
    $307 = ($306|0)<(2);
    if ($307) {
     $$1512610 = $303;
     while(1) {
      $308 = ((($$1512610)) + -1|0);
      HEAP8[$308>>0] = 48;
      $309 = $308;
      $310 = (($304) - ($309))|0;
      $311 = ($310|0)<(2);
      if ($311) {
       $$1512610 = $308;
      } else {
       $$1512$lcssa = $308;
       break;
      }
     }
    } else {
     $$1512$lcssa = $303;
    }
    $312 = $$5519$ph >> 31;
    $313 = $312 & 2;
    $314 = (($313) + 43)|0;
    $315 = $314&255;
    $316 = ((($$1512$lcssa)) + -1|0);
    HEAP8[$316>>0] = $315;
    $317 = $$1480&255;
    $318 = ((($$1512$lcssa)) + -2|0);
    HEAP8[$318>>0] = $317;
    $319 = $318;
    $320 = (($304) - ($319))|0;
    $$2513 = $318;$$pn = $320;
   }
   $321 = (($$0520) + 1)|0;
   $322 = (($321) + ($$3477))|0;
   $$1526 = (($322) + ($294))|0;
   $323 = (($$1526) + ($$pn))|0;
   _pad_676($0,32,$2,$323,$4);
   _out_670($0,$$0521,$$0520);
   $324 = $4 ^ 65536;
   _pad_676($0,48,$2,$323,$324);
   if ($296) {
    $325 = ($$9$ph>>>0)>($$561>>>0);
    $$0496$$9 = $325 ? $$561 : $$9$ph;
    $326 = ((($8)) + 9|0);
    $327 = $326;
    $328 = ((($8)) + 8|0);
    $$5493600 = $$0496$$9;
    while(1) {
     $329 = HEAP32[$$5493600>>2]|0;
     $330 = (_fmt_u($329,0,$326)|0);
     $331 = ($$5493600|0)==($$0496$$9|0);
     if ($331) {
      $337 = ($330|0)==($326|0);
      if ($337) {
       HEAP8[$328>>0] = 48;
       $$1465 = $328;
      } else {
       $$1465 = $330;
      }
     } else {
      $332 = ($330>>>0)>($8>>>0);
      if ($332) {
       $333 = $330;
       $334 = (($333) - ($9))|0;
       _memset(($8|0),48,($334|0))|0;
       $$0464597 = $330;
       while(1) {
        $335 = ((($$0464597)) + -1|0);
        $336 = ($335>>>0)>($8>>>0);
        if ($336) {
         $$0464597 = $335;
        } else {
         $$1465 = $335;
         break;
        }
       }
      } else {
       $$1465 = $330;
      }
     }
     $338 = $$1465;
     $339 = (($327) - ($338))|0;
     _out_670($0,$$1465,$339);
     $340 = ((($$5493600)) + 4|0);
     $341 = ($340>>>0)>($$561>>>0);
     if ($341) {
      break;
     } else {
      $$5493600 = $340;
     }
    }
    $342 = ($292|0)==(0);
    if (!($342)) {
     _out_670($0,1522,1);
    }
    $343 = ($340>>>0)<($$7505>>>0);
    $344 = ($$3477|0)>(0);
    $345 = $343 & $344;
    if ($345) {
     $$4478593 = $$3477;$$6494592 = $340;
     while(1) {
      $346 = HEAP32[$$6494592>>2]|0;
      $347 = (_fmt_u($346,0,$326)|0);
      $348 = ($347>>>0)>($8>>>0);
      if ($348) {
       $349 = $347;
       $350 = (($349) - ($9))|0;
       _memset(($8|0),48,($350|0))|0;
       $$0463587 = $347;
       while(1) {
        $351 = ((($$0463587)) + -1|0);
        $352 = ($351>>>0)>($8>>>0);
        if ($352) {
         $$0463587 = $351;
        } else {
         $$0463$lcssa = $351;
         break;
        }
       }
      } else {
       $$0463$lcssa = $347;
      }
      $353 = ($$4478593|0)<(9);
      $354 = $353 ? $$4478593 : 9;
      _out_670($0,$$0463$lcssa,$354);
      $355 = ((($$6494592)) + 4|0);
      $356 = (($$4478593) + -9)|0;
      $357 = ($355>>>0)<($$7505>>>0);
      $358 = ($$4478593|0)>(9);
      $359 = $357 & $358;
      if ($359) {
       $$4478593 = $356;$$6494592 = $355;
      } else {
       $$4478$lcssa = $356;
       break;
      }
     }
    } else {
     $$4478$lcssa = $$3477;
    }
    $360 = (($$4478$lcssa) + 9)|0;
    _pad_676($0,48,$360,9,0);
   } else {
    $361 = ((($$9$ph)) + 4|0);
    $$7505$ = $$lcssa675 ? $$7505 : $361;
    $362 = ($$3477|0)>(-1);
    if ($362) {
     $363 = ((($8)) + 9|0);
     $364 = ($$pre$phi698Z2D|0)==(0);
     $365 = $363;
     $366 = (0 - ($9))|0;
     $367 = ((($8)) + 8|0);
     $$5605 = $$3477;$$7495604 = $$9$ph;
     while(1) {
      $368 = HEAP32[$$7495604>>2]|0;
      $369 = (_fmt_u($368,0,$363)|0);
      $370 = ($369|0)==($363|0);
      if ($370) {
       HEAP8[$367>>0] = 48;
       $$0 = $367;
      } else {
       $$0 = $369;
      }
      $371 = ($$7495604|0)==($$9$ph|0);
      do {
       if ($371) {
        $375 = ((($$0)) + 1|0);
        _out_670($0,$$0,1);
        $376 = ($$5605|0)<(1);
        $or$cond556 = $364 & $376;
        if ($or$cond556) {
         $$2 = $375;
         break;
        }
        _out_670($0,1522,1);
        $$2 = $375;
       } else {
        $372 = ($$0>>>0)>($8>>>0);
        if (!($372)) {
         $$2 = $$0;
         break;
        }
        $scevgep686 = (($$0) + ($366)|0);
        $scevgep686687 = $scevgep686;
        _memset(($8|0),48,($scevgep686687|0))|0;
        $$1601 = $$0;
        while(1) {
         $373 = ((($$1601)) + -1|0);
         $374 = ($373>>>0)>($8>>>0);
         if ($374) {
          $$1601 = $373;
         } else {
          $$2 = $373;
          break;
         }
        }
       }
      } while(0);
      $377 = $$2;
      $378 = (($365) - ($377))|0;
      $379 = ($$5605|0)>($378|0);
      $380 = $379 ? $378 : $$5605;
      _out_670($0,$$2,$380);
      $381 = (($$5605) - ($378))|0;
      $382 = ((($$7495604)) + 4|0);
      $383 = ($382>>>0)<($$7505$>>>0);
      $384 = ($381|0)>(-1);
      $385 = $383 & $384;
      if ($385) {
       $$5605 = $381;$$7495604 = $382;
      } else {
       $$5$lcssa = $381;
       break;
      }
     }
    } else {
     $$5$lcssa = $$3477;
    }
    $386 = (($$5$lcssa) + 18)|0;
    _pad_676($0,48,$386,18,0);
    $387 = $11;
    $388 = $$2513;
    $389 = (($387) - ($388))|0;
    _out_670($0,$$2513,$389);
   }
   $390 = $4 ^ 8192;
   _pad_676($0,32,$2,$323,$390);
   $$sink560 = $323;
  }
 } while(0);
 $391 = ($$sink560|0)<($2|0);
 $$557 = $391 ? $2 : $$sink560;
 STACKTOP = sp;return ($$557|0);
}
function ___DOUBLE_BITS_677($0) {
 $0 = +$0;
 var $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $0;$1 = HEAP32[tempDoublePtr>>2]|0;
 $2 = HEAP32[tempDoublePtr+4>>2]|0;
 tempRet0 = ($2);
 return ($1|0);
}
function _frexpl($0,$1) {
 $0 = +$0;
 $1 = $1|0;
 var $2 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = (+_frexp($0,$1));
 return (+$2);
}
function _frexp($0,$1) {
 $0 = +$0;
 $1 = $1|0;
 var $$0 = 0.0, $$016 = 0.0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0.0, $storemerge = 0, $trunc$clear = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $0;$2 = HEAP32[tempDoublePtr>>2]|0;
 $3 = HEAP32[tempDoublePtr+4>>2]|0;
 $4 = (_bitshift64Lshr(($2|0),($3|0),52)|0);
 $5 = tempRet0;
 $6 = $4&65535;
 $trunc$clear = $6 & 2047;
 switch ($trunc$clear<<16>>16) {
 case 0:  {
  $7 = $0 != 0.0;
  if ($7) {
   $8 = $0 * 1.8446744073709552E+19;
   $9 = (+_frexp($8,$1));
   $10 = HEAP32[$1>>2]|0;
   $11 = (($10) + -64)|0;
   $$016 = $9;$storemerge = $11;
  } else {
   $$016 = $0;$storemerge = 0;
  }
  HEAP32[$1>>2] = $storemerge;
  $$0 = $$016;
  break;
 }
 case 2047:  {
  $$0 = $0;
  break;
 }
 default: {
  $12 = $4 & 2047;
  $13 = (($12) + -1022)|0;
  HEAP32[$1>>2] = $13;
  $14 = $3 & -2146435073;
  $15 = $14 | 1071644672;
  HEAP32[tempDoublePtr>>2] = $2;HEAP32[tempDoublePtr+4>>2] = $15;$16 = +HEAPF64[tempDoublePtr>>3];
  $$0 = $16;
 }
 }
 return (+$$0);
}
function _wcrtomb($0,$1,$2) {
 $0 = $0|0;
 $1 = $1|0;
 $2 = $2|0;
 var $$0 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $3 = ($0|0)==(0|0);
 do {
  if ($3) {
   $$0 = 1;
  } else {
   $4 = ($1>>>0)<(128);
   if ($4) {
    $5 = $1&255;
    HEAP8[$0>>0] = $5;
    $$0 = 1;
    break;
   }
   $6 = (___pthread_self_910()|0);
   $7 = ((($6)) + 188|0);
   $8 = HEAP32[$7>>2]|0;
   $9 = HEAP32[$8>>2]|0;
   $10 = ($9|0)==(0|0);
   if ($10) {
    $11 = $1 & -128;
    $12 = ($11|0)==(57216);
    if ($12) {
     $14 = $1&255;
     HEAP8[$0>>0] = $14;
     $$0 = 1;
     break;
    } else {
     $13 = (___errno_location()|0);
     HEAP32[$13>>2] = 84;
     $$0 = -1;
     break;
    }
   }
   $15 = ($1>>>0)<(2048);
   if ($15) {
    $16 = $1 >>> 6;
    $17 = $16 | 192;
    $18 = $17&255;
    $19 = ((($0)) + 1|0);
    HEAP8[$0>>0] = $18;
    $20 = $1 & 63;
    $21 = $20 | 128;
    $22 = $21&255;
    HEAP8[$19>>0] = $22;
    $$0 = 2;
    break;
   }
   $23 = ($1>>>0)<(55296);
   $24 = $1 & -8192;
   $25 = ($24|0)==(57344);
   $or$cond = $23 | $25;
   if ($or$cond) {
    $26 = $1 >>> 12;
    $27 = $26 | 224;
    $28 = $27&255;
    $29 = ((($0)) + 1|0);
    HEAP8[$0>>0] = $28;
    $30 = $1 >>> 6;
    $31 = $30 & 63;
    $32 = $31 | 128;
    $33 = $32&255;
    $34 = ((($0)) + 2|0);
    HEAP8[$29>>0] = $33;
    $35 = $1 & 63;
    $36 = $35 | 128;
    $37 = $36&255;
    HEAP8[$34>>0] = $37;
    $$0 = 3;
    break;
   }
   $38 = (($1) + -65536)|0;
   $39 = ($38>>>0)<(1048576);
   if ($39) {
    $40 = $1 >>> 18;
    $41 = $40 | 240;
    $42 = $41&255;
    $43 = ((($0)) + 1|0);
    HEAP8[$0>>0] = $42;
    $44 = $1 >>> 12;
    $45 = $44 & 63;
    $46 = $45 | 128;
    $47 = $46&255;
    $48 = ((($0)) + 2|0);
    HEAP8[$43>>0] = $47;
    $49 = $1 >>> 6;
    $50 = $49 & 63;
    $51 = $50 | 128;
    $52 = $51&255;
    $53 = ((($0)) + 3|0);
    HEAP8[$48>>0] = $52;
    $54 = $1 & 63;
    $55 = $54 | 128;
    $56 = $55&255;
    HEAP8[$53>>0] = $56;
    $$0 = 4;
    break;
   } else {
    $57 = (___errno_location()|0);
    HEAP32[$57>>2] = 84;
    $$0 = -1;
    break;
   }
  }
 } while(0);
 return ($$0|0);
}
function ___pthread_self_910() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_pthread_self()|0);
 return ($0|0);
}
function ___pthread_self_85() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_pthread_self()|0);
 return ($0|0);
}
function ___strerror_l($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $$012$lcssa = 0, $$01214 = 0, $$016 = 0, $$113 = 0, $$115 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $$016 = 0;
 while(1) {
  $3 = (1524 + ($$016)|0);
  $4 = HEAP8[$3>>0]|0;
  $5 = $4&255;
  $6 = ($5|0)==($0|0);
  if ($6) {
   label = 2;
   break;
  }
  $7 = (($$016) + 1)|0;
  $8 = ($7|0)==(87);
  if ($8) {
   $$01214 = 1612;$$115 = 87;
   label = 5;
   break;
  } else {
   $$016 = $7;
  }
 }
 if ((label|0) == 2) {
  $2 = ($$016|0)==(0);
  if ($2) {
   $$012$lcssa = 1612;
  } else {
   $$01214 = 1612;$$115 = $$016;
   label = 5;
  }
 }
 if ((label|0) == 5) {
  while(1) {
   label = 0;
   $$113 = $$01214;
   while(1) {
    $9 = HEAP8[$$113>>0]|0;
    $10 = ($9<<24>>24)==(0);
    $11 = ((($$113)) + 1|0);
    if ($10) {
     break;
    } else {
     $$113 = $11;
    }
   }
   $12 = (($$115) + -1)|0;
   $13 = ($12|0)==(0);
   if ($13) {
    $$012$lcssa = $11;
    break;
   } else {
    $$01214 = $11;$$115 = $12;
    label = 5;
   }
  }
 }
 $14 = ((($1)) + 20|0);
 $15 = HEAP32[$14>>2]|0;
 $16 = (___lctrans($$012$lcssa,$15)|0);
 return ($16|0);
}
function ___lctrans($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = (___lctrans_impl($0,$1)|0);
 return ($2|0);
}
function runPostSets() {
}
function ___muldsi3($a, $b) {
    $a = $a | 0;
    $b = $b | 0;
    var $1 = 0, $2 = 0, $3 = 0, $6 = 0, $8 = 0, $11 = 0, $12 = 0;
    $1 = $a & 65535;
    $2 = $b & 65535;
    $3 = Math_imul($2, $1) | 0;
    $6 = $a >>> 16;
    $8 = ($3 >>> 16) + (Math_imul($2, $6) | 0) | 0;
    $11 = $b >>> 16;
    $12 = Math_imul($11, $1) | 0;
    return (tempRet0 = (($8 >>> 16) + (Math_imul($11, $6) | 0) | 0) + ((($8 & 65535) + $12 | 0) >>> 16) | 0, 0 | ($8 + $12 << 16 | $3 & 65535)) | 0;
}
function ___muldi3($a$0, $a$1, $b$0, $b$1) {
    $a$0 = $a$0 | 0;
    $a$1 = $a$1 | 0;
    $b$0 = $b$0 | 0;
    $b$1 = $b$1 | 0;
    var $x_sroa_0_0_extract_trunc = 0, $y_sroa_0_0_extract_trunc = 0, $1$0 = 0, $1$1 = 0, $2 = 0;
    $x_sroa_0_0_extract_trunc = $a$0;
    $y_sroa_0_0_extract_trunc = $b$0;
    $1$0 = ___muldsi3($x_sroa_0_0_extract_trunc, $y_sroa_0_0_extract_trunc) | 0;
    $1$1 = tempRet0;
    $2 = Math_imul($a$1, $y_sroa_0_0_extract_trunc) | 0;
    return (tempRet0 = ((Math_imul($b$1, $x_sroa_0_0_extract_trunc) | 0) + $2 | 0) + $1$1 | $1$1 & 0, 0 | $1$0 & -1) | 0;
}
function _i64Add(a, b, c, d) {
    /*
      x = a + b*2^32
      y = c + d*2^32
      result = l + h*2^32
    */
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a + c)>>>0;
    h = (b + d + (((l>>>0) < (a>>>0))|0))>>>0; // Add carry from low word to high word on overflow.
    return ((tempRet0 = h,l|0)|0);
}
function _i64Subtract(a, b, c, d) {
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a - c)>>>0;
    h = (b - d)>>>0;
    h = (b - d - (((c>>>0) > (a>>>0))|0))>>>0; // Borrow one from high word to low word on underflow.
    return ((tempRet0 = h,l|0)|0);
}
function _llvm_cttz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((cttz_i8)+(x & 0xff))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((cttz_i8)+(x >>> 24))>>0)])|0) + 24)|0;
}
function ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) {
    $a$0 = $a$0 | 0;
    $a$1 = $a$1 | 0;
    $b$0 = $b$0 | 0;
    $b$1 = $b$1 | 0;
    $rem = $rem | 0;
    var $n_sroa_0_0_extract_trunc = 0, $n_sroa_1_4_extract_shift$0 = 0, $n_sroa_1_4_extract_trunc = 0, $d_sroa_0_0_extract_trunc = 0, $d_sroa_1_4_extract_shift$0 = 0, $d_sroa_1_4_extract_trunc = 0, $4 = 0, $17 = 0, $37 = 0, $49 = 0, $51 = 0, $57 = 0, $58 = 0, $66 = 0, $78 = 0, $86 = 0, $88 = 0, $89 = 0, $91 = 0, $92 = 0, $95 = 0, $105 = 0, $117 = 0, $119 = 0, $125 = 0, $126 = 0, $130 = 0, $q_sroa_1_1_ph = 0, $q_sroa_0_1_ph = 0, $r_sroa_1_1_ph = 0, $r_sroa_0_1_ph = 0, $sr_1_ph = 0, $d_sroa_0_0_insert_insert99$0 = 0, $d_sroa_0_0_insert_insert99$1 = 0, $137$0 = 0, $137$1 = 0, $carry_0203 = 0, $sr_1202 = 0, $r_sroa_0_1201 = 0, $r_sroa_1_1200 = 0, $q_sroa_0_1199 = 0, $q_sroa_1_1198 = 0, $147 = 0, $149 = 0, $r_sroa_0_0_insert_insert42$0 = 0, $r_sroa_0_0_insert_insert42$1 = 0, $150$1 = 0, $151$0 = 0, $152 = 0, $154$0 = 0, $r_sroa_0_0_extract_trunc = 0, $r_sroa_1_4_extract_trunc = 0, $155 = 0, $carry_0_lcssa$0 = 0, $carry_0_lcssa$1 = 0, $r_sroa_0_1_lcssa = 0, $r_sroa_1_1_lcssa = 0, $q_sroa_0_1_lcssa = 0, $q_sroa_1_1_lcssa = 0, $q_sroa_0_0_insert_ext75$0 = 0, $q_sroa_0_0_insert_ext75$1 = 0, $q_sroa_0_0_insert_insert77$1 = 0, $_0$0 = 0, $_0$1 = 0;
    $n_sroa_0_0_extract_trunc = $a$0;
    $n_sroa_1_4_extract_shift$0 = $a$1;
    $n_sroa_1_4_extract_trunc = $n_sroa_1_4_extract_shift$0;
    $d_sroa_0_0_extract_trunc = $b$0;
    $d_sroa_1_4_extract_shift$0 = $b$1;
    $d_sroa_1_4_extract_trunc = $d_sroa_1_4_extract_shift$0;
    if (($n_sroa_1_4_extract_trunc | 0) == 0) {
      $4 = ($rem | 0) != 0;
      if (($d_sroa_1_4_extract_trunc | 0) == 0) {
        if ($4) {
          HEAP32[$rem >> 2] = ($n_sroa_0_0_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
          HEAP32[$rem + 4 >> 2] = 0;
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_0_0_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      } else {
        if (!$4) {
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        HEAP32[$rem >> 2] = $a$0 & -1;
        HEAP32[$rem + 4 >> 2] = $a$1 & 0;
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
    }
    $17 = ($d_sroa_1_4_extract_trunc | 0) == 0;
    do {
      if (($d_sroa_0_0_extract_trunc | 0) == 0) {
        if ($17) {
          if (($rem | 0) != 0) {
            HEAP32[$rem >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
            HEAP32[$rem + 4 >> 2] = 0;
          }
          $_0$1 = 0;
          $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        if (($n_sroa_0_0_extract_trunc | 0) == 0) {
          if (($rem | 0) != 0) {
            HEAP32[$rem >> 2] = 0;
            HEAP32[$rem + 4 >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_1_4_extract_trunc >>> 0);
          }
          $_0$1 = 0;
          $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_1_4_extract_trunc >>> 0) >>> 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        $37 = $d_sroa_1_4_extract_trunc - 1 | 0;
        if (($37 & $d_sroa_1_4_extract_trunc | 0) == 0) {
          if (($rem | 0) != 0) {
            HEAP32[$rem >> 2] = 0 | $a$0 & -1;
            HEAP32[$rem + 4 >> 2] = $37 & $n_sroa_1_4_extract_trunc | $a$1 & 0;
          }
          $_0$1 = 0;
          $_0$0 = $n_sroa_1_4_extract_trunc >>> ((_llvm_cttz_i32($d_sroa_1_4_extract_trunc | 0) | 0) >>> 0);
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        $49 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
        $51 = $49 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        if ($51 >>> 0 <= 30) {
          $57 = $51 + 1 | 0;
          $58 = 31 - $51 | 0;
          $sr_1_ph = $57;
          $r_sroa_0_1_ph = $n_sroa_1_4_extract_trunc << $58 | $n_sroa_0_0_extract_trunc >>> ($57 >>> 0);
          $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($57 >>> 0);
          $q_sroa_0_1_ph = 0;
          $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $58;
          break;
        }
        if (($rem | 0) == 0) {
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        HEAP32[$rem >> 2] = 0 | $a$0 & -1;
        HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      } else {
        if (!$17) {
          $117 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
          $119 = $117 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
          if ($119 >>> 0 <= 31) {
            $125 = $119 + 1 | 0;
            $126 = 31 - $119 | 0;
            $130 = $119 - 31 >> 31;
            $sr_1_ph = $125;
            $r_sroa_0_1_ph = $n_sroa_0_0_extract_trunc >>> ($125 >>> 0) & $130 | $n_sroa_1_4_extract_trunc << $126;
            $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($125 >>> 0) & $130;
            $q_sroa_0_1_ph = 0;
            $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $126;
            break;
          }
          if (($rem | 0) == 0) {
            $_0$1 = 0;
            $_0$0 = 0;
            return (tempRet0 = $_0$1, $_0$0) | 0;
          }
          HEAP32[$rem >> 2] = 0 | $a$0 & -1;
          HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        $66 = $d_sroa_0_0_extract_trunc - 1 | 0;
        if (($66 & $d_sroa_0_0_extract_trunc | 0) != 0) {
          $86 = (Math_clz32($d_sroa_0_0_extract_trunc | 0) | 0) + 33 | 0;
          $88 = $86 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
          $89 = 64 - $88 | 0;
          $91 = 32 - $88 | 0;
          $92 = $91 >> 31;
          $95 = $88 - 32 | 0;
          $105 = $95 >> 31;
          $sr_1_ph = $88;
          $r_sroa_0_1_ph = $91 - 1 >> 31 & $n_sroa_1_4_extract_trunc >>> ($95 >>> 0) | ($n_sroa_1_4_extract_trunc << $91 | $n_sroa_0_0_extract_trunc >>> ($88 >>> 0)) & $105;
          $r_sroa_1_1_ph = $105 & $n_sroa_1_4_extract_trunc >>> ($88 >>> 0);
          $q_sroa_0_1_ph = $n_sroa_0_0_extract_trunc << $89 & $92;
          $q_sroa_1_1_ph = ($n_sroa_1_4_extract_trunc << $89 | $n_sroa_0_0_extract_trunc >>> ($95 >>> 0)) & $92 | $n_sroa_0_0_extract_trunc << $91 & $88 - 33 >> 31;
          break;
        }
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = $66 & $n_sroa_0_0_extract_trunc;
          HEAP32[$rem + 4 >> 2] = 0;
        }
        if (($d_sroa_0_0_extract_trunc | 0) == 1) {
          $_0$1 = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
          $_0$0 = 0 | $a$0 & -1;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        } else {
          $78 = _llvm_cttz_i32($d_sroa_0_0_extract_trunc | 0) | 0;
          $_0$1 = 0 | $n_sroa_1_4_extract_trunc >>> ($78 >>> 0);
          $_0$0 = $n_sroa_1_4_extract_trunc << 32 - $78 | $n_sroa_0_0_extract_trunc >>> ($78 >>> 0) | 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
      }
    } while (0);
    if (($sr_1_ph | 0) == 0) {
      $q_sroa_1_1_lcssa = $q_sroa_1_1_ph;
      $q_sroa_0_1_lcssa = $q_sroa_0_1_ph;
      $r_sroa_1_1_lcssa = $r_sroa_1_1_ph;
      $r_sroa_0_1_lcssa = $r_sroa_0_1_ph;
      $carry_0_lcssa$1 = 0;
      $carry_0_lcssa$0 = 0;
    } else {
      $d_sroa_0_0_insert_insert99$0 = 0 | $b$0 & -1;
      $d_sroa_0_0_insert_insert99$1 = $d_sroa_1_4_extract_shift$0 | $b$1 & 0;
      $137$0 = _i64Add($d_sroa_0_0_insert_insert99$0 | 0, $d_sroa_0_0_insert_insert99$1 | 0, -1, -1) | 0;
      $137$1 = tempRet0;
      $q_sroa_1_1198 = $q_sroa_1_1_ph;
      $q_sroa_0_1199 = $q_sroa_0_1_ph;
      $r_sroa_1_1200 = $r_sroa_1_1_ph;
      $r_sroa_0_1201 = $r_sroa_0_1_ph;
      $sr_1202 = $sr_1_ph;
      $carry_0203 = 0;
      while (1) {
        $147 = $q_sroa_0_1199 >>> 31 | $q_sroa_1_1198 << 1;
        $149 = $carry_0203 | $q_sroa_0_1199 << 1;
        $r_sroa_0_0_insert_insert42$0 = 0 | ($r_sroa_0_1201 << 1 | $q_sroa_1_1198 >>> 31);
        $r_sroa_0_0_insert_insert42$1 = $r_sroa_0_1201 >>> 31 | $r_sroa_1_1200 << 1 | 0;
        _i64Subtract($137$0 | 0, $137$1 | 0, $r_sroa_0_0_insert_insert42$0 | 0, $r_sroa_0_0_insert_insert42$1 | 0) | 0;
        $150$1 = tempRet0;
        $151$0 = $150$1 >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1;
        $152 = $151$0 & 1;
        $154$0 = _i64Subtract($r_sroa_0_0_insert_insert42$0 | 0, $r_sroa_0_0_insert_insert42$1 | 0, $151$0 & $d_sroa_0_0_insert_insert99$0 | 0, ((($150$1 | 0) < 0 ? -1 : 0) >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1) & $d_sroa_0_0_insert_insert99$1 | 0) | 0;
        $r_sroa_0_0_extract_trunc = $154$0;
        $r_sroa_1_4_extract_trunc = tempRet0;
        $155 = $sr_1202 - 1 | 0;
        if (($155 | 0) == 0) {
          break;
        } else {
          $q_sroa_1_1198 = $147;
          $q_sroa_0_1199 = $149;
          $r_sroa_1_1200 = $r_sroa_1_4_extract_trunc;
          $r_sroa_0_1201 = $r_sroa_0_0_extract_trunc;
          $sr_1202 = $155;
          $carry_0203 = $152;
        }
      }
      $q_sroa_1_1_lcssa = $147;
      $q_sroa_0_1_lcssa = $149;
      $r_sroa_1_1_lcssa = $r_sroa_1_4_extract_trunc;
      $r_sroa_0_1_lcssa = $r_sroa_0_0_extract_trunc;
      $carry_0_lcssa$1 = 0;
      $carry_0_lcssa$0 = $152;
    }
    $q_sroa_0_0_insert_ext75$0 = $q_sroa_0_1_lcssa;
    $q_sroa_0_0_insert_ext75$1 = 0;
    $q_sroa_0_0_insert_insert77$1 = $q_sroa_1_1_lcssa | $q_sroa_0_0_insert_ext75$1;
    if (($rem | 0) != 0) {
      HEAP32[$rem >> 2] = 0 | $r_sroa_0_1_lcssa;
      HEAP32[$rem + 4 >> 2] = $r_sroa_1_1_lcssa | 0;
    }
    $_0$1 = (0 | $q_sroa_0_0_insert_ext75$0) >>> 31 | $q_sroa_0_0_insert_insert77$1 << 1 | ($q_sroa_0_0_insert_ext75$1 << 1 | $q_sroa_0_0_insert_ext75$0 >>> 31) & 0 | $carry_0_lcssa$1;
    $_0$0 = ($q_sroa_0_0_insert_ext75$0 << 1 | 0 >>> 31) & -2 | $carry_0_lcssa$0;
    return (tempRet0 = $_0$1, $_0$0) | 0;
}
function ___udivdi3($a$0, $a$1, $b$0, $b$1) {
    $a$0 = $a$0 | 0;
    $a$1 = $a$1 | 0;
    $b$0 = $b$0 | 0;
    $b$1 = $b$1 | 0;
    var $1$0 = 0;
    $1$0 = ___udivmoddi4($a$0, $a$1, $b$0, $b$1, 0) | 0;
    return $1$0 | 0;
}
function ___uremdi3($a$0, $a$1, $b$0, $b$1) {
    $a$0 = $a$0 | 0;
    $a$1 = $a$1 | 0;
    $b$0 = $b$0 | 0;
    $b$1 = $b$1 | 0;
    var $rem = 0, __stackBase__ = 0;
    __stackBase__ = STACKTOP;
    STACKTOP = STACKTOP + 16 | 0;
    $rem = __stackBase__ | 0;
    ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) | 0;
    STACKTOP = __stackBase__;
    return (tempRet0 = HEAP32[$rem + 4 >> 2] | 0, HEAP32[$rem >> 2] | 0) | 0;
}
function _bitshift64Lshr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >>> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = 0;
    return (high >>> (bits - 32))|0;
}
function _bitshift64Shl(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = (high << bits) | ((low&(ander << (32 - bits))) >>> (32 - bits));
      return low << bits;
    }
    tempRet0 = low << (bits - 32);
    return 0;
}
function _llvm_bswap_i32(x) {
    x = x|0;
    return (((x&0xff)<<24) | (((x>>8)&0xff)<<16) | (((x>>16)&0xff)<<8) | (x>>>24))|0;
}
function _memcpy(dest, src, num) {
    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    var aligned_dest_end = 0;
    var block_aligned_dest_end = 0;
    var dest_end = 0;
    // Test against a benchmarked cutoff limit for when HEAPU8.set() becomes faster to use.
    if ((num|0) >=
      8192
    ) {
      return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    }

    ret = dest|0;
    dest_end = (dest + num)|0;
    if ((dest&3) == (src&3)) {
      // The initial unaligned < 4-byte front.
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      aligned_dest_end = (dest_end & -4)|0;
      block_aligned_dest_end = (aligned_dest_end - 64)|0;
      while ((dest|0) <= (block_aligned_dest_end|0) ) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        HEAP32[(((dest)+(4))>>2)]=((HEAP32[(((src)+(4))>>2)])|0);
        HEAP32[(((dest)+(8))>>2)]=((HEAP32[(((src)+(8))>>2)])|0);
        HEAP32[(((dest)+(12))>>2)]=((HEAP32[(((src)+(12))>>2)])|0);
        HEAP32[(((dest)+(16))>>2)]=((HEAP32[(((src)+(16))>>2)])|0);
        HEAP32[(((dest)+(20))>>2)]=((HEAP32[(((src)+(20))>>2)])|0);
        HEAP32[(((dest)+(24))>>2)]=((HEAP32[(((src)+(24))>>2)])|0);
        HEAP32[(((dest)+(28))>>2)]=((HEAP32[(((src)+(28))>>2)])|0);
        HEAP32[(((dest)+(32))>>2)]=((HEAP32[(((src)+(32))>>2)])|0);
        HEAP32[(((dest)+(36))>>2)]=((HEAP32[(((src)+(36))>>2)])|0);
        HEAP32[(((dest)+(40))>>2)]=((HEAP32[(((src)+(40))>>2)])|0);
        HEAP32[(((dest)+(44))>>2)]=((HEAP32[(((src)+(44))>>2)])|0);
        HEAP32[(((dest)+(48))>>2)]=((HEAP32[(((src)+(48))>>2)])|0);
        HEAP32[(((dest)+(52))>>2)]=((HEAP32[(((src)+(52))>>2)])|0);
        HEAP32[(((dest)+(56))>>2)]=((HEAP32[(((src)+(56))>>2)])|0);
        HEAP32[(((dest)+(60))>>2)]=((HEAP32[(((src)+(60))>>2)])|0);
        dest = (dest+64)|0;
        src = (src+64)|0;
      }
      while ((dest|0) < (aligned_dest_end|0) ) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
      }
    } else {
      // In the unaligned copy case, unroll a bit as well.
      aligned_dest_end = (dest_end - 4)|0;
      while ((dest|0) < (aligned_dest_end|0) ) {
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        HEAP8[(((dest)+(1))>>0)]=((HEAP8[(((src)+(1))>>0)])|0);
        HEAP8[(((dest)+(2))>>0)]=((HEAP8[(((src)+(2))>>0)])|0);
        HEAP8[(((dest)+(3))>>0)]=((HEAP8[(((src)+(3))>>0)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
      }
    }
    // The remaining unaligned < 4 byte tail.
    while ((dest|0) < (dest_end|0)) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
    }
    return ret|0;
}
function _memmove(dest, src, num) {
    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if (((src|0) < (dest|0)) & ((dest|0) < ((src + num)|0))) {
      // Unlikely case: Copy backwards in a safe manner
      ret = dest;
      src = (src + num)|0;
      dest = (dest + num)|0;
      while ((num|0) > 0) {
        dest = (dest - 1)|0;
        src = (src - 1)|0;
        num = (num - 1)|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      }
      dest = ret;
    } else {
      _memcpy(dest, src, num) | 0;
    }
    return dest | 0;
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var end = 0, aligned_end = 0, block_aligned_end = 0, value4 = 0;
    end = (ptr + num)|0;

    value = value & 0xff;
    if ((num|0) >= 67 /* 64 bytes for an unrolled loop + 3 bytes for unaligned head*/) {
      while ((ptr&3) != 0) {
        HEAP8[((ptr)>>0)]=value;
        ptr = (ptr+1)|0;
      }

      aligned_end = (end & -4)|0;
      block_aligned_end = (aligned_end - 64)|0;
      value4 = value | (value << 8) | (value << 16) | (value << 24);

      while((ptr|0) <= (block_aligned_end|0)) {
        HEAP32[((ptr)>>2)]=value4;
        HEAP32[(((ptr)+(4))>>2)]=value4;
        HEAP32[(((ptr)+(8))>>2)]=value4;
        HEAP32[(((ptr)+(12))>>2)]=value4;
        HEAP32[(((ptr)+(16))>>2)]=value4;
        HEAP32[(((ptr)+(20))>>2)]=value4;
        HEAP32[(((ptr)+(24))>>2)]=value4;
        HEAP32[(((ptr)+(28))>>2)]=value4;
        HEAP32[(((ptr)+(32))>>2)]=value4;
        HEAP32[(((ptr)+(36))>>2)]=value4;
        HEAP32[(((ptr)+(40))>>2)]=value4;
        HEAP32[(((ptr)+(44))>>2)]=value4;
        HEAP32[(((ptr)+(48))>>2)]=value4;
        HEAP32[(((ptr)+(52))>>2)]=value4;
        HEAP32[(((ptr)+(56))>>2)]=value4;
        HEAP32[(((ptr)+(60))>>2)]=value4;
        ptr = (ptr + 64)|0;
      }

      while ((ptr|0) < (aligned_end|0) ) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    // The remaining bytes.
    while ((ptr|0) < (end|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (end-num)|0;
}
function _sbrk(increment) {
    increment = increment|0;
    var oldDynamicTop = 0;
    var oldDynamicTopOnChange = 0;
    var newDynamicTop = 0;
    var totalMemory = 0;
    oldDynamicTop = HEAP32[DYNAMICTOP_PTR>>2]|0;
    newDynamicTop = oldDynamicTop + increment | 0;

    if (((increment|0) > 0 & (newDynamicTop|0) < (oldDynamicTop|0)) // Detect and fail if we would wrap around signed 32-bit int.
      | (newDynamicTop|0) < 0) { // Also underflow, sbrk() should be able to be used to subtract.
      abortOnCannotGrowMemory()|0;
      ___setErrNo(12);
      return -1;
    }

    HEAP32[DYNAMICTOP_PTR>>2] = newDynamicTop;
    totalMemory = getTotalMemory()|0;
    if ((newDynamicTop|0) > (totalMemory|0)) {
      if ((enlargeMemory()|0) == 0) {
        HEAP32[DYNAMICTOP_PTR>>2] = oldDynamicTop;
        ___setErrNo(12);
        return -1;
      }
    }
    return oldDynamicTop|0;
}

  
function dynCall_ii(index,a1) {
  index = index|0;
  a1=a1|0;
  return FUNCTION_TABLE_ii[index&1](a1|0)|0;
}


function dynCall_iiii(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0;
  return FUNCTION_TABLE_iiii[index&7](a1|0,a2|0,a3|0)|0;
}


function dynCall_vi(index,a1) {
  index = index|0;
  a1=a1|0;
  FUNCTION_TABLE_vi[index&7](a1|0);
}


function dynCall_vii(index,a1,a2) {
  index = index|0;
  a1=a1|0; a2=a2|0;
  FUNCTION_TABLE_vii[index&0](a1|0,a2|0);
}

function b0(p0) {
 p0 = p0|0; nullFunc_ii(0);return 0;
}
function b1(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(1);return 0;
}
function b2(p0) {
 p0 = p0|0; nullFunc_vi(2);
}
function b3(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(3);
}

// EMSCRIPTEN_END_FUNCS
var FUNCTION_TABLE_ii = [b0,___stdio_close];
var FUNCTION_TABLE_iiii = [b1,b1,___stdio_write,___stdio_seek,___stdout_write,b1,b1,b1];
var FUNCTION_TABLE_vi = [b2,b2,b2,b2,b2,_coq_scan_roots,b2,b2];
var FUNCTION_TABLE_vii = [b3];

  return { ___errno_location: ___errno_location, ___muldi3: ___muldi3, ___udivdi3: ___udivdi3, ___uremdi3: ___uremdi3, _bitshift64Lshr: _bitshift64Lshr, _bitshift64Shl: _bitshift64Shl, _coq_closure_arity: _coq_closure_arity, _coq_eval_tcode: _coq_eval_tcode, _coq_int_tcode: _coq_int_tcode, _coq_interprete: _coq_interprete, _coq_interprete_ml: _coq_interprete_ml, _coq_is_accumulate_code: _coq_is_accumulate_code, _coq_kind_of_closure: _coq_kind_of_closure, _coq_makeaccu: _coq_makeaccu, _coq_offset: _coq_offset, _coq_offset_closure: _coq_offset_closure, _coq_offset_tcode: _coq_offset_tcode, _coq_push_arguments: _coq_push_arguments, _coq_push_ra: _coq_push_ra, _coq_push_vstack: _coq_push_vstack, _coq_pushpop: _coq_pushpop, _coq_scan_roots: _coq_scan_roots, _coq_set_drawinstr: _coq_set_drawinstr, _coq_stat_alloc: _coq_stat_alloc, _coq_stat_free: _coq_stat_free, _coq_static_alloc: _coq_static_alloc, _coq_tcode_of_code: _coq_tcode_of_code, _fflush: _fflush, _free: _free, _get_coq_atom_tbl: _get_coq_atom_tbl, _get_coq_global_data: _get_coq_global_data, _i64Add: _i64Add, _i64Subtract: _i64Subtract, _init_arity: _init_arity, _init_coq_atom_tbl: _init_coq_atom_tbl, _init_coq_global_data: _init_coq_global_data, _init_coq_interpreter: _init_coq_interpreter, _init_coq_stack: _init_coq_stack, _init_coq_vm: _init_coq_vm, _llvm_bswap_i32: _llvm_bswap_i32, _malloc: _malloc, _memcpy: _memcpy, _memmove: _memmove, _memset: _memset, _realloc_coq_atom_tbl: _realloc_coq_atom_tbl, _realloc_coq_global_data: _realloc_coq_global_data, _realloc_coq_stack: _realloc_coq_stack, _sbrk: _sbrk, dynCall_ii: dynCall_ii, dynCall_iiii: dynCall_iiii, dynCall_vi: dynCall_vi, dynCall_vii: dynCall_vii, establishStackSpace: establishStackSpace, getTempRet0: getTempRet0, runPostSets: runPostSets, setTempRet0: setTempRet0, setThrew: setThrew, stackAlloc: stackAlloc, stackRestore: stackRestore, stackSave: stackSave };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);

var real____errno_location = asm["___errno_location"]; asm["___errno_location"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____errno_location.apply(null, arguments);
};

var real____muldi3 = asm["___muldi3"]; asm["___muldi3"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____muldi3.apply(null, arguments);
};

var real____udivdi3 = asm["___udivdi3"]; asm["___udivdi3"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____udivdi3.apply(null, arguments);
};

var real____uremdi3 = asm["___uremdi3"]; asm["___uremdi3"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real____uremdi3.apply(null, arguments);
};

var real__bitshift64Lshr = asm["_bitshift64Lshr"]; asm["_bitshift64Lshr"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__bitshift64Lshr.apply(null, arguments);
};

var real__bitshift64Shl = asm["_bitshift64Shl"]; asm["_bitshift64Shl"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__bitshift64Shl.apply(null, arguments);
};

var real__coq_closure_arity = asm["_coq_closure_arity"]; asm["_coq_closure_arity"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_closure_arity.apply(null, arguments);
};

var real__coq_eval_tcode = asm["_coq_eval_tcode"]; asm["_coq_eval_tcode"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_eval_tcode.apply(null, arguments);
};

var real__coq_int_tcode = asm["_coq_int_tcode"]; asm["_coq_int_tcode"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_int_tcode.apply(null, arguments);
};

var real__coq_interprete = asm["_coq_interprete"]; asm["_coq_interprete"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_interprete.apply(null, arguments);
};

var real__coq_interprete_ml = asm["_coq_interprete_ml"]; asm["_coq_interprete_ml"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_interprete_ml.apply(null, arguments);
};

var real__coq_is_accumulate_code = asm["_coq_is_accumulate_code"]; asm["_coq_is_accumulate_code"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_is_accumulate_code.apply(null, arguments);
};

var real__coq_kind_of_closure = asm["_coq_kind_of_closure"]; asm["_coq_kind_of_closure"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_kind_of_closure.apply(null, arguments);
};

var real__coq_makeaccu = asm["_coq_makeaccu"]; asm["_coq_makeaccu"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_makeaccu.apply(null, arguments);
};

var real__coq_offset = asm["_coq_offset"]; asm["_coq_offset"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_offset.apply(null, arguments);
};

var real__coq_offset_closure = asm["_coq_offset_closure"]; asm["_coq_offset_closure"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_offset_closure.apply(null, arguments);
};

var real__coq_offset_tcode = asm["_coq_offset_tcode"]; asm["_coq_offset_tcode"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_offset_tcode.apply(null, arguments);
};

var real__coq_push_arguments = asm["_coq_push_arguments"]; asm["_coq_push_arguments"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_push_arguments.apply(null, arguments);
};

var real__coq_push_ra = asm["_coq_push_ra"]; asm["_coq_push_ra"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_push_ra.apply(null, arguments);
};

var real__coq_push_vstack = asm["_coq_push_vstack"]; asm["_coq_push_vstack"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_push_vstack.apply(null, arguments);
};

var real__coq_pushpop = asm["_coq_pushpop"]; asm["_coq_pushpop"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_pushpop.apply(null, arguments);
};

var real__coq_scan_roots = asm["_coq_scan_roots"]; asm["_coq_scan_roots"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_scan_roots.apply(null, arguments);
};

var real__coq_set_drawinstr = asm["_coq_set_drawinstr"]; asm["_coq_set_drawinstr"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_set_drawinstr.apply(null, arguments);
};

var real__coq_stat_alloc = asm["_coq_stat_alloc"]; asm["_coq_stat_alloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_stat_alloc.apply(null, arguments);
};

var real__coq_stat_free = asm["_coq_stat_free"]; asm["_coq_stat_free"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_stat_free.apply(null, arguments);
};

var real__coq_static_alloc = asm["_coq_static_alloc"]; asm["_coq_static_alloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_static_alloc.apply(null, arguments);
};

var real__coq_tcode_of_code = asm["_coq_tcode_of_code"]; asm["_coq_tcode_of_code"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__coq_tcode_of_code.apply(null, arguments);
};

var real__fflush = asm["_fflush"]; asm["_fflush"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__fflush.apply(null, arguments);
};

var real__free = asm["_free"]; asm["_free"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__free.apply(null, arguments);
};

var real__get_coq_atom_tbl = asm["_get_coq_atom_tbl"]; asm["_get_coq_atom_tbl"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__get_coq_atom_tbl.apply(null, arguments);
};

var real__get_coq_global_data = asm["_get_coq_global_data"]; asm["_get_coq_global_data"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__get_coq_global_data.apply(null, arguments);
};

var real__i64Add = asm["_i64Add"]; asm["_i64Add"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__i64Add.apply(null, arguments);
};

var real__i64Subtract = asm["_i64Subtract"]; asm["_i64Subtract"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__i64Subtract.apply(null, arguments);
};

var real__init_arity = asm["_init_arity"]; asm["_init_arity"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__init_arity.apply(null, arguments);
};

var real__init_coq_atom_tbl = asm["_init_coq_atom_tbl"]; asm["_init_coq_atom_tbl"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__init_coq_atom_tbl.apply(null, arguments);
};

var real__init_coq_global_data = asm["_init_coq_global_data"]; asm["_init_coq_global_data"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__init_coq_global_data.apply(null, arguments);
};

var real__init_coq_interpreter = asm["_init_coq_interpreter"]; asm["_init_coq_interpreter"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__init_coq_interpreter.apply(null, arguments);
};

var real__init_coq_stack = asm["_init_coq_stack"]; asm["_init_coq_stack"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__init_coq_stack.apply(null, arguments);
};

var real__init_coq_vm = asm["_init_coq_vm"]; asm["_init_coq_vm"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__init_coq_vm.apply(null, arguments);
};

var real__llvm_bswap_i32 = asm["_llvm_bswap_i32"]; asm["_llvm_bswap_i32"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__llvm_bswap_i32.apply(null, arguments);
};

var real__malloc = asm["_malloc"]; asm["_malloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__malloc.apply(null, arguments);
};

var real__memmove = asm["_memmove"]; asm["_memmove"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__memmove.apply(null, arguments);
};

var real__realloc_coq_atom_tbl = asm["_realloc_coq_atom_tbl"]; asm["_realloc_coq_atom_tbl"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__realloc_coq_atom_tbl.apply(null, arguments);
};

var real__realloc_coq_global_data = asm["_realloc_coq_global_data"]; asm["_realloc_coq_global_data"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__realloc_coq_global_data.apply(null, arguments);
};

var real__realloc_coq_stack = asm["_realloc_coq_stack"]; asm["_realloc_coq_stack"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__realloc_coq_stack.apply(null, arguments);
};

var real__sbrk = asm["_sbrk"]; asm["_sbrk"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real__sbrk.apply(null, arguments);
};

var real_establishStackSpace = asm["establishStackSpace"]; asm["establishStackSpace"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_establishStackSpace.apply(null, arguments);
};

var real_getTempRet0 = asm["getTempRet0"]; asm["getTempRet0"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_getTempRet0.apply(null, arguments);
};

var real_setTempRet0 = asm["setTempRet0"]; asm["setTempRet0"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_setTempRet0.apply(null, arguments);
};

var real_setThrew = asm["setThrew"]; asm["setThrew"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_setThrew.apply(null, arguments);
};

var real_stackAlloc = asm["stackAlloc"]; asm["stackAlloc"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_stackAlloc.apply(null, arguments);
};

var real_stackRestore = asm["stackRestore"]; asm["stackRestore"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_stackRestore.apply(null, arguments);
};

var real_stackSave = asm["stackSave"]; asm["stackSave"] = function() {
  assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
  assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
  return real_stackSave.apply(null, arguments);
};
var ___errno_location = Module["___errno_location"] = asm["___errno_location"];
var ___muldi3 = Module["___muldi3"] = asm["___muldi3"];
var ___udivdi3 = Module["___udivdi3"] = asm["___udivdi3"];
var ___uremdi3 = Module["___uremdi3"] = asm["___uremdi3"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var _coq_closure_arity = Module["_coq_closure_arity"] = asm["_coq_closure_arity"];
var _coq_eval_tcode = Module["_coq_eval_tcode"] = asm["_coq_eval_tcode"];
var _coq_int_tcode = Module["_coq_int_tcode"] = asm["_coq_int_tcode"];
var _coq_interprete = Module["_coq_interprete"] = asm["_coq_interprete"];
var _coq_interprete_ml = Module["_coq_interprete_ml"] = asm["_coq_interprete_ml"];
var _coq_is_accumulate_code = Module["_coq_is_accumulate_code"] = asm["_coq_is_accumulate_code"];
var _coq_kind_of_closure = Module["_coq_kind_of_closure"] = asm["_coq_kind_of_closure"];
var _coq_makeaccu = Module["_coq_makeaccu"] = asm["_coq_makeaccu"];
var _coq_offset = Module["_coq_offset"] = asm["_coq_offset"];
var _coq_offset_closure = Module["_coq_offset_closure"] = asm["_coq_offset_closure"];
var _coq_offset_tcode = Module["_coq_offset_tcode"] = asm["_coq_offset_tcode"];
var _coq_push_arguments = Module["_coq_push_arguments"] = asm["_coq_push_arguments"];
var _coq_push_ra = Module["_coq_push_ra"] = asm["_coq_push_ra"];
var _coq_push_vstack = Module["_coq_push_vstack"] = asm["_coq_push_vstack"];
var _coq_pushpop = Module["_coq_pushpop"] = asm["_coq_pushpop"];
var _coq_scan_roots = Module["_coq_scan_roots"] = asm["_coq_scan_roots"];
var _coq_set_drawinstr = Module["_coq_set_drawinstr"] = asm["_coq_set_drawinstr"];
var _coq_stat_alloc = Module["_coq_stat_alloc"] = asm["_coq_stat_alloc"];
var _coq_stat_free = Module["_coq_stat_free"] = asm["_coq_stat_free"];
var _coq_static_alloc = Module["_coq_static_alloc"] = asm["_coq_static_alloc"];
var _coq_tcode_of_code = Module["_coq_tcode_of_code"] = asm["_coq_tcode_of_code"];
var _fflush = Module["_fflush"] = asm["_fflush"];
var _free = Module["_free"] = asm["_free"];
var _get_coq_atom_tbl = Module["_get_coq_atom_tbl"] = asm["_get_coq_atom_tbl"];
var _get_coq_global_data = Module["_get_coq_global_data"] = asm["_get_coq_global_data"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _init_arity = Module["_init_arity"] = asm["_init_arity"];
var _init_coq_atom_tbl = Module["_init_coq_atom_tbl"] = asm["_init_coq_atom_tbl"];
var _init_coq_global_data = Module["_init_coq_global_data"] = asm["_init_coq_global_data"];
var _init_coq_interpreter = Module["_init_coq_interpreter"] = asm["_init_coq_interpreter"];
var _init_coq_stack = Module["_init_coq_stack"] = asm["_init_coq_stack"];
var _init_coq_vm = Module["_init_coq_vm"] = asm["_init_coq_vm"];
var _llvm_bswap_i32 = Module["_llvm_bswap_i32"] = asm["_llvm_bswap_i32"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _memset = Module["_memset"] = asm["_memset"];
var _realloc_coq_atom_tbl = Module["_realloc_coq_atom_tbl"] = asm["_realloc_coq_atom_tbl"];
var _realloc_coq_global_data = Module["_realloc_coq_global_data"] = asm["_realloc_coq_global_data"];
var _realloc_coq_stack = Module["_realloc_coq_stack"] = asm["_realloc_coq_stack"];
var _sbrk = Module["_sbrk"] = asm["_sbrk"];
var establishStackSpace = Module["establishStackSpace"] = asm["establishStackSpace"];
var getTempRet0 = Module["getTempRet0"] = asm["getTempRet0"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var setTempRet0 = Module["setTempRet0"] = asm["setTempRet0"];
var setThrew = Module["setThrew"] = asm["setThrew"];
var stackAlloc = Module["stackAlloc"] = asm["stackAlloc"];
var stackRestore = Module["stackRestore"] = asm["stackRestore"];
var stackSave = Module["stackSave"] = asm["stackSave"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
;



// === Auto-generated postamble setup entry stuff ===

Module['asm'] = asm;

if (!Module["intArrayFromString"]) Module["intArrayFromString"] = function() { abort("'intArrayFromString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["intArrayToString"]) Module["intArrayToString"] = function() { abort("'intArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["ccall"]) Module["ccall"] = function() { abort("'ccall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["cwrap"]) Module["cwrap"] = function() { abort("'cwrap' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["setValue"]) Module["setValue"] = function() { abort("'setValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getValue"]) Module["getValue"] = function() { abort("'getValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["allocate"]) Module["allocate"] = function() { abort("'allocate' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getMemory"]) Module["getMemory"] = function() { abort("'getMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["Pointer_stringify"]) Module["Pointer_stringify"] = function() { abort("'Pointer_stringify' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["AsciiToString"]) Module["AsciiToString"] = function() { abort("'AsciiToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stringToAscii"]) Module["stringToAscii"] = function() { abort("'stringToAscii' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["UTF8ArrayToString"]) Module["UTF8ArrayToString"] = function() { abort("'UTF8ArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["UTF8ToString"]) Module["UTF8ToString"] = function() { abort("'UTF8ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stringToUTF8Array"]) Module["stringToUTF8Array"] = function() { abort("'stringToUTF8Array' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stringToUTF8"]) Module["stringToUTF8"] = function() { abort("'stringToUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["lengthBytesUTF8"]) Module["lengthBytesUTF8"] = function() { abort("'lengthBytesUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["UTF16ToString"]) Module["UTF16ToString"] = function() { abort("'UTF16ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stringToUTF16"]) Module["stringToUTF16"] = function() { abort("'stringToUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["lengthBytesUTF16"]) Module["lengthBytesUTF16"] = function() { abort("'lengthBytesUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["UTF32ToString"]) Module["UTF32ToString"] = function() { abort("'UTF32ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stringToUTF32"]) Module["stringToUTF32"] = function() { abort("'stringToUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["lengthBytesUTF32"]) Module["lengthBytesUTF32"] = function() { abort("'lengthBytesUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["allocateUTF8"]) Module["allocateUTF8"] = function() { abort("'allocateUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["stackTrace"]) Module["stackTrace"] = function() { abort("'stackTrace' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addOnPreRun"]) Module["addOnPreRun"] = function() { abort("'addOnPreRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addOnInit"]) Module["addOnInit"] = function() { abort("'addOnInit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addOnPreMain"]) Module["addOnPreMain"] = function() { abort("'addOnPreMain' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addOnExit"]) Module["addOnExit"] = function() { abort("'addOnExit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addOnPostRun"]) Module["addOnPostRun"] = function() { abort("'addOnPostRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["writeStringToMemory"]) Module["writeStringToMemory"] = function() { abort("'writeStringToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["writeArrayToMemory"]) Module["writeArrayToMemory"] = function() { abort("'writeArrayToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["writeAsciiToMemory"]) Module["writeAsciiToMemory"] = function() { abort("'writeAsciiToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addRunDependency"]) Module["addRunDependency"] = function() { abort("'addRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["removeRunDependency"]) Module["removeRunDependency"] = function() { abort("'removeRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS"]) Module["FS"] = function() { abort("'FS' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["FS_createFolder"]) Module["FS_createFolder"] = function() { abort("'FS_createFolder' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createPath"]) Module["FS_createPath"] = function() { abort("'FS_createPath' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createDataFile"]) Module["FS_createDataFile"] = function() { abort("'FS_createDataFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createPreloadedFile"]) Module["FS_createPreloadedFile"] = function() { abort("'FS_createPreloadedFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createLazyFile"]) Module["FS_createLazyFile"] = function() { abort("'FS_createLazyFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createLink"]) Module["FS_createLink"] = function() { abort("'FS_createLink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_createDevice"]) Module["FS_createDevice"] = function() { abort("'FS_createDevice' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["FS_unlink"]) Module["FS_unlink"] = function() { abort("'FS_unlink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you") };
if (!Module["GL"]) Module["GL"] = function() { abort("'GL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["staticAlloc"]) Module["staticAlloc"] = function() { abort("'staticAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["dynamicAlloc"]) Module["dynamicAlloc"] = function() { abort("'dynamicAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["warnOnce"]) Module["warnOnce"] = function() { abort("'warnOnce' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["loadDynamicLibrary"]) Module["loadDynamicLibrary"] = function() { abort("'loadDynamicLibrary' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["loadWebAssemblyModule"]) Module["loadWebAssemblyModule"] = function() { abort("'loadWebAssemblyModule' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getLEB"]) Module["getLEB"] = function() { abort("'getLEB' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getFunctionTables"]) Module["getFunctionTables"] = function() { abort("'getFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["alignFunctionTables"]) Module["alignFunctionTables"] = function() { abort("'alignFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["registerFunctions"]) Module["registerFunctions"] = function() { abort("'registerFunctions' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["addFunction"]) Module["addFunction"] = function() { abort("'addFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["removeFunction"]) Module["removeFunction"] = function() { abort("'removeFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getFuncWrapper"]) Module["getFuncWrapper"] = function() { abort("'getFuncWrapper' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["prettyPrint"]) Module["prettyPrint"] = function() { abort("'prettyPrint' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["makeBigInt"]) Module["makeBigInt"] = function() { abort("'makeBigInt' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["dynCall"]) Module["dynCall"] = function() { abort("'dynCall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["getCompilerSetting"]) Module["getCompilerSetting"] = function() { abort("'getCompilerSetting' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["intArrayFromBase64"]) Module["intArrayFromBase64"] = function() { abort("'intArrayFromBase64' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };
if (!Module["tryParseAsDataURI"]) Module["tryParseAsDataURI"] = function() { abort("'tryParseAsDataURI' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") };if (!Module["ALLOC_NORMAL"]) Object.defineProperty(Module, "ALLOC_NORMAL", { get: function() { abort("'ALLOC_NORMAL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Module["ALLOC_STACK"]) Object.defineProperty(Module, "ALLOC_STACK", { get: function() { abort("'ALLOC_STACK' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Module["ALLOC_STATIC"]) Object.defineProperty(Module, "ALLOC_STATIC", { get: function() { abort("'ALLOC_STATIC' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Module["ALLOC_DYNAMIC"]) Object.defineProperty(Module, "ALLOC_DYNAMIC", { get: function() { abort("'ALLOC_DYNAMIC' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });
if (!Module["ALLOC_NONE"]) Object.defineProperty(Module, "ALLOC_NONE", { get: function() { abort("'ALLOC_NONE' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)") } });

if (memoryInitializer) {
  if (!isDataURI(memoryInitializer)) {
    if (typeof Module['locateFile'] === 'function') {
      memoryInitializer = Module['locateFile'](memoryInitializer);
    } else if (Module['memoryInitializerPrefixURL']) {
      memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
    }
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, GLOBAL_BASE);
  } else {
    addRunDependency('memory initializer');
    var applyMemoryInitializer = function(data) {
      if (data.byteLength) data = new Uint8Array(data);
      for (var i = 0; i < data.length; i++) {
        assert(HEAPU8[GLOBAL_BASE + i] === 0, "area for memory initializer should not have been touched before it's loaded");
      }
      HEAPU8.set(data, GLOBAL_BASE);
      // Delete the typed array that contains the large blob of the memory initializer request response so that
      // we won't keep unnecessary memory lying around. However, keep the XHR object itself alive so that e.g.
      // its .status field can still be accessed later.
      if (Module['memoryInitializerRequest']) delete Module['memoryInitializerRequest'].response;
      removeRunDependency('memory initializer');
    }
    function doBrowserLoad() {
      Module['readAsync'](memoryInitializer, applyMemoryInitializer, function() {
        throw 'could not load memory initializer ' + memoryInitializer;
      });
    }
    var memoryInitializerBytes = tryParseAsDataURI(memoryInitializer);
    if (memoryInitializerBytes) {
      applyMemoryInitializer(memoryInitializerBytes.buffer);
    } else
    if (Module['memoryInitializerRequest']) {
      // a network request has already been created, just use that
      function useRequest() {
        var request = Module['memoryInitializerRequest'];
        var response = request.response;
        if (request.status !== 200 && request.status !== 0) {
          var data = tryParseAsDataURI(Module['memoryInitializerRequestURL']);
          if (data) {
            response = data.buffer;
          } else {
            // If you see this warning, the issue may be that you are using locateFile or memoryInitializerPrefixURL, and defining them in JS. That
            // means that the HTML file doesn't know about them, and when it tries to create the mem init request early, does it to the wrong place.
            // Look in your browser's devtools network console to see what's going on.
            console.warn('a problem seems to have happened with Module.memoryInitializerRequest, status: ' + request.status + ', retrying ' + memoryInitializer);
            doBrowserLoad();
            return;
          }
        }
        applyMemoryInitializer(response);
      }
      if (Module['memoryInitializerRequest'].response) {
        setTimeout(useRequest, 0); // it's already here; but, apply it asynchronously
      } else {
        Module['memoryInitializerRequest'].addEventListener('load', useRequest); // wait for it
      }
    } else {
      // fetch it from the network ourselves
      doBrowserLoad();
    }
  }
}


// Modularize mode returns a function, which can be called to
// create instances. The instances provide a then() method,
// must like a Promise, that receives a callback. The callback
// is called when the module is ready to run, with the module
// as a parameter. (Like a Promise, it also returns the module
// so you can use the output of .then(..)).
Module['then'] = function(func) {
  // We may already be ready to run code at this time. if
  // so, just queue a call to the callback.
  if (Module['calledRun']) {
    func(Module);
  } else {
    // we are not ready to call then() yet. we must call it
    // at the same time we would call onRuntimeInitialized.
    var old = Module['onRuntimeInitialized'];
    Module['onRuntimeInitialized'] = function() {
      if (old) old();
      func(Module);
    };
  }
  return Module;
};

/**
 * @constructor
 * @extends {Error}
 * @this {ExitStatus}
 */
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}





/** @type {function(Array=)} */
function run(args) {
  args = args || Module['arguments'];

  if (runDependencies > 0) {
    return;
  }

  writeStackCookie();

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return;

    ensureInitRuntime();

    preMain();

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    assert(!Module['_main'], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
  checkStackCookie();
}
Module['run'] = run;

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in NO_FILESYSTEM
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var print = Module['print'];
  var printErr = Module['printErr'];
  var has = false;
  Module['print'] = Module['printErr'] = function(x) {
    has = true;
  }
  try { // it doesn't matter if it fails
    var flush = flush_NO_FILESYSTEM;
    if (flush) flush(0);
  } catch(e) {}
  Module['print'] = print;
  Module['printErr'] = printErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set NO_EXIT_RUNTIME to 0 (see the FAQ), or make sure to emit a newline when you printf etc.');
  }
}

function exit(status, implicit) {
  checkUnflushedContent();

  // if this is just main exit-ing implicitly, and the status is 0, then we
  // don't need to do anything here and can just leave. if the status is
  // non-zero, though, then we need to report it.
  // (we may have warned about this earlier, if a situation justifies doing so)
  if (implicit && Module['noExitRuntime'] && status === 0) {
    return;
  }

  if (Module['noExitRuntime']) {
    // if exit() was called, we may warn the user if the runtime isn't actually being shut down
    if (!implicit) {
      Module.printErr('exit(' + status + ') called, but NO_EXIT_RUNTIME is set, so halting execution but not exiting the runtime or preventing further async execution (build with NO_EXIT_RUNTIME=0, if you want a true shutdown)');
    }
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  if (ENVIRONMENT_IS_NODE) {
    process['exit'](status);
  }
  Module['quit'](status, new ExitStatus(status));
}
Module['exit'] = exit;

var abortDecorators = [];

function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what);
  }

  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';
  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}


Module["noExitRuntime"] = true;

run();

// {{POST_RUN_ADDITIONS}}





// {{MODULE_ADDITIONS}}





  return Module;
};
if (typeof exports === 'object' && typeof module === 'object')
  module.exports = Module;
else if (typeof define === 'function' && define['amd'])
  define([], function() { return Module; });
else if (typeof exports === 'object')
  exports["Module"] = Module;

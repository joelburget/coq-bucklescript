// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var Block = require("bs-platform/lib/js/block.js");
var Caml_builtin_exceptions = require("bs-platform/lib/js/caml_builtin_exceptions.js");

function get(hook) {
  var match = hook[0];
  if (typeof match === "number") {
    throw [
          Caml_builtin_exceptions.assert_failure,
          [
            "hook.ml",
            21,
            11
          ]
        ];
  } else {
    return match[0];
  }
}

function set(hook, data) {
  var match = hook[0];
  if (typeof match === "number") {
    hook[0] = /* Set */Block.__(1, [data]);
    return /* () */0;
  } else if (match.tag) {
    throw [
          Caml_builtin_exceptions.assert_failure,
          [
            "hook.ml",
            26,
            11
          ]
        ];
  } else {
    hook[0] = /* Set */Block.__(1, [data]);
    return /* () */0;
  }
}

function make($$default, _) {
  var data = $$default ? /* Default */Block.__(0, [$$default[0]]) : /* Unset */0;
  var ans = [data];
  return /* tuple */[
          ans,
          ans
        ];
}

exports.make = make;
exports.get = get;
exports.set = set;
/* No side effect */

// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var Lazy = require("bs-platform/lib/js/lazy.js");
var Block = require("bs-platform/lib/js/block.js");
var Curry = require("bs-platform/lib/js/curry.js");
var CamlinternalLazy = require("bs-platform/lib/js/camlinternalLazy.js");
var CAst$ReactTemplate = require("./cAst.bs.js");

function map_thunk(f, param) {
  if (param.tag) {
    var k = param[0];
    return /* Thunk */Block.__(1, [Block.__(246, [(function () {
                      var tag = k.tag | 0;
                      return Curry._1(f, tag === 250 ? k[0] : (
                                    tag === 246 ? CamlinternalLazy.force_lazy_block(k) : k
                                  ));
                    })])]);
  } else {
    return /* Value */Block.__(0, [Curry._1(f, param[0])]);
  }
}

function get_thunk(param) {
  if (param.tag) {
    var k = param[0];
    var tag = k.tag | 0;
    if (tag === 250) {
      return k[0];
    } else if (tag === 246) {
      return CamlinternalLazy.force_lazy_block(k);
    } else {
      return k;
    }
  } else {
    return param[0];
  }
}

function get(x) {
  return get_thunk(x[/* v */0]);
}

function make(loc, v) {
  return CAst$ReactTemplate.make(loc, /* Value */Block.__(0, [v]));
}

function delay(loc, v) {
  return CAst$ReactTemplate.make(loc, /* Thunk */Block.__(1, [Lazy.from_fun(v)]));
}

function map(f, n) {
  return CAst$ReactTemplate.map((function (x) {
                return map_thunk(f, x);
              }), n);
}

function map_with_loc(f, n) {
  return CAst$ReactTemplate.map_with_loc((function (loc, x) {
                return map_thunk((function (x) {
                              return Curry._2(f, loc, x);
                            }), x);
              }), n);
}

function map_from_loc(f, param) {
  var loc = param[0];
  var v = Curry._2(f, loc, param[1]);
  return CAst$ReactTemplate.make(loc, /* Value */Block.__(0, [v]));
}

function with_val(f, n) {
  return Curry._1(f, get_thunk(n[/* v */0]));
}

function with_loc_val(f, n) {
  return Curry._2(f, n[/* loc */1], get_thunk(n[/* v */0]));
}

exports.get = get;
exports.get_thunk = get_thunk;
exports.make = make;
exports.delay = delay;
exports.map = map;
exports.map_with_loc = map_with_loc;
exports.map_from_loc = map_from_loc;
exports.with_val = with_val;
exports.with_loc_val = with_loc_val;
/* No side effect */

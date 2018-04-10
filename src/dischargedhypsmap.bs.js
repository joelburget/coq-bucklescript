// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var Curry = require("bs-platform/lib/js/curry.js");
var Summary$ReactTemplate = require("./summary.bs.js");
var Libnames$ReactTemplate = require("./libnames.bs.js");
var Caml_builtin_exceptions = require("bs-platform/lib/js/caml_builtin_exceptions.js");

var discharged_hyps_map = Summary$ReactTemplate.ref(/* None */0, "discharged_hypothesis", Libnames$ReactTemplate.Spmap[/* empty */0]);

function set_discharged_hyps(sp, hyps) {
  discharged_hyps_map[0] = Curry._3(Libnames$ReactTemplate.Spmap[/* add */3], sp, hyps, discharged_hyps_map[0]);
  return /* () */0;
}

function get_discharged_hyps(sp) {
  try {
    return Curry._2(Libnames$ReactTemplate.Spmap[/* find */21], sp, discharged_hyps_map[0]);
  }
  catch (exn){
    if (exn === Caml_builtin_exceptions.not_found) {
      return /* [] */0;
    } else {
      throw exn;
    }
  }
}

exports.set_discharged_hyps = set_discharged_hyps;
exports.get_discharged_hyps = get_discharged_hyps;
/* discharged_hyps_map Not a pure module */

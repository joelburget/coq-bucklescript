// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var Sys = require("bs-platform/lib/js/sys.js");
var $$Array = require("bs-platform/lib/js/array.js");
var Caml_array = require("bs-platform/lib/js/caml_array.js");
var Caml_primitive = require("bs-platform/lib/js/caml_primitive.js");
var Caml_missing_polyfill = require("bs-platform/lib/js/caml_missing_polyfill.js");
var Vmvalues$ReactTemplate = require("../src/vmvalues.bs.js");
var Caml_builtin_exceptions = require("bs-platform/lib/js/caml_builtin_exceptions.js");

var popstop_tbl = [$$Array.init(30, (function () {
          return Caml_missing_polyfill.not_implemented("coq_pushpop not implemented by bucklescript yet\n");
        }))];

function popstop_code(i) {
  var len = popstop_tbl[0].length;
  if (i < len) {
    return Caml_array.caml_array_get(popstop_tbl[0], i);
  } else {
    popstop_tbl[0] = $$Array.init(i + 10 | 0, (function (j) {
            if (j < len) {
              return Caml_array.caml_array_get(popstop_tbl[0], j);
            } else {
              return Caml_missing_polyfill.not_implemented("coq_pushpop not implemented by bucklescript yet\n");
            }
          }));
    return Caml_array.caml_array_get(popstop_tbl[0], i);
  }
}

popstop_code(0);

function apply_arguments(vf, vargs) {
  var n = Vmvalues$ReactTemplate.nargs(vargs);
  if (n) {
    Caml_missing_polyfill.not_implemented("coq_push_ra not implemented by bucklescript yet\n");
    Caml_missing_polyfill.not_implemented("coq_push_arguments not implemented by bucklescript yet\n");
    return Caml_missing_polyfill.not_implemented("coq_interprete_ml not implemented by bucklescript yet\n");
  } else {
    return Vmvalues$ReactTemplate.fun_val(vf);
  }
}

function apply_varray(vf, varray) {
  var n = varray.length;
  if (n) {
    Caml_missing_polyfill.not_implemented("coq_push_ra not implemented by bucklescript yet\n");
    Caml_missing_polyfill.not_implemented("coq_push_vstack not implemented by bucklescript yet\n");
    return Caml_missing_polyfill.not_implemented("coq_interprete_ml not implemented by bucklescript yet\n");
  } else {
    return Vmvalues$ReactTemplate.fun_val(vf);
  }
}

function mkrel_vstack(k, arity) {
  var max = (k + arity | 0) - 1 | 0;
  return $$Array.init(arity, (function (i) {
                return Vmvalues$ReactTemplate.val_of_rel(max - i | 0);
              }));
}

function reduce_fun(k, vf) {
  var vargs = mkrel_vstack(k, 1);
  return apply_varray(vf, vargs);
}

function decompose_vfun2(k, vf1, vf2) {
  var arity = Caml_primitive.caml_int_min(Caml_missing_polyfill.not_implemented("coq_closure_arity not implemented by bucklescript yet\n"), Caml_missing_polyfill.not_implemented("coq_closure_arity not implemented by bucklescript yet\n"));
  if (!(0 < arity && arity < Sys.max_array_length)) {
    throw [
          Caml_builtin_exceptions.assert_failure,
          [
            "vm.ml",
            84,
            2
          ]
        ];
  }
  var vargs = mkrel_vstack(k, arity);
  var v1 = apply_varray(vf1, vargs);
  var v2 = apply_varray(vf2, vargs);
  return /* tuple */[
          arity,
          v1,
          v2
        ];
}

function reduce_fix(k, vf) {
  var fb = Vmvalues$ReactTemplate.first_fix(vf);
  var fc_typ = Vmvalues$ReactTemplate.fix_types(fb);
  var ndef = fc_typ.length;
  Caml_missing_polyfill.not_implemented("coq_offset_closure not implemented by bucklescript yet\n");
  var ftyp = $$Array.map((function () {
          return Caml_missing_polyfill.not_implemented("coq_interprete_ml not implemented by bucklescript yet\n");
        }), fc_typ);
  return /* tuple */[
          Vmvalues$ReactTemplate.mk_fix_body(k, ndef, fb),
          ftyp
        ];
}

function reduce_cofix(k, vcf) {
  var fc_typ = Vmvalues$ReactTemplate.cofix_types(vcf);
  var ndef = fc_typ.length;
  var ftyp = $$Array.map((function () {
          return Caml_missing_polyfill.not_implemented("coq_interprete_ml not implemented by bucklescript yet\n");
        }), fc_typ);
  return /* tuple */[
          Vmvalues$ReactTemplate.mk_cofix_body(apply_varray, k, ndef, vcf),
          ftyp
        ];
}

function type_of_switch() {
  Caml_missing_polyfill.not_implemented("coq_push_vstack not implemented by bucklescript yet\n");
  return Caml_missing_polyfill.not_implemented("coq_interprete_ml not implemented by bucklescript yet\n");
}

function apply_switch(sw, _) {
  var tc = sw[/* sw_annot */2][/* tailcall */2];
  if (tc) {
    Caml_missing_polyfill.not_implemented("coq_push_ra not implemented by bucklescript yet\n");
    Caml_missing_polyfill.not_implemented("coq_push_vstack not implemented by bucklescript yet\n");
  } else {
    Caml_missing_polyfill.not_implemented("coq_push_vstack not implemented by bucklescript yet\n");
    Caml_missing_polyfill.not_implemented("coq_push_ra not implemented by bucklescript yet\n");
  }
  return Caml_missing_polyfill.not_implemented("coq_interprete_ml not implemented by bucklescript yet\n");
}

function branch_of_switch(k, sw) {
  var eval_branch = function (ta) {
    var arg = Vmvalues$ReactTemplate.branch_arg(k, ta);
    var v = apply_switch(sw, arg);
    return /* tuple */[
            ta[1],
            v
          ];
  };
  return $$Array.map(eval_branch, sw[/* sw_annot */2][/* rtbl */1]);
}

function apply_whd(k, whd) {
  var v = Vmvalues$ReactTemplate.val_of_rel(k);
  switch (whd.tag | 0) {
    case 1 : 
        return reduce_fun(k, whd[0]);
    case 2 : 
        var match = whd[1];
        if (match) {
          Caml_missing_polyfill.not_implemented("coq_push_ra not implemented by bucklescript yet\n");
          Caml_missing_polyfill.not_implemented("coq_push_val not implemented by bucklescript yet\n");
          Caml_missing_polyfill.not_implemented("coq_push_arguments not implemented by bucklescript yet\n");
          return Caml_missing_polyfill.not_implemented("coq_interprete_ml not implemented by bucklescript yet\n");
        } else {
          Caml_missing_polyfill.not_implemented("coq_push_ra not implemented by bucklescript yet\n");
          Caml_missing_polyfill.not_implemented("coq_push_val not implemented by bucklescript yet\n");
          return Caml_missing_polyfill.not_implemented("coq_interprete_ml not implemented by bucklescript yet\n");
        }
        break;
    case 3 : 
        Caml_missing_polyfill.not_implemented("coq_push_ra not implemented by bucklescript yet\n");
        Caml_missing_polyfill.not_implemented("coq_push_val not implemented by bucklescript yet\n");
        return Caml_missing_polyfill.not_implemented("coq_interprete_ml not implemented by bucklescript yet\n");
    case 6 : 
        var _a = Vmvalues$ReactTemplate.val_of_atom(whd[0]);
        var _stk = whd[1];
        var v$1 = v;
        while(true) {
          var stk = _stk;
          var a = _a;
          if (stk) {
            var match$1 = stk[0];
            switch (match$1.tag | 0) {
              case 0 : 
                  _stk = stk[1];
                  _a = apply_arguments(Vmvalues$ReactTemplate.fun_of_val(a), match$1[0]);
                  continue ;
                  case 1 : 
                  var stk$1 = stk[1];
                  var match$2;
                  var exit = 0;
                  if (stk$1) {
                    var match$3 = stk$1[0];
                    if (match$3.tag) {
                      exit = 1;
                    } else {
                      Caml_missing_polyfill.not_implemented("coq_push_ra not implemented by bucklescript yet\n");
                      Caml_missing_polyfill.not_implemented("coq_push_arguments not implemented by bucklescript yet\n");
                      Caml_missing_polyfill.not_implemented("coq_push_val not implemented by bucklescript yet\n");
                      Caml_missing_polyfill.not_implemented("coq_push_arguments not implemented by bucklescript yet\n");
                      var a$1 = Caml_missing_polyfill.not_implemented("coq_interprete_ml not implemented by bucklescript yet\n");
                      match$2 = /* tuple */[
                        a$1,
                        stk$1[1]
                      ];
                    }
                  } else {
                    exit = 1;
                  }
                  if (exit === 1) {
                    Caml_missing_polyfill.not_implemented("coq_push_ra not implemented by bucklescript yet\n");
                    Caml_missing_polyfill.not_implemented("coq_push_val not implemented by bucklescript yet\n");
                    Caml_missing_polyfill.not_implemented("coq_push_arguments not implemented by bucklescript yet\n");
                    var a$2 = Caml_missing_polyfill.not_implemented("coq_interprete_ml not implemented by bucklescript yet\n");
                    match$2 = /* tuple */[
                      a$2,
                      stk$1
                    ];
                  }
                  _stk = match$2[1];
                  _a = match$2[0];
                  continue ;
                  case 2 : 
                  _stk = stk[1];
                  _a = apply_switch(match$1[0], a);
                  continue ;
                  case 3 : 
                  _stk = stk[1];
                  _a = Vmvalues$ReactTemplate.val_of_proj(match$1[0], a);
                  continue ;
                  
            }
          } else {
            return apply_varray(Vmvalues$ReactTemplate.fun_of_val(a), /* array */[v$1]);
          }
        };
    case 7 : 
        throw [
              Caml_builtin_exceptions.assert_failure,
              [
                "vm.ml",
                188,
                23
              ]
            ];
    default:
      throw [
            Caml_builtin_exceptions.assert_failure,
            [
              "vm.ml",
              171,
              51
            ]
          ];
  }
}

function set_drawinstr() {
  return Caml_missing_polyfill.not_implemented("coq_set_drawinstr not implemented by bucklescript yet\n");
}

exports.set_drawinstr = set_drawinstr;
exports.reduce_fix = reduce_fix;
exports.reduce_cofix = reduce_cofix;
exports.type_of_switch = type_of_switch;
exports.branch_of_switch = branch_of_switch;
exports.reduce_fun = reduce_fun;
exports.decompose_vfun2 = decompose_vfun2;
exports.apply_whd = apply_whd;
/* popstop_tbl Not a pure module */

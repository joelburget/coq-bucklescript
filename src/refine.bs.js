// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var Curry = require("bs-platform/lib/js/curry.js");
var Js_exn = require("bs-platform/lib/js/js_exn.js");
var Pp$ReactTemplate = require("./pp.bs.js");
var Evd$ReactTemplate = require("./evd.bs.js");
var Hook$ReactTemplate = require("./hook.bs.js");
var Util$ReactTemplate = require("./util.bs.js");
var CList$ReactTemplate = require("./cList.bs.js");
var Typing$ReactTemplate = require("./typing.bs.js");
var Context$ReactTemplate = require("./context.bs.js");
var EConstr$ReactTemplate = require("./eConstr.bs.js");
var Environ$ReactTemplate = require("./environ.bs.js");
var Coercion$ReactTemplate = require("./coercion.bs.js");
var Evarconv$ReactTemplate = require("./evarconv.bs.js");
var Evarutil$ReactTemplate = require("./evarutil.bs.js");
var Retyping$ReactTemplate = require("./retyping.bs.js");
var Caml_builtin_exceptions = require("bs-platform/lib/js/caml_builtin_exceptions.js");
var Proofview$ReactTemplate = require("./proofview.bs.js");
var Safe_typing$ReactTemplate = require("./safe_typing.bs.js");
var Pretype_errors$ReactTemplate = require("./pretype_errors.bs.js");

function extract_prefix(env, info) {
  var ctx1 = Curry._1(Util$ReactTemplate.List[/* rev */4], Environ$ReactTemplate.named_context(env));
  var ctx2 = Curry._1(Util$ReactTemplate.List[/* rev */4], Evd$ReactTemplate.evar_context(info));
  var _l1 = ctx1;
  var _l2 = ctx2;
  var _accu = /* [] */0;
  while(true) {
    var accu = _accu;
    var l2 = _l2;
    var l1 = _l1;
    if (l1) {
      if (l2) {
        var l2$1 = l2[1];
        var d2 = l2[0];
        var d1 = l1[0];
        if (d1 === d2) {
          _accu = /* :: */[
            d1,
            accu
          ];
          _l2 = l2$1;
          _l1 = l1[1];
          continue ;
          
        } else {
          return /* tuple */[
                  accu,
                  /* :: */[
                    d2,
                    l2$1
                  ]
                ];
        }
      } else {
        return /* tuple */[
                accu,
                l2
              ];
      }
    } else {
      return /* tuple */[
              accu,
              l2
            ];
    }
  };
}

function typecheck_proof(c, concl, env, sigma) {
  var evdref = [sigma];
  Typing$ReactTemplate.e_check(env, evdref, c, concl);
  return evdref[0];
}

var match = Hook$ReactTemplate.make(/* Some */[(function (_, _$1, _$2) {
          return Pp$ReactTemplate.str("<constr>");
        })], /* () */0);

var pr_constrv = match[0];

function add_if_undefined(kn, cb, env) {
  try {
    Environ$ReactTemplate.lookup_constant(kn, env);
    return env;
  }
  catch (exn){
    if (exn === Caml_builtin_exceptions.not_found) {
      return Environ$ReactTemplate.add_constant(kn, cb, env);
    } else {
      throw exn;
    }
  }
}

function add_side_effects(env, effects) {
  return Curry._3(Util$ReactTemplate.List[/* fold_left */13], (function (env, eff) {
                var env$1 = env;
                var param = eff;
                var match = param[/* eff */1];
                if (match.tag) {
                  return Curry._3(Util$ReactTemplate.List[/* fold_left */13], (function (env, param) {
                                return add_if_undefined(param[1], param[2], env);
                              }), env$1, match[0]);
                } else {
                  return add_if_undefined(match[0], match[1], env$1);
                }
              }), env, effects);
}

function generic_refine(typecheck, f, gl) {
  var sigma = Proofview$ReactTemplate.Goal[/* sigma */5](gl);
  var env = Proofview$ReactTemplate.Goal[/* env */4](gl);
  var concl = Proofview$ReactTemplate.Goal[/* concl */2](gl);
  var state = Proofview$ReactTemplate.Goal[/* state */7](gl);
  var prev_future_goals = Evd$ReactTemplate.save_future_goals(sigma);
  return Curry._2(Proofview$ReactTemplate.Notations[/* >>= */0], Proofview$ReactTemplate.Unsafe[/* tclEVARS */0](Evd$ReactTemplate.reset_future_goals(sigma)), (function () {
                return Curry._2(Proofview$ReactTemplate.Notations[/* >>= */0], f, (function (param) {
                              var c = param[1];
                              var v = param[0];
                              return Curry._2(Proofview$ReactTemplate.Notations[/* >>= */0], Proofview$ReactTemplate.tclEVARMAP, (function (sigma) {
                                            return Proofview$ReactTemplate.V82[/* wrap_exceptions */10]((function () {
                                                          var evs = Evd$ReactTemplate.save_future_goals(sigma);
                                                          var privates_csts = Evd$ReactTemplate.eval_side_effects(sigma);
                                                          var sideff = Safe_typing$ReactTemplate.side_effects_of_private_constants(privates_csts);
                                                          var env$1 = add_side_effects(env, sideff);
                                                          var fold = function (accu, ev) {
                                                            var ev$1 = ev;
                                                            var env$2 = env$1;
                                                            var sigma = accu;
                                                            var info = Evd$ReactTemplate.find(sigma, ev$1);
                                                            var type_hyp = function (param, decl) {
                                                              var env = param[1];
                                                              var t = EConstr$ReactTemplate.of_constr(Curry._1(Context$ReactTemplate.Named[/* Declaration */0][/* get_type */2], decl));
                                                              var evdref = [param[0]];
                                                              Typing$ReactTemplate.e_sort_of(env, evdref, t);
                                                              if (decl.tag) {
                                                                Typing$ReactTemplate.e_check(env, evdref, EConstr$ReactTemplate.of_constr(decl[1]), t);
                                                              }
                                                              return /* tuple */[
                                                                      evdref[0],
                                                                      Environ$ReactTemplate.push_named(decl, env)
                                                                    ];
                                                            };
                                                            var match = extract_prefix(env$2, info);
                                                            var env$3 = Environ$ReactTemplate.reset_with_named_context(Environ$ReactTemplate.val_of_named_context(match[0]), env$2);
                                                            var match$1 = Curry._3(Util$ReactTemplate.List[/* fold_left */13], type_hyp, /* tuple */[
                                                                  sigma,
                                                                  env$3
                                                                ], match[1]);
                                                            var evdref = [match$1[0]];
                                                            Typing$ReactTemplate.e_sort_of(match$1[1], evdref, EConstr$ReactTemplate.of_constr(Evd$ReactTemplate.evar_concl(info)));
                                                            return evdref[0];
                                                          };
                                                          var sigma$1 = typecheck ? Evd$ReactTemplate.fold_future_goals(fold, sigma, evs) : sigma;
                                                          var sigma$2 = typecheck ? typecheck_proof(c, concl, env$1, sigma$1) : sigma$1;
                                                          var self = Proofview$ReactTemplate.Goal[/* goal */13](gl);
                                                          if (Evarutil$ReactTemplate.occur_evar_upto(sigma$2, self, c)) {
                                                            Pretype_errors$ReactTemplate.error_occur_check(env$1, sigma$2, self, c);
                                                          }
                                                          var sigma$3 = Evd$ReactTemplate.restore_future_goals(sigma$2, prev_future_goals);
                                                          var partial_arg = Proofview$ReactTemplate.Unsafe[/* advance */14];
                                                          var evs$1 = Evd$ReactTemplate.map_filter_future_goals((function (param) {
                                                                  return partial_arg(sigma$3, param);
                                                                }), evs);
                                                          var match = Evd$ReactTemplate.dispatch_future_goals(evs$1);
                                                          var evkmain = match[3];
                                                          var given_up = match[2];
                                                          var shelf = match[1];
                                                          var comb = match[0];
                                                          var c$1 = EConstr$ReactTemplate.Unsafe[/* to_constr */0](c);
                                                          var match$1 = Proofview$ReactTemplate.Unsafe[/* advance */14](sigma$3, self);
                                                          var sigma$4;
                                                          if (match$1) {
                                                            var self$1 = match$1[0];
                                                            if (evkmain) {
                                                              var id = Evd$ReactTemplate.evar_ident(self$1, sigma$3);
                                                              var sigma$5 = Evd$ReactTemplate.define(self$1, c$1, sigma$3);
                                                              sigma$4 = id ? Evd$ReactTemplate.rename(evkmain[0], id[0], sigma$5) : sigma$5;
                                                            } else {
                                                              sigma$4 = Evd$ReactTemplate.define(self$1, c$1, sigma$3);
                                                            }
                                                          } else {
                                                            sigma$4 = sigma$3;
                                                          }
                                                          var sigma$6 = CList$ReactTemplate.fold_left(Proofview$ReactTemplate.Unsafe[/* mark_as_goal */12], sigma$4, comb);
                                                          var comb$1 = CList$ReactTemplate.map((function (x) {
                                                                  return Proofview$ReactTemplate.goal_with_state(x, state);
                                                                }), comb);
                                                          var trace = function () {
                                                            return Pp$ReactTemplate.hov(2, Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.str("simple refine"), Pp$ReactTemplate.spc(/* () */0)), Curry._3(Hook$ReactTemplate.get(pr_constrv), env$1, sigma$6, c$1)));
                                                          };
                                                          return Curry._2(Proofview$ReactTemplate.Notations[/* >>= */0], Proofview$ReactTemplate.Trace[/* name_tactic */2](trace, Curry._1(Proofview$ReactTemplate.tclUNIT, v)), (function (v) {
                                                                        return Curry._2(Proofview$ReactTemplate.Notations[/* <*> */1], Curry._2(Proofview$ReactTemplate.Notations[/* <*> */1], Curry._2(Proofview$ReactTemplate.Notations[/* <*> */1], Curry._2(Proofview$ReactTemplate.Notations[/* <*> */1], Curry._2(Proofview$ReactTemplate.Notations[/* <*> */1], Curry._1(Proofview$ReactTemplate.Unsafe[/* tclSETENV */2], Environ$ReactTemplate.reset_context(env$1)), Proofview$ReactTemplate.Unsafe[/* tclEVARS */0](sigma$6)), Curry._1(Proofview$ReactTemplate.Unsafe[/* tclSETGOALS */4], comb$1)), Proofview$ReactTemplate.Unsafe[/* tclPUTSHELF */8](shelf)), Curry._1(Proofview$ReactTemplate.Unsafe[/* tclPUTGIVENUP */9], given_up)), Curry._1(Proofview$ReactTemplate.tclUNIT, v));
                                                                      }));
                                                        }));
                                          }));
                            }));
              }));
}

function lift(c) {
  return Curry._2(Proofview$ReactTemplate.Notations[/* >>= */0], Proofview$ReactTemplate.tclEVARMAP, (function (sigma) {
                return Proofview$ReactTemplate.V82[/* wrap_exceptions */10]((function () {
                              var match = Curry._1(c, sigma);
                              var c$1 = match[1];
                              return Curry._2(Proofview$ReactTemplate.Notations[/* >>= */0], Proofview$ReactTemplate.Unsafe[/* tclEVARS */0](match[0]), (function () {
                                            return Curry._1(Proofview$ReactTemplate.tclUNIT, c$1);
                                          }));
                            }));
              }));
}

function make_refine_enter(typecheck, f, gl) {
  return generic_refine(typecheck, lift(f), gl);
}

function refine_one(typecheck, f) {
  return Proofview$ReactTemplate.Goal[/* enter_one */10](/* None */0, (function (param) {
                return make_refine_enter(typecheck, f, param);
              }));
}

function refine(typecheck, f) {
  var f$1 = function (evd) {
    var match = Curry._1(f, evd);
    return /* tuple */[
            match[0],
            /* tuple */[
              /* () */0,
              match[1]
            ]
          ];
  };
  return Proofview$ReactTemplate.Goal[/* enter */9]((function (param) {
                return make_refine_enter(typecheck, f$1, param);
              }));
}

function with_type(env, evd, c, t) {
  var my_type = Retyping$ReactTemplate.get_type_of(/* None */0, /* None */0, env, evd, c);
  var j = Environ$ReactTemplate.make_judge(c, my_type);
  var match = Coercion$ReactTemplate.inh_conv_coerce_to(/* None */0, /* true */1)(env, evd, j, t);
  return /* tuple */[
          match[0],
          match[1][/* uj_val */0]
        ];
}

function refine_casted(typecheck, f) {
  return Proofview$ReactTemplate.Goal[/* enter */9]((function (gl) {
                var concl = Proofview$ReactTemplate.Goal[/* concl */2](gl);
                var env = Proofview$ReactTemplate.Goal[/* env */4](gl);
                var f$1 = function (h) {
                  var match = Curry._1(f, h);
                  return with_type(env, match[0], match[1], concl);
                };
                return refine(typecheck, f$1);
              }));
}

var solve_constraints = Curry._2(Proofview$ReactTemplate.Notations[/* >>= */0], Proofview$ReactTemplate.tclENV, (function (env) {
        return Curry._2(Proofview$ReactTemplate.Notations[/* >>= */0], Proofview$ReactTemplate.tclEVARMAP, (function (sigma) {
                      try {
                        return Proofview$ReactTemplate.Unsafe[/* tclEVARSADVANCE */1](Evarconv$ReactTemplate.solve_unif_constraints_with_heuristics(env, /* None */0, sigma));
                      }
                      catch (raw_e){
                        var e = Js_exn.internalToOCamlException(raw_e);
                        return Proofview$ReactTemplate.tclZERO(/* None */0, e);
                      }
                    }));
      }));

var pr_constr = match[1];

exports.pr_constr = pr_constr;
exports.refine = refine;
exports.refine_one = refine_one;
exports.generic_refine = generic_refine;
exports.with_type = with_type;
exports.refine_casted = refine_casted;
exports.solve_constraints = solve_constraints;
/* match Not a pure module */

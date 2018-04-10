// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var Block = require("bs-platform/lib/js/block.js");
var Curry = require("bs-platform/lib/js/curry.js");
var Js_exn = require("bs-platform/lib/js/js_exn.js");
var Caml_array = require("bs-platform/lib/js/caml_array.js");
var Caml_exceptions = require("bs-platform/lib/js/caml_exceptions.js");
var Pp$ReactTemplate = require("./pp.bs.js");
var Evd$ReactTemplate = require("./evd.bs.js");
var Goal$ReactTemplate = require("./goal.bs.js");
var Util$ReactTemplate = require("./util.bs.js");
var Flags$ReactTemplate = require("./flags.bs.js");
var Logic$ReactTemplate = require("./logic.bs.js");
var Names$ReactTemplate = require("./names.bs.js");
var Global$ReactTemplate = require("./global.bs.js");
var CErrors$ReactTemplate = require("./cErrors.bs.js");
var Context$ReactTemplate = require("./context.bs.js");
var Control$ReactTemplate = require("../shims/control.bs.js");
var EConstr$ReactTemplate = require("./eConstr.bs.js");
var CProfile$ReactTemplate = require("../shims/cProfile.bs.js");
var Feedback$ReactTemplate = require("./feedback.bs.js");

function sig_it(x) {
  return x[/* it */0];
}

function project(x) {
  return x[/* sigma */1];
}

function pf_env(gls) {
  return Global$ReactTemplate.env_of_context(Goal$ReactTemplate.V82[/* hyps */1](gls[/* sigma */1], gls[/* it */0]));
}

function pf_hyps(gls) {
  return EConstr$ReactTemplate.named_context_of_val(Goal$ReactTemplate.V82[/* hyps */1](gls[/* sigma */1], gls[/* it */0]));
}

function refiner(pr, goal_sigma) {
  var match = Logic$ReactTemplate.prim_refiner(pr, goal_sigma[/* sigma */1], goal_sigma[/* it */0]);
  return /* record */[
          /* it */match[0],
          /* sigma */match[1]
        ];
}

var refiner$1;

if (Flags$ReactTemplate.profile) {
  var refiner_key = CProfile$ReactTemplate.declare_profile("refiner");
  refiner$1 = CProfile$ReactTemplate.profile2(refiner_key, refiner);
} else {
  refiner$1 = refiner;
}

function unpackage(glsig) {
  return /* tuple */[
          [glsig[/* sigma */1]],
          glsig[/* it */0]
        ];
}

function repackage(r, v) {
  return /* record */[
          /* it */v,
          /* sigma */r[0]
        ];
}

function apply_sig_tac(r, tac, g) {
  Control$ReactTemplate.check_for_interrupt(/* () */0);
  var glsigma = Curry._1(tac, /* record */[
        /* it */g,
        /* sigma */r[0]
      ]);
  r[0] = glsigma[/* sigma */1];
  return glsigma[/* it */0];
}

function tclIDTAC(gls) {
  var gls$1 = gls;
  return /* record */[
          /* it : :: */[
            gls$1[/* it */0],
            /* [] */0
          ],
          /* sigma */gls$1[/* sigma */1]
        ];
}

function tclIDTAC_MESSAGE(s, gls) {
  Feedback$ReactTemplate.msg_info(/* None */0, Pp$ReactTemplate.hov(0, s));
  return tclIDTAC(gls);
}

function tclFAIL_s(s, _) {
  return CErrors$ReactTemplate.user_err(/* None */0, /* Some */["Refiner.tclFAIL_s"], Pp$ReactTemplate.str(s));
}

var FailError = Caml_exceptions.create("Refiner-ReactTemplate.FailError");

function tclFAIL(lvl, s, _) {
  throw [
        FailError,
        lvl,
        Block.__(250, [s])
      ];
}

function tclFAIL_lazy(lvl, s, _) {
  throw [
        FailError,
        lvl,
        s
      ];
}

function start_tac(gls) {
  var match = unpackage(gls);
  return /* tuple */[
          match[0],
          /* :: */[
            match[1],
            /* [] */0
          ]
        ];
}

function finish_tac(param) {
  return /* record */[
          /* it */param[1],
          /* sigma */param[0][0]
        ];
}

function thens3parts_tac(tacfi, tac, tacli, param) {
  var gs = param[1];
  var sigr = param[0];
  var nf = tacfi.length;
  var nl = tacli.length;
  var ng = Curry._1(Util$ReactTemplate.List[/* length */0], gs);
  if (ng < (nf + nl | 0)) {
    CErrors$ReactTemplate.user_err(/* None */0, /* Some */["Refiner.thensn_tac"], Pp$ReactTemplate.str("Not enough subgoals."));
  }
  var gll = Curry._3(Util$ReactTemplate.List[/* map_i */67], (function (i) {
          var partial_arg = i < nf ? Caml_array.caml_array_get(tacfi, i) : (
              i >= (ng - nl | 0) ? Caml_array.caml_array_get(tacli, (nl - ng | 0) + i | 0) : tac
            );
          return (function (param) {
              return apply_sig_tac(sigr, partial_arg, param);
            });
        }), 0, gs);
  return /* tuple */[
          sigr,
          Curry._1(Util$ReactTemplate.List[/* flatten */8], gll)
        ];
}

function thensi_tac(tac, param) {
  var sigr = param[0];
  var gll = Curry._3(Util$ReactTemplate.List[/* map_i */67], (function (i) {
          var partial_arg = Curry._1(tac, i);
          return (function (param) {
              return apply_sig_tac(sigr, partial_arg, param);
            });
        }), 1, param[1]);
  return /* tuple */[
          sigr,
          Curry._1(Util$ReactTemplate.List[/* flatten */8], gll)
        ];
}

function tclTHENS3PARTS(tac1, tacfi, tac, tacli, gls) {
  var partial_arg = /* array */[];
  var partial_arg$1 = /* array */[];
  return finish_tac(thens3parts_tac(tacfi, tac, tacli, (function (param) {
                      return thens3parts_tac(partial_arg$1, tac1, partial_arg, param);
                    })(start_tac(gls))));
}

function tclTHENSFIRSTn(tac1, taci, tac) {
  var partial_arg = /* array */[];
  return (function (param) {
      return tclTHENS3PARTS(tac1, taci, tac, partial_arg, param);
    });
}

function tclTHENSLASTn(tac1, tac, taci) {
  var partial_arg = /* array */[];
  return (function (param) {
      return tclTHENS3PARTS(tac1, partial_arg, tac, taci, param);
    });
}

function tclTHEN_i(tac, taci, gls) {
  var partial_arg = /* array */[];
  var partial_arg$1 = /* array */[];
  return finish_tac(thensi_tac(taci, (function (param) {
                      return thens3parts_tac(partial_arg$1, tac, partial_arg, param);
                    })(start_tac(gls))));
}

function tclTHENLASTn(tac1, taci) {
  return tclTHENSLASTn(tac1, tclIDTAC, taci);
}

function tclTHENFIRSTn(tac1, taci) {
  return tclTHENSFIRSTn(tac1, taci, tclIDTAC);
}

function tclTHEN(tac1, tac2) {
  var partial_arg = /* array */[];
  var partial_arg$1 = /* array */[];
  return (function (param) {
      return tclTHENS3PARTS(tac1, partial_arg$1, tac2, partial_arg, param);
    });
}

function tclTHENSV(tac1, tac2v) {
  var partial_arg = /* array */[];
  return (function (param) {
      return tclTHENS3PARTS(tac1, tac2v, (function (param) {
                    return tclFAIL_s("Wrong number of tactics.", param);
                  }), partial_arg, param);
    });
}

function tclTHENS(tac1, tac2l) {
  return tclTHENSV(tac1, Util$ReactTemplate.$$Array[/* of_list */10](tac2l));
}

function tclTHENLAST(tac1, tac2) {
  return tclTHENSLASTn(tac1, tclIDTAC, /* array */[tac2]);
}

function tclTHENFIRST(tac1, tac2) {
  return tclTHENSFIRSTn(tac1, /* array */[tac2], tclIDTAC);
}

function tclTHENLIST(param) {
  if (param) {
    return tclTHEN(param[0], tclTHENLIST(param[1]));
  } else {
    return tclIDTAC;
  }
}

function tclMAP(tacfun, l) {
  return Curry._3(Util$ReactTemplate.List[/* fold_right */14], (function (x) {
                var partial_arg = Curry._1(tacfun, x);
                return (function (param) {
                    return tclTHEN(partial_arg, param);
                  });
              }), l, tclIDTAC);
}

function tclPROGRESS(tac, ptree) {
  var rslt = Curry._1(tac, ptree);
  if (Goal$ReactTemplate.V82[/* progress */8](rslt, ptree)) {
    return rslt;
  } else {
    return CErrors$ReactTemplate.user_err(/* None */0, /* Some */["Refiner.PROGRESS"], Pp$ReactTemplate.str("Failed to progress."));
  }
}

function tclSHOWHYPS(tac, goal) {
  var oldhyps = pf_hyps(goal);
  var rslt = Curry._1(tac, goal);
  var sigma = rslt[/* sigma */1];
  var hyps = Curry._2(Util$ReactTemplate.List[/* map */10], (function (gl) {
          return pf_hyps(/* record */[
                      /* it */gl,
                      /* sigma */sigma
                    ]);
        }), rslt[/* it */0]);
  var cmp = function (d1, d2) {
    return Names$ReactTemplate.Id[/* equal */0](Curry._1(Context$ReactTemplate.Named[/* Declaration */0][/* get_id */0], d1), Curry._1(Context$ReactTemplate.Named[/* Declaration */0][/* get_id */0], d2));
  };
  var newhyps = Curry._2(Util$ReactTemplate.List[/* map */10], (function (hypl) {
          return Curry._3(Util$ReactTemplate.List[/* subtract */53], cmp, hypl, oldhyps);
        }), hyps);
  var frst = [/* true */1];
  var s = Curry._3(Util$ReactTemplate.List[/* fold_left */13], (function (acc, lh) {
          return acc + ((
                    frst[0] ? (frst[0] = /* false */0, "") : " | "
                  ) + Curry._3(Util$ReactTemplate.List[/* fold_left */13], (function (acc, d) {
                          return Names$ReactTemplate.Id[/* to_string */7](Curry._1(Context$ReactTemplate.Named[/* Declaration */0][/* get_id */0], d)) + (" " + acc);
                        }), "", lh));
        }), "", newhyps);
  Feedback$ReactTemplate.msg_notice(/* None */0, Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.str("<infoH>"), Pp$ReactTemplate.hov(0, Pp$ReactTemplate.str(s))), Pp$ReactTemplate.str("</infoH>")));
  return tclIDTAC(goal);
}

function catch_failerror(param) {
  var info = param[1];
  var e = param[0];
  if (Logic$ReactTemplate.catchable_exception(e)) {
    return Control$ReactTemplate.check_for_interrupt(/* () */0);
  } else if (e[0] === FailError) {
    var lvl = e[1];
    if (lvl !== 0) {
      return Util$ReactTemplate.iraise(/* tuple */[
                  [
                    FailError,
                    lvl - 1 | 0,
                    e[2]
                  ],
                  info
                ]);
    } else {
      return Control$ReactTemplate.check_for_interrupt(/* () */0);
    }
  } else {
    return Util$ReactTemplate.iraise(/* tuple */[
                e,
                info
              ]);
  }
}

function tclORELSE0(t1, t2, g) {
  try {
    return Curry._1(t1, g);
  }
  catch (raw_e){
    var e = Js_exn.internalToOCamlException(raw_e);
    if (CErrors$ReactTemplate.noncritical(e)) {
      var e$1 = CErrors$ReactTemplate.push(e);
      catch_failerror(e$1);
      return Curry._1(t2, g);
    } else {
      throw e;
    }
  }
}

function tclORELSE(t1, t2) {
  return (function (param) {
      return tclORELSE0((function (param) {
                    return tclPROGRESS(t1, param);
                  }), t2, param);
    });
}

function tclTRY(f) {
  return (function (param) {
      return tclORELSE0(f, tclIDTAC, param);
    });
}

function tclTHENTRY(f, g) {
  return tclTHEN(f, (function (param) {
                return tclORELSE0(g, tclIDTAC, param);
              }));
}

function tclFIRST(param) {
  if (param) {
    var t = param[0];
    var partial_arg = tclFIRST(param[1]);
    return (function (param) {
        return tclORELSE0(t, partial_arg, param);
      });
  } else {
    return (function (param) {
        return tclFAIL_s("No applicable tactic.", param);
      });
  }
}

function ite_gen(tcal, tac_if, $$continue, tac_else, gl) {
  var success = [/* false */0];
  var tac_if0 = function (gl) {
    var result = Curry._1(tac_if, gl);
    success[0] = /* true */1;
    return result;
  };
  try {
    return Curry._3(tcal, tac_if0, $$continue, gl);
  }
  catch (raw_e){
    var e = Js_exn.internalToOCamlException(raw_e);
    if (CErrors$ReactTemplate.noncritical(e)) {
      var e$1 = CErrors$ReactTemplate.push(e);
      catch_failerror(e$1);
      var e$2 = e$1;
      var gl$1 = gl;
      if (success[0]) {
        return Util$ReactTemplate.iraise(e$2);
      } else {
        try {
          return Curry._1(tac_else, gl$1);
        }
        catch (raw_e$prime){
          var e$prime = Js_exn.internalToOCamlException(raw_e$prime);
          if (CErrors$ReactTemplate.noncritical(e$prime)) {
            return Util$ReactTemplate.iraise(e$2);
          } else {
            throw e$prime;
          }
        }
      }
    } else {
      throw e;
    }
  }
}

function tclIFTHENELSE(param, param$1, param$2, param$3) {
  return ite_gen(tclTHEN, param, param$1, param$2, param$3);
}

function tclIFTHENSELSE(param, param$1, param$2, param$3) {
  return ite_gen(tclTHENS, param, param$1, param$2, param$3);
}

function tclIFTHENSVELSE(param, param$1, param$2, param$3) {
  return ite_gen(tclTHENSV, param, param$1, param$2, param$3);
}

function tclIFTHENTRYELSEMUST(tac1, tac2, gl) {
  return tclIFTHENELSE(tac1, (function (param) {
                return tclORELSE0(tac2, tclIDTAC, param);
              }), tac2, gl);
}

function tclCOMPLETE(tac) {
  return tclTHEN(tac, (function (param) {
                return tclFAIL_s("Proof is not complete.", param);
              }));
}

function tclSOLVE(tacl) {
  return tclFIRST(Curry._2(Util$ReactTemplate.List[/* map */10], tclCOMPLETE, tacl));
}

function tclDO(n, t) {
  var dorec = function (k) {
    if (k < 0) {
      CErrors$ReactTemplate.user_err(/* None */0, /* Some */["Refiner.tclDO"], Pp$ReactTemplate.str("Wrong argument : Do needs a positive integer."));
    }
    if (k) {
      if (k === 1) {
        return t;
      } else {
        return tclTHEN(t, dorec(k - 1 | 0));
      }
    } else {
      return tclIDTAC;
    }
  };
  return dorec(n);
}

function tclREPEAT(t, g) {
  var t1 = t;
  var t2then = function (param) {
    return tclREPEAT(t, param);
  };
  var t2else = tclIDTAC;
  var gls = g;
  var match;
  try {
    match = /* Some */[tclPROGRESS(t1, gls)];
  }
  catch (raw_e){
    var e = Js_exn.internalToOCamlException(raw_e);
    if (CErrors$ReactTemplate.noncritical(e)) {
      var e$1 = CErrors$ReactTemplate.push(e);
      catch_failerror(e$1);
      match = /* None */0;
    } else {
      throw e;
    }
  }
  if (match) {
    var match$1 = unpackage(match[0]);
    var partial_arg = /* array */[];
    var partial_arg$1 = /* array */[];
    return finish_tac((function (param) {
                    return thens3parts_tac(partial_arg$1, t2then, partial_arg, param);
                  })(/* tuple */[
                    match$1[0],
                    match$1[1]
                  ]));
  } else {
    return Curry._1(t2else, gls);
  }
}

function tclAT_LEAST_ONCE(t) {
  return tclTHEN(t, (function (param) {
                return tclREPEAT(t, param);
              }));
}

function tclREPEAT_MAIN(t, g) {
  return tclORELSE0((function (param) {
                return tclPROGRESS((function (param) {
                              return tclTHEN_i(t, (function (i) {
                                            if (i === 1) {
                                              return (function (param) {
                                                  return tclREPEAT_MAIN(t, param);
                                                });
                                            } else {
                                              return tclIDTAC;
                                            }
                                          }), param);
                            }), param);
              }), tclIDTAC, g);
}

function tclEVARS(sigma, gls) {
  return tclIDTAC(/* record */[
              /* it */gls[/* it */0],
              /* sigma */sigma
            ]);
}

function tclEVARUNIVCONTEXT(ctx, gls) {
  return tclIDTAC(/* record */[
              /* it */gls[/* it */0],
              /* sigma */Evd$ReactTemplate.set_universe_context(gls[/* sigma */1], ctx)
            ]);
}

function tclPUSHCONTEXT(rigid, ctx, tac, gl) {
  var partial_arg = Evd$ReactTemplate.merge_context_set(/* None */0, /* None */0, rigid, gl[/* sigma */1], ctx);
  return tclTHEN((function (param) {
                  return tclEVARS(partial_arg, param);
                }), tac)(gl);
}

function tclPUSHEVARUNIVCONTEXT(ctx, gl) {
  return tclEVARS(Evd$ReactTemplate.merge_universe_context(gl[/* sigma */1], ctx), gl);
}

function tclPUSHCONSTRAINTS(cst, gl) {
  return tclEVARS(Evd$ReactTemplate.add_constraints(gl[/* sigma */1], cst), gl);
}

exports.sig_it = sig_it;
exports.project = project;
exports.pf_env = pf_env;
exports.pf_hyps = pf_hyps;
exports.unpackage = unpackage;
exports.repackage = repackage;
exports.apply_sig_tac = apply_sig_tac;
exports.refiner = refiner$1;
exports.tclIDTAC = tclIDTAC;
exports.tclIDTAC_MESSAGE = tclIDTAC_MESSAGE;
exports.tclEVARS = tclEVARS;
exports.tclEVARUNIVCONTEXT = tclEVARUNIVCONTEXT;
exports.tclPUSHCONTEXT = tclPUSHCONTEXT;
exports.tclPUSHEVARUNIVCONTEXT = tclPUSHEVARUNIVCONTEXT;
exports.tclPUSHCONSTRAINTS = tclPUSHCONSTRAINTS;
exports.tclTHEN = tclTHEN;
exports.tclTHENLIST = tclTHENLIST;
exports.tclMAP = tclMAP;
exports.tclTHEN_i = tclTHEN_i;
exports.tclTHENLAST = tclTHENLAST;
exports.tclTHENFIRST = tclTHENFIRST;
exports.tclTHENSV = tclTHENSV;
exports.tclTHENS = tclTHENS;
exports.tclTHENS3PARTS = tclTHENS3PARTS;
exports.tclTHENSLASTn = tclTHENSLASTn;
exports.tclTHENSFIRSTn = tclTHENSFIRSTn;
exports.tclTHENLASTn = tclTHENLASTn;
exports.tclTHENFIRSTn = tclTHENFIRSTn;
exports.FailError = FailError;
exports.catch_failerror = catch_failerror;
exports.tclORELSE0 = tclORELSE0;
exports.tclORELSE = tclORELSE;
exports.tclREPEAT = tclREPEAT;
exports.tclREPEAT_MAIN = tclREPEAT_MAIN;
exports.tclFIRST = tclFIRST;
exports.tclSOLVE = tclSOLVE;
exports.tclTRY = tclTRY;
exports.tclTHENTRY = tclTHENTRY;
exports.tclCOMPLETE = tclCOMPLETE;
exports.tclAT_LEAST_ONCE = tclAT_LEAST_ONCE;
exports.tclFAIL = tclFAIL;
exports.tclFAIL_lazy = tclFAIL_lazy;
exports.tclDO = tclDO;
exports.tclPROGRESS = tclPROGRESS;
exports.tclSHOWHYPS = tclSHOWHYPS;
exports.tclIFTHENELSE = tclIFTHENELSE;
exports.tclIFTHENSELSE = tclIFTHENSELSE;
exports.tclIFTHENSVELSE = tclIFTHENSVELSE;
exports.tclIFTHENTRYELSEMUST = tclIFTHENTRYELSEMUST;
/* refiner Not a pure module */

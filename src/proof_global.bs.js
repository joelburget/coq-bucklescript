// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var Block = require("bs-platform/lib/js/block.js");
var Curry = require("bs-platform/lib/js/curry.js");
var Format = require("bs-platform/lib/js/format.js");
var Hashtbl = require("bs-platform/lib/js/hashtbl.js");
var Caml_obj = require("bs-platform/lib/js/caml_obj.js");
var Caml_exceptions = require("bs-platform/lib/js/caml_exceptions.js");
var Pp$ReactTemplate = require("./pp.bs.js");
var Evd$ReactTemplate = require("./evd.bs.js");
var CAst$ReactTemplate = require("./cAst.bs.js");
var Univ$ReactTemplate = require("./univ.bs.js");
var Util$ReactTemplate = require("./util.bs.js");
var Names$ReactTemplate = require("./names.bs.js");
var Proof$ReactTemplate = require("./proof.bs.js");
var Future$ReactTemplate = require("./future.bs.js");
var Global$ReactTemplate = require("./global.bs.js");
var Option$ReactTemplate = require("./option.bs.js");
var UState$ReactTemplate = require("./uState.bs.js");
var CErrors$ReactTemplate = require("./cErrors.bs.js");
var Context$ReactTemplate = require("./context.bs.js");
var EConstr$ReactTemplate = require("./eConstr.bs.js");
var Environ$ReactTemplate = require("./environ.bs.js");
var Ftactic$ReactTemplate = require("./ftactic.bs.js");
var Univops$ReactTemplate = require("./univops.bs.js");
var Evarutil$ReactTemplate = require("./evarutil.bs.js");
var Goptions$ReactTemplate = require("./goptions.bs.js");
var Caml_builtin_exceptions = require("bs-platform/lib/js/caml_builtin_exceptions.js");
var Geninterp$ReactTemplate = require("./geninterp.bs.js");
var Proofview$ReactTemplate = require("./proofview.bs.js");
var Universes$ReactTemplate = require("./universes.bs.js");
var CEphemeron$ReactTemplate = require("./cEphemeron.bs.js");
var Safe_typing$ReactTemplate = require("./safe_typing.bs.js");
var Proof_bullet$ReactTemplate = require("./proof_bullet.bs.js");

var proof_modes = Hashtbl.create(/* None */0, 6);

function find_proof_mode(n) {
  try {
    return Hashtbl.find(proof_modes, n);
  }
  catch (exn){
    if (exn === Caml_builtin_exceptions.not_found) {
      return CErrors$ReactTemplate.user_err(/* None */0, /* None */0, Pp$ReactTemplate.str(Curry._1(Format.sprintf(/* Format */[
                              /* String_literal */Block.__(11, [
                                  "No proof mode named \"",
                                  /* String */Block.__(2, [
                                      /* No_padding */0,
                                      /* String_literal */Block.__(11, [
                                          "\".",
                                          /* End_of_format */0
                                        ])
                                    ])
                                ]),
                              "No proof mode named \"%s\"."
                            ]), n)));
    } else {
      throw exn;
    }
  }
}

function register_proof_mode(m) {
  return Hashtbl.add(proof_modes, m[/* name */0], CEphemeron$ReactTemplate.create(m));
}

function standard_001() {
  return /* () */0;
}

function standard_002() {
  return /* () */0;
}

var standard = /* record */[
  /* name */"No",
  standard_001,
  standard_002
];

register_proof_mode(standard);

var default_proof_mode = [find_proof_mode("No")];

function get_default_proof_mode_name() {
  return CEphemeron$ReactTemplate.$$default(default_proof_mode[0], standard)[/* name */0];
}

Goptions$ReactTemplate.declare_string_option(/* None */0, /* record */[
      /* optdepr : false */0,
      /* optname */"default proof mode",
      /* optkey : :: */[
        "Default",
        /* :: */[
          "Proof",
          /* :: */[
            "Mode",
            /* [] */0
          ]
        ]
      ],
      /* optread */(function () {
          return CEphemeron$ReactTemplate.$$default(default_proof_mode[0], standard)[/* name */0];
        }),
      /* optwrite */(function (n) {
          default_proof_mode[0] = find_proof_mode(n);
          return /* () */0;
        })
    ]);

function make_terminator(f) {
  return f;
}

function apply_terminator(f) {
  return f;
}

var pstates = [/* [] */0];

var current_proof_mode = [default_proof_mode[0]];

function update_proof_mode() {
  var match = pstates[0];
  if (match) {
    CEphemeron$ReactTemplate.iter_opt(current_proof_mode[0], (function (x) {
            return Curry._1(x[/* reset */2], /* () */0);
          }));
    current_proof_mode[0] = match[0][/* mode */6];
    return CEphemeron$ReactTemplate.iter_opt(current_proof_mode[0], (function (x) {
                  return Curry._1(x[/* set */1], /* () */0);
                }));
  } else {
    CEphemeron$ReactTemplate.iter_opt(current_proof_mode[0], (function (x) {
            return Curry._1(x[/* reset */2], /* () */0);
          }));
    current_proof_mode[0] = find_proof_mode("No");
    return /* () */0;
  }
}

function push(a, l) {
  l[0] = /* :: */[
    a,
    l[0]
  ];
  return update_proof_mode(/* () */0);
}

var NoSuchProof = Caml_exceptions.create("Proof_global-ReactTemplate.NoSuchProof");

CErrors$ReactTemplate.register_handler((function (param) {
        if (param === NoSuchProof) {
          return CErrors$ReactTemplate.user_err(/* None */0, /* None */0, Pp$ReactTemplate.str("No such proof."));
        } else {
          throw CErrors$ReactTemplate.Unhandled;
        }
      }));

var NoCurrentProof = Caml_exceptions.create("Proof_global-ReactTemplate.NoCurrentProof");

CErrors$ReactTemplate.register_handler((function (param) {
        if (param === NoCurrentProof) {
          return CErrors$ReactTemplate.user_err(/* None */0, /* None */0, Pp$ReactTemplate.str("No focused proof (No proof-editing in progress)."));
        } else {
          throw CErrors$ReactTemplate.Unhandled;
        }
      }));

function get_all_proof_names() {
  return Curry._2(Util$ReactTemplate.List[/* map */10], (function (param) {
                return param[/* pid */0];
              }), pstates[0]);
}

function cur_pstate() {
  var match = pstates[0];
  if (match) {
    return match[0];
  } else {
    throw NoCurrentProof;
  }
}

function give_me_the_proof() {
  return cur_pstate(/* () */0)[/* proof */4];
}

function give_me_the_proof_opt() {
  try {
    return /* Some */[give_me_the_proof(/* () */0)];
  }
  catch (exn){
    if (exn === NoCurrentProof) {
      return /* None */0;
    } else {
      throw exn;
    }
  }
}

function get_current_proof_name() {
  return cur_pstate(/* () */0)[/* pid */0];
}

function with_current_proof(f) {
  var match = pstates[0];
  if (match) {
    var p = match[0];
    var match$1 = p[/* endline_tactic */2];
    var et;
    if (match$1) {
      var tac = match$1[0];
      var ist_000 = /* lfun */Names$ReactTemplate.Id[/* Map */10][/* empty */0];
      var ist_001 = /* extra */Geninterp$ReactTemplate.TacStore[/* empty */0];
      var ist = /* record */[
        ist_000,
        ist_001
      ];
      var tac$1 = Curry._3(Geninterp$ReactTemplate.interp, tac[0][0], ist, tac[1]);
      et = Ftactic$ReactTemplate.run(tac$1, (function () {
              return Curry._1(Proofview$ReactTemplate.tclUNIT, /* () */0);
            }));
    } else {
      et = Curry._1(Proofview$ReactTemplate.tclUNIT, /* () */0);
    }
    var match$2 = Curry._2(f, et, p[/* proof */4]);
    var newrecord = p.slice();
    newrecord[/* proof */4] = match$2[0];
    pstates[0] = /* :: */[
      newrecord,
      match[1]
    ];
    return match$2[1];
  } else {
    throw NoCurrentProof;
  }
}

function simple_with_current_proof(f) {
  return with_current_proof((function (t, p) {
                return /* tuple */[
                        Curry._2(f, t, p),
                        /* () */0
                      ];
              }));
}

function compact_the_proof() {
  return simple_with_current_proof((function () {
                return Proof$ReactTemplate.compact;
              }));
}

function set_endline_tactic(tac) {
  var match = pstates[0];
  if (match) {
    var newrecord = match[0].slice();
    pstates[0] = /* :: */[
      (newrecord[/* endline_tactic */2] = /* Some */[tac], newrecord),
      match[1]
    ];
    return /* () */0;
  } else {
    throw NoCurrentProof;
  }
}

function msg_proofs() {
  var l = get_all_proof_names(/* () */0);
  if (l) {
    return Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.str("."), Pp$ReactTemplate.fnl(/* () */0)), Pp$ReactTemplate.str("Proofs currently edited:")), Pp$ReactTemplate.spc(/* () */0)), Pp$ReactTemplate.pr_sequence(Names$ReactTemplate.Id[/* print */8], l)), Pp$ReactTemplate.str("."));
  } else {
    return Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.spc(/* () */0), Pp$ReactTemplate.str("(No proof-editing in progress)."));
  }
}

function there_are_pending_proofs() {
  return 1 - Curry._1(Util$ReactTemplate.List[/* is_empty */45], pstates[0]);
}

function check_no_pending_proof() {
  if (there_are_pending_proofs(/* () */0)) {
    return CErrors$ReactTemplate.user_err(/* None */0, /* None */0, Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.str("Proof editing in progress"), msg_proofs(/* () */0)), Pp$ReactTemplate.fnl(/* () */0)), Pp$ReactTemplate.str("Use \"Abort All\" first or complete proof(s).")));
  } else {
    return /* () */0;
  }
}

function discard_gen(id) {
  pstates[0] = Curry._2(Util$ReactTemplate.List[/* filter */27], (function (param) {
          return 1 - Names$ReactTemplate.Id[/* equal */0](id, param[/* pid */0]);
        }), pstates[0]);
  return /* () */0;
}

function discard(param) {
  var n = Curry._1(Util$ReactTemplate.List[/* length */0], pstates[0]);
  discard_gen(param[/* v */0]);
  if (Curry._1(Util$ReactTemplate.List[/* length */0], pstates[0]) === n) {
    return CErrors$ReactTemplate.user_err(param[/* loc */1], /* Some */["Pfedit.delete_proof"], Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.str("No such proof"), msg_proofs(/* () */0)));
  } else {
    return 0;
  }
}

function discard_current() {
  if (Curry._1(Util$ReactTemplate.List[/* is_empty */45], pstates[0])) {
    throw NoCurrentProof;
  } else {
    pstates[0] = Curry._1(Util$ReactTemplate.List[/* tl */2], pstates[0]);
    return /* () */0;
  }
}

function discard_all() {
  pstates[0] = /* [] */0;
  return /* () */0;
}

function set_proof_mode(mn) {
  var m = find_proof_mode(mn);
  var id = get_current_proof_name(/* () */0);
  pstates[0] = Curry._2(Util$ReactTemplate.List[/* map */10], (function (p) {
          if (Names$ReactTemplate.Id[/* equal */0](p[/* pid */0], id)) {
            var newrecord = p.slice();
            newrecord[/* mode */6] = m;
            return newrecord;
          } else {
            return p;
          }
        }), pstates[0]);
  return update_proof_mode(/* () */0);
}

function activate_proof_mode(mode) {
  return CEphemeron$ReactTemplate.iter_opt(find_proof_mode(mode), (function (x) {
                return Curry._1(x[/* set */1], /* () */0);
              }));
}

function disactivate_current_proof_mode() {
  return CEphemeron$ReactTemplate.iter_opt(current_proof_mode[0], (function (x) {
                return Curry._1(x[/* reset */2], /* () */0);
              }));
}

var default_universe_decl_002 = /* univdecl_constraints */Univ$ReactTemplate.Constraint[/* empty */0];

var default_universe_decl = /* record */[
  /* univdecl_instance : [] */0,
  /* univdecl_extensible_instance : true */1,
  default_universe_decl_002,
  /* univdecl_extensible_constraints : true */1
];

function start_proof(sigma, id, $staropt$star, str, goals, terminator) {
  var pl = $staropt$star ? $staropt$star[0] : default_universe_decl;
  var initial_state_001 = /* terminator */CEphemeron$ReactTemplate.create(terminator);
  var initial_state_004 = /* proof */Proof$ReactTemplate.start(sigma, goals);
  var initial_state_006 = /* mode */find_proof_mode("No");
  var initial_state = /* record */[
    /* pid */id,
    initial_state_001,
    /* endline_tactic : None */0,
    /* section_vars : None */0,
    initial_state_004,
    /* strength */str,
    initial_state_006,
    /* universe_decl */pl
  ];
  return push(initial_state, pstates);
}

function start_dependent_proof(id, $staropt$star, str, goals, terminator) {
  var pl = $staropt$star ? $staropt$star[0] : default_universe_decl;
  var initial_state_001 = /* terminator */CEphemeron$ReactTemplate.create(terminator);
  var initial_state_004 = /* proof */Proof$ReactTemplate.dependent_start(goals);
  var initial_state_006 = /* mode */find_proof_mode("No");
  var initial_state = /* record */[
    /* pid */id,
    initial_state_001,
    /* endline_tactic : None */0,
    /* section_vars : None */0,
    initial_state_004,
    /* strength */str,
    initial_state_006,
    /* universe_decl */pl
  ];
  return push(initial_state, pstates);
}

function get_used_variables() {
  return cur_pstate(/* () */0)[/* section_vars */3];
}

function get_universe_decl() {
  return cur_pstate(/* () */0)[/* universe_decl */7];
}

var proof_using_auto_clear = [/* false */0];

Goptions$ReactTemplate.declare_bool_option(/* None */0, /* record */[
      /* optdepr : false */0,
      /* optname */"Proof using Clear Unused",
      /* optkey : :: */[
        "Proof",
        /* :: */[
          "Using",
          /* :: */[
            "Clear",
            /* :: */[
              "Unused",
              /* [] */0
            ]
          ]
        ]
      ],
      /* optread */(function () {
          return proof_using_auto_clear[0];
        }),
      /* optwrite */(function (b) {
          proof_using_auto_clear[0] = b;
          return /* () */0;
        })
    ]);

function set_used_variables(l) {
  var env = Global$ReactTemplate.env(/* () */0);
  var ids = Curry._3(Util$ReactTemplate.List[/* fold_right */14], Names$ReactTemplate.Id[/* Set */9][/* add */3], l, Names$ReactTemplate.Id[/* Set */9][/* empty */0]);
  var ctx = Environ$ReactTemplate.keep_hyps(env, ids);
  var ctx_set = Curry._3(Util$ReactTemplate.List[/* fold_right */14], Names$ReactTemplate.Id[/* Set */9][/* add */3], Curry._2(Util$ReactTemplate.List[/* map */10], Context$ReactTemplate.Named[/* Declaration */0][/* get_id */0], ctx), Names$ReactTemplate.Id[/* Set */9][/* empty */0]);
  var aux = function (env, entry, orig) {
    var to_clear = orig[2];
    var all_safe = orig[1];
    var ctx = orig[0];
    if (entry.tag) {
      var x = entry[0];
      if (Curry._2(Names$ReactTemplate.Id[/* Set */9][/* mem */2], x, all_safe)) {
        return orig;
      } else {
        var vars = Curry._2(Names$ReactTemplate.Id[/* Set */9][/* union */6], Environ$ReactTemplate.global_vars_set(env, entry[1]), Environ$ReactTemplate.global_vars_set(env, entry[2]));
        if (Curry._2(Names$ReactTemplate.Id[/* Set */9][/* subset */11], vars, all_safe)) {
          return /* tuple */[
                  /* :: */[
                    entry,
                    ctx
                  ],
                  Curry._2(Names$ReactTemplate.Id[/* Set */9][/* add */3], x, all_safe),
                  to_clear
                ];
        } else {
          return /* tuple */[
                  ctx,
                  all_safe,
                  /* :: */[
                    CAst$ReactTemplate.make(/* None */0, x),
                    to_clear
                  ]
                ];
        }
      }
    } else {
      var x$1 = entry[0];
      if (Curry._2(Names$ReactTemplate.Id[/* Set */9][/* mem */2], x$1, all_safe)) {
        return orig;
      } else {
        return /* tuple */[
                ctx,
                all_safe,
                /* :: */[
                  CAst$ReactTemplate.make(/* None */0, x$1),
                  to_clear
                ]
              ];
      }
    }
  };
  var match = Environ$ReactTemplate.fold_named_context(aux, env, /* tuple */[
        ctx,
        ctx_set,
        /* [] */0
      ]);
  var ctx$1 = match[0];
  var to_clear = proof_using_auto_clear[0] ? match[2] : /* [] */0;
  var match$1 = pstates[0];
  if (match$1) {
    var p = match$1[0];
    if (!Option$ReactTemplate.is_empty(p[/* section_vars */3])) {
      CErrors$ReactTemplate.user_err(/* None */0, /* None */0, Pp$ReactTemplate.str("Used section variables can be declared only once"));
    }
    var newrecord = p.slice();
    pstates[0] = /* :: */[
      (newrecord[/* section_vars */3] = /* Some */[ctx$1], newrecord),
      match$1[1]
    ];
    return /* tuple */[
            ctx$1,
            to_clear
          ];
  } else {
    throw NoCurrentProof;
  }
}

function get_open_goals() {
  var match = Proof$ReactTemplate.proof(cur_pstate(/* () */0)[/* proof */4]);
  return (Curry._1(Util$ReactTemplate.List[/* length */0], match[0]) + Curry._3(Util$ReactTemplate.List[/* fold_left */13], (function (prim, prim$1) {
                  return prim + prim$1 | 0;
                }), 0, Curry._2(Util$ReactTemplate.List[/* map */10], (function (param) {
                      return Curry._1(Util$ReactTemplate.List[/* length */0], param[0]) + Curry._1(Util$ReactTemplate.List[/* length */0], param[1]) | 0;
                    }), match[1])) | 0) + Curry._1(Util$ReactTemplate.List[/* length */0], match[2]) | 0;
}

function close_proof(keep_body_ucst_separate, feedback_id, now, fpl) {
  var match = cur_pstate(/* () */0);
  var universe_decl = match[/* universe_decl */7];
  var strength = match[/* strength */5];
  var proof = match[/* proof */4];
  var section_vars = match[/* section_vars */3];
  var terminator = match[/* terminator */1];
  var poly = Util$ReactTemplate.pi2(strength);
  var initial_goals = Proof$ReactTemplate.initial_goals(proof);
  var initial_euctx = Proof$ReactTemplate.initial_euctx(proof);
  var constrain_variables = function (ctx) {
    return UState$ReactTemplate.constrain_variables(UState$ReactTemplate.context_set(initial_euctx)[0], ctx);
  };
  var match$1 = Future$ReactTemplate.split2(fpl);
  var univs = match$1[1];
  var universes = poly || now ? Future$ReactTemplate.force(univs) : initial_euctx;
  var subst_evar = function (k) {
    return Proof$ReactTemplate.in_proof(proof, (function (m) {
                  return Evd$ReactTemplate.existential_opt_value(m, k);
                }));
  };
  var nf = Universes$ReactTemplate.nf_evars_and_universes_opt_subst(subst_evar, UState$ReactTemplate.subst(universes));
  var make_body;
  if (poly || now) {
    make_body = (function (t, p) {
        return Future$ReactTemplate.split2(Future$ReactTemplate.chain(p, (function (param) {
                          var t$1 = t;
                          var param$1 = param;
                          var c = param$1[0];
                          var eff = param$1[1];
                          var allow_deferred = 1 - poly && (keep_body_ucst_separate || 1 - Caml_obj.caml_equal(Safe_typing$ReactTemplate.empty_private_constants, eff));
                          var typ = allow_deferred ? t$1 : Curry._1(nf, t$1);
                          var env = Global$ReactTemplate.env(/* () */0);
                          var used_univs_body = Univops$ReactTemplate.universes_of_constr(env, c);
                          var used_univs_typ = Univops$ReactTemplate.universes_of_constr(env, typ);
                          if (allow_deferred) {
                            var initunivs = UState$ReactTemplate.const_univ_entry(poly, initial_euctx);
                            var ctx = constrain_variables(universes);
                            var used_univs = Curry._2(Univ$ReactTemplate.LSet[/* union */6], used_univs_body, used_univs_typ);
                            var ctx_body = UState$ReactTemplate.restrict(ctx, used_univs);
                            var univs = UState$ReactTemplate.check_mono_univ_decl(ctx_body, universe_decl);
                            return /* tuple */[
                                    /* tuple */[
                                      initunivs,
                                      typ
                                    ],
                                    /* tuple */[
                                      /* tuple */[
                                        c,
                                        univs
                                      ],
                                      eff
                                    ]
                                  ];
                          } else {
                            var used_univs$1 = Curry._2(Univ$ReactTemplate.LSet[/* union */6], used_univs_body, used_univs_typ);
                            var ctx$1 = UState$ReactTemplate.restrict(universes, used_univs$1);
                            var univs$1 = UState$ReactTemplate.check_univ_decl(poly, ctx$1, universe_decl);
                            return /* tuple */[
                                    /* tuple */[
                                      univs$1,
                                      typ
                                    ],
                                    /* tuple */[
                                      /* tuple */[
                                        c,
                                        Univ$ReactTemplate.ContextSet[/* empty */0]
                                      ],
                                      eff
                                    ]
                                  ];
                          }
                        })));
      });
  } else {
    make_body = (function (t, p) {
        var univctx = /* Monomorphic_const_entry */Block.__(0, [UState$ReactTemplate.context_set(universes)]);
        return /* tuple */[
                Future$ReactTemplate.from_val(/* None */0, /* tuple */[
                      univctx,
                      Curry._1(nf, t)
                    ]),
                Future$ReactTemplate.chain(p, (function (param) {
                        var bodyunivs = constrain_variables(Future$ReactTemplate.force(univs));
                        var univs$1 = UState$ReactTemplate.check_mono_univ_decl(bodyunivs, universe_decl);
                        return /* tuple */[
                                /* tuple */[
                                  param[0],
                                  univs$1
                                ],
                                param[1]
                              ];
                      }))
              ];
      });
  }
  var entry_fn = function (p, param) {
    var t = EConstr$ReactTemplate.Unsafe[/* to_constr */0](param[1]);
    var match = Curry._2(make_body, t, p);
    var match$1 = Future$ReactTemplate.force(match[0]);
    return /* record */[
            /* const_entry_body */match[1],
            /* const_entry_secctx */section_vars,
            /* const_entry_feedback */feedback_id,
            /* const_entry_type : Some */[match$1[1]],
            /* const_entry_universes */match$1[0],
            /* const_entry_opaque : true */1,
            /* const_entry_inline_code : false */0
          ];
  };
  var entries = Future$ReactTemplate.map2(entry_fn, match$1[0], initial_goals);
  return /* tuple */[
          /* record */[
            /* id */match[/* pid */0],
            /* entries */entries,
            /* persistence */strength,
            /* universes */universes
          ],
          (function (pr_ending) {
              return Curry._1(CEphemeron$ReactTemplate.get(terminator), pr_ending);
            })
        ];
}

function return_proof($staropt$star, _) {
  var allow_partial = $staropt$star ? $staropt$star[0] : /* false */0;
  var match = cur_pstate(/* () */0);
  var proof = match[/* proof */4];
  var pid = match[/* pid */0];
  if (allow_partial) {
    var proofs = Proof$ReactTemplate.partial_proof(proof);
    var match$1 = Proof$ReactTemplate.proof(proof);
    var evd = match$1[4];
    var eff = Evd$ReactTemplate.eval_side_effects(evd);
    var proofs$1 = Curry._2(Util$ReactTemplate.List[/* map */10], (function (c) {
            return /* tuple */[
                    EConstr$ReactTemplate.Unsafe[/* to_constr */0](c),
                    eff
                  ];
          }), proofs);
    return /* tuple */[
            proofs$1,
            Evd$ReactTemplate.evar_universe_context(evd)
          ];
  } else {
    var initial_goals = Proof$ReactTemplate.initial_goals(proof);
    var error = function (s) {
      var prf = Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.str(" (in proof "), Names$ReactTemplate.Id[/* print */8](pid)), Pp$ReactTemplate.str(")"));
      throw [
            CErrors$ReactTemplate.UserError,
            /* Some */["last tactic before Qed"],
            Pp$ReactTemplate.$plus$plus(s, prf)
          ];
    };
    var evd$1;
    try {
      evd$1 = Proof$ReactTemplate.$$return(proof);
    }
    catch (exn){
      if (exn === Proof$ReactTemplate.UnfinishedProof) {
        evd$1 = error(Pp$ReactTemplate.str("Attempt to save an incomplete proof"));
      } else if (exn === Proof$ReactTemplate.HasShelvedGoals) {
        evd$1 = error(Pp$ReactTemplate.str("Attempt to save a proof with shelved goals"));
      } else if (exn === Proof$ReactTemplate.HasGivenUpGoals) {
        evd$1 = error(Pp$ReactTemplate.strbrk("Attempt to save a proof with given up goals. If this is really what you want to do, use Admitted in place of Qed."));
      } else if (exn === Proof$ReactTemplate.HasUnresolvedEvar) {
        evd$1 = error(Pp$ReactTemplate.strbrk("Attempt to save a proof with existential variables still non-instantiated"));
      } else {
        throw exn;
      }
    }
    var eff$1 = Evd$ReactTemplate.eval_side_effects(evd$1);
    var evd$2 = Evd$ReactTemplate.minimize_universes(evd$1);
    var proofs$2 = Curry._2(Util$ReactTemplate.List[/* map */10], (function (param) {
            return /* tuple */[
                    Evarutil$ReactTemplate.nf_evars_universes(evd$2)(EConstr$ReactTemplate.Unsafe[/* to_constr */0](param[0])),
                    eff$1
                  ];
          }), initial_goals);
    return /* tuple */[
            proofs$2,
            Evd$ReactTemplate.evar_universe_context(evd$2)
          ];
  }
}

function close_future_proof(feedback_id, proof) {
  return close_proof(/* true */1, /* Some */[feedback_id], /* false */0, proof);
}

function close_proof$1(keep_body_ucst_separate, fix_exn) {
  return close_proof(keep_body_ucst_separate, /* None */0, /* true */1, Future$ReactTemplate.from_val(/* Some */[fix_exn], return_proof(/* None */0, /* () */0)));
}

function get_terminator() {
  return CEphemeron$ReactTemplate.get(cur_pstate(/* () */0)[/* terminator */1]);
}

function set_terminator(hook) {
  var match = pstates[0];
  if (match) {
    var newrecord = match[0].slice();
    pstates[0] = /* :: */[
      (newrecord[/* terminator */1] = CEphemeron$ReactTemplate.create(hook), newrecord),
      match[1]
    ];
    return /* () */0;
  } else {
    throw NoCurrentProof;
  }
}

function get_current_initial_conclusions() {
  var match = cur_pstate(/* () */0);
  var initial = Proof$ReactTemplate.initial_goals(match[/* proof */4]);
  var goals = Curry._2(Util$ReactTemplate.List[/* map */10], (function (param) {
          return param[1];
        }), initial);
  return /* tuple */[
          match[/* pid */0],
          /* tuple */[
            goals,
            match[/* strength */5]
          ]
        ];
}

var V82 = /* module */[/* get_current_initial_conclusions */get_current_initial_conclusions];

function freeze(marshallable) {
  if (marshallable !== 4448519) {
    return pstates[0];
  } else {
    return CErrors$ReactTemplate.anomaly(/* None */0, /* None */0, Pp$ReactTemplate.str("full marshalling of proof state not supported."));
  }
}

function unfreeze(s) {
  pstates[0] = s;
  return update_proof_mode(/* () */0);
}

function proof_of_state(param) {
  if (param) {
    return param[0][/* proof */4];
  } else {
    throw NoCurrentProof;
  }
}

function copy_terminators(src, tgt) {
  if (Curry._1(Util$ReactTemplate.List[/* length */0], src) !== Curry._1(Util$ReactTemplate.List[/* length */0], tgt)) {
    throw [
          Caml_builtin_exceptions.assert_failure,
          [
            "proof_global.ml",
            479,
            2
          ]
        ];
  }
  return Curry._3(Util$ReactTemplate.List[/* map2 */16], (function (op, p) {
                var newrecord = p.slice();
                newrecord[/* terminator */1] = op[/* terminator */1];
                return newrecord;
              }), src, tgt);
}

function update_global_env() {
  return with_current_proof((function (_, p) {
                return Proof$ReactTemplate.in_proof(p, (function (sigma) {
                              var tac = Proofview$ReactTemplate.Unsafe[/* tclEVARS */0](Evd$ReactTemplate.update_sigma_env(sigma, Global$ReactTemplate.env(/* () */0)));
                              var match = Proof$ReactTemplate.run_tactic(Global$ReactTemplate.env(/* () */0), tac, p);
                              return /* tuple */[
                                      match[0],
                                      /* () */0
                                    ];
                            }));
              }));
}

function hook() {
  try {
    return Proof_bullet$ReactTemplate.suggest(give_me_the_proof(/* () */0));
  }
  catch (exn){
    if (exn === NoCurrentProof) {
      return Pp$ReactTemplate.mt(/* () */0);
    } else {
      throw exn;
    }
  }
}

Proofview$ReactTemplate.set_nosuchgoals_hook(hook);

exports.there_are_pending_proofs = there_are_pending_proofs;
exports.check_no_pending_proof = check_no_pending_proof;
exports.get_current_proof_name = get_current_proof_name;
exports.get_all_proof_names = get_all_proof_names;
exports.discard = discard;
exports.discard_current = discard_current;
exports.discard_all = discard_all;
exports.give_me_the_proof_opt = give_me_the_proof_opt;
exports.NoCurrentProof = NoCurrentProof;
exports.give_me_the_proof = give_me_the_proof;
exports.compact_the_proof = compact_the_proof;
exports.make_terminator = make_terminator;
exports.apply_terminator = apply_terminator;
exports.start_proof = start_proof;
exports.start_dependent_proof = start_dependent_proof;
exports.update_global_env = update_global_env;
exports.close_proof = close_proof$1;
exports.return_proof = return_proof;
exports.close_future_proof = close_future_proof;
exports.get_terminator = get_terminator;
exports.set_terminator = set_terminator;
exports.NoSuchProof = NoSuchProof;
exports.get_open_goals = get_open_goals;
exports.with_current_proof = with_current_proof;
exports.simple_with_current_proof = simple_with_current_proof;
exports.set_endline_tactic = set_endline_tactic;
exports.set_used_variables = set_used_variables;
exports.get_used_variables = get_used_variables;
exports.get_universe_decl = get_universe_decl;
exports.V82 = V82;
exports.freeze = freeze;
exports.unfreeze = unfreeze;
exports.proof_of_state = proof_of_state;
exports.copy_terminators = copy_terminators;
exports.register_proof_mode = register_proof_mode;
exports.get_default_proof_mode_name = get_default_proof_mode_name;
exports.set_proof_mode = set_proof_mode;
exports.activate_proof_mode = activate_proof_mode;
exports.disactivate_current_proof_mode = disactivate_current_proof_mode;
/* proof_modes Not a pure module */

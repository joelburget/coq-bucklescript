// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var Block = require("bs-platform/lib/js/block.js");
var Curry = require("bs-platform/lib/js/curry.js");
var Js_exn = require("bs-platform/lib/js/js_exn.js");
var Caml_array = require("bs-platform/lib/js/caml_array.js");
var Pp$ReactTemplate = require("./pp.bs.js");
var Evd$ReactTemplate = require("./evd.bs.js");
var Univ$ReactTemplate = require("./univ.bs.js");
var Util$ReactTemplate = require("./util.bs.js");
var Vars$ReactTemplate = require("./vars.bs.js");
var Sorts$ReactTemplate = require("./sorts.bs.js");
var Constr$ReactTemplate = require("./constr.bs.js");
var Global$ReactTemplate = require("./global.bs.js");
var CErrors$ReactTemplate = require("./cErrors.bs.js");
var EConstr$ReactTemplate = require("./eConstr.bs.js");
var Environ$ReactTemplate = require("./environ.bs.js");
var Nameops$ReactTemplate = require("./nameops.bs.js");
var Termops$ReactTemplate = require("./termops.bs.js");
var Typeops$ReactTemplate = require("./typeops.bs.js");
var Evarconv$ReactTemplate = require("./evarconv.bs.js");
var Retyping$ReactTemplate = require("./retyping.bs.js");
var Caml_builtin_exceptions = require("bs-platform/lib/js/caml_builtin_exceptions.js");
var Evarsolve$ReactTemplate = require("./evarsolve.bs.js");
var Inductive$ReactTemplate = require("./inductive.bs.js");
var Evardefine$ReactTemplate = require("./evardefine.bs.js");
var Type_errors$ReactTemplate = require("./type_errors.bs.js");
var Inductiveops$ReactTemplate = require("./inductiveops.bs.js");
var Reductionops$ReactTemplate = require("./reductionops.bs.js");
var Pretype_errors$ReactTemplate = require("./pretype_errors.bs.js");
var Arguments_renaming$ReactTemplate = require("./arguments_renaming.bs.js");

function meta_type(evd, mv) {
  var ty;
  try {
    ty = Evd$ReactTemplate.meta_ftype(evd, mv);
  }
  catch (exn){
    if (exn === Caml_builtin_exceptions.not_found) {
      ty = CErrors$ReactTemplate.anomaly(/* None */0, /* None */0, Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.str("unknown meta ?"), Pp$ReactTemplate.str(Nameops$ReactTemplate.string_of_meta(mv))), Pp$ReactTemplate.str(".")));
    } else {
      throw exn;
    }
  }
  var ty$1 = Evd$ReactTemplate.map_fl(EConstr$ReactTemplate.of_constr, ty);
  return Reductionops$ReactTemplate.meta_instance(evd, ty$1);
}

function inductive_type_knowing_parameters(env, sigma, param, jl) {
  var u = EConstr$ReactTemplate.Unsafe[/* to_instance */4](param[1]);
  var mspec = Inductive$ReactTemplate.lookup_mind_specif(env, param[0]);
  var paramstyp = Util$ReactTemplate.$$Array[/* map */12]((function (j) {
          return Block.__(246, [(function () {
                        return EConstr$ReactTemplate.to_constr(sigma, j[/* uj_type */1]);
                      })]);
        }), jl);
  return Inductive$ReactTemplate.type_of_inductive_knowing_parameters(env, /* None */0, /* tuple */[
              mspec,
              u
            ], paramstyp);
}

function e_type_judgment(env, evdref, j) {
  var match = EConstr$ReactTemplate.kind(evdref[0], Reductionops$ReactTemplate.whd_all(env)(evdref[0], j[/* uj_type */1]));
  switch (match.tag | 0) {
    case 3 : 
        var match$1 = Evardefine$ReactTemplate.define_evar_as_sort(env, evdref[0], match[0]);
        evdref[0] = match$1[0];
        return /* record */[
                /* utj_val */j[/* uj_val */0],
                /* utj_type */match$1[1]
              ];
    case 4 : 
        return /* record */[
                /* utj_val */j[/* uj_val */0],
                /* utj_type */EConstr$ReactTemplate.ESorts[/* kind */1](evdref[0], match[0])
              ];
    default:
      return Pretype_errors$ReactTemplate.error_not_a_type(/* None */0, env, evdref[0], j);
  }
}

function e_assumption_of_judgment(env, evdref, j) {
  try {
    return e_type_judgment(env, evdref, j)[/* utj_val */0];
  }
  catch (raw_exn){
    var exn = Js_exn.internalToOCamlException(raw_exn);
    if (exn[0] === Type_errors$ReactTemplate.TypeError) {
      return Pretype_errors$ReactTemplate.error_assumption(/* None */0, env, evdref[0], j);
    } else if (exn[0] === Pretype_errors$ReactTemplate.PretypeError) {
      return Pretype_errors$ReactTemplate.error_assumption(/* None */0, env, evdref[0], j);
    } else {
      throw exn;
    }
  }
}

function e_check_branch_types(env, evdref, param, cj, param$1) {
  var explft = param$1[1];
  var lfj = param$1[0];
  var u = param[1];
  var ind = param[0];
  if (lfj.length !== explft.length) {
    Pretype_errors$ReactTemplate.error_number_branches(/* None */0, env, evdref[0], cj, explft.length);
  }
  for(var i = 0 ,i_finish = explft.length - 1 | 0; i <= i_finish; ++i){
    if (!Evarconv$ReactTemplate.e_cumul(env, /* None */0, evdref, Caml_array.caml_array_get(lfj, i)[/* uj_type */1], Caml_array.caml_array_get(explft, i))) {
      Pretype_errors$ReactTemplate.error_ill_formed_branch(/* None */0, env, evdref[0], cj[/* uj_val */0], /* tuple */[
            /* tuple */[
              ind,
              i + 1 | 0
            ],
            u
          ], Caml_array.caml_array_get(lfj, i)[/* uj_type */1], Caml_array.caml_array_get(explft, i));
    }
    
  }
  return /* () */0;
}

function max_sort(l) {
  if (Curry._2(Sorts$ReactTemplate.List[/* mem */0], /* InType */2, l)) {
    return /* InType */2;
  } else if (Curry._2(Sorts$ReactTemplate.List[/* mem */0], /* InSet */1, l)) {
    return /* InSet */1;
  } else {
    return /* InProp */0;
  }
}

function e_is_correct_arity(env, evdref, c, pj, ind, specif, params) {
  var arsign = Inductiveops$ReactTemplate.make_arity_signature(env, evdref[0], /* true */1, Inductiveops$ReactTemplate.make_ind_family(/* tuple */[
            ind,
            params
          ]));
  var allowed_sorts = Inductive$ReactTemplate.elim_sorts(specif);
  var error = function () {
    return Pretype_errors$ReactTemplate.error_elim_arity(/* None */0, env, evdref[0], ind, allowed_sorts, c, pj, /* None */0);
  };
  var _env = env;
  var _pt = pj[/* uj_type */1];
  var _ar = Curry._1(Util$ReactTemplate.List[/* rev */4], arsign);
  while(true) {
    var ar = _ar;
    var pt = _pt;
    var env$1 = _env;
    var pt$prime = Reductionops$ReactTemplate.whd_all(env$1)(evdref[0], pt);
    var match = EConstr$ReactTemplate.kind(evdref[0], pt$prime);
    var exit = 0;
    switch (match.tag | 0) {
      case 3 : 
          if (ar) {
            exit = 1;
          } else {
            var match$1 = Evd$ReactTemplate.fresh_sort_in_family(/* None */0, /* None */0, env$1, evdref[0], max_sort(allowed_sorts));
            evdref[0] = Evd$ReactTemplate.define(match[0][0], Constr$ReactTemplate.mkSort(match$1[1]), match$1[0]);
            return /* () */0;
          }
          break;
      case 4 : 
          if (ar) {
            exit = 1;
          } else {
            var s = EConstr$ReactTemplate.ESorts[/* kind */1](evdref[0], match[0]);
            if (Curry._2(Sorts$ReactTemplate.List[/* mem */0], Sorts$ReactTemplate.family(s), allowed_sorts)) {
              return 0;
            } else {
              return error(/* () */0);
            }
          }
          break;
      case 6 : 
          if (ar) {
            var match$2 = ar[0];
            var a1 = match[1];
            if (match$2.tag) {
              exit = 1;
            } else {
              if (!Evarconv$ReactTemplate.e_cumul(env$1, /* None */0, evdref, a1, match$2[1])) {
                error(/* () */0);
              }
              _ar = ar[1];
              _pt = match[2];
              _env = EConstr$ReactTemplate.push_rel(/* LocalAssum */Block.__(0, [
                      match[0],
                      a1
                    ]), env$1);
              continue ;
              
            }
          } else {
            return error(/* () */0);
          }
          break;
      default:
        exit = 1;
    }
    if (exit === 1) {
      if (ar) {
        var d = ar[0];
        if (d.tag) {
          _ar = ar[1];
          _pt = EConstr$ReactTemplate.Vars[/* lift */0](1, pt$prime);
          _env = EConstr$ReactTemplate.push_rel(d, env$1);
          continue ;
          
        } else {
          return error(/* () */0);
        }
      } else {
        return error(/* () */0);
      }
    }
    
  };
}

function lambda_applist_assum(sigma, n, c, l) {
  var _n = n;
  var _subst = /* [] */0;
  var _t = c;
  var _l = l;
  while(true) {
    var l$1 = _l;
    var t = _t;
    var subst = _subst;
    var n$1 = _n;
    if (n$1) {
      var match = EConstr$ReactTemplate.kind(sigma, t);
      switch (match.tag | 0) {
        case 7 : 
            if (l$1) {
              _l = l$1[1];
              _t = match[2];
              _subst = /* :: */[
                l$1[0],
                subst
              ];
              _n = n$1 - 1 | 0;
              continue ;
              
            } else {
              return CErrors$ReactTemplate.anomaly(/* None */0, /* None */0, Pp$ReactTemplate.str("Not enough lambda/let's."));
            }
            break;
        case 8 : 
            _t = match[3];
            _subst = /* :: */[
              EConstr$ReactTemplate.Vars[/* substl */3](subst, match[1]),
              subst
            ];
            _n = n$1 - 1 | 0;
            continue ;
            default:
          return CErrors$ReactTemplate.anomaly(/* None */0, /* None */0, Pp$ReactTemplate.str("Not enough lambda/let's."));
      }
    } else if (l$1) {
      return CErrors$ReactTemplate.anomaly(/* None */0, /* None */0, Pp$ReactTemplate.str("Not enough arguments."));
    } else {
      return EConstr$ReactTemplate.Vars[/* substl */3](subst, t);
    }
  };
}

function e_type_case_branches(env, evdref, param, pj, c) {
  var ind = param[0];
  var specif = Inductive$ReactTemplate.lookup_mind_specif(env, ind[0]);
  var nparams = Inductive$ReactTemplate.inductive_params(specif);
  var match = Curry._2(Util$ReactTemplate.List[/* chop */99], nparams, param[1]);
  var p = pj[/* uj_val */0];
  var params = Curry._2(Util$ReactTemplate.List[/* map */10], EConstr$ReactTemplate.Unsafe[/* to_constr */0], match[0]);
  e_is_correct_arity(env, evdref, c, pj, ind, specif, params);
  var lc = Inductive$ReactTemplate.build_branches_type(ind, specif, params, EConstr$ReactTemplate.to_constr(evdref[0], p));
  var lc$1 = Util$ReactTemplate.$$Array[/* map */12](EConstr$ReactTemplate.of_constr, lc);
  var n = specif[1][/* mind_nrealdecls */6];
  var ty = Reductionops$ReactTemplate.whd_betaiota(evdref[0], lambda_applist_assum(evdref[0], n + 1 | 0, p, Util$ReactTemplate.$at(match[1], /* :: */[
                c,
                /* [] */0
              ])));
  return /* tuple */[
          lc$1,
          ty
        ];
}

function check_type_fixpoint(loc, env, evdref, lna, lar, vdefj) {
  var lt = vdefj.length;
  if (lar.length === lt) {
    for(var i = 0 ,i_finish = lt - 1 | 0; i <= i_finish; ++i){
      if (!Evarconv$ReactTemplate.e_cumul(env, /* None */0, evdref, Caml_array.caml_array_get(vdefj, i)[/* uj_type */1], EConstr$ReactTemplate.Vars[/* lift */0](lt, Caml_array.caml_array_get(lar, i)))) {
        Pretype_errors$ReactTemplate.error_ill_typed_rec_body(loc, env, evdref[0], i, lna, vdefj, lar);
      }
      
    }
    return /* () */0;
  } else {
    return 0;
  }
}

function check_allowed_sort(env, sigma, ind, c, p) {
  var pj = Retyping$ReactTemplate.get_judgment_of(env, sigma, p);
  var ksort = Sorts$ReactTemplate.family(EConstr$ReactTemplate.ESorts[/* kind */1](sigma, Reductionops$ReactTemplate.sort_of_arity(env, sigma, pj[/* uj_type */1])));
  var specif = Global$ReactTemplate.lookup_inductive(ind[0]);
  var sorts = Inductive$ReactTemplate.elim_sorts(specif);
  if (Curry._2(Util$ReactTemplate.List[/* exists */21], (function (param) {
            return +(ksort === param);
          }), sorts)) {
    return 0;
  } else {
    var s = Inductive$ReactTemplate.inductive_sort_family(specif[1]);
    return Pretype_errors$ReactTemplate.error_elim_arity(/* None */0, env, sigma, ind, sorts, c, pj, /* Some */[/* tuple */[
                  ksort,
                  s,
                  Type_errors$ReactTemplate.error_elim_explain(ksort, s)
                ]]);
  }
}

function e_judge_of_cast(env, evdref, cj, k, tj) {
  var expected_type = tj[/* utj_val */0];
  if (!Evarconv$ReactTemplate.e_cumul(env, /* None */0, evdref, cj[/* uj_type */1], expected_type)) {
    Pretype_errors$ReactTemplate.error_actual_type_core(/* None */0, env, evdref[0], cj, expected_type);
  }
  return /* record */[
          /* uj_val */EConstr$ReactTemplate.mkCast(/* tuple */[
                cj[/* uj_val */0],
                k,
                expected_type
              ]),
          /* uj_type */expected_type
        ];
}

function enrich_env(env, evdref) {
  var penv = Environ$ReactTemplate.pre_env(env);
  var newrecord = penv.slice();
  var init = penv[/* env_stratification */4];
  newrecord[/* env_stratification */4] = /* record */[
    /* env_universes */Evd$ReactTemplate.universes(evdref[0]),
    /* env_engagement */init[/* env_engagement */1]
  ];
  return Environ$ReactTemplate.env_of_pre_env(newrecord);
}

function check_fix(env, sigma, pfix) {
  var inj = function (c) {
    return EConstr$ReactTemplate.to_constr(sigma, c);
  };
  var match = pfix[1];
  return Inductive$ReactTemplate.check_fix(env, /* tuple */[
              pfix[0],
              /* tuple */[
                match[0],
                Util$ReactTemplate.$$Array[/* map */12](inj, match[1]),
                Util$ReactTemplate.$$Array[/* map */12](inj, match[2])
              ]
            ]);
}

function check_cofix(env, sigma, pcofix) {
  var inj = function (c) {
    return EConstr$ReactTemplate.to_constr(sigma, c);
  };
  var match = pcofix[1];
  return Inductive$ReactTemplate.check_cofix(env, /* tuple */[
              pcofix[0],
              /* tuple */[
                match[0],
                Util$ReactTemplate.$$Array[/* map */12](inj, match[1]),
                Util$ReactTemplate.$$Array[/* map */12](inj, match[2])
              ]
            ]);
}

var judge_of_prop_001 = /* uj_type */EConstr$ReactTemplate.mkSort(Sorts$ReactTemplate.type1);

var judge_of_prop = /* record */[
  /* uj_val */EConstr$ReactTemplate.mkProp,
  judge_of_prop_001
];

var judge_of_set_001 = /* uj_type */EConstr$ReactTemplate.mkSort(Sorts$ReactTemplate.type1);

var judge_of_set = /* record */[
  /* uj_val */EConstr$ReactTemplate.mkSet,
  judge_of_set_001
];

function judge_of_projection(env, sigma, p, cj) {
  var pb = Environ$ReactTemplate.lookup_projection(p, env);
  var match;
  try {
    match = Inductiveops$ReactTemplate.find_mrectype(env, sigma, cj[/* uj_type */1]);
  }
  catch (exn){
    if (exn === Caml_builtin_exceptions.not_found) {
      match = Pretype_errors$ReactTemplate.error_case_not_inductive(/* None */0, env, sigma, cj);
    } else {
      throw exn;
    }
  }
  var u = EConstr$ReactTemplate.EInstance[/* kind */1](sigma, match[0][1]);
  var ty = EConstr$ReactTemplate.of_constr(Vars$ReactTemplate.subst_instance_constr(u, pb[/* proj_type */3]));
  var ty$1 = EConstr$ReactTemplate.Vars[/* substl */3](/* :: */[
        cj[/* uj_val */0],
        Curry._1(Util$ReactTemplate.List[/* rev */4], match[1])
      ], ty);
  return /* record */[
          /* uj_val */EConstr$ReactTemplate.mkProj(/* tuple */[
                p,
                cj[/* uj_val */0]
              ]),
          /* uj_type */ty$1
        ];
}

function judge_of_abstraction(_, name, $$var, j) {
  return /* record */[
          /* uj_val */EConstr$ReactTemplate.mkLambda(/* tuple */[
                name,
                $$var[/* utj_val */0],
                j[/* uj_val */0]
              ]),
          /* uj_type */EConstr$ReactTemplate.mkProd(/* tuple */[
                name,
                $$var[/* utj_val */0],
                j[/* uj_type */1]
              ])
        ];
}

function judge_of_product(env, name, t1, t2) {
  var s = Typeops$ReactTemplate.sort_of_product(env, t1[/* utj_type */1], t2[/* utj_type */1]);
  return /* record */[
          /* uj_val */EConstr$ReactTemplate.mkProd(/* tuple */[
                name,
                t1[/* utj_val */0],
                t2[/* utj_val */0]
              ]),
          /* uj_type */EConstr$ReactTemplate.mkSort(s)
        ];
}

function execute(env, evdref, cstr) {
  var cstr$1 = Reductionops$ReactTemplate.whd_evar(evdref[0], cstr);
  var match = EConstr$ReactTemplate.kind(evdref[0], cstr$1);
  switch (match.tag | 0) {
    case 0 : 
        var env$1 = env;
        var v = match[0];
        return Termops$ReactTemplate.on_judgment(EConstr$ReactTemplate.of_constr, Typeops$ReactTemplate.judge_of_relative(env$1, v));
    case 1 : 
        var env$2 = env;
        var id = match[0];
        return Termops$ReactTemplate.on_judgment(EConstr$ReactTemplate.of_constr, Typeops$ReactTemplate.judge_of_variable(env$2, id));
    case 2 : 
        return /* record */[
                /* uj_val */cstr$1,
                /* uj_type */meta_type(evdref[0], match[0])
              ];
    case 3 : 
        var ty = EConstr$ReactTemplate.existential_type(evdref[0], match[0]);
        var jty = execute(env, evdref, ty);
        var jty$1 = e_assumption_of_judgment(env, evdref, jty);
        return /* record */[
                /* uj_val */cstr$1,
                /* uj_type */jty$1
              ];
    case 4 : 
        var match$1 = EConstr$ReactTemplate.ESorts[/* kind */1](evdref[0], match[0]);
        if (match$1.tag) {
          var u = match$1[0];
          var uu = Univ$ReactTemplate.Universe[/* super */10](u);
          return /* record */[
                  /* uj_val */EConstr$ReactTemplate.mkType(u),
                  /* uj_type */EConstr$ReactTemplate.mkType(uu)
                ];
        } else {
          var param = match$1[0];
          if (param !== 0) {
            return judge_of_prop;
          } else {
            return judge_of_set;
          }
        }
        break;
    case 5 : 
        var cj = execute(env, evdref, match[0]);
        var tj = execute(env, evdref, match[2]);
        var tj$1 = e_type_judgment(env, evdref, tj);
        return e_judge_of_cast(env, evdref, cj, match[1], tj$1);
    case 6 : 
        var name = match[0];
        var j = execute(env, evdref, match[1]);
        var varj = e_type_judgment(env, evdref, j);
        var env1 = EConstr$ReactTemplate.push_rel(/* LocalAssum */Block.__(0, [
                name,
                varj[/* utj_val */0]
              ]), env);
        var j$prime = execute(env1, evdref, match[2]);
        var varj$prime = e_type_judgment(env1, evdref, j$prime);
        return judge_of_product(env, name, varj, varj$prime);
    case 7 : 
        var name$1 = match[0];
        var j$1 = execute(env, evdref, match[1]);
        var $$var = e_type_judgment(env, evdref, j$1);
        var env1$1 = EConstr$ReactTemplate.push_rel(/* LocalAssum */Block.__(0, [
                name$1,
                $$var[/* utj_val */0]
              ]), env);
        var j$prime$1 = execute(env1$1, evdref, match[2]);
        return judge_of_abstraction(env1$1, name$1, $$var, j$prime$1);
    case 8 : 
        var name$2 = match[0];
        var j1 = execute(env, evdref, match[1]);
        var j2 = execute(env, evdref, match[2]);
        var j2$1 = e_type_judgment(env, evdref, j2);
        e_judge_of_cast(env, evdref, j1, /* DEFAULTcast */2, j2$1);
        var env1$2 = EConstr$ReactTemplate.push_rel(/* LocalDef */Block.__(1, [
                name$2,
                j1[/* uj_val */0],
                j2$1[/* utj_val */0]
              ]), env);
        var j3 = execute(env1$2, evdref, match[3]);
        var name$3 = name$2;
        var defj = j1;
        var typj = j2$1;
        var j$2 = j3;
        return /* record */[
                /* uj_val */EConstr$ReactTemplate.mkLetIn(/* tuple */[
                      name$3,
                      defj[/* uj_val */0],
                      typj[/* utj_val */0],
                      j$2[/* uj_val */0]
                    ]),
                /* uj_type */EConstr$ReactTemplate.Vars[/* subst1 */4](defj[/* uj_val */0], j$2[/* uj_type */1])
              ];
    case 9 : 
        var f = match[0];
        var jl = execute_array(env, evdref)(match[1]);
        var match$2 = EConstr$ReactTemplate.kind(evdref[0], f);
        var exit = 0;
        if (match$2.tag === 11) {
          var match$3 = match$2[0];
          var u$1 = match$3[1];
          var ind = match$3[0];
          if (Curry._1(EConstr$ReactTemplate.EInstance[/* is_empty */3], u$1) && Environ$ReactTemplate.template_polymorphic_ind(ind, env)) {
            var fj = execute(env, evdref, f);
            var env$3 = env;
            var evdref$1 = evdref;
            var funj = fj;
            var ind$1 = /* tuple */[
              ind,
              u$1
            ];
            var argjv = jl;
            var _n = 1;
            var _typ = funj[/* uj_type */1];
            var _param = Util$ReactTemplate.$$Array[/* to_list */9](argjv);
            while(true) {
              var param$1 = _param;
              var typ = _typ;
              var n = _n;
              if (param$1) {
                var hj = param$1[0];
                var match$4 = EConstr$ReactTemplate.kind(evdref$1[0], Reductionops$ReactTemplate.whd_all(env$3)(evdref$1[0], typ));
                var match$5;
                switch (match$4.tag | 0) {
                  case 3 : 
                      var match$6 = Evardefine$ReactTemplate.define_evar_as_product(evdref$1[0], match$4[0]);
                      var evd$prime = match$6[0];
                      evdref$1[0] = evd$prime;
                      var match$7 = EConstr$ReactTemplate.destProd(evd$prime, match$6[1]);
                      match$5 = /* tuple */[
                        match$7[1],
                        match$7[2]
                      ];
                      break;
                  case 6 : 
                      match$5 = /* tuple */[
                        match$4[1],
                        match$4[2]
                      ];
                      break;
                  default:
                    match$5 = Pretype_errors$ReactTemplate.error_cant_apply_not_functional(/* None */0, env$3, evdref$1[0], funj, argjv);
                }
                var c1 = match$5[0];
                if (Evarconv$ReactTemplate.e_cumul(env$3, /* None */0, evdref$1, hj[/* uj_type */1], c1)) {
                  _param = param$1[1];
                  _typ = EConstr$ReactTemplate.Vars[/* subst1 */4](hj[/* uj_val */0], match$5[1]);
                  _n = n + 1 | 0;
                  continue ;
                  
                } else {
                  return Pretype_errors$ReactTemplate.error_cant_apply_bad_type(/* None */0, env$3, evdref$1[0], /* tuple */[
                              n,
                              c1,
                              hj[/* uj_type */1]
                            ], funj, argjv);
                }
              } else {
                var ar = inductive_type_knowing_parameters(env$3, evdref$1[0], ind$1, argjv);
                return /* record */[
                        /* uj_val */EConstr$ReactTemplate.mkApp(/* tuple */[
                              Environ$ReactTemplate.j_val(funj),
                              Util$ReactTemplate.$$Array[/* map */12](Environ$ReactTemplate.j_val, argjv)
                            ]),
                        /* uj_type */Reductionops$ReactTemplate.hnf_prod_appvect(env$3, evdref$1[0], EConstr$ReactTemplate.of_constr(ar), Util$ReactTemplate.$$Array[/* map */12](Environ$ReactTemplate.j_val, argjv))
                      ];
              }
            };
          } else {
            exit = 1;
          }
        } else {
          exit = 1;
        }
        if (exit === 1) {
          var fj$1 = execute(env, evdref, f);
          var env$4 = env;
          var evdref$2 = evdref;
          var funj$1 = fj$1;
          var argjv$1 = jl;
          var _n$1 = 1;
          var _typ$1 = funj$1[/* uj_type */1];
          var _param$1 = Util$ReactTemplate.$$Array[/* to_list */9](argjv$1);
          while(true) {
            var param$2 = _param$1;
            var typ$1 = _typ$1;
            var n$1 = _n$1;
            if (param$2) {
              var hj$1 = param$2[0];
              var match$8 = EConstr$ReactTemplate.kind(evdref$2[0], Reductionops$ReactTemplate.whd_all(env$4)(evdref$2[0], typ$1));
              var match$9;
              switch (match$8.tag | 0) {
                case 3 : 
                    var match$10 = Evardefine$ReactTemplate.define_evar_as_product(evdref$2[0], match$8[0]);
                    var evd$prime$1 = match$10[0];
                    evdref$2[0] = evd$prime$1;
                    var match$11 = EConstr$ReactTemplate.destProd(evd$prime$1, match$10[1]);
                    match$9 = /* tuple */[
                      match$11[1],
                      match$11[2]
                    ];
                    break;
                case 6 : 
                    match$9 = /* tuple */[
                      match$8[1],
                      match$8[2]
                    ];
                    break;
                default:
                  match$9 = Pretype_errors$ReactTemplate.error_cant_apply_not_functional(/* None */0, env$4, evdref$2[0], funj$1, argjv$1);
              }
              var c1$1 = match$9[0];
              if (Evarconv$ReactTemplate.e_cumul(env$4, /* None */0, evdref$2, hj$1[/* uj_type */1], c1$1)) {
                _param$1 = param$2[1];
                _typ$1 = EConstr$ReactTemplate.Vars[/* subst1 */4](hj$1[/* uj_val */0], match$9[1]);
                _n$1 = n$1 + 1 | 0;
                continue ;
                
              } else {
                return Pretype_errors$ReactTemplate.error_cant_apply_bad_type(/* None */0, env$4, evdref$2[0], /* tuple */[
                            n$1,
                            c1$1,
                            hj$1[/* uj_type */1]
                          ], funj$1, argjv$1);
              }
            } else {
              return /* record */[
                      /* uj_val */EConstr$ReactTemplate.mkApp(/* tuple */[
                            Environ$ReactTemplate.j_val(funj$1),
                            Util$ReactTemplate.$$Array[/* map */12](Environ$ReactTemplate.j_val, argjv$1)
                          ]),
                      /* uj_type */typ$1
                    ];
            }
          };
        }
        break;
    case 10 : 
        var match$12 = match[0];
        var u$2 = EConstr$ReactTemplate.EInstance[/* kind */1](evdref[0], match$12[1]);
        return Environ$ReactTemplate.make_judge(cstr$1, EConstr$ReactTemplate.of_constr(Arguments_renaming$ReactTemplate.rename_type_of_constant(env, /* tuple */[
                            match$12[0],
                            u$2
                          ])));
    case 11 : 
        var match$13 = match[0];
        var u$3 = EConstr$ReactTemplate.EInstance[/* kind */1](evdref[0], match$13[1]);
        return Environ$ReactTemplate.make_judge(cstr$1, EConstr$ReactTemplate.of_constr(Arguments_renaming$ReactTemplate.rename_type_of_inductive(env, /* tuple */[
                            match$13[0],
                            u$3
                          ])));
    case 12 : 
        var match$14 = match[0];
        var u$4 = EConstr$ReactTemplate.EInstance[/* kind */1](evdref[0], match$14[1]);
        return Environ$ReactTemplate.make_judge(cstr$1, EConstr$ReactTemplate.of_constr(Arguments_renaming$ReactTemplate.rename_type_of_constructor(env, /* tuple */[
                            match$14[0],
                            u$4
                          ])));
    case 13 : 
        var cj$1 = execute(env, evdref, match[2]);
        var pj = execute(env, evdref, match[1]);
        var lfj = execute_array(env, evdref)(match[3]);
        var env$5 = env;
        var evdref$3 = evdref;
        var ci = match[0];
        var pj$1 = pj;
        var cj$2 = cj$1;
        var lfj$1 = lfj;
        var match$15;
        try {
          match$15 = Inductiveops$ReactTemplate.find_mrectype(env$5, evdref$3[0], cj$2[/* uj_type */1]);
        }
        catch (exn){
          if (exn === Caml_builtin_exceptions.not_found) {
            match$15 = Pretype_errors$ReactTemplate.error_case_not_inductive(/* None */0, env$5, evdref$3[0], cj$2);
          } else {
            throw exn;
          }
        }
        var match$16 = match$15[0];
        var indspec_000 = /* tuple */[
          match$16[0],
          EConstr$ReactTemplate.EInstance[/* kind */1](evdref$3[0], match$16[1])
        ];
        var indspec_001 = match$15[1];
        var indspec = /* tuple */[
          indspec_000,
          indspec_001
        ];
        Inductive$ReactTemplate.check_case_info(env$5, indspec_000, ci);
        var match$17 = e_type_case_branches(env$5, evdref$3, indspec, pj$1, cj$2[/* uj_val */0]);
        e_check_branch_types(env$5, evdref$3, indspec_000, cj$2, /* tuple */[
              lfj$1,
              match$17[0]
            ]);
        return /* record */[
                /* uj_val */EConstr$ReactTemplate.mkCase(/* tuple */[
                      ci,
                      pj$1[/* uj_val */0],
                      cj$2[/* uj_val */0],
                      Util$ReactTemplate.$$Array[/* map */12](Environ$ReactTemplate.j_val, lfj$1)
                    ]),
                /* uj_type */match$17[1]
              ];
    case 14 : 
        var match$18 = match[0];
        var vni = match$18[0];
        var recdef$prime = execute_recdef(env, evdref, match$18[1]);
        var fix = /* tuple */[
          vni,
          recdef$prime
        ];
        check_fix(env, evdref[0], fix);
        return Environ$ReactTemplate.make_judge(EConstr$ReactTemplate.mkFix(fix), Caml_array.caml_array_get(recdef$prime[1], vni[1]));
    case 15 : 
        var match$19 = match[0];
        var i = match$19[0];
        var recdef$prime$1 = execute_recdef(env, evdref, match$19[1]);
        var cofix = /* tuple */[
          i,
          recdef$prime$1
        ];
        check_cofix(env, evdref[0], cofix);
        return Environ$ReactTemplate.make_judge(EConstr$ReactTemplate.mkCoFix(cofix), Caml_array.caml_array_get(recdef$prime$1[1], i));
    case 16 : 
        var cj$3 = execute(env, evdref, match[1]);
        return judge_of_projection(env, evdref[0], match[0], cj$3);
    
  }
}

function execute_recdef(env, evdref, param) {
  var vdef = param[2];
  var names = param[0];
  var larj = execute_array(env, evdref)(param[1]);
  var lara = Util$ReactTemplate.$$Array[/* map */12]((function (param) {
          return e_assumption_of_judgment(env, evdref, param);
        }), larj);
  var env1 = EConstr$ReactTemplate.push_rec_types(/* tuple */[
        names,
        lara,
        vdef
      ], env);
  var vdefj = execute_array(env1, evdref)(vdef);
  var vdefv = Util$ReactTemplate.$$Array[/* map */12](Environ$ReactTemplate.j_val, vdefj);
  check_type_fixpoint(/* None */0, env1, evdref, names, lara, vdefj);
  return /* tuple */[
          names,
          lara,
          vdefv
        ];
}

function execute_array(env, evdref) {
  var partial_arg = Util$ReactTemplate.$$Array[/* map */12];
  return (function (param) {
      return partial_arg((function (param) {
                    return execute(env, evdref, param);
                  }), param);
    });
}

function e_check(env, evdref, c, t) {
  var env$1 = enrich_env(env, evdref);
  var j = execute(env$1, evdref, c);
  if (Evarconv$ReactTemplate.e_cumul(env$1, /* None */0, evdref, j[/* uj_type */1], t)) {
    return 0;
  } else {
    return Pretype_errors$ReactTemplate.error_actual_type_core(/* None */0, env$1, evdref[0], j, t);
  }
}

function unsafe_type_of(env, evd, c) {
  var evdref = [evd];
  var env$1 = enrich_env(env, evdref);
  return execute(env$1, evdref, c)[/* uj_type */1];
}

function e_sort_of(env, evdref, c) {
  var env$1 = enrich_env(env, evdref);
  var j = execute(env$1, evdref, c);
  return e_type_judgment(env$1, evdref, j)[/* utj_type */1];
}

function type_of($staropt$star, env, evd, c) {
  var refresh = $staropt$star ? $staropt$star[0] : /* false */0;
  var evdref = [evd];
  var env$1 = enrich_env(env, evdref);
  var j = execute(env$1, evdref, c);
  if (refresh) {
    return Evarsolve$ReactTemplate.refresh_universes(/* None */0, /* Some */[/* true */1], /* None */0, /* Some */[/* false */0], env$1, evdref[0], j[/* uj_type */1]);
  } else {
    return /* tuple */[
            evdref[0],
            j[/* uj_type */1]
          ];
  }
}

function e_type_of($staropt$star, env, evdref, c) {
  var refresh = $staropt$star ? $staropt$star[0] : /* false */0;
  var env$1 = enrich_env(env, evdref);
  var j = execute(env$1, evdref, c);
  if (refresh) {
    var match = Evarsolve$ReactTemplate.refresh_universes(/* None */0, /* Some */[/* true */1], /* None */0, /* Some */[/* false */0], env$1, evdref[0], j[/* uj_type */1]);
    evdref[0] = match[0];
    return match[1];
  } else {
    return j[/* uj_type */1];
  }
}

function e_solve_evars(env, evdref, c) {
  var env$1 = enrich_env(env, evdref);
  var c$1 = execute(env$1, evdref, c)[/* uj_val */0];
  return Reductionops$ReactTemplate.nf_evar(evdref[0], c$1);
}

Evarconv$ReactTemplate.set_solve_evars(e_solve_evars);

exports.unsafe_type_of = unsafe_type_of;
exports.type_of = type_of;
exports.e_type_of = e_type_of;
exports.e_sort_of = e_sort_of;
exports.e_check = e_check;
exports.meta_type = meta_type;
exports.e_solve_evars = e_solve_evars;
exports.check_allowed_sort = check_allowed_sort;
exports.check_type_fixpoint = check_type_fixpoint;
exports.judge_of_prop = judge_of_prop;
exports.judge_of_set = judge_of_set;
exports.judge_of_abstraction = judge_of_abstraction;
exports.judge_of_product = judge_of_product;
exports.judge_of_projection = judge_of_projection;
/* judge_of_prop Not a pure module */

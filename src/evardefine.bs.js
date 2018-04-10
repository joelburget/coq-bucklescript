// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var Block = require("bs-platform/lib/js/block.js");
var Curry = require("bs-platform/lib/js/curry.js");
var Pp$ReactTemplate = require("./pp.bs.js");
var Evd$ReactTemplate = require("./evd.bs.js");
var Univ$ReactTemplate = require("./univ.bs.js");
var Util$ReactTemplate = require("./util.bs.js");
var Sorts$ReactTemplate = require("./sorts.bs.js");
var Constr$ReactTemplate = require("./constr.bs.js");
var Option$ReactTemplate = require("./option.bs.js");
var Context$ReactTemplate = require("./context.bs.js");
var EConstr$ReactTemplate = require("./eConstr.bs.js");
var Environ$ReactTemplate = require("./environ.bs.js");
var Namegen$ReactTemplate = require("./namegen.bs.js");
var Termops$ReactTemplate = require("./termops.bs.js");
var Evarutil$ReactTemplate = require("./evarutil.bs.js");
var Reductionops$ReactTemplate = require("./reductionops.bs.js");
var Pretype_errors$ReactTemplate = require("./pretype_errors.bs.js");

function env_nf_evar(sigma, env) {
  var nf_evar = function (c) {
    return Evarutil$ReactTemplate.nf_evar(sigma, c);
  };
  return Termops$ReactTemplate.process_rel_context((function (d, e) {
                return EConstr$ReactTemplate.push_rel(Curry._2(Context$ReactTemplate.Rel[/* Declaration */0][/* map_constr */13], nf_evar, d), e);
              }), env);
}

function env_nf_betaiotaevar(sigma, env) {
  return Termops$ReactTemplate.process_rel_context((function (d, env) {
                return EConstr$ReactTemplate.push_rel(Curry._2(Context$ReactTemplate.Rel[/* Declaration */0][/* map_constr */13], (function (c) {
                                  return Reductionops$ReactTemplate.nf_betaiota(env, sigma, c);
                                }), d), env);
              }), env);
}

function mk_tycon(ty) {
  return /* Some */[ty];
}

function mk_valcon(c) {
  return /* Some */[c];
}

function define_pure_evar_as_product(evd, evk) {
  var evi = Evd$ReactTemplate.find_undefined(evd, evk);
  var evenv = Evd$ReactTemplate.evar_env(evi);
  var id = Namegen$ReactTemplate.next_ident_away(Namegen$ReactTemplate.default_dependent_ident, Environ$ReactTemplate.ids_of_named_context_val(evi[/* evar_hyps */1]));
  var concl = Reductionops$ReactTemplate.whd_all(evenv)(evd, EConstr$ReactTemplate.of_constr(evi[/* evar_concl */0]));
  var s = EConstr$ReactTemplate.destSort(evd, concl);
  var match = Evarutil$ReactTemplate.new_type_evar(evenv, evd, /* None */0, /* Some */[Evd$ReactTemplate.evar_filter(evi)], /* None */0, /* None */0, Evd$ReactTemplate.univ_flexible_alg);
  var match$1 = match[1];
  var dom = match$1[0];
  var evd1 = match[0];
  var newenv = EConstr$ReactTemplate.push_named(/* LocalAssum */Block.__(0, [
          id,
          dom
        ]), evenv);
  var src = Evd$ReactTemplate.evar_source(evk, evd1);
  var filter = Evd$ReactTemplate.Filter[/* extend */4](1, Evd$ReactTemplate.evar_filter(evi));
  var match$2;
  if (Sorts$ReactTemplate.is_prop(EConstr$ReactTemplate.ESorts[/* kind */1](evd1, s))) {
    match$2 = Evarutil$ReactTemplate.new_evar(newenv, evd1, /* Some */[src], /* Some */[filter], /* None */0, /* None */0, /* None */0, /* None */0, concl);
  } else {
    var match$3 = Evarutil$ReactTemplate.new_type_evar(newenv, evd1, /* Some */[src], /* Some */[filter], /* None */0, /* None */0, Evd$ReactTemplate.univ_flexible_alg);
    var match$4 = match$3[1];
    var prods = Univ$ReactTemplate.sup(Sorts$ReactTemplate.univ_of_sort(match$1[1]), Sorts$ReactTemplate.univ_of_sort(match$4[1]));
    var evd3 = Evd$ReactTemplate.set_leq_sort(evenv, match$3[0], /* Type */Block.__(1, [prods]), EConstr$ReactTemplate.ESorts[/* kind */1](evd1, s));
    match$2 = /* tuple */[
      evd3,
      match$4[0]
    ];
  }
  var prod = EConstr$ReactTemplate.mkProd(/* tuple */[
        /* Name */[id],
        dom,
        EConstr$ReactTemplate.Vars[/* subst_var */11](id, match$2[1])
      ]);
  var evd3$1 = Evd$ReactTemplate.define(evk, EConstr$ReactTemplate.Unsafe[/* to_constr */0](prod), match$2[0]);
  return /* tuple */[
          evd3$1,
          prod
        ];
}

function define_evar_as_product(evd, param) {
  var args = param[1];
  var match = define_pure_evar_as_product(evd, param[0]);
  var evd$1 = match[0];
  var match$1 = EConstr$ReactTemplate.destProd(evd$1, match[1]);
  var evdom = EConstr$ReactTemplate.mkEvar(/* tuple */[
        EConstr$ReactTemplate.destEvar(evd$1, match$1[1])[0],
        args
      ]);
  var partial_arg = EConstr$ReactTemplate.Vars[/* lift */0];
  var evrngargs = Util$ReactTemplate.$$Array[/* cons */35](EConstr$ReactTemplate.mkRel(1), Util$ReactTemplate.$$Array[/* map */12]((function (param) {
              return partial_arg(1, param);
            }), args));
  var evrng = EConstr$ReactTemplate.mkEvar(/* tuple */[
        EConstr$ReactTemplate.destEvar(evd$1, match$1[2])[0],
        evrngargs
      ]);
  return /* tuple */[
          evd$1,
          EConstr$ReactTemplate.mkProd(/* tuple */[
                match$1[0],
                evdom,
                evrng
              ])
        ];
}

function define_pure_evar_as_lambda(env, evd, evk) {
  var evi = Evd$ReactTemplate.find_undefined(evd, evk);
  var evenv = Evd$ReactTemplate.evar_env(evi);
  var typ = Reductionops$ReactTemplate.whd_all(evenv)(evd, EConstr$ReactTemplate.of_constr(Evd$ReactTemplate.evar_concl(evi)));
  var match = EConstr$ReactTemplate.kind(evd, typ);
  var match$1;
  switch (match.tag | 0) {
    case 3 : 
        var match$2 = define_evar_as_product(evd, match[0]);
        var evd$1 = match$2[0];
        match$1 = /* tuple */[
          evd$1,
          EConstr$ReactTemplate.destProd(evd$1, match$2[1])
        ];
        break;
    case 6 : 
        match$1 = /* tuple */[
          evd,
          /* tuple */[
            match[0],
            match[1],
            match[2]
          ]
        ];
        break;
    default:
      match$1 = Pretype_errors$ReactTemplate.error_not_product(/* None */0, env, evd, typ);
  }
  var match$3 = match$1[1];
  var dom = match$3[1];
  var evd1 = match$1[0];
  var avoid = Environ$ReactTemplate.ids_of_named_context_val(evi[/* evar_hyps */1]);
  var id = Namegen$ReactTemplate.next_name_away_with_default_using_types("x", match$3[0], avoid, Reductionops$ReactTemplate.whd_evar(evd, dom));
  var newenv = EConstr$ReactTemplate.push_named(/* LocalAssum */Block.__(0, [
          id,
          dom
        ]), evenv);
  var filter = Evd$ReactTemplate.Filter[/* extend */4](1, Evd$ReactTemplate.evar_filter(evi));
  var src = Evd$ReactTemplate.evar_source(evk, evd1);
  var match$4 = Evarutil$ReactTemplate.new_evar(newenv, evd1, /* Some */[src], /* Some */[filter], /* None */0, /* None */0, /* None */0, /* None */0, EConstr$ReactTemplate.Vars[/* subst1 */4](EConstr$ReactTemplate.mkVar(id), match$3[2]));
  var lam = EConstr$ReactTemplate.mkLambda(/* tuple */[
        /* Name */[id],
        dom,
        EConstr$ReactTemplate.Vars[/* subst_var */11](id, match$4[1])
      ]);
  return /* tuple */[
          Evd$ReactTemplate.define(evk, EConstr$ReactTemplate.Unsafe[/* to_constr */0](lam), match$4[0]),
          lam
        ];
}

function define_evar_as_lambda(env, evd, param) {
  var match = define_pure_evar_as_lambda(env, evd, param[0]);
  var evd$1 = match[0];
  var match$1 = EConstr$ReactTemplate.destLambda(evd$1, match[1]);
  var partial_arg = EConstr$ReactTemplate.Vars[/* lift */0];
  var evbodyargs = Util$ReactTemplate.$$Array[/* cons */35](EConstr$ReactTemplate.mkRel(1), Util$ReactTemplate.$$Array[/* map */12]((function (param) {
              return partial_arg(1, param);
            }), param[1]));
  var evbody = EConstr$ReactTemplate.mkEvar(/* tuple */[
        EConstr$ReactTemplate.destEvar(evd$1, match$1[2])[0],
        evbodyargs
      ]);
  return /* tuple */[
          evd$1,
          EConstr$ReactTemplate.mkLambda(/* tuple */[
                match$1[0],
                match$1[1],
                evbody
              ])
        ];
}

function evar_absorb_arguments(env, _evd, _ev, _param) {
  while(true) {
    var param = _param;
    var ev = _ev;
    var evd = _evd;
    if (param) {
      var match = define_pure_evar_as_lambda(env, evd, ev[0]);
      var evd$1 = match[0];
      var match$1 = EConstr$ReactTemplate.destLambda(evd$1, match[1]);
      var evk = EConstr$ReactTemplate.destEvar(evd$1, match$1[2])[0];
      _param = param[1];
      _ev = /* tuple */[
        evk,
        Util$ReactTemplate.$$Array[/* cons */35](param[0], ev[1])
      ];
      _evd = evd$1;
      continue ;
      
    } else {
      return /* tuple */[
              evd,
              ev
            ];
    }
  };
}

function define_evar_as_sort(env, evd, param) {
  var ev = param[0];
  var match = Evd$ReactTemplate.new_univ_variable(/* None */0, /* None */0, Evd$ReactTemplate.univ_rigid, evd);
  var u = match[1];
  var evd$1 = match[0];
  var evi = Evd$ReactTemplate.find_undefined(evd$1, ev);
  var s = /* Type */Block.__(1, [u]);
  var concl = Reductionops$ReactTemplate.whd_all(Evd$ReactTemplate.evar_env(evi))(evd$1, EConstr$ReactTemplate.of_constr(evi[/* evar_concl */0]));
  var sort = EConstr$ReactTemplate.destSort(evd$1, concl);
  var evd$prime = Evd$ReactTemplate.define(ev, Constr$ReactTemplate.mkSort(s), evd$1);
  return /* tuple */[
          Evd$ReactTemplate.set_leq_sort(env, evd$prime, /* Type */Block.__(1, [Univ$ReactTemplate.$$super(u)]), EConstr$ReactTemplate.ESorts[/* kind */1](evd$prime, sort)),
          s
        ];
}

function split_tycon(loc, env, evd, tycon) {
  var real_split = function (_evd, _c) {
    while(true) {
      var c = _c;
      var evd = _evd;
      var t = Reductionops$ReactTemplate.whd_all(env)(evd, c);
      var match = EConstr$ReactTemplate.kind(evd, t);
      switch (match.tag | 0) {
        case 3 : 
            var match$1 = define_evar_as_product(evd, match[0]);
            var match$2 = EConstr$ReactTemplate.destProd(evd, match$1[1]);
            return /* tuple */[
                    match$1[0],
                    /* tuple */[
                      /* Anonymous */0,
                      match$2[1],
                      match$2[2]
                    ]
                  ];
        case 6 : 
            return /* tuple */[
                    evd,
                    /* tuple */[
                      match[0],
                      match[1],
                      match[2]
                    ]
                  ];
        case 9 : 
            var c$1 = match[0];
            if (EConstr$ReactTemplate.isEvar(evd, c$1)) {
              var match$3 = define_evar_as_lambda(env, evd, EConstr$ReactTemplate.destEvar(evd, c$1));
              _c = EConstr$ReactTemplate.mkApp(/* tuple */[
                    match$3[1],
                    match[1]
                  ]);
              _evd = match$3[0];
              continue ;
              
            } else {
              return Pretype_errors$ReactTemplate.error_not_product(loc, env, evd, c);
            }
            break;
        default:
          return Pretype_errors$ReactTemplate.error_not_product(loc, env, evd, c);
      }
    };
  };
  if (tycon) {
    var match = real_split(evd, tycon[0]);
    var match$1 = match[1];
    return /* tuple */[
            match[0],
            /* tuple */[
              match$1[0],
              /* Some */[match$1[1]],
              /* Some */[match$1[2]]
            ]
          ];
  } else {
    return /* tuple */[
            evd,
            /* tuple */[
              /* Anonymous */0,
              /* None */0,
              /* None */0
            ]
          ];
  }
}

function valcon_of_tycon(x) {
  return x;
}

function lift_tycon(n) {
  var partial_arg = EConstr$ReactTemplate.Vars[/* lift */0];
  var partial_arg$1 = function (param) {
    return partial_arg(n, param);
  };
  return (function (param) {
      return Option$ReactTemplate.map(partial_arg$1, param);
    });
}

function pr_tycon(env, sigma, param) {
  if (param) {
    return Termops$ReactTemplate.print_constr_env(env, sigma, param[0]);
  } else {
    return Pp$ReactTemplate.str("None");
  }
}

var empty_tycon = /* None */0;

var empty_valcon = /* None */0;

exports.env_nf_evar = env_nf_evar;
exports.env_nf_betaiotaevar = env_nf_betaiotaevar;
exports.empty_tycon = empty_tycon;
exports.mk_tycon = mk_tycon;
exports.empty_valcon = empty_valcon;
exports.mk_valcon = mk_valcon;
exports.evar_absorb_arguments = evar_absorb_arguments;
exports.split_tycon = split_tycon;
exports.valcon_of_tycon = valcon_of_tycon;
exports.lift_tycon = lift_tycon;
exports.define_evar_as_product = define_evar_as_product;
exports.define_evar_as_lambda = define_evar_as_lambda;
exports.define_evar_as_sort = define_evar_as_sort;
exports.pr_tycon = pr_tycon;
/* Pp-ReactTemplate Not a pure module */

// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var Block = require("bs-platform/lib/js/block.js");
var Curry = require("bs-platform/lib/js/curry.js");
var Pp$ReactTemplate = require("./pp.bs.js");
var Lib$ReactTemplate = require("./lib.bs.js");
var Term$ReactTemplate = require("./term.bs.js");
var Univ$ReactTemplate = require("./univ.bs.js");
var Util$ReactTemplate = require("./util.bs.js");
var Vars$ReactTemplate = require("./vars.bs.js");
var Constr$ReactTemplate = require("./constr.bs.js");
var CErrors$ReactTemplate = require("./cErrors.bs.js");
var Context$ReactTemplate = require("./context.bs.js");
var Cooking$ReactTemplate = require("./cooking.bs.js");
var Termops$ReactTemplate = require("./termops.bs.js");

function detype_param(param) {
  if (param.tag) {
    var match = param[0];
    if (match) {
      return /* tuple */[
              match[0],
              /* LocalDefEntry */Block.__(0, [param[1]])
            ];
    } else {
      return CErrors$ReactTemplate.anomaly(/* None */0, /* None */0, Pp$ReactTemplate.str("Unnamed inductive local variable."));
    }
  } else {
    var match$1 = param[0];
    if (match$1) {
      return /* tuple */[
              match$1[0],
              /* LocalAssumEntry */Block.__(1, [param[1]])
            ];
    } else {
      return CErrors$ReactTemplate.anomaly(/* None */0, /* None */0, Pp$ReactTemplate.str("Unnamed inductive local variable."));
    }
  }
}

function abstract_inductive(decls, nparamdecls, inds) {
  var ntyp = Curry._1(Util$ReactTemplate.List[/* length */0], inds);
  var ndecls = Curry._1(Context$ReactTemplate.Named[/* length */3], decls);
  var args = Context$ReactTemplate.Named[/* to_instance */11](Constr$ReactTemplate.mkVar, Curry._1(Util$ReactTemplate.List[/* rev */4], decls));
  var args$1 = Util$ReactTemplate.$$Array[/* of_list */10](args);
  var subs = Curry._2(Util$ReactTemplate.List[/* init */46], ntyp, (function (k) {
          return Vars$ReactTemplate.lift(ndecls)(Constr$ReactTemplate.mkApp(/* tuple */[
                          Constr$ReactTemplate.mkRel(k + 1 | 0),
                          args$1
                        ]));
        }));
  var inds$prime = Curry._2(Util$ReactTemplate.List[/* map */10], (function (param) {
          var lc$prime = Curry._2(Util$ReactTemplate.List[/* map */10], (function (param) {
                  return Vars$ReactTemplate.substl(subs, param);
                }), param[4]);
          var lc$prime$prime = Curry._2(Util$ReactTemplate.List[/* map */10], (function (b) {
                  return Curry._1(Termops$ReactTemplate.it_mkNamedProd_wo_LetIn(b), decls);
                }), lc$prime);
          var arity$prime = Curry._1(Termops$ReactTemplate.it_mkNamedProd_wo_LetIn(param[1]), decls);
          return /* tuple */[
                  param[0],
                  arity$prime,
                  param[2],
                  param[3],
                  lc$prime$prime
                ];
        }), inds);
  var nparamdecls$prime = nparamdecls + args$1.length | 0;
  var match = Curry._1(Util$ReactTemplate.List[/* hd */1], inds$prime);
  var match$1 = Term$ReactTemplate.decompose_prod_n_assum(nparamdecls$prime)(match[1]);
  var params$prime = Curry._2(Util$ReactTemplate.List[/* map */10], detype_param, match$1[0]);
  var ind$prime$prime = Curry._2(Util$ReactTemplate.List[/* map */10], (function (param) {
          var match = Term$ReactTemplate.decompose_prod_n_assum(nparamdecls$prime)(param[1]);
          var shortlc = Curry._2(Util$ReactTemplate.List[/* map */10], (function (c) {
                  return Term$ReactTemplate.decompose_prod_n_assum(nparamdecls$prime)(c)[1];
                }), param[4]);
          return /* record */[
                  /* mind_entry_typename */param[0],
                  /* mind_entry_arity */match[1],
                  /* mind_entry_template */param[2],
                  /* mind_entry_consnames */param[3],
                  /* mind_entry_lc */shortlc
                ];
        }), inds$prime);
  return /* tuple */[
          params$prime,
          ind$prime$prime
        ];
}

function refresh_polymorphic_type_of_inductive(param) {
  var mip = param[1];
  var match = mip[/* mind_arity */2];
  if (match.tag) {
    var ctx = Curry._1(Util$ReactTemplate.List[/* rev */4], mip[/* mind_arity_ctxt */1]);
    return /* tuple */[
            Term$ReactTemplate.mkArity(/* tuple */[
                  Curry._1(Util$ReactTemplate.List[/* rev */4], ctx),
                  /* Type */Block.__(1, [match[0][/* template_level */1]])
                ]),
            /* true */1
          ];
  } else {
    return /* tuple */[
            match[0][/* mind_user_arity */0],
            /* false */0
          ];
  }
}

function process_inductive(info, modlist, mib) {
  var section_decls = Curry._1(Lib$ReactTemplate.named_of_variable_context, info[/* abstr_ctx */0]);
  var nparamdecls = Curry._1(Context$ReactTemplate.Rel[/* length */3], mib[/* mind_params_ctxt */7]);
  var match = mib[/* mind_universes */8];
  var match$1;
  switch (match.tag | 0) {
    case 0 : 
        match$1 = /* tuple */[
          Univ$ReactTemplate.empty_level_subst,
          /* Monomorphic_ind_entry */Block.__(0, [match[0]])
        ];
        break;
    case 1 : 
        var match$2 = Lib$ReactTemplate.discharge_abstract_universe_context(info, match[0]);
        var auctx = Univ$ReactTemplate.AUContext[/* repr */0](match$2[1]);
        match$1 = /* tuple */[
          match$2[0],
          /* Polymorphic_ind_entry */Block.__(1, [auctx])
        ];
        break;
    case 2 : 
        var auctx$1 = Univ$ReactTemplate.ACumulativityInfo[/* univ_context */0](match[0]);
        var match$3 = Lib$ReactTemplate.discharge_abstract_universe_context(info, auctx$1);
        var auctx$2 = Univ$ReactTemplate.AUContext[/* repr */0](match$3[1]);
        match$1 = /* tuple */[
          match$3[0],
          /* Cumulative_ind_entry */Block.__(2, [Univ$ReactTemplate.CumulativityInfo[/* from_universe_context */5](auctx$2)])
        ];
        break;
    
  }
  var subst = match$1[0];
  var discharge = function (c) {
    return Vars$ReactTemplate.subst_univs_level_constr(subst, Cooking$ReactTemplate.expmod_constr(modlist, c));
  };
  var inds = Util$ReactTemplate.$$Array[/* map_to_list */44]((function (mip) {
          var match = refresh_polymorphic_type_of_inductive(/* tuple */[
                mib,
                mip
              ]);
          var arity = discharge(match[0]);
          var lc = Util$ReactTemplate.$$Array[/* map */12](discharge, mip[/* mind_user_lc */4]);
          return /* tuple */[
                  mip[/* mind_typename */0],
                  arity,
                  match[1],
                  Util$ReactTemplate.$$Array[/* to_list */9](mip[/* mind_consnames */3]),
                  Util$ReactTemplate.$$Array[/* to_list */9](lc)
                ];
        }), mib[/* mind_packets */0]);
  var section_decls$prime = Curry._1(Context$ReactTemplate.Named[/* map */6](discharge), section_decls);
  var match$4 = abstract_inductive(section_decls$prime, nparamdecls, inds);
  var match$5 = mib[/* mind_record */1];
  var record;
  if (match$5) {
    var match$6 = match$5[0];
    record = match$6 ? /* Some */[/* Some */[match$6[0][0]]] : /* Some */[/* None */0];
  } else {
    record = /* None */0;
  }
  return /* record */[
          /* mind_entry_record */record,
          /* mind_entry_finite */mib[/* mind_finite */2],
          /* mind_entry_params */match$4[0],
          /* mind_entry_inds */match$4[1],
          /* mind_entry_universes */match$1[1],
          /* mind_entry_private */mib[/* mind_private */9]
        ];
}

exports.process_inductive = process_inductive;
/* Pp-ReactTemplate Not a pure module */

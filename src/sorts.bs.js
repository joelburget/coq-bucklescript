// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var List = require("bs-platform/lib/js/list.js");
var Block = require("bs-platform/lib/js/block.js");
var Curry = require("bs-platform/lib/js/curry.js");
var Univ$ReactTemplate = require("./univ.bs.js");
var CList$ReactTemplate = require("./cList.bs.js");
var Hashset$ReactTemplate = require("./hashset.bs.js");
var Hashcons$ReactTemplate = require("./hashcons.bs.js");

var prop = /* Prop */Block.__(0, [/* Null */1]);

var set = /* Prop */Block.__(0, [/* Pos */0]);

var type1 = /* Type */Block.__(1, [Univ$ReactTemplate.type1_univ]);

function univ_of_sort(param) {
  if (param.tag) {
    return param[0];
  } else if (param[0] !== 0) {
    return Univ$ReactTemplate.Universe[/* type0m */12];
  } else {
    return Univ$ReactTemplate.Universe[/* type0 */13];
  }
}

function sort_of_univ(u) {
  if (Univ$ReactTemplate.is_type0m_univ(u)) {
    return prop;
  } else if (Univ$ReactTemplate.is_type0_univ(u)) {
    return set;
  } else {
    return /* Type */Block.__(1, [u]);
  }
}

function compare(s1, s2) {
  if (s1 === s2) {
    return 0;
  } else if (s1.tag) {
    if (s2.tag) {
      return Univ$ReactTemplate.Universe[/* compare */0](s1[0], s2[0]);
    } else {
      return 1;
    }
  } else if (s2.tag) {
    return -1;
  } else {
    var c2 = s2[0];
    if (s1[0] !== 0) {
      if (c2 !== 0) {
        return 0;
      } else {
        return 1;
      }
    } else if (c2 !== 0) {
      return -1;
    } else {
      return 0;
    }
  }
}

function equal(s1, s2) {
  return +(compare(s1, s2) === 0);
}

function is_prop(param) {
  if (param.tag) {
    if (Univ$ReactTemplate.Universe[/* equal */1](Univ$ReactTemplate.Universe[/* type0m */12], param[0])) {
      return /* true */1;
    } else {
      return /* false */0;
    }
  } else if (param[0] !== 0) {
    return /* true */1;
  } else {
    return /* false */0;
  }
}

function is_set(param) {
  if (param.tag) {
    if (Univ$ReactTemplate.Universe[/* equal */1](Univ$ReactTemplate.Universe[/* type0 */13], param[0])) {
      return /* true */1;
    } else {
      return /* false */0;
    }
  } else if (param[0] !== 0) {
    return /* false */0;
  } else {
    return /* true */1;
  }
}

function is_small(param) {
  if (param.tag) {
    return Univ$ReactTemplate.is_small_univ(param[0]);
  } else {
    return /* true */1;
  }
}

function family(param) {
  if (param.tag) {
    var u = param[0];
    if (Univ$ReactTemplate.is_type0m_univ(u)) {
      return /* InProp */0;
    } else if (Univ$ReactTemplate.is_type0_univ(u)) {
      return /* InSet */1;
    } else {
      return /* InType */2;
    }
  } else if (param[0] !== 0) {
    return /* InProp */0;
  } else {
    return /* InSet */1;
  }
}

function family_equal(prim, prim$1) {
  return +(prim === prim$1);
}

function hash(param) {
  if (param.tag) {
    var h = Univ$ReactTemplate.Universe[/* hash */2](param[0]);
    return Hashset$ReactTemplate.Combine[/* combinesmall */1](2, h);
  } else {
    var h$1 = param[0] !== 0 ? 1 : 0;
    return Hashset$ReactTemplate.Combine[/* combinesmall */1](1, h$1);
  }
}

function intersect(l, l$prime) {
  return CList$ReactTemplate.intersect(family_equal, l, l$prime);
}

var List$1 = /* module */[
  /* mem */List.memq,
  /* intersect */intersect
];

function hashcons(huniv, c) {
  if (c.tag) {
    var u = c[0];
    var u$prime = Curry._1(huniv, u);
    if (u$prime === u) {
      return c;
    } else {
      return /* Type */Block.__(1, [u$prime]);
    }
  } else {
    return c;
  }
}

function eq(s1, s2) {
  if (s1.tag) {
    if (s2.tag) {
      return +(s1[0] === s2[0]);
    } else {
      return /* false */0;
    }
  } else if (s2.tag) {
    return /* false */0;
  } else {
    return +(s1[0] === s2[0]);
  }
}

var Hsorts = Hashcons$ReactTemplate.Make(/* module */[
      /* hashcons */hashcons,
      /* eq */eq,
      /* hash */hash
    ]);

var hcons = Hashcons$ReactTemplate.simple_hcons(Hsorts[/* generate */0], Hsorts[/* hcons */1], Univ$ReactTemplate.hcons_univ);

exports.set = set;
exports.prop = prop;
exports.type1 = type1;
exports.equal = equal;
exports.compare = compare;
exports.hash = hash;
exports.is_set = is_set;
exports.is_prop = is_prop;
exports.is_small = is_small;
exports.family = family;
exports.hcons = hcons;
exports.family_equal = family_equal;
exports.List = List$1;
exports.univ_of_sort = univ_of_sort;
exports.sort_of_univ = sort_of_univ;
/* Hsorts Not a pure module */

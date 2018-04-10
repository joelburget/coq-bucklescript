// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var Block = require("bs-platform/lib/js/block.js");
var Bytes = require("bs-platform/lib/js/bytes.js");
var Curry = require("bs-platform/lib/js/curry.js");
var Buffer = require("bs-platform/lib/js/buffer.js");
var Js_exn = require("bs-platform/lib/js/js_exn.js");
var Stream = require("bs-platform/lib/js/stream.js");
var Caml_bytes = require("bs-platform/lib/js/caml_bytes.js");
var Pervasives = require("bs-platform/lib/js/pervasives.js");
var Caml_string = require("bs-platform/lib/js/caml_string.js");
var CMap$ReactTemplate = require("./cMap.bs.js");
var CSet$ReactTemplate = require("./cSet.bs.js");
var CList$ReactTemplate = require("./cList.bs.js");
var CArray$ReactTemplate = require("./cArray.bs.js");
var CStack$ReactTemplate = require("./cStack.bs.js");
var CString$ReactTemplate = require("./cString.bs.js");
var Exninfo$ReactTemplate = require("./exninfo.bs.js");
var Caml_builtin_exceptions = require("bs-platform/lib/js/caml_builtin_exceptions.js");

function on_fst(f, param) {
  return /* tuple */[
          Curry._1(f, param[0]),
          param[1]
        ];
}

function on_snd(f, param) {
  return /* tuple */[
          param[0],
          Curry._1(f, param[1])
        ];
}

function map_pair(f, param) {
  return /* tuple */[
          Curry._1(f, param[0]),
          Curry._1(f, param[1])
        ];
}

function on_pi1(f, param) {
  return /* tuple */[
          Curry._1(f, param[0]),
          param[1],
          param[2]
        ];
}

function on_pi2(f, param) {
  return /* tuple */[
          param[0],
          Curry._1(f, param[1]),
          param[2]
        ];
}

function on_pi3(f, param) {
  return /* tuple */[
          param[0],
          param[1],
          Curry._1(f, param[2])
        ];
}

function pi1(param) {
  return param[0];
}

function pi2(param) {
  return param[1];
}

function pi3(param) {
  return param[2];
}

function is_letter(c) {
  if (c >= /* "a" */97 && c <= /* "z" */122) {
    return /* true */1;
  } else if (c >= /* "A" */65) {
    return +(c <= /* "Z" */90);
  } else {
    return /* false */0;
  }
}

function is_digit(c) {
  if (c >= /* "0" */48) {
    return +(c <= /* "9" */57);
  } else {
    return /* false */0;
  }
}

function is_ident_tail(c) {
  if (is_letter(c) || is_digit(c) || c === /* "'" */39) {
    return /* true */1;
  } else {
    return +(c === /* "_" */95);
  }
}

function is_blank(param) {
  var switcher = param - 9 | 0;
  if (switcher > 4 || switcher < 0) {
    if (switcher !== 23) {
      return /* false */0;
    } else {
      return /* true */1;
    }
  } else if (switcher === 3 || switcher === 2) {
    return /* false */0;
  } else {
    return /* true */1;
  }
}

function abort() {
  throw [
        Caml_builtin_exceptions.assert_failure,
        [
          "util.ml",
          42,
          22
        ]
      ];
}

var Empty = /* module */[/* abort */abort];

function subst_command_placeholder(s, t) {
  var buff = Buffer.create(s.length + t.length | 0);
  var i = 0;
  while(i < s.length) {
    if (Caml_string.get(s, i) === /* "%" */37 && (i + 1 | 0) < s.length && Caml_string.get(s, i + 1 | 0) === /* "s" */115) {
      Buffer.add_string(buff, t);
      i = i + 1 | 0;
    } else {
      Buffer.add_char(buff, Caml_string.get(s, i));
    }
    i = i + 1 | 0;
  };
  return Buffer.contents(buff);
}

function matrix_transpose() {
  return Pervasives.failwith("undefined: matrix_transpose");
}

function identity(x) {
  return x;
}

function $percent$great(f, g, x) {
  return Curry._1(g, Curry._1(f, x));
}

function $$const(x, _) {
  return x;
}

function iterate_f(f, _n, _x) {
  while(true) {
    var x = _x;
    var n = _n;
    if (n <= 0) {
      return x;
    } else {
      _x = Curry._1(f, x);
      _n = n - 1 | 0;
      continue ;
      
    }
  };
}

function repeat(n, f, x) {
  var _i = n;
  while(true) {
    var i = _i;
    if (i !== 0) {
      Curry._1(f, x);
      _i = i - 1 | 0;
      continue ;
      
    } else {
      return 0;
    }
  };
}

function app_opt(f, x) {
  if (f) {
    return Curry._1(f[0], x);
  } else {
    return x;
  }
}

function stream_nth(n, st) {
  try {
    return CList$ReactTemplate.nth(Stream.npeek(n + 1 | 0, st), n);
  }
  catch (raw_exn){
    var exn = Js_exn.internalToOCamlException(raw_exn);
    if (exn[0] === Caml_builtin_exceptions.failure) {
      throw Stream.Failure;
    } else {
      throw exn;
    }
  }
}

function stream_njunk(n, st) {
  return repeat(n, Stream.junk, st);
}

function delayed_force(f) {
  return Curry._1(f, /* () */0);
}

function sym() {
  return /* Refl */0;
}

function map(f, g, param) {
  if (param.tag) {
    return /* Inr */Block.__(1, [Curry._1(g, param[0])]);
  } else {
    return /* Inl */Block.__(0, [Curry._1(f, param[0])]);
  }
}

function equal(f, g, x, y) {
  if (x.tag) {
    if (y.tag) {
      return Curry._2(g, x[0], y[0]);
    } else {
      return /* false */0;
    }
  } else if (y.tag) {
    return /* false */0;
  } else {
    return Curry._2(f, x[0], y[0]);
  }
}

function fold_left(f, g, a, param) {
  if (param.tag) {
    return Curry._2(g, a, param[0]);
  } else {
    return Curry._2(f, a, param[0]);
  }
}

var Union = /* module */[
  /* map */map,
  /* equal */equal,
  /* fold_left */fold_left
];

function open_utf8_file_in(fname) {
  var is_bom = function (s) {
    if (Caml_bytes.get(s, 0) === 239 && Caml_bytes.get(s, 1) === 187) {
      return +(Caml_bytes.get(s, 2) === 191);
    } else {
      return /* false */0;
    }
  };
  var in_chan = Pervasives.open_in(fname);
  var s = Bytes.make(3, /* " " */32);
  if (Pervasives.input(in_chan, s, 0, 3) < 3 || !is_bom(s)) {
    Pervasives.seek_in(in_chan, 0);
  }
  return in_chan;
}

function set_temporary_memory() {
  var a = [/* None */0];
  return /* tuple */[
          (function (x) {
              if (a[0] !== /* None */0) {
                throw [
                      Caml_builtin_exceptions.assert_failure,
                      [
                        "util.ml",
                        185,
                        12
                      ]
                    ];
              }
              a[0] = /* Some */[x];
              return x;
            }),
          (function () {
              var match = a[0];
              if (match) {
                return match[0];
              } else {
                throw [
                      Caml_builtin_exceptions.assert_failure,
                      [
                        "util.ml",
                        186,
                        49
                      ]
                    ];
              }
            })
        ];
}

var $$String = /* CString-ReactTemplate */[
  CString$ReactTemplate.make,
  CString$ReactTemplate.init,
  CString$ReactTemplate.copy,
  CString$ReactTemplate.sub,
  CString$ReactTemplate.fill,
  CString$ReactTemplate.blit,
  CString$ReactTemplate.concat,
  CString$ReactTemplate.iter,
  CString$ReactTemplate.iteri,
  CString$ReactTemplate.map,
  CString$ReactTemplate.mapi,
  CString$ReactTemplate.trim,
  CString$ReactTemplate.escaped,
  CString$ReactTemplate.index,
  CString$ReactTemplate.rindex,
  CString$ReactTemplate.index_from,
  CString$ReactTemplate.rindex_from,
  CString$ReactTemplate.contains,
  CString$ReactTemplate.contains_from,
  CString$ReactTemplate.rcontains_from,
  CString$ReactTemplate.uppercase,
  CString$ReactTemplate.lowercase,
  CString$ReactTemplate.capitalize,
  CString$ReactTemplate.uncapitalize,
  CString$ReactTemplate.compare,
  CString$ReactTemplate.hash,
  CString$ReactTemplate.is_empty,
  CString$ReactTemplate.explode,
  CString$ReactTemplate.implode,
  CString$ReactTemplate.strip,
  CString$ReactTemplate.drop_simple_quotes,
  CString$ReactTemplate.string_index_from,
  CString$ReactTemplate.string_contains,
  CString$ReactTemplate.plural,
  CString$ReactTemplate.conjugate_verb_to_be,
  CString$ReactTemplate.ordinal,
  CString$ReactTemplate.split,
  CString$ReactTemplate.is_sub,
  CString$ReactTemplate.$$Set,
  CString$ReactTemplate.$$Map,
  CString$ReactTemplate.List,
  CString$ReactTemplate.hcons
];

var List = /* CList-ReactTemplate */[
  CList$ReactTemplate.length,
  CList$ReactTemplate.hd,
  CList$ReactTemplate.tl,
  CList$ReactTemplate.nth,
  CList$ReactTemplate.rev,
  CList$ReactTemplate.append,
  CList$ReactTemplate.rev_append,
  CList$ReactTemplate.concat,
  CList$ReactTemplate.flatten,
  CList$ReactTemplate.iter,
  CList$ReactTemplate.map,
  CList$ReactTemplate.mapi,
  CList$ReactTemplate.rev_map,
  CList$ReactTemplate.fold_left,
  CList$ReactTemplate.fold_right,
  CList$ReactTemplate.iter2,
  CList$ReactTemplate.map2,
  CList$ReactTemplate.rev_map2,
  CList$ReactTemplate.fold_left2,
  CList$ReactTemplate.fold_right2,
  CList$ReactTemplate.for_all,
  CList$ReactTemplate.exists,
  CList$ReactTemplate.for_all2,
  CList$ReactTemplate.exists2,
  CList$ReactTemplate.mem,
  CList$ReactTemplate.memq,
  CList$ReactTemplate.find,
  CList$ReactTemplate.filter,
  CList$ReactTemplate.find_all,
  CList$ReactTemplate.partition,
  CList$ReactTemplate.assoc,
  CList$ReactTemplate.assq,
  CList$ReactTemplate.mem_assoc,
  CList$ReactTemplate.mem_assq,
  CList$ReactTemplate.remove_assoc,
  CList$ReactTemplate.remove_assq,
  CList$ReactTemplate.split,
  CList$ReactTemplate.combine,
  CList$ReactTemplate.sort,
  CList$ReactTemplate.stable_sort,
  CList$ReactTemplate.fast_sort,
  CList$ReactTemplate.sort_uniq,
  CList$ReactTemplate.merge,
  CList$ReactTemplate.compare,
  CList$ReactTemplate.equal,
  CList$ReactTemplate.is_empty,
  CList$ReactTemplate.init,
  CList$ReactTemplate.mem_f,
  CList$ReactTemplate.add_set,
  CList$ReactTemplate.eq_set,
  CList$ReactTemplate.intersect,
  CList$ReactTemplate.union,
  CList$ReactTemplate.unionq,
  CList$ReactTemplate.subtract,
  CList$ReactTemplate.subtractq,
  CList$ReactTemplate.interval,
  CList$ReactTemplate.make,
  CList$ReactTemplate.assign,
  CList$ReactTemplate.distinct,
  CList$ReactTemplate.distinct_f,
  CList$ReactTemplate.duplicates,
  CList$ReactTemplate.filter2,
  CList$ReactTemplate.map_filter,
  CList$ReactTemplate.map_filter_i,
  CList$ReactTemplate.filter_with,
  CList$ReactTemplate.smartmap,
  CList$ReactTemplate.map_left,
  CList$ReactTemplate.map_i,
  CList$ReactTemplate.map2_i,
  CList$ReactTemplate.map3,
  CList$ReactTemplate.map4,
  CList$ReactTemplate.filteri,
  CList$ReactTemplate.partitioni,
  CList$ReactTemplate.map_of_array,
  CList$ReactTemplate.smartfilter,
  CList$ReactTemplate.extend,
  CList$ReactTemplate.count,
  CList$ReactTemplate.index,
  CList$ReactTemplate.index0,
  CList$ReactTemplate.iteri,
  CList$ReactTemplate.fold_left_until,
  CList$ReactTemplate.fold_right_i,
  CList$ReactTemplate.fold_left_i,
  CList$ReactTemplate.fold_right_and_left,
  CList$ReactTemplate.fold_left3,
  CList$ReactTemplate.fold_left2_set,
  CList$ReactTemplate.for_all_i,
  CList$ReactTemplate.except,
  CList$ReactTemplate.remove,
  CList$ReactTemplate.remove_first,
  CList$ReactTemplate.extract_first,
  CList$ReactTemplate.insert,
  CList$ReactTemplate.for_all2eq,
  CList$ReactTemplate.sep_last,
  CList$ReactTemplate.find_map,
  CList$ReactTemplate.uniquize,
  CList$ReactTemplate.sort_uniquize,
  CList$ReactTemplate.merge_uniq,
  CList$ReactTemplate.subset,
  CList$ReactTemplate.chop,
  CList$ReactTemplate.IndexOutOfRange,
  CList$ReactTemplate.$$goto,
  CList$ReactTemplate.split_when,
  CList$ReactTemplate.split3,
  CList$ReactTemplate.firstn,
  CList$ReactTemplate.last,
  CList$ReactTemplate.lastn,
  CList$ReactTemplate.skipn,
  CList$ReactTemplate.skipn_at_least,
  CList$ReactTemplate.addn,
  CList$ReactTemplate.prefix_of,
  CList$ReactTemplate.drop_prefix,
  CList$ReactTemplate.drop_last,
  CList$ReactTemplate.map_append,
  CList$ReactTemplate.map_append2,
  CList$ReactTemplate.share_tails,
  CList$ReactTemplate.fold_left_map,
  CList$ReactTemplate.fold_right_map,
  CList$ReactTemplate.fold_left2_map,
  CList$ReactTemplate.fold_right2_map,
  CList$ReactTemplate.fold_left3_map,
  CList$ReactTemplate.fold_left4_map,
  CList$ReactTemplate.fold_map,
  CList$ReactTemplate.fold_map$prime,
  CList$ReactTemplate.map_assoc,
  CList$ReactTemplate.assoc_f,
  CList$ReactTemplate.remove_assoc_f,
  CList$ReactTemplate.mem_assoc_f,
  CList$ReactTemplate.cartesian,
  CList$ReactTemplate.cartesians,
  CList$ReactTemplate.combinations,
  CList$ReactTemplate.combine3,
  CList$ReactTemplate.cartesians_filter,
  CList$ReactTemplate.factorize_left
];

var $at = CList$ReactTemplate.append;

var $$Array = [
  CArray$ReactTemplate.init,
  CArray$ReactTemplate.make_matrix,
  CArray$ReactTemplate.create_matrix,
  CArray$ReactTemplate.append,
  CArray$ReactTemplate.concat,
  CArray$ReactTemplate.sub,
  CArray$ReactTemplate.copy,
  CArray$ReactTemplate.fill,
  CArray$ReactTemplate.blit,
  CArray$ReactTemplate.to_list,
  CArray$ReactTemplate.of_list,
  CArray$ReactTemplate.iter,
  CArray$ReactTemplate.map,
  CArray$ReactTemplate.iteri,
  CArray$ReactTemplate.mapi,
  CArray$ReactTemplate.fold_left,
  CArray$ReactTemplate.fold_right,
  CArray$ReactTemplate.sort,
  CArray$ReactTemplate.stable_sort,
  CArray$ReactTemplate.fast_sort,
  CArray$ReactTemplate.compare,
  CArray$ReactTemplate.equal,
  CArray$ReactTemplate.equal_norefl,
  CArray$ReactTemplate.is_empty,
  CArray$ReactTemplate.exists,
  CArray$ReactTemplate.exists2,
  CArray$ReactTemplate.for_all,
  CArray$ReactTemplate.for_all2,
  CArray$ReactTemplate.for_all3,
  CArray$ReactTemplate.for_all4,
  CArray$ReactTemplate.for_all_i,
  CArray$ReactTemplate.findi,
  CArray$ReactTemplate.hd,
  CArray$ReactTemplate.tl,
  CArray$ReactTemplate.last,
  CArray$ReactTemplate.cons,
  CArray$ReactTemplate.rev,
  CArray$ReactTemplate.fold_right_i,
  CArray$ReactTemplate.fold_left_i,
  CArray$ReactTemplate.fold_right2,
  CArray$ReactTemplate.fold_left2,
  CArray$ReactTemplate.fold_left3,
  CArray$ReactTemplate.fold_left2_i,
  CArray$ReactTemplate.fold_left_from,
  CArray$ReactTemplate.map_to_list,
  CArray$ReactTemplate.map_of_list,
  CArray$ReactTemplate.chop,
  CArray$ReactTemplate.smartmap,
  CArray$ReactTemplate.smartfoldmap,
  CArray$ReactTemplate.map2,
  CArray$ReactTemplate.map2_i,
  CArray$ReactTemplate.map3,
  CArray$ReactTemplate.map_left,
  CArray$ReactTemplate.iter2,
  CArray$ReactTemplate.fold_left_map,
  CArray$ReactTemplate.fold_right_map,
  CArray$ReactTemplate.fold_left2_map,
  CArray$ReactTemplate.fold_right2_map,
  CArray$ReactTemplate.fold_map,
  CArray$ReactTemplate.fold_map$prime,
  CArray$ReactTemplate.fold_map2$prime,
  CArray$ReactTemplate.distinct,
  CArray$ReactTemplate.rev_of_list,
  CArray$ReactTemplate.rev_to_list,
  CArray$ReactTemplate.filter_with
];

var $$Set = /* CSet-ReactTemplate */[
  CSet$ReactTemplate.Make,
  CSet$ReactTemplate.Hashcons
];

var $$Map = /* CMap-ReactTemplate */[CMap$ReactTemplate.Make];

var Stack = /* CStack-ReactTemplate */[
  CStack$ReactTemplate.Empty,
  CStack$ReactTemplate.create,
  CStack$ReactTemplate.push,
  CStack$ReactTemplate.find,
  CStack$ReactTemplate.is_empty,
  CStack$ReactTemplate.iter,
  CStack$ReactTemplate.clear,
  CStack$ReactTemplate.length,
  CStack$ReactTemplate.pop,
  CStack$ReactTemplate.top,
  CStack$ReactTemplate.to_list,
  CStack$ReactTemplate.find_map,
  CStack$ReactTemplate.fold_until
];

var iterate = iterate_f;

var iraise = Exninfo$ReactTemplate.iraise;

var map_union = map;

exports.on_fst = on_fst;
exports.on_snd = on_snd;
exports.map_pair = map_pair;
exports.on_pi1 = on_pi1;
exports.on_pi2 = on_pi2;
exports.on_pi3 = on_pi3;
exports.pi1 = pi1;
exports.pi2 = pi2;
exports.pi3 = pi3;
exports.is_letter = is_letter;
exports.is_digit = is_digit;
exports.is_ident_tail = is_ident_tail;
exports.is_blank = is_blank;
exports.Empty = Empty;
exports.$$String = $$String;
exports.subst_command_placeholder = subst_command_placeholder;
exports.List = List;
exports.$at = $at;
exports.$$Array = $$Array;
exports.$$Set = $$Set;
exports.$$Map = $$Map;
exports.Stack = Stack;
exports.stream_nth = stream_nth;
exports.stream_njunk = stream_njunk;
exports.matrix_transpose = matrix_transpose;
exports.identity = identity;
exports.$percent$great = $percent$great;
exports.$$const = $$const;
exports.iterate = iterate;
exports.repeat = repeat;
exports.app_opt = app_opt;
exports.delayed_force = delayed_force;
exports.iraise = iraise;
exports.Union = Union;
exports.map_union = map_union;
exports.sym = sym;
exports.open_utf8_file_in = open_utf8_file_in;
exports.set_temporary_memory = set_temporary_memory;
/* CSet-ReactTemplate Not a pure module */

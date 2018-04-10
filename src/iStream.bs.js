// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var Lazy = require("bs-platform/lib/js/lazy.js");
var Block = require("bs-platform/lib/js/block.js");
var Curry = require("bs-platform/lib/js/curry.js");
var CamlinternalLazy = require("bs-platform/lib/js/camlinternalLazy.js");

var empty = Lazy.from_val(/* Nil */0);

function cons(x, s) {
  return Lazy.from_val(/* Cons */[
              x,
              s
            ]);
}

function make(f, s) {
  return Block.__(246, [(function () {
                var f$1 = f;
                var s$1 = s;
                var match = Curry._1(f$1, s$1);
                if (match) {
                  return /* Cons */[
                          match[0],
                          make(f$1, match[1])
                        ];
                } else {
                  return /* Nil */0;
                }
              })]);
}

function force(_s) {
  while(true) {
    var s = _s;
    var tag = s.tag | 0;
    var match = tag === 250 ? s[0] : (
        tag === 246 ? CamlinternalLazy.force_lazy_block(s) : s
      );
    if (match) {
      _s = match[1];
      continue ;
      
    } else {
      return /* () */0;
    }
  };
}

function force$1(s) {
  force(s);
  return s;
}

function is_empty(s) {
  var tag = s.tag | 0;
  var match = tag === 250 ? s[0] : (
      tag === 246 ? CamlinternalLazy.force_lazy_block(s) : s
    );
  if (match) {
    return /* false */0;
  } else {
    return /* true */1;
  }
}

function peek(prim) {
  var tag = prim.tag | 0;
  if (tag === 250) {
    return prim[0];
  } else if (tag === 246) {
    return CamlinternalLazy.force_lazy_block(prim);
  } else {
    return prim;
  }
}

function of_list(param) {
  if (param) {
    var s = of_list(param[1]);
    return Lazy.from_val(/* Cons */[
                param[0],
                s
              ]);
  } else {
    return empty;
  }
}

function to_list(s) {
  var tag = s.tag | 0;
  var match = tag === 250 ? s[0] : (
      tag === 246 ? CamlinternalLazy.force_lazy_block(s) : s
    );
  if (match) {
    return /* :: */[
            match[0],
            to_list(match[1])
          ];
  } else {
    return /* [] */0;
  }
}

function iter(f, _s) {
  while(true) {
    var s = _s;
    var tag = s.tag | 0;
    var match = tag === 250 ? s[0] : (
        tag === 246 ? CamlinternalLazy.force_lazy_block(s) : s
      );
    if (match) {
      Curry._1(f, match[0]);
      _s = match[1];
      continue ;
      
    } else {
      return /* () */0;
    }
  };
}

function map(f, s) {
  return Block.__(246, [(function () {
                var tag = s.tag | 0;
                var f$1 = f;
                var param = tag === 250 ? s[0] : (
                    tag === 246 ? CamlinternalLazy.force_lazy_block(s) : s
                  );
                if (param) {
                  return /* Cons */[
                          Curry._1(f$1, param[0]),
                          map(f$1, param[1])
                        ];
                } else {
                  return /* Nil */0;
                }
              })]);
}

function app_node(n1, s2) {
  if (n1) {
    return /* Cons */[
            n1[0],
            app(n1[1], s2)
          ];
  } else {
    var tag = s2.tag | 0;
    if (tag === 250) {
      return s2[0];
    } else if (tag === 246) {
      return CamlinternalLazy.force_lazy_block(s2);
    } else {
      return s2;
    }
  }
}

function app(s1, s2) {
  return Block.__(246, [(function () {
                var tag = s1.tag | 0;
                return app_node(tag === 250 ? s1[0] : (
                              tag === 246 ? CamlinternalLazy.force_lazy_block(s1) : s1
                            ), s2);
              })]);
}

function fold(f, _accu, _s) {
  while(true) {
    var s = _s;
    var accu = _accu;
    var tag = s.tag | 0;
    var match = tag === 250 ? s[0] : (
        tag === 246 ? CamlinternalLazy.force_lazy_block(s) : s
      );
    if (match) {
      _s = match[1];
      _accu = Curry._2(f, accu, match[0]);
      continue ;
      
    } else {
      return accu;
    }
  };
}

function map_filter(f, s) {
  return Block.__(246, [(function () {
                var tag = s.tag | 0;
                var f$1 = f;
                var _param = tag === 250 ? s[0] : (
                    tag === 246 ? CamlinternalLazy.force_lazy_block(s) : s
                  );
                while(true) {
                  var param = _param;
                  if (param) {
                    var s$1 = param[1];
                    var match = Curry._1(f$1, param[0]);
                    if (match) {
                      return /* Cons */[
                              match[0],
                              map_filter(f$1, s$1)
                            ];
                    } else {
                      var tag$1 = s$1.tag | 0;
                      _param = tag$1 === 250 ? s$1[0] : (
                          tag$1 === 246 ? CamlinternalLazy.force_lazy_block(s$1) : s$1
                        );
                      continue ;
                      
                    }
                  } else {
                    return /* Nil */0;
                  }
                };
              })]);
}

function concat(s) {
  return Block.__(246, [(function () {
                var tag = s.tag | 0;
                var param = tag === 250 ? s[0] : (
                    tag === 246 ? CamlinternalLazy.force_lazy_block(s) : s
                  );
                if (param) {
                  var s$1 = param[0];
                  var tag$1 = s$1.tag | 0;
                  return app_node(tag$1 === 250 ? s$1[0] : (
                                tag$1 === 246 ? CamlinternalLazy.force_lazy_block(s$1) : s$1
                              ), concat(param[1]));
                } else {
                  return /* Nil */0;
                }
              })]);
}

function concat_map(f, l) {
  return Block.__(246, [(function () {
                var tag = l.tag | 0;
                var f$1 = f;
                var param = tag === 250 ? l[0] : (
                    tag === 246 ? CamlinternalLazy.force_lazy_block(l) : l
                  );
                if (param) {
                  var lzarg = Curry._1(f$1, param[0]);
                  var tag$1 = lzarg.tag | 0;
                  return app_node(tag$1 === 250 ? lzarg[0] : (
                                tag$1 === 246 ? CamlinternalLazy.force_lazy_block(lzarg) : lzarg
                              ), concat_map(f$1, param[1]));
                } else {
                  return /* Nil */0;
                }
              })]);
}

var thunk = Lazy.from_fun;

exports.empty = empty;
exports.cons = cons;
exports.thunk = thunk;
exports.make = make;
exports.is_empty = is_empty;
exports.peek = peek;
exports.app = app;
exports.map = map;
exports.iter = iter;
exports.fold = fold;
exports.concat = concat;
exports.map_filter = map_filter;
exports.concat_map = concat_map;
exports.of_list = of_list;
exports.to_list = to_list;
exports.force = force$1;
/* empty Not a pure module */

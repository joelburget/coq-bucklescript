// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var List = require("bs-platform/lib/js/list.js");
var $$Array = require("bs-platform/lib/js/array.js");
var Block = require("bs-platform/lib/js/block.js");
var Curry = require("bs-platform/lib/js/curry.js");
var Printf = require("bs-platform/lib/js/printf.js");
var $$String = require("bs-platform/lib/js/string.js");
var Caml_array = require("bs-platform/lib/js/caml_array.js");
var Caml_int32 = require("bs-platform/lib/js/caml_int32.js");
var Pervasives = require("bs-platform/lib/js/pervasives.js");
var Caml_format = require("bs-platform/lib/js/caml_format.js");
var Caml_string = require("bs-platform/lib/js/caml_string.js");
var Caml_builtin_exceptions = require("bs-platform/lib/js/caml_builtin_exceptions.js");

function log10(n) {
  if (n < 10) {
    return 0;
  } else {
    return 1 + log10(n / 10 | 0) | 0;
  }
}

var size = log10(Pervasives.max_int) / 2 | 0;

var format_size = size === 4 ? Printf.sprintf(/* Format */[
        /* Int */Block.__(4, [
            /* Int_d */0,
            /* Lit_padding */Block.__(0, [
                /* Zeros */2,
                4
              ]),
            /* No_precision */0,
            /* End_of_format */0
          ]),
        "%04d"
      ]) : (
    size === 9 ? Printf.sprintf(/* Format */[
            /* Int */Block.__(4, [
                /* Int_d */0,
                /* Lit_padding */Block.__(0, [
                    /* Zeros */2,
                    9
                  ]),
                /* No_precision */0,
                /* End_of_format */0
              ]),
            "%09d"
          ]) : (function (n) {
          var aux = function (_j, _l, _n) {
            while(true) {
              var n = _n;
              var l = _l;
              var j = _j;
              if (j === size) {
                return l;
              } else {
                _n = n / 10 | 0;
                _l = /* :: */[
                  Pervasives.string_of_int(n % 10),
                  l
                ];
                _j = j + 1 | 0;
                continue ;
                
              }
            };
          };
          return $$String.concat("", aux(0, /* [] */0, n));
        })
  );

function exp10(n) {
  if (n !== 0) {
    return Caml_int32.imul(10, exp10(n - 1 | 0));
  } else {
    return 1;
  }
}

var base = exp10(size);

var zero = /* array */[];

function is_zero(param) {
  if (param.length !== 0) {
    return /* false */0;
  } else {
    return /* true */1;
  }
}

function normalize_neg(n) {
  var k = 1;
  while(k < n.length && Caml_array.caml_array_get(n, k) === (base - 1 | 0)) {
    k = k + 1 | 0;
  };
  var n$prime = $$Array.sub(n, k, n.length - k | 0);
  if (n$prime.length) {
    Caml_array.caml_array_set(n$prime, 0, Caml_array.caml_array_get(n$prime, 0) - base | 0);
    return n$prime;
  } else {
    return /* int array */[-1];
  }
}

function normalize(n) {
  if (n.length) {
    if (Caml_array.caml_array_get(n, 0) === -1) {
      return normalize_neg(n);
    } else if (Caml_array.caml_array_get(n, 0)) {
      return n;
    } else {
      var n$1 = n;
      var k = 0;
      while(k < n$1.length && Caml_array.caml_array_get(n$1, k) === 0) {
        k = k + 1 | 0;
      };
      return $$Array.sub(n$1, k, n$1.length - k | 0);
    }
  } else {
    return n;
  }
}

function neg(m) {
  if (is_zero(m)) {
    return zero;
  } else {
    var n = $$Array.copy(m);
    var i = m.length - 1 | 0;
    while(i > 0 && Caml_array.caml_array_get(n, i) === 0) {
      i = i - 1 | 0;
    };
    if (i) {
      Caml_array.caml_array_set(n, i, base - Caml_array.caml_array_get(n, i) | 0);
      i = i - 1 | 0;
      while(i > 0) {
        Caml_array.caml_array_set(n, i, (base - 1 | 0) - Caml_array.caml_array_get(n, i) | 0);
        i = i - 1 | 0;
      };
      Caml_array.caml_array_set(n, 0, (-Caml_array.caml_array_get(n, 0) | 0) - 1 | 0);
      return n;
    } else {
      Caml_array.caml_array_set(n, 0, -Caml_array.caml_array_get(n, 0) | 0);
      if (Caml_array.caml_array_get(n, 0) === -1) {
        return normalize_neg(n);
      } else if (Caml_array.caml_array_get(n, 0) === base) {
        Caml_array.caml_array_set(n, 0, 0);
        return $$Array.append(/* int array */[1], n);
      } else {
        return n;
      }
    }
  }
}

function push_carry(r, j) {
  var j$1 = j;
  while(j$1 > 0 && Caml_array.caml_array_get(r, j$1) < 0) {
    Caml_array.caml_array_set(r, j$1, Caml_array.caml_array_get(r, j$1) + base | 0);
    j$1 = j$1 - 1 | 0;
    Caml_array.caml_array_set(r, j$1, Caml_array.caml_array_get(r, j$1) - 1 | 0);
  };
  while(j$1 > 0 && Caml_array.caml_array_get(r, j$1) >= base) {
    Caml_array.caml_array_set(r, j$1, Caml_array.caml_array_get(r, j$1) - base | 0);
    j$1 = j$1 - 1 | 0;
    Caml_array.caml_array_set(r, j$1, Caml_array.caml_array_get(r, j$1) + 1 | 0);
  };
  if (Caml_array.caml_array_get(r, 0) >= base) {
    Caml_array.caml_array_set(r, 0, Caml_array.caml_array_get(r, 0) - base | 0);
    return $$Array.append(/* int array */[1], r);
  } else if (Caml_array.caml_array_get(r, 0) < (-base | 0)) {
    Caml_array.caml_array_set(r, 0, Caml_array.caml_array_get(r, 0) + (base << 1) | 0);
    return $$Array.append(/* int array */[-2], r);
  } else {
    return normalize(r);
  }
}

function add_to(r, a, j) {
  if (is_zero(a)) {
    return r;
  } else {
    for(var i = r.length - 1 | 0 ,i_finish = j + 1 | 0; i >= i_finish; --i){
      Caml_array.caml_array_set(r, i, Caml_array.caml_array_get(r, i) + Caml_array.caml_array_get(a, i - j | 0) | 0);
      if (Caml_array.caml_array_get(r, i) >= base) {
        Caml_array.caml_array_set(r, i, Caml_array.caml_array_get(r, i) - base | 0);
        Caml_array.caml_array_set(r, i - 1 | 0, Caml_array.caml_array_get(r, i - 1 | 0) + 1 | 0);
      }
      
    }
    Caml_array.caml_array_set(r, j, Caml_array.caml_array_get(r, j) + Caml_array.caml_array_get(a, 0) | 0);
    return push_carry(r, j);
  }
}

function add(n, m) {
  var d = n.length - m.length | 0;
  if (d > 0) {
    return add_to($$Array.copy(n), m, d);
  } else {
    return add_to($$Array.copy(m), n, -d | 0);
  }
}

function sub(n, m) {
  var d = n.length - m.length | 0;
  if (d >= 0) {
    var r = $$Array.copy(n);
    var a = m;
    var j = d;
    if (is_zero(a)) {
      return r;
    } else {
      for(var i = r.length - 1 | 0 ,i_finish = j + 1 | 0; i >= i_finish; --i){
        Caml_array.caml_array_set(r, i, Caml_array.caml_array_get(r, i) - Caml_array.caml_array_get(a, i - j | 0) | 0);
        if (Caml_array.caml_array_get(r, i) < 0) {
          Caml_array.caml_array_set(r, i, Caml_array.caml_array_get(r, i) + base | 0);
          Caml_array.caml_array_set(r, i - 1 | 0, Caml_array.caml_array_get(r, i - 1 | 0) - 1 | 0);
        }
        
      }
      Caml_array.caml_array_set(r, j, Caml_array.caml_array_get(r, j) - Caml_array.caml_array_get(a, 0) | 0);
      return push_carry(r, j);
    }
  } else {
    var r$1 = neg(m);
    return add_to(r$1, n, r$1.length - n.length | 0);
  }
}

function mult(m, n) {
  if (is_zero(m) || is_zero(n)) {
    return zero;
  } else {
    var l = m.length + n.length | 0;
    var r = Caml_array.caml_make_vect(l, 0);
    for(var i = m.length - 1 | 0; i >= 0; --i){
      for(var j = n.length - 1 | 0; j >= 0; --j){
        var p = Caml_int32.imul(Caml_array.caml_array_get(m, i), Caml_array.caml_array_get(n, j)) + Caml_array.caml_array_get(r, (i + j | 0) + 1 | 0) | 0;
        var match = p < 0 ? /* tuple */[
            Caml_int32.div(p + 1 | 0, base) - 1 | 0,
            (Caml_int32.mod_(p + 1 | 0, base) + base | 0) - 1 | 0
          ] : /* tuple */[
            Caml_int32.div(p, base),
            Caml_int32.mod_(p, base)
          ];
        var q = match[0];
        Caml_array.caml_array_set(r, (i + j | 0) + 1 | 0, match[1]);
        if (q !== 0) {
          Caml_array.caml_array_set(r, i + j | 0, Caml_array.caml_array_get(r, i + j | 0) + q | 0);
        }
        
      }
    }
    return normalize(r);
  }
}

function is_strictly_neg(n) {
  if (is_zero(n)) {
    return /* false */0;
  } else {
    return +(Caml_array.caml_array_get(n, 0) < 0);
  }
}

function is_strictly_pos(n) {
  if (is_zero(n)) {
    return /* false */0;
  } else {
    return +(Caml_array.caml_array_get(n, 0) > 0);
  }
}

function is_pos_or_zero(n) {
  if (is_zero(n)) {
    return /* true */1;
  } else {
    return +(Caml_array.caml_array_get(n, 0) > 0);
  }
}

function less_than_same_size(m, n, _i, _j) {
  while(true) {
    var j = _j;
    var i = _i;
    if (i < m.length) {
      if (Caml_array.caml_array_get(m, i) < Caml_array.caml_array_get(n, j)) {
        return /* true */1;
      } else if (Caml_array.caml_array_get(m, i) === Caml_array.caml_array_get(n, j)) {
        _j = j + 1 | 0;
        _i = i + 1 | 0;
        continue ;
        
      } else {
        return /* false */0;
      }
    } else {
      return /* false */0;
    }
  };
}

function less_than(m, n) {
  if (is_strictly_neg(m)) {
    if (is_pos_or_zero(n) || m.length > n.length) {
      return /* true */1;
    } else if (m.length === n.length) {
      return less_than_same_size(m, n, 0, 0);
    } else {
      return /* false */0;
    }
  } else if (is_strictly_pos(n)) {
    if (m.length < n.length) {
      return /* true */1;
    } else if (m.length === n.length) {
      return less_than_same_size(m, n, 0, 0);
    } else {
      return /* false */0;
    }
  } else {
    return /* false */0;
  }
}

function less_than_shift_pos(k, m, n) {
  if ((m.length - k | 0) < n.length) {
    return /* true */1;
  } else if ((m.length - k | 0) === n.length) {
    return less_than_same_size(m, n, k, 0);
  } else {
    return /* false */0;
  }
}

function can_divide(k, m, d, _i) {
  while(true) {
    var i = _i;
    if (i === d.length) {
      return /* true */1;
    } else if (Caml_array.caml_array_get(m, k + i | 0) > Caml_array.caml_array_get(d, i)) {
      return /* true */1;
    } else if (Caml_array.caml_array_get(m, k + i | 0) === Caml_array.caml_array_get(d, i)) {
      _i = i + 1 | 0;
      continue ;
      
    } else {
      return /* false */0;
    }
  };
}

function sub_mult(m, d, q, k) {
  if (q !== 0) {
    for(var i = d.length - 1 | 0; i >= 0; --i){
      var v = Caml_int32.imul(Caml_array.caml_array_get(d, i), q);
      Caml_array.caml_array_set(m, k + i | 0, Caml_array.caml_array_get(m, k + i | 0) - Caml_int32.mod_(v, base) | 0);
      if (Caml_array.caml_array_get(m, k + i | 0) < 0) {
        Caml_array.caml_array_set(m, k + i | 0, Caml_array.caml_array_get(m, k + i | 0) + base | 0);
        Caml_array.caml_array_set(m, (k + i | 0) - 1 | 0, Caml_array.caml_array_get(m, (k + i | 0) - 1 | 0) - 1 | 0);
      }
      if (v >= base) {
        Caml_array.caml_array_set(m, (k + i | 0) - 1 | 0, Caml_array.caml_array_get(m, (k + i | 0) - 1 | 0) - Caml_int32.div(v, base) | 0);
        var j = i - 1 | 0;
        while(Caml_array.caml_array_get(m, k + j | 0) < 0) {
          Caml_array.caml_array_set(m, k + j | 0, Caml_array.caml_array_get(m, k + j | 0) + base | 0);
          j = j - 1 | 0;
          Caml_array.caml_array_set(m, k + j | 0, Caml_array.caml_array_get(m, k + j | 0) - 1 | 0);
        };
      }
      
    }
    return /* () */0;
  } else {
    return 0;
  }
}

function euclid(m, d) {
  var match = is_strictly_neg(m) ? /* tuple */[
      -1,
      neg(m)
    ] : /* tuple */[
      1,
      $$Array.copy(m)
    ];
  var m$1 = match[1];
  var isnegm = match[0];
  var match$1 = is_strictly_neg(d) ? /* tuple */[
      -1,
      neg(d)
    ] : /* tuple */[
      1,
      d
    ];
  var d$1 = match$1[1];
  if (is_zero(d$1)) {
    throw Caml_builtin_exceptions.division_by_zero;
  }
  var match$2;
  if (less_than(m$1, d$1)) {
    match$2 = /* tuple */[
      zero,
      m$1
    ];
  } else {
    var ql = m$1.length - d$1.length | 0;
    var q = Caml_array.caml_make_vect(ql + 1 | 0, 0);
    var i = 0;
    while(!less_than_shift_pos(i, m$1, d$1)) {
      if (Caml_array.caml_array_get(m$1, i)) {
        if (can_divide(i, m$1, d$1, 0)) {
          var v = d$1.length > 1 && Caml_array.caml_array_get(d$1, 0) !== Caml_array.caml_array_get(m$1, i) ? Caml_int32.div(Caml_int32.imul(Caml_array.caml_array_get(m$1, i), base) + Caml_array.caml_array_get(m$1, i + 1 | 0) | 0, (Caml_int32.imul(Caml_array.caml_array_get(d$1, 0), base) + Caml_array.caml_array_get(d$1, 1) | 0) + 1 | 0) : Caml_int32.div(Caml_array.caml_array_get(m$1, i), Caml_array.caml_array_get(d$1, 0));
          Caml_array.caml_array_set(q, i, Caml_array.caml_array_get(q, i) + v | 0);
          sub_mult(m$1, d$1, v, i);
        } else {
          var v$1 = Caml_int32.div(Caml_int32.imul(Caml_array.caml_array_get(m$1, i), base) + Caml_array.caml_array_get(m$1, i + 1 | 0) | 0, Caml_array.caml_array_get(d$1, 0) + 1 | 0);
          Caml_array.caml_array_set(q, i, Caml_array.caml_array_get(q, i) + Caml_int32.div(v$1, base) | 0);
          sub_mult(m$1, d$1, Caml_int32.div(v$1, base), i);
          Caml_array.caml_array_set(q, i + 1 | 0, Caml_array.caml_array_get(q, i + 1 | 0) + Caml_int32.mod_(v$1, base) | 0);
          if (Caml_array.caml_array_get(q, i + 1 | 0) >= base) {
            Caml_array.caml_array_set(q, i + 1 | 0, Caml_array.caml_array_get(q, i + 1 | 0) - base | 0);
            Caml_array.caml_array_set(q, i, Caml_array.caml_array_get(q, i) + 1 | 0);
          }
          sub_mult(m$1, d$1, Caml_int32.mod_(v$1, base), i + 1 | 0);
        }
      } else {
        i = i + 1 | 0;
      }
    };
    match$2 = /* tuple */[
      normalize(q),
      normalize(m$1)
    ];
  }
  var r = match$2[1];
  var q$1 = match$2[0];
  return /* tuple */[
          Caml_int32.imul(match$1[0], isnegm) === -1 ? neg(q$1) : q$1,
          isnegm === -1 ? neg(r) : r
        ];
}

function of_string(s) {
  var len = s.length;
  var isneg = +(len > 1 && Caml_string.get(s, 0) === /* "-" */45);
  var d = isneg ? 1 : 0;
  while(d < len && Caml_string.get(s, d) === /* "0" */48) {
    d = d + 1 | 0;
  };
  if (d === len) {
    return zero;
  } else {
    var r = Caml_int32.mod_(len - d | 0, size);
    var h = $$String.sub(s, d, r);
    var e = h === "" ? 0 : 1;
    var l = Caml_int32.div(len - d | 0, size);
    var a = Caml_array.caml_make_vect(l + e | 0, 0);
    if (e === 1) {
      Caml_array.caml_array_set(a, 0, Caml_format.caml_int_of_string(h));
    }
    for(var i = 1; i <= l; ++i){
      Caml_array.caml_array_set(a, (i + e | 0) - 1 | 0, Caml_format.caml_int_of_string($$String.sub(s, (Caml_int32.imul(i - 1 | 0, size) + d | 0) + r | 0, size)));
    }
    if (isneg) {
      return neg(a);
    } else {
      return a;
    }
  }
}

function to_string_pos(sgn, n) {
  if (n.length) {
    return sgn + $$String.concat("", /* :: */[
                Pervasives.string_of_int(Caml_array.caml_array_get(n, 0)),
                List.map(format_size, List.tl($$Array.to_list(n)))
              ]);
  } else {
    return "0";
  }
}

function small(n) {
  if ((-base | 0) <= n) {
    return +(n < base);
  } else {
    return /* false */0;
  }
}

function mkarray(n) {
  var lo = Caml_int32.mod_(n, base);
  var hi = Caml_int32.div(n, base);
  var t = small(hi) ? /* int array */[
      hi,
      lo
    ] : /* int array */[
      Caml_int32.div(hi, base),
      Caml_int32.mod_(hi, base),
      lo
    ];
  for(var i = t.length - 1 | 0; i >= 1; --i){
    if (Caml_array.caml_array_get(t, i) < 0) {
      Caml_array.caml_array_set(t, i, Caml_array.caml_array_get(t, i) + base | 0);
      Caml_array.caml_array_set(t, i - 1 | 0, Caml_array.caml_array_get(t, i - 1 | 0) - 1 | 0);
    }
    
  }
  return t;
}

function of_int(n) {
  if (small(n)) {
    return n;
  } else {
    return mkarray(n);
  }
}

function of_ints(n) {
  var n$1 = normalize(n);
  if (is_zero(n$1)) {
    return 0;
  } else if (n$1.length === 1) {
    return Caml_array.caml_array_get(n$1, 0);
  } else {
    return n$1;
  }
}

function to_ints(n) {
  if (typeof n === "number") {
    var n$1 = n;
    if (n$1) {
      if (small(n$1)) {
        return /* int array */[n$1];
      } else {
        return mkarray(n$1);
      }
    } else {
      return /* int array */[];
    }
  } else {
    return n;
  }
}

var maxi = mkarray(Pervasives.max_int);

var mini = mkarray(Pervasives.min_int);

function to_int(n) {
  if (typeof n === "number") {
    return n;
  } else {
    var t = n;
    var l = t.length;
    if (l > 3 || l === 3 && (less_than(maxi, t) || less_than(t, mini))) {
      Pervasives.failwith("Bigint.to_int: too large");
    }
    var sum = 0;
    var pow = 1;
    for(var i = l - 1 | 0; i >= 0; --i){
      sum = sum + Caml_int32.imul(Caml_array.caml_array_get(t, i), pow) | 0;
      pow = Caml_int32.imul(pow, base);
    }
    return sum;
  }
}

function app_pair(f, param) {
  return /* tuple */[
          Curry._1(f, param[0]),
          Curry._1(f, param[1])
        ];
}

function add$1(m, n) {
  if (typeof m === "number" && typeof n === "number") {
    return of_int(m + n | 0);
  } else {
    return of_ints(add(to_ints(m), to_ints(n)));
  }
}

function sub$1(m, n) {
  if (typeof m === "number" && typeof n === "number") {
    return of_int(m - n | 0);
  } else {
    return of_ints(sub(to_ints(m), to_ints(n)));
  }
}

function mult$1(m, n) {
  if (typeof m === "number" && typeof n === "number") {
    return of_int(Caml_int32.imul(m, n));
  } else {
    return of_ints(mult(to_ints(m), to_ints(n)));
  }
}

function euclid$1(m, n) {
  if (typeof m === "number" && typeof n === "number") {
    return app_pair(of_int, /* tuple */[
                Caml_int32.div(m, n),
                Caml_int32.mod_(m, n)
              ]);
  } else {
    return app_pair(of_ints, euclid(to_ints(m), to_ints(n)));
  }
}

function less_than$1(m, n) {
  if (typeof m === "number" && typeof n === "number") {
    return +(m < n);
  } else {
    return less_than(to_ints(m), to_ints(n));
  }
}

function neg$1(n) {
  if (typeof n === "number") {
    return of_int(-n | 0);
  } else {
    return of_ints(neg(to_ints(n)));
  }
}

function of_string$1(m) {
  return of_ints(of_string(m));
}

function to_string(m) {
  var n = to_ints(m);
  if (is_strictly_neg(n)) {
    return to_string_pos("-", neg(n));
  } else {
    return to_string_pos("", n);
  }
}

var zero$1 = of_int(0);

var one = of_int(1);

var two = of_int(2);

function sub_1(n) {
  return sub$1(n, one);
}

function add_1(n) {
  return add$1(n, one);
}

function mult_2(n) {
  return add$1(n, n);
}

function div2_with_rest(n) {
  var match = euclid$1(n, two);
  return /* tuple */[
          match[0],
          +(match[1] === one)
        ];
}

function is_strictly_neg$1(n) {
  return is_strictly_neg(to_ints(n));
}

function is_strictly_pos$1(n) {
  return is_strictly_pos(to_ints(n));
}

function is_neg_or_zero(n) {
  var n$1 = to_ints(n);
  if (is_zero(n$1)) {
    return /* true */1;
  } else {
    return +(Caml_array.caml_array_get(n$1, 0) < 0);
  }
}

function is_pos_or_zero$1(n) {
  return is_pos_or_zero(to_ints(n));
}

function equal(m, n) {
  if (m.length !== undefined && n.length !== undefined) {
    var m$1 = m;
    var n$1 = n;
    var lenm = m$1.length;
    var lenn = n$1.length;
    if (lenm === lenn) {
      var len = lenm;
      var v1 = m$1;
      var v2 = n$1;
      var _i = 0;
      while(true) {
        var i = _i;
        if (len === i) {
          return /* true */1;
        } else if (Caml_array.caml_array_get(v1, i) === Caml_array.caml_array_get(v2, i)) {
          _i = i + 1 | 0;
          continue ;
          
        } else {
          return /* false */0;
        }
      };
    } else {
      return /* false */0;
    }
  } else {
    return +(m === n);
  }
}

function pow(param, param$1) {
  var _odd_rest = one;
  var _n = param;
  var _m = param$1;
  while(true) {
    var m = _m;
    var n = _n;
    var odd_rest = _odd_rest;
    if (m <= 0) {
      return odd_rest;
    } else {
      var quo = (m >>> 1);
      var odd = +((m & 1) !== 0);
      _m = quo;
      _n = mult$1(n, n);
      _odd_rest = odd ? mult$1(n, odd_rest) : odd_rest;
      continue ;
      
    }
  };
}

exports.of_string = of_string$1;
exports.to_string = to_string;
exports.of_int = of_int;
exports.to_int = to_int;
exports.zero = zero$1;
exports.one = one;
exports.two = two;
exports.div2_with_rest = div2_with_rest;
exports.add_1 = add_1;
exports.sub_1 = sub_1;
exports.mult_2 = mult_2;
exports.add = add$1;
exports.sub = sub$1;
exports.mult = mult$1;
exports.euclid = euclid$1;
exports.less_than = less_than$1;
exports.equal = equal;
exports.is_strictly_pos = is_strictly_pos$1;
exports.is_strictly_neg = is_strictly_neg$1;
exports.is_pos_or_zero = is_pos_or_zero$1;
exports.is_neg_or_zero = is_neg_or_zero;
exports.neg = neg$1;
exports.pow = pow;
/* size Not a pure module */

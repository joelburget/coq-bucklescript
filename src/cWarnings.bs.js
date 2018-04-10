// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var List = require("bs-platform/lib/js/list.js");
var Curry = require("bs-platform/lib/js/curry.js");
var $$String = require("bs-platform/lib/js/string.js");
var Hashtbl = require("bs-platform/lib/js/hashtbl.js");
var Caml_string = require("bs-platform/lib/js/caml_string.js");
var Pp$ReactTemplate = require("./pp.bs.js");
var Str$ReactTemplate = require("../shims/str.bs.js");
var CList$ReactTemplate = require("./cList.bs.js");
var Flags$ReactTemplate = require("./flags.bs.js");
var Option$ReactTemplate = require("./option.bs.js");
var CErrors$ReactTemplate = require("./cErrors.bs.js");
var CString$ReactTemplate = require("./cString.bs.js");
var Feedback$ReactTemplate = require("./feedback.bs.js");
var Caml_builtin_exceptions = require("bs-platform/lib/js/caml_builtin_exceptions.js");

var warnings = Hashtbl.create(/* None */0, 97);

var categories = Hashtbl.create(/* None */0, 97);

var current_loc = [/* None */0];

var flags = [""];

function set_current_loc(loc) {
  current_loc[0] = loc;
  return /* () */0;
}

function get_flags() {
  return flags[0];
}

function add_warning_in_category(name, category) {
  var ws;
  try {
    ws = Hashtbl.find(categories, category);
  }
  catch (exn){
    if (exn === Caml_builtin_exceptions.not_found) {
      ws = /* [] */0;
    } else {
      throw exn;
    }
  }
  return Hashtbl.replace(categories, category, /* :: */[
              name,
              ws
            ]);
}

function set_warning_status(name, status) {
  try {
    var w = Hashtbl.find(warnings, name);
    return Hashtbl.replace(warnings, name, /* record */[
                /* default */w[/* default */0],
                /* category */w[/* category */1],
                /* status */status
              ]);
  }
  catch (exn){
    if (exn === Caml_builtin_exceptions.not_found) {
      return /* () */0;
    } else {
      throw exn;
    }
  }
}

function reset_default_warnings() {
  return Hashtbl.iter((function (name, w) {
                return Hashtbl.replace(warnings, name, /* record */[
                            /* default */w[/* default */0],
                            /* category */w[/* category */1],
                            /* status */w[/* default */0]
                          ]);
              }), warnings);
}

function set_all_warnings_status(status) {
  return Hashtbl.iter((function (name, w) {
                return Hashtbl.replace(warnings, name, /* record */[
                            /* default */w[/* default */0],
                            /* category */w[/* category */1],
                            /* status */status
                          ]);
              }), warnings);
}

function parse_flag(s) {
  if (s.length > 1) {
    var match = Caml_string.get(s, 0);
    var switcher = match - 43 | 0;
    if (switcher > 2 || switcher < 0) {
      return /* tuple */[
              /* Enabled */1,
              s
            ];
    } else {
      switch (switcher) {
        case 0 : 
            return /* tuple */[
                    /* AsError */2,
                    $$String.sub(s, 1, s.length - 1 | 0)
                  ];
        case 1 : 
            return /* tuple */[
                    /* Enabled */1,
                    s
                  ];
        case 2 : 
            return /* tuple */[
                    /* Disabled */0,
                    $$String.sub(s, 1, s.length - 1 | 0)
                  ];
        
      }
    }
  } else {
    return CErrors$ReactTemplate.user_err(/* None */0, /* None */0, Pp$ReactTemplate.str("Invalid warnings flag"));
  }
}

function string_of_flag(param) {
  var name = param[1];
  switch (param[0]) {
    case 0 : 
        return "-" + name;
    case 1 : 
        return name;
    case 2 : 
        return "+" + name;
    
  }
}

function string_of_flags(flags) {
  return $$String.concat(",", List.map(string_of_flag, flags));
}

function split_flags(s) {
  var reg = Str$ReactTemplate.regexp("[ ,]+");
  return Str$ReactTemplate.split(reg, s);
}

function cut_before_all_rev(_acc, _param) {
  while(true) {
    var param = _param;
    var acc = _acc;
    if (param) {
      var w = param[0];
      var name = w[1];
      var acc$1 = name === "all" ? /* :: */[
          w,
          /* [] */0
        ] : (
          name === "none" ? /* :: */[
              /* tuple */[
                /* Disabled */0,
                "all"
              ],
              /* [] */0
            ] : /* :: */[
              w,
              acc
            ]
        );
      _param = param[1];
      _acc = acc$1;
      continue ;
      
    } else {
      return acc;
    }
  };
}

function uniquize_flags_rev(flags) {
  var _acc = /* [] */0;
  var _visited = CString$ReactTemplate.$$Set[/* empty */0];
  var _param = flags;
  while(true) {
    var param = _param;
    var visited = _visited;
    var acc = _acc;
    if (param) {
      var flags$1 = param[1];
      var flag = param[0];
      var name = flag[1];
      if (Curry._2(CString$ReactTemplate.$$Set[/* mem */2], name, visited)) {
        _param = flags$1;
        continue ;
        
      } else {
        var visited$1;
        try {
          var warnings = Hashtbl.find(categories, name);
          visited$1 = List.fold_left((function (v, w) {
                  return Curry._2(CString$ReactTemplate.$$Set[/* add */3], w, v);
                }), visited, warnings);
        }
        catch (exn){
          if (exn === Caml_builtin_exceptions.not_found) {
            visited$1 = visited;
          } else {
            throw exn;
          }
        }
        _param = flags$1;
        _visited = Curry._2(CString$ReactTemplate.$$Set[/* add */3], name, visited$1);
        _acc = /* :: */[
          flag,
          acc
        ];
        continue ;
        
      }
    } else {
      return acc;
    }
  };
}

function normalize_flags_string(s) {
  if (s === "none") {
    return s;
  } else {
    var flags = List.map(parse_flag, split_flags(s));
    return string_of_flags(uniquize_flags_rev(cut_before_all_rev(/* [] */0, flags)));
  }
}

function parse_warnings(items) {
  return CList$ReactTemplate.iter((function (param) {
                var name = param[1];
                var status = param[0];
                if (name === "all") {
                  return set_all_warnings_status(status);
                } else {
                  try {
                    var name$1 = name;
                    var status$1 = status;
                    var names = Hashtbl.find(categories, name$1);
                    return List.iter((function (name) {
                                  return set_warning_status(name, status$1);
                                }), names);
                  }
                  catch (exn){
                    if (exn === Caml_builtin_exceptions.not_found) {
                      try {
                        return set_warning_status(name, status);
                      }
                      catch (exn$1){
                        if (exn$1 === Caml_builtin_exceptions.not_found) {
                          return /* () */0;
                        } else {
                          throw exn$1;
                        }
                      }
                    } else {
                      throw exn;
                    }
                  }
                }
              }), items);
}

function parse_flags(s) {
  if (s === "none") {
    Flags$ReactTemplate.make_warn(/* false */0);
    set_all_warnings_status(/* Disabled */0);
    return "none";
  } else {
    Flags$ReactTemplate.make_warn(/* true */1);
    var flags = List.map(parse_flag, split_flags(s));
    var flags$1 = uniquize_flags_rev(cut_before_all_rev(/* [] */0, flags));
    parse_warnings(flags$1);
    return string_of_flags(flags$1);
  }
}

function set_flags(s) {
  reset_default_warnings(/* () */0);
  var s$1 = parse_flags(s);
  flags[0] = s$1;
  return /* () */0;
}

function create(name, category, $staropt$star, pp) {
  var $$default = $staropt$star ? $staropt$star[0] : /* Enabled */1;
  Hashtbl.replace(warnings, name, /* record */[
        /* default */$$default,
        /* category */category,
        /* status */$$default
      ]);
  add_warning_in_category(name, category);
  if ($$default !== /* Disabled */0) {
    add_warning_in_category(name, "default");
  }
  set_flags(flags[0]);
  return (function (loc, x) {
      var w = Hashtbl.find(warnings, name);
      var loc$1 = Option$ReactTemplate.append(loc, current_loc[0]);
      var match = w[/* status */2];
      switch (match) {
        case 0 : 
            return /* () */0;
        case 1 : 
            var msg = Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Curry._1(pp, x), Pp$ReactTemplate.spc(/* () */0)), Pp$ReactTemplate.str("[")), Pp$ReactTemplate.str(name)), Pp$ReactTemplate.str(",")), Pp$ReactTemplate.str(category)), Pp$ReactTemplate.str("]"));
            return Feedback$ReactTemplate.msg_warning(loc$1, msg);
        case 2 : 
            return CErrors$ReactTemplate.user_err(loc$1, /* None */0, Curry._1(pp, x));
        
      }
    });
}

exports.set_current_loc = set_current_loc;
exports.create = create;
exports.get_flags = get_flags;
exports.set_flags = set_flags;
exports.normalize_flags_string = normalize_flags_string;
/* warnings Not a pure module */

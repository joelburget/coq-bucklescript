// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var List = require("bs-platform/lib/js/list.js");
var Curry = require("bs-platform/lib/js/curry.js");
var Format = require("bs-platform/lib/js/format.js");
var Js_exn = require("bs-platform/lib/js/js_exn.js");
var $$String = require("bs-platform/lib/js/string.js");
var Pervasives = require("bs-platform/lib/js/pervasives.js");
var Caml_primitive = require("bs-platform/lib/js/caml_primitive.js");
var Pp$ReactTemplate = require("../src/pp.bs.js");
var Loc$ReactTemplate = require("../src/loc.bs.js");
var Util$ReactTemplate = require("../src/util.bs.js");
var Flags$ReactTemplate = require("../src/flags.bs.js");
var Option$ReactTemplate = require("../src/option.bs.js");
var CErrors$ReactTemplate = require("../src/cErrors.bs.js");
var CString$ReactTemplate = require("../src/cString.bs.js");
var Exninfo$ReactTemplate = require("../src/exninfo.bs.js");
var Terminal$ReactTemplate = require("../clib/terminal.bs.js");
var Backtrace$ReactTemplate = require("../src/backtrace.bs.js");
var Caml_builtin_exceptions = require("bs-platform/lib/js/caml_builtin_exceptions.js");

var dflt_gp = /* record */[
  /* margin */78,
  /* max_indent */50,
  /* max_depth */50,
  /* ellipsis */"..."
];

var deep_gp = /* record */[
  /* margin */78,
  /* max_indent */50,
  /* max_depth */10000,
  /* ellipsis */"..."
];

function set_gp(ft, gp) {
  Format.pp_set_margin(ft, gp[/* margin */0]);
  Format.pp_set_max_indent(ft, gp[/* max_indent */1]);
  Format.pp_set_max_boxes(ft, gp[/* max_depth */2]);
  return Format.pp_set_ellipsis_text(ft, gp[/* ellipsis */3]);
}

function set_dflt_gp(ft) {
  return set_gp(ft, dflt_gp);
}

function get_gp(ft) {
  return /* record */[
          /* margin */Format.pp_get_margin(ft, /* () */0),
          /* max_indent */Format.pp_get_max_indent(ft, /* () */0),
          /* max_depth */Format.pp_get_max_boxes(ft, /* () */0),
          /* ellipsis */Format.pp_get_ellipsis_text(ft, /* () */0)
        ];
}

function with_fp(chan, out_function, flush_function) {
  var ft = Format.make_formatter(out_function, flush_function);
  Format.pp_set_formatter_out_channel(ft, chan);
  return ft;
}

function with_output_to(ch) {
  var ft = with_fp(ch, (function (param, param$1, param$2) {
          return Pervasives.output_substring(ch, param, param$1, param$2);
        }), (function () {
          return Pervasives.flush(ch);
        }));
  set_gp(ft, deep_gp);
  return ft;
}

var std_ft = [Format.std_formatter];

set_gp(std_ft[0], dflt_gp);

var err_ft = [Format.err_formatter];

set_gp(err_ft[0], deep_gp);

var deep_ft = [with_output_to(Pervasives.stdout)];

set_gp(deep_ft[0], deep_gp);

var $$default = Format.pp_get_max_boxes(std_ft[0], /* () */0);

var default_margin = Format.pp_get_margin(std_ft[0], /* () */0);

function get_depth_boxes() {
  return /* Some */[Format.pp_get_max_boxes(std_ft[0], /* () */0)];
}

function set_depth_boxes(v) {
  return Format.pp_set_max_boxes(std_ft[0], v ? v[0] : $$default);
}

function get_margin() {
  return /* Some */[Format.pp_get_margin(std_ft[0], /* () */0)];
}

function set_margin(v) {
  var v$1 = v ? v[0] : default_margin;
  Format.pp_set_margin(Format.str_formatter, v$1);
  Format.pp_set_margin(std_ft[0], v$1);
  Format.pp_set_margin(deep_ft[0], v$1);
  var m = Caml_primitive.caml_int_max((v$1 << 6) / 100 | 0, v$1 - 30 | 0);
  Format.pp_set_max_indent(Format.str_formatter, m);
  Format.pp_set_max_indent(std_ft[0], m);
  return Format.pp_set_max_indent(deep_ft[0], m);
}

function msgnl_with(_, fmt, strm) {
  Pp$ReactTemplate.pp_with(fmt, Pp$ReactTemplate.$plus$plus(strm, Pp$ReactTemplate.fnl(/* () */0)));
  return Format.pp_print_flush(fmt, /* () */0);
}

function quote_emacs(q_start, q_end, msg) {
  return Pp$ReactTemplate.hov(0, Pp$ReactTemplate.seq(/* :: */[
                  Pp$ReactTemplate.str(q_start),
                  /* :: */[
                    Pp$ReactTemplate.brk(/* tuple */[
                          0,
                          0
                        ]),
                    /* :: */[
                      msg,
                      /* :: */[
                        Pp$ReactTemplate.brk(/* tuple */[
                              0,
                              0
                            ]),
                        /* :: */[
                          Pp$ReactTemplate.str(q_end),
                          /* [] */0
                        ]
                      ]
                    ]
                  ]
                ]));
}

function quote_warning(param) {
  return quote_emacs("<warning>", "</warning>", param);
}

function quote_info(param) {
  return quote_emacs("<infomsg>", "</infomsg>", param);
}

var dbg_hdr = Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.tag("message.debug", Pp$ReactTemplate.str("Debug:")), Pp$ReactTemplate.spc(/* () */0));

var info_hdr = Pp$ReactTemplate.mt(/* () */0);

var warn_hdr = Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.tag("message.warning", Pp$ReactTemplate.str("Warning:")), Pp$ReactTemplate.spc(/* () */0));

var err_hdr = Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.tag("message.error", Pp$ReactTemplate.str("Error:")), Pp$ReactTemplate.spc(/* () */0));

function make_body(quoter, info, pre_hdr, s) {
  return Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.pr_opt_no_spc((function (x) {
                    return Pp$ReactTemplate.$plus$plus(x, Pp$ReactTemplate.fnl(/* () */0));
                  }), pre_hdr), Curry._1(quoter, Pp$ReactTemplate.hov(0, Pp$ReactTemplate.$plus$plus(info, s))));
}

function noq(x) {
  return x;
}

function gen_logger(dbg, warn, pre_hdr, level, msg) {
  switch (level) {
    case 0 : 
        return msgnl_with(/* None */0, std_ft[0], make_body(dbg, dbg_hdr, pre_hdr, msg));
    case 1 : 
        return msgnl_with(/* None */0, std_ft[0], make_body(dbg, info_hdr, pre_hdr, msg));
    case 2 : 
        return msgnl_with(/* None */0, std_ft[0], make_body(noq, info_hdr, pre_hdr, msg));
    case 3 : 
        return Flags$ReactTemplate.if_warn((function () {
                      return msgnl_with(/* None */0, err_ft[0], make_body(warn, warn_hdr, pre_hdr, msg));
                    }), /* () */0);
    case 4 : 
        return msgnl_with(/* None */0, err_ft[0], make_body(noq, err_hdr, pre_hdr, msg));
    
  }
}

var std_logger_cleanup = [(function () {
      return /* () */0;
    })];

function std_logger(pre_hdr, level, msg) {
  gen_logger((function (x) {
          return x;
        }), (function (x) {
          return x;
        }), pre_hdr, level, msg);
  return Curry._1(std_logger_cleanup[0], /* () */0);
}

function default_tag_map() {
  return /* :: */[
          /* tuple */[
            "message.error",
            Terminal$ReactTemplate.make(/* Some */[/* WHITE */-945061239], /* Some */[/* RED */4093233], /* Some */[/* true */1], /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* () */0)
          ],
          /* :: */[
            /* tuple */[
              "message.warning",
              Terminal$ReactTemplate.make(/* Some */[/* WHITE */-945061239], /* Some */[/* YELLOW */48188276], /* Some */[/* true */1], /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* () */0)
            ],
            /* :: */[
              /* tuple */[
                "message.debug",
                Terminal$ReactTemplate.make(/* Some */[/* WHITE */-945061239], /* Some */[/* MAGENTA */242322953], /* Some */[/* true */1], /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* () */0)
              ],
              /* :: */[
                /* tuple */[
                  "constr.evar",
                  Terminal$ReactTemplate.make(/* Some */[/* LIGHT_BLUE */-1059124733], /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* () */0)
                ],
                /* :: */[
                  /* tuple */[
                    "constr.keyword",
                    Terminal$ReactTemplate.make(/* None */0, /* None */0, /* Some */[/* true */1], /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* () */0)
                  ],
                  /* :: */[
                    /* tuple */[
                      "constr.type",
                      Terminal$ReactTemplate.make(/* Some */[/* YELLOW */48188276], /* None */0, /* Some */[/* true */1], /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* () */0)
                    ],
                    /* :: */[
                      /* tuple */[
                        "constr.notation",
                        Terminal$ReactTemplate.make(/* Some */[/* WHITE */-945061239], /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* () */0)
                      ],
                      /* :: */[
                        /* tuple */[
                          "constr.reference",
                          Terminal$ReactTemplate.make(/* Some */[/* LIGHT_GREEN */-415907046], /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* () */0)
                        ],
                        /* :: */[
                          /* tuple */[
                            "constr.path",
                            Terminal$ReactTemplate.make(/* Some */[/* LIGHT_MAGENTA */-960670144], /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* () */0)
                          ],
                          /* :: */[
                            /* tuple */[
                              "module.definition",
                              Terminal$ReactTemplate.make(/* Some */[/* LIGHT_RED */-572123672], /* None */0, /* Some */[/* true */1], /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* () */0)
                            ],
                            /* :: */[
                              /* tuple */[
                                "module.keyword",
                                Terminal$ReactTemplate.make(/* None */0, /* None */0, /* Some */[/* true */1], /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* () */0)
                              ],
                              /* :: */[
                                /* tuple */[
                                  "tactic.keyword",
                                  Terminal$ReactTemplate.make(/* None */0, /* None */0, /* Some */[/* true */1], /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* () */0)
                                ],
                                /* :: */[
                                  /* tuple */[
                                    "tactic.primitive",
                                    Terminal$ReactTemplate.make(/* Some */[/* LIGHT_GREEN */-415907046], /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* () */0)
                                  ],
                                  /* :: */[
                                    /* tuple */[
                                      "tactic.string",
                                      Terminal$ReactTemplate.make(/* Some */[/* LIGHT_RED */-572123672], /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* () */0)
                                    ],
                                    /* [] */0
                                  ]
                                ]
                              ]
                            ]
                          ]
                        ]
                      ]
                    ]
                  ]
                ]
              ]
            ]
          ]
        ];
}

var tag_map = [CString$ReactTemplate.$$Map[/* empty */0]];

function init_tag_map(styles) {
  var set = function (accu, param) {
    return Curry._3(CString$ReactTemplate.$$Map[/* add */3], param[0], param[1], accu);
  };
  tag_map[0] = List.fold_left(set, tag_map[0], styles);
  return /* () */0;
}

function default_styles() {
  return init_tag_map(default_tag_map(/* () */0));
}

function parse_color_config(file) {
  return init_tag_map(Terminal$ReactTemplate.parse(file));
}

function dump_tags() {
  return Curry._1(CString$ReactTemplate.$$Map[/* bindings */16], tag_map[0]);
}

function make_style_stack() {
  var empty = Terminal$ReactTemplate.make(/* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* () */0);
  var default_tag = /* record */[
    /* fg_color : Some */[/* DEFAULT */462924961],
    /* bg_color : Some */[/* DEFAULT */462924961],
    /* bold : Some */[/* false */0],
    /* italic : Some */[/* false */0],
    /* underline : Some */[/* false */0],
    /* negative : Some */[/* false */0],
    /* prefix : None */0,
    /* suffix : None */0
  ];
  var style_stack = [/* [] */0];
  var peek = function () {
    var match = style_stack[0];
    if (match) {
      return match[0];
    } else {
      return default_tag;
    }
  };
  var push = function (tag) {
    var style;
    try {
      style = Curry._2(CString$ReactTemplate.$$Map[/* find */21], tag, tag_map[0]);
    }
    catch (exn){
      if (exn === Caml_builtin_exceptions.not_found) {
        style = empty;
      } else {
        throw exn;
      }
    }
    var style$1 = Terminal$ReactTemplate.merge(peek(/* () */0), style);
    style_stack[0] = /* :: */[
      style$1,
      style_stack[0]
    ];
    return Terminal$ReactTemplate.$$eval(style$1);
  };
  var pop = function () {
    var match = style_stack[0];
    if (match) {
      style_stack[0] = match[1];
      return Terminal$ReactTemplate.$$eval(peek(/* () */0));
    } else {
      return Terminal$ReactTemplate.$$eval(default_tag);
    }
  };
  var clear = function () {
    style_stack[0] = /* [] */0;
    return /* () */0;
  };
  return /* tuple */[
          push,
          pop,
          clear
        ];
}

function make_printing_functions() {
  var empty = Terminal$ReactTemplate.make(/* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* None */0, /* () */0);
  var print_prefix = function (ft, tag) {
    var style;
    try {
      style = Curry._2(CString$ReactTemplate.$$Map[/* find */21], tag, tag_map[0]);
    }
    catch (exn){
      if (exn === Caml_builtin_exceptions.not_found) {
        style = empty;
      } else {
        throw exn;
      }
    }
    var match = style[/* prefix */6];
    if (match) {
      return Format.pp_print_string(ft, match[0]);
    } else {
      return /* () */0;
    }
  };
  var print_suffix = function (ft, tag) {
    var style;
    try {
      style = Curry._2(CString$ReactTemplate.$$Map[/* find */21], tag, tag_map[0]);
    }
    catch (exn){
      if (exn === Caml_builtin_exceptions.not_found) {
        style = empty;
      } else {
        throw exn;
      }
    }
    var match = style[/* suffix */7];
    if (match) {
      return Format.pp_print_string(ft, match[0]);
    } else {
      return /* () */0;
    }
  };
  return /* tuple */[
          print_prefix,
          print_suffix
        ];
}

function init_terminal_output(color) {
  var match = make_style_stack(/* () */0);
  var pop_tag = match[1];
  var push_tag = match[0];
  var match$1 = make_printing_functions(/* () */0);
  var print_suffix = match$1[1];
  var print_prefix = match$1[0];
  var tag_handler = function (ft) {
    return /* record */[
            /* mark_open_tag */push_tag,
            /* mark_close_tag */pop_tag,
            /* print_open_tag */Curry._1(print_prefix, ft),
            /* print_close_tag */Curry._1(print_suffix, ft)
          ];
  };
  if (color) {
    std_logger_cleanup[0] = match[2];
    Format.pp_set_mark_tags(std_ft[0], /* true */1);
    Format.pp_set_mark_tags(err_ft[0], /* true */1);
  } else {
    Format.pp_set_print_tags(std_ft[0], /* true */1);
    Format.pp_set_print_tags(err_ft[0], /* true */1);
  }
  Format.pp_set_formatter_tag_functions(std_ft[0], tag_handler(std_ft[0]));
  return Format.pp_set_formatter_tag_functions(err_ft[0], tag_handler(err_ft[0]));
}

function emacs_logger(param, param$1, param$2) {
  return gen_logger(quote_info, quote_warning, param, param$1, param$2);
}

function pr_loc(loc) {
  var fname = loc[/* fname */0];
  if (fname) {
    return Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.str("File "), Pp$ReactTemplate.str("\"")), Pp$ReactTemplate.str(fname[0])), Pp$ReactTemplate.str("\"")), Pp$ReactTemplate.str(", line ")), Pp$ReactTemplate.$$int(loc[/* line_nb */1])), Pp$ReactTemplate.str(", characters ")), Pp$ReactTemplate.$$int(loc[/* bp */5] - loc[/* bol_pos */2] | 0)), Pp$ReactTemplate.str("-")), Pp$ReactTemplate.$$int(loc[/* ep */6] - loc[/* bol_pos */2] | 0)), Pp$ReactTemplate.str(":"));
  } else {
    return Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.str("Toplevel input, characters "), Pp$ReactTemplate.$$int(loc[/* bp */5])), Pp$ReactTemplate.str("-")), Pp$ReactTemplate.$$int(loc[/* ep */6])), Pp$ReactTemplate.str(":"));
  }
}

function print_err_exn(extra, any) {
  var match = CErrors$ReactTemplate.push(any);
  var info = match[1];
  var loc = Loc$ReactTemplate.get_loc(info);
  var msg_loc = Option$ReactTemplate.cata(pr_loc, Pp$ReactTemplate.mt(/* () */0), loc);
  var pre_hdr = Pp$ReactTemplate.$plus$plus(Pp$ReactTemplate.pr_opt_no_spc((function (x) {
              return x;
            }), extra), msg_loc);
  var msg = Pp$ReactTemplate.$plus$plus(CErrors$ReactTemplate.iprint(/* tuple */[
            match[0],
            info
          ]), Pp$ReactTemplate.fnl(/* () */0));
  return std_logger(/* Some */[pre_hdr], /* Error */4, msg);
}

function with_output_to_file(fname, func, input) {
  var channel = Pervasives.open_out($$String.concat(".", /* :: */[
            fname,
            /* :: */[
              "out",
              /* [] */0
            ]
          ]));
  var old_fmt_000 = std_ft[0];
  var old_fmt_001 = err_ft[0];
  var old_fmt_002 = deep_ft[0];
  var old_fmt = /* tuple */[
    old_fmt_000,
    old_fmt_001,
    old_fmt_002
  ];
  var new_ft = Format.formatter_of_out_channel(channel);
  std_ft[0] = new_ft;
  err_ft[0] = new_ft;
  deep_ft[0] = new_ft;
  try {
    var output = Curry._1(func, input);
    std_ft[0] = Util$ReactTemplate.pi1(old_fmt);
    err_ft[0] = Util$ReactTemplate.pi2(old_fmt);
    deep_ft[0] = Util$ReactTemplate.pi3(old_fmt);
    Pervasives.close_out(channel);
    return output;
  }
  catch (raw_reraise){
    var reraise = Js_exn.internalToOCamlException(raw_reraise);
    var reraise$1 = Backtrace$ReactTemplate.add_backtrace(reraise);
    std_ft[0] = Util$ReactTemplate.pi1(old_fmt);
    err_ft[0] = Util$ReactTemplate.pi2(old_fmt);
    deep_ft[0] = Util$ReactTemplate.pi3(old_fmt);
    Pervasives.close_out(channel);
    return Exninfo$ReactTemplate.iraise(reraise$1);
  }
}

exports.dflt_gp = dflt_gp;
exports.deep_gp = deep_gp;
exports.set_gp = set_gp;
exports.set_dflt_gp = set_dflt_gp;
exports.get_gp = get_gp;
exports.with_output_to = with_output_to;
exports.std_ft = std_ft;
exports.err_ft = err_ft;
exports.deep_ft = deep_ft;
exports.set_depth_boxes = set_depth_boxes;
exports.get_depth_boxes = get_depth_boxes;
exports.set_margin = set_margin;
exports.get_margin = get_margin;
exports.std_logger = std_logger;
exports.emacs_logger = emacs_logger;
exports.default_styles = default_styles;
exports.parse_color_config = parse_color_config;
exports.dump_tags = dump_tags;
exports.init_terminal_output = init_terminal_output;
exports.pr_loc = pr_loc;
exports.print_err_exn = print_err_exn;
exports.with_output_to_file = with_output_to_file;
/*  Not a pure module */

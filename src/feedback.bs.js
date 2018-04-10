// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var Block = require("bs-platform/lib/js/block.js");
var Curry = require("bs-platform/lib/js/curry.js");
var Format = require("bs-platform/lib/js/format.js");
var Hashtbl = require("bs-platform/lib/js/hashtbl.js");
var Pp$ReactTemplate = require("./pp.bs.js");
var Option$ReactTemplate = require("./option.bs.js");
var Stateid$ReactTemplate = require("./stateid.bs.js");

var feeders = Hashtbl.create(/* None */0, 7);

var f_id = [0];

function add_feeder(f) {
  f_id[0] = f_id[0] + 1 | 0;
  Hashtbl.add(feeders, f_id[0], f);
  return f_id[0];
}

function del_feeder(fid) {
  return Hashtbl.remove(feeders, fid);
}

var span_id = [Stateid$ReactTemplate.dummy];

var doc_id = [0];

var feedback_route = [0];

function set_id_for_feedback($staropt$star, d, i) {
  var route = $staropt$star ? $staropt$star[0] : 0;
  doc_id[0] = d;
  span_id[0] = i;
  feedback_route[0] = route;
  return /* () */0;
}

var warn_no_listeners = [/* true */1];

function feedback(did, id, route, what) {
  var m_000 = /* doc_id */Option$ReactTemplate.$$default(doc_id[0], did);
  var m_001 = /* span_id */Option$ReactTemplate.$$default(span_id[0], id);
  var m_002 = /* route */Option$ReactTemplate.$$default(feedback_route[0], route);
  var m = /* record */[
    m_000,
    m_001,
    m_002,
    /* contents */what
  ];
  if (warn_no_listeners[0] && Hashtbl.length(feeders) === 0) {
    Format.eprintf(/* Format */[
          /* String_literal */Block.__(11, [
              "Warning, feedback message received but no listener to handle it!",
              /* Formatting_lit */Block.__(17, [
                  /* Force_newline */3,
                  /* Flush */Block.__(10, [/* End_of_format */0])
                ])
            ]),
          "Warning, feedback message received but no listener to handle it!@\n%!"
        ]);
  }
  return Hashtbl.iter((function (_, f) {
                return Curry._1(f, m);
              }), feeders);
}

function feedback_logger(loc, lvl, msg) {
  return feedback(/* None */0, /* Some */[span_id[0]], /* Some */[feedback_route[0]], /* Message */Block.__(8, [
                lvl,
                loc,
                msg
              ]));
}

function msg_info(loc, x) {
  return feedback_logger(loc, /* Info */1, x);
}

function msg_notice(loc, x) {
  return feedback_logger(loc, /* Notice */2, x);
}

function msg_warning(loc, x) {
  return feedback_logger(loc, /* Warning */3, x);
}

function msg_error(loc, x) {
  return feedback_logger(loc, /* Error */4, x);
}

function msg_debug(loc, x) {
  return feedback_logger(loc, /* Debug */0, x);
}

function console_feedback_listener(fmt) {
  var pp_lvl = function (fmt, lvl) {
    switch (lvl) {
      case 0 : 
          return Format.fprintf(fmt, /* Format */[
                      /* String_literal */Block.__(11, [
                          "Debug: ",
                          /* End_of_format */0
                        ]),
                      "Debug: "
                    ]);
      case 1 : 
          return Format.fprintf(fmt, /* Format */[
                      /* String_literal */Block.__(11, [
                          "Info: ",
                          /* End_of_format */0
                        ]),
                      "Info: "
                    ]);
      case 2 : 
          return Format.fprintf(fmt, /* Format */[
                      /* End_of_format */0,
                      ""
                    ]);
      case 3 : 
          return Format.fprintf(fmt, /* Format */[
                      /* String_literal */Block.__(11, [
                          "Warning: ",
                          /* End_of_format */0
                        ]),
                      "Warning: "
                    ]);
      case 4 : 
          return Format.fprintf(fmt, /* Format */[
                      /* String_literal */Block.__(11, [
                          "Error: ",
                          /* End_of_format */0
                        ]),
                      "Error: "
                    ]);
      
    }
  };
  var pp_loc = function (fmt, loc) {
    if (loc) {
      var loc$1 = loc[0];
      var match = loc$1[/* fname */0];
      var where = match ? match[0] : "Toplevel input";
      return Curry._4(Format.fprintf(fmt, /* Format */[
                      /* Char_literal */Block.__(12, [
                          /* "\"" */34,
                          /* String */Block.__(2, [
                              /* No_padding */0,
                              /* String_literal */Block.__(11, [
                                  "\", line ",
                                  /* Int */Block.__(4, [
                                      /* Int_d */0,
                                      /* No_padding */0,
                                      /* No_precision */0,
                                      /* String_literal */Block.__(11, [
                                          ", characters ",
                                          /* Int */Block.__(4, [
                                              /* Int_d */0,
                                              /* No_padding */0,
                                              /* No_precision */0,
                                              /* Char_literal */Block.__(12, [
                                                  /* "-" */45,
                                                  /* Int */Block.__(4, [
                                                      /* Int_d */0,
                                                      /* No_padding */0,
                                                      /* No_precision */0,
                                                      /* Char_literal */Block.__(12, [
                                                          /* ":" */58,
                                                          /* Formatting_lit */Block.__(17, [
                                                              /* Force_newline */3,
                                                              /* End_of_format */0
                                                            ])
                                                        ])
                                                    ])
                                                ])
                                            ])
                                        ])
                                    ])
                                ])
                            ])
                        ]),
                      "\"%s\", line %d, characters %d-%d:@\n"
                    ]), where, loc$1[/* line_nb */1], loc$1[/* bp */5] - loc$1[/* bol_pos */2] | 0, loc$1[/* ep */6] - loc$1[/* bol_pos */2] | 0);
    } else {
      return Format.fprintf(fmt, /* Format */[
                  /* End_of_format */0,
                  ""
                ]);
    }
  };
  return (function (fb) {
      var match = fb[/* contents */3];
      if (typeof match === "number" || match.tag !== 8) {
        return /* () */0;
      } else {
        return Curry._6(Format.fprintf(fmt, /* Format */[
                        /* Formatting_gen */Block.__(18, [
                            /* Open_box */Block.__(1, [/* Format */[
                                  /* End_of_format */0,
                                  ""
                                ]]),
                            /* Alpha */Block.__(15, [/* Formatting_lit */Block.__(17, [
                                    /* Close_box */0,
                                    /* Alpha */Block.__(15, [/* Formatting_gen */Block.__(18, [
                                            /* Open_box */Block.__(1, [/* Format */[
                                                  /* End_of_format */0,
                                                  ""
                                                ]]),
                                            /* Alpha */Block.__(15, [/* Formatting_lit */Block.__(17, [
                                                    /* Close_box */0,
                                                    /* Char_literal */Block.__(12, [
                                                        /* "\n" */10,
                                                        /* Flush */Block.__(10, [/* End_of_format */0])
                                                      ])
                                                  ])])
                                          ])])
                                  ])])
                          ]),
                        "@[%a@]%a@[%a@]\n%!"
                      ]), pp_loc, match[1], pp_lvl, match[0], Pp$ReactTemplate.pp_with, match[2]);
      }
    });
}

var default_route = 0;

exports.default_route = default_route;
exports.add_feeder = add_feeder;
exports.del_feeder = del_feeder;
exports.feedback = feedback;
exports.set_id_for_feedback = set_id_for_feedback;
exports.msg_info = msg_info;
exports.msg_notice = msg_notice;
exports.msg_warning = msg_warning;
exports.msg_error = msg_error;
exports.msg_debug = msg_debug;
exports.console_feedback_listener = console_feedback_listener;
exports.warn_no_listeners = warn_no_listeners;
/* feeders Not a pure module */

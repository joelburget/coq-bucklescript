// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';

var Sys = require("bs-platform/lib/js/sys.js");
var List = require("bs-platform/lib/js/list.js");
var $$Array = require("bs-platform/lib/js/array.js");
var Block = require("bs-platform/lib/js/block.js");
var Bytes = require("bs-platform/lib/js/bytes.js");
var Curry = require("bs-platform/lib/js/curry.js");
var Hashtbl = require("bs-platform/lib/js/hashtbl.js");
var Caml_array = require("bs-platform/lib/js/caml_array.js");
var Pervasives = require("bs-platform/lib/js/pervasives.js");
var Caml_string = require("bs-platform/lib/js/caml_string.js");
var Names$ReactTemplate = require("./names.bs.js");
var CArray$ReactTemplate = require("./cArray.bs.js");
var CString$ReactTemplate = require("./cString.bs.js");
var Caml_missing_polyfill = require("bs-platform/lib/js/caml_missing_polyfill.js");
var Hashset$ReactTemplate = require("./hashset.bs.js");
var Copcodes$ReactTemplate = require("./copcodes.bs.js");
var Caml_builtin_exceptions = require("bs-platform/lib/js/caml_builtin_exceptions.js");
var Mod_subst$ReactTemplate = require("./mod_subst.bs.js");
var Cbytecodes$ReactTemplate = require("./cbytecodes.bs.js");

function eq_reloc_info(r1, r2) {
  switch (r1.tag | 0) {
    case 0 : 
        switch (r2.tag | 0) {
          case 0 : 
              return Cbytecodes$ReactTemplate.eq_annot_switch(r1[0], r2[0]);
          case 1 : 
          case 2 : 
              return /* false */0;
          
        }
        break;
    case 1 : 
        switch (r2.tag | 0) {
          case 1 : 
              return Cbytecodes$ReactTemplate.eq_structured_constant(r1[0], r2[0]);
          case 0 : 
          case 2 : 
              return /* false */0;
          
        }
        break;
    case 2 : 
        switch (r2.tag | 0) {
          case 0 : 
          case 1 : 
              return /* false */0;
          case 2 : 
              return Names$ReactTemplate.Constant[/* equal */12](r1[0], r2[0]);
          
        }
        break;
    
  }
}

function hash_reloc_info(r) {
  switch (r.tag | 0) {
    case 0 : 
        return Hashset$ReactTemplate.Combine[/* combinesmall */1](1, Cbytecodes$ReactTemplate.hash_annot_switch(r[0]));
    case 1 : 
        return Hashset$ReactTemplate.Combine[/* combinesmall */1](2, Cbytecodes$ReactTemplate.hash_structured_constant(r[0]));
    case 2 : 
        return Hashset$ReactTemplate.Combine[/* combinesmall */1](3, Names$ReactTemplate.Constant[/* hash */13](r[0]));
    
  }
}

var RelocTable = Hashtbl.Make(/* module */[
      /* equal */eq_reloc_info,
      /* hash */hash_reloc_info
    ]);

function patch_char4(buff, pos, c1, c2, c3, c4) {
  buff[pos] = c1;
  buff[pos + 1 | 0] = c2;
  buff[pos + 2 | 0] = c3;
  buff[pos + 3 | 0] = c4;
  return /* () */0;
}

function patch_int(buff, reloc) {
  var buff$1 = Bytes.of_string(buff);
  var iter = function (param) {
    var reloc = param[0];
    return $$Array.iter((function (pos) {
                  var buff$2 = buff$1;
                  var pos$1 = pos;
                  var n = reloc;
                  return patch_char4(buff$2, pos$1, n, (n >> 8), (n >> 16), (n >> 24));
                }), param[1]);
  };
  CArray$ReactTemplate.iter(iter, reloc);
  return buff$1;
}

function patch(buff, pl, f) {
  var reloc = CArray$ReactTemplate.map((function (param) {
          return /* tuple */[
                  Curry._1(f, param[0]),
                  param[1]
                ];
        }), pl[/* reloc_infos */0]);
  patch_int(buff, reloc);
  return Caml_missing_polyfill.not_implemented("coq_tcode_of_code not implemented by bucklescript yet\n");
}

function out_word(env, b1, b2, b3, b4) {
  var p = env[/* out_position */1];
  if (p >= env[/* out_buffer */0].length) {
    var len = env[/* out_buffer */0].length;
    var new_len = len <= (Sys.max_string_length / 2 | 0) ? (len << 1) : (
        len === Sys.max_string_length ? Pervasives.invalid_arg("String.create") : Sys.max_string_length
      );
    var new_buffer = Caml_string.caml_create_string(new_len);
    Bytes.blit(env[/* out_buffer */0], 0, new_buffer, 0, len);
    env[/* out_buffer */0] = new_buffer;
  }
  patch_char4(env[/* out_buffer */0], p, b1, b2, b3, b4);
  env[/* out_position */1] = p + 4 | 0;
  return /* () */0;
}

function out(env, opcode) {
  return out_word(env, opcode, 0, 0, 0);
}

function out_int(env, n) {
  return out_word(env, n, (n >> 8), (n >> 16), (n >> 24));
}

function extend_label_table(env, needed) {
  var new_size = env[/* label_table */2].length;
  while(needed >= new_size) {
    new_size = (new_size << 1);
  };
  var new_table = Caml_array.caml_make_vect(new_size, /* Label_undefined */Block.__(1, [/* [] */0]));
  $$Array.blit(env[/* label_table */2], 0, new_table, 0, env[/* label_table */2].length);
  env[/* label_table */2] = new_table;
  return /* () */0;
}

function out_label_with_orig(env, orig, lbl) {
  if (lbl >= env[/* label_table */2].length) {
    extend_label_table(env, lbl);
  }
  var match = Caml_array.caml_array_get(env[/* label_table */2], lbl);
  if (match.tag) {
    Caml_array.caml_array_set(env[/* label_table */2], lbl, /* Label_undefined */Block.__(1, [/* :: */[
              /* tuple */[
                env[/* out_position */1],
                orig
              ],
              match[0]
            ]]));
    return out_int(env, 0);
  } else {
    return out_int(env, ((match[0] - orig | 0) >> 2));
  }
}

function out_label(env, l) {
  return out_label_with_orig(env, env[/* out_position */1], l);
}

function enter(env, info) {
  var pos = env[/* out_position */1];
  var old;
  try {
    old = Curry._2(RelocTable[/* find */6], env[/* reloc_info */3], info);
  }
  catch (exn){
    if (exn === Caml_builtin_exceptions.not_found) {
      old = /* [] */0;
    } else {
      throw exn;
    }
  }
  return Curry._3(RelocTable[/* replace */8], env[/* reloc_info */3], info, /* :: */[
              pos,
              old
            ]);
}

function slot_for_const(env, c) {
  enter(env, /* Reloc_const */Block.__(1, [c]));
  return out_int(env, 0);
}

function slot_for_annot(env, a) {
  enter(env, /* Reloc_annot */Block.__(0, [a]));
  return out_int(env, 0);
}

function slot_for_getglobal(env, p) {
  enter(env, /* Reloc_getglobal */Block.__(2, [p]));
  return out_int(env, 0);
}

function emit_instr(env, param) {
  if (typeof param === "number") {
    switch (param) {
      case 0 : 
          return out(env, Copcodes$ReactTemplate.opPUSH);
      case 1 : 
          out(env, Copcodes$ReactTemplate.opRETURN);
          return out_int(env, 0);
      case 2 : 
          return out(env, Copcodes$ReactTemplate.opRESTART);
      case 3 : 
          return out(env, Copcodes$ReactTemplate.opMAKEPROD);
      case 4 : 
          return out(env, Copcodes$ReactTemplate.opSTOP);
      case 5 : 
          return out(env, Copcodes$ReactTemplate.opADDINT31);
      case 6 : 
          return out(env, Copcodes$ReactTemplate.opADDCINT31);
      case 7 : 
          return out(env, Copcodes$ReactTemplate.opADDCARRYCINT31);
      case 8 : 
          return out(env, Copcodes$ReactTemplate.opSUBINT31);
      case 9 : 
          return out(env, Copcodes$ReactTemplate.opSUBCINT31);
      case 10 : 
          return out(env, Copcodes$ReactTemplate.opSUBCARRYCINT31);
      case 11 : 
          return out(env, Copcodes$ReactTemplate.opMULINT31);
      case 12 : 
          return out(env, Copcodes$ReactTemplate.opMULCINT31);
      case 13 : 
          return out(env, Copcodes$ReactTemplate.opDIV21INT31);
      case 14 : 
          return out(env, Copcodes$ReactTemplate.opDIVINT31);
      case 15 : 
          return out(env, Copcodes$ReactTemplate.opADDMULDIVINT31);
      case 16 : 
          return out(env, Copcodes$ReactTemplate.opCOMPAREINT31);
      case 17 : 
          return out(env, Copcodes$ReactTemplate.opHEAD0INT31);
      case 18 : 
          return out(env, Copcodes$ReactTemplate.opTAIL0INT31);
      case 19 : 
          return out(env, Copcodes$ReactTemplate.opCOMPINT31);
      case 20 : 
          return out(env, Copcodes$ReactTemplate.opDECOMPINT31);
      case 21 : 
          return out(env, Copcodes$ReactTemplate.opORINT31);
      case 22 : 
          return out(env, Copcodes$ReactTemplate.opANDINT31);
      case 23 : 
          return out(env, Copcodes$ReactTemplate.opXORINT31);
      
    }
  } else {
    switch (param.tag | 0) {
      case 0 : 
          var env$1 = env;
          var lbl = param[0];
          if (lbl >= env$1[/* label_table */2].length) {
            extend_label_table(env$1, lbl);
          }
          var match = Caml_array.caml_array_get(env$1[/* label_table */2], lbl);
          if (match.tag) {
            List.iter((function (p) {
                    var env$2 = env$1;
                    var param = p;
                    var pos = param[0];
                    var displ = ((env$2[/* out_position */1] - param[1] | 0) >> 2);
                    env$2[/* out_buffer */0][pos] = displ;
                    env$2[/* out_buffer */0][pos + 1 | 0] = (displ >> 8);
                    env$2[/* out_buffer */0][pos + 2 | 0] = (displ >> 16);
                    env$2[/* out_buffer */0][pos + 3 | 0] = (displ >> 24);
                    return /* () */0;
                  }), match[0]);
            return Caml_array.caml_array_set(env$1[/* label_table */2], lbl, /* Label_defined */Block.__(0, [env$1[/* out_position */1]]));
          } else {
            throw [
                  Caml_builtin_exceptions.failure,
                  "CEmitcode.define_label"
                ];
          }
      case 1 : 
          var n = param[0];
          if (n < 8) {
            return out(env, Copcodes$ReactTemplate.opACC0 + n | 0);
          } else {
            out(env, Copcodes$ReactTemplate.opACC);
            return out_int(env, n);
          }
      case 2 : 
          var n$1 = param[0];
          if (n$1 >= 1 && n$1 <= 4) {
            return out(env, (Copcodes$ReactTemplate.opENVACC1 + n$1 | 0) - 1 | 0);
          } else {
            out(env, Copcodes$ReactTemplate.opENVACC);
            return out_int(env, n$1);
          }
      case 3 : 
          var ofs = param[0];
          if (ofs === -2 || ofs === 0 || ofs === 2) {
            return out(env, Copcodes$ReactTemplate.opOFFSETCLOSURE0 + (ofs / 2 | 0) | 0);
          } else {
            out(env, Copcodes$ReactTemplate.opOFFSETCLOSURE);
            return out_int(env, ofs);
          }
      case 4 : 
          out(env, Copcodes$ReactTemplate.opPOP);
          return out_int(env, param[0]);
      case 5 : 
          out(env, Copcodes$ReactTemplate.opPUSH_RETADDR);
          return out_label(env, param[0]);
      case 6 : 
          var n$2 = param[0];
          if (n$2 < 4) {
            return out(env, (Copcodes$ReactTemplate.opAPPLY1 + n$2 | 0) - 1 | 0);
          } else {
            out(env, Copcodes$ReactTemplate.opAPPLY);
            return out_int(env, n$2);
          }
      case 7 : 
          var sz = param[1];
          var n$3 = param[0];
          if (n$3 < 4) {
            out(env, (Copcodes$ReactTemplate.opAPPTERM1 + n$3 | 0) - 1 | 0);
            return out_int(env, sz);
          } else {
            out(env, Copcodes$ReactTemplate.opAPPTERM);
            out_int(env, n$3);
            return out_int(env, sz);
          }
      case 8 : 
          out(env, Copcodes$ReactTemplate.opRETURN);
          return out_int(env, param[0]);
      case 9 : 
          out(env, Copcodes$ReactTemplate.opGRAB);
          return out_int(env, param[0]);
      case 10 : 
          out(env, Copcodes$ReactTemplate.opGRABREC);
          return out_int(env, param[0]);
      case 11 : 
          out(env, Copcodes$ReactTemplate.opCLOSURE);
          out_int(env, param[1]);
          return out_label(env, param[0]);
      case 12 : 
          var lbl_bodies = param[3];
          out(env, Copcodes$ReactTemplate.opCLOSUREREC);
          out_int(env, lbl_bodies.length);
          out_int(env, param[0]);
          out_int(env, param[1]);
          var org = env[/* out_position */1];
          $$Array.iter((function (param) {
                  return out_label_with_orig(env, org, param);
                }), param[2]);
          var org$1 = env[/* out_position */1];
          return $$Array.iter((function (param) {
                        return out_label_with_orig(env, org$1, param);
                      }), lbl_bodies);
      case 13 : 
          var lbl_bodies$1 = param[3];
          out(env, Copcodes$ReactTemplate.opCLOSURECOFIX);
          out_int(env, lbl_bodies$1.length);
          out_int(env, param[0]);
          out_int(env, param[1]);
          var org$2 = env[/* out_position */1];
          $$Array.iter((function (param) {
                  return out_label_with_orig(env, org$2, param);
                }), param[2]);
          var org$3 = env[/* out_position */1];
          return $$Array.iter((function (param) {
                        return out_label_with_orig(env, org$3, param);
                      }), lbl_bodies$1);
      case 14 : 
          out(env, Copcodes$ReactTemplate.opGETGLOBAL);
          return slot_for_getglobal(env, param[0]);
      case 15 : 
          var c = param[0];
          if (c.tag === 3) {
            var i = c[0];
            if (i >= 0 && i <= 3) {
              return out(env, Copcodes$ReactTemplate.opCONST0 + i | 0);
            } else {
              out(env, Copcodes$ReactTemplate.opCONSTINT);
              return out_int(env, i);
            }
          } else {
            out(env, Copcodes$ReactTemplate.opGETGLOBAL);
            return slot_for_const(env, c);
          }
          break;
      case 16 : 
          var t = param[1];
          var n$4 = param[0];
          if (n$4) {
            if (n$4 < 4) {
              out(env, (Copcodes$ReactTemplate.opMAKEBLOCK1 + n$4 | 0) - 1 | 0);
              return out_int(env, t);
            } else {
              out(env, Copcodes$ReactTemplate.opMAKEBLOCK);
              out_int(env, n$4);
              return out_int(env, t);
            }
          } else {
            return Pervasives.invalid_arg("emit_instr : block size = 0");
          }
      case 17 : 
          out(env, Copcodes$ReactTemplate.opMAKESWITCHBLOCK);
          out_label(env, param[0]);
          out_label(env, param[1]);
          slot_for_annot(env, param[2]);
          return out_int(env, param[3]);
      case 18 : 
          var tbl_block = param[1];
          var tbl_const = param[0];
          var lenb = tbl_block.length;
          var lenc = tbl_const.length;
          if (!(lenb < 256 && lenc < 16777216)) {
            throw [
                  Caml_builtin_exceptions.assert_failure,
                  [
                    "cemitcodes.ml",
                    264,
                    6
                  ]
                ];
          }
          out(env, Copcodes$ReactTemplate.opSWITCH);
          out_word(env, lenc, (lenc >> 8), (lenc >> 16), lenb);
          var org$4 = env[/* out_position */1];
          $$Array.iter((function (param) {
                  return out_label_with_orig(env, org$4, param);
                }), tbl_const);
          return $$Array.iter((function (param) {
                        return out_label_with_orig(env, org$4, param);
                      }), tbl_block);
      case 19 : 
          out(env, Copcodes$ReactTemplate.opPUSHFIELDS);
          return out_int(env, param[0]);
      case 20 : 
          var n$5 = param[0];
          if (n$5 <= 1) {
            return out(env, Copcodes$ReactTemplate.opGETFIELD0 + n$5 | 0);
          } else {
            out(env, Copcodes$ReactTemplate.opGETFIELD);
            return out_int(env, n$5);
          }
      case 21 : 
          var n$6 = param[0];
          if (n$6 <= 1) {
            return out(env, Copcodes$ReactTemplate.opSETFIELD0 + n$6 | 0);
          } else {
            out(env, Copcodes$ReactTemplate.opSETFIELD);
            return out_int(env, n$6);
          }
      case 22 : 
          return Pervasives.invalid_arg("Cemitcodes.emit_instr");
      case 23 : 
          out(env, Copcodes$ReactTemplate.opPROJ);
          out_int(env, param[0]);
          return slot_for_const(env, /* Const_proj */Block.__(2, [param[1]]));
      case 24 : 
          out(env, Copcodes$ReactTemplate.opENSURESTACKCAPACITY);
          return out_int(env, param[0]);
      case 25 : 
          out(env, Copcodes$ReactTemplate.opBRANCH);
          return out_label(env, param[0]);
      case 26 : 
          out(env, Copcodes$ReactTemplate.opISCONST);
          return out_label(env, param[0]);
      case 27 : 
          out(env, Copcodes$ReactTemplate.opARECONST);
          out_int(env, param[0]);
          return out_label(env, param[1]);
      
    }
  }
}

function emit(env, _insns, _remaining) {
  while(true) {
    var remaining = _remaining;
    var insns = _insns;
    if (insns) {
      var instr = insns[0];
      var exit = 0;
      if (typeof instr === "number") {
        if (instr) {
          exit = 1;
        } else {
          var match = insns[1];
          if (match) {
            var match$1 = match[0];
            if (typeof match$1 === "number") {
              exit = 1;
            } else {
              switch (match$1.tag | 0) {
                case 1 : 
                    var n = match$1[0];
                    if (n < 8) {
                      out(env, Copcodes$ReactTemplate.opPUSHACC0 + n | 0);
                    } else {
                      out(env, Copcodes$ReactTemplate.opPUSHACC);
                      out_int(env, n);
                    }
                    _insns = match[1];
                    continue ;
                    case 2 : 
                    var n$1 = match$1[0];
                    if (n$1 >= 1 && n$1 <= 4) {
                      out(env, (Copcodes$ReactTemplate.opPUSHENVACC1 + n$1 | 0) - 1 | 0);
                    } else {
                      out(env, Copcodes$ReactTemplate.opPUSHENVACC);
                      out_int(env, n$1);
                    }
                    _insns = match[1];
                    continue ;
                    case 3 : 
                    var ofs = match$1[0];
                    if (ofs === -2 || ofs === 0 || ofs === 2) {
                      out(env, Copcodes$ReactTemplate.opPUSHOFFSETCLOSURE0 + (ofs / 2 | 0) | 0);
                    } else {
                      out(env, Copcodes$ReactTemplate.opPUSHOFFSETCLOSURE);
                      out_int(env, ofs);
                    }
                    _insns = match[1];
                    continue ;
                    case 14 : 
                    out(env, Copcodes$ReactTemplate.opPUSHGETGLOBAL);
                    slot_for_getglobal(env, match$1[0]);
                    _insns = match[1];
                    continue ;
                    case 15 : 
                    var $$const = match$1[0];
                    if ($$const.tag === 3) {
                      var i = $$const[0];
                      if (i >= 0 && i <= 3) {
                        out(env, Copcodes$ReactTemplate.opPUSHCONST0 + i | 0);
                      } else {
                        out(env, Copcodes$ReactTemplate.opPUSHCONSTINT);
                        out_int(env, i);
                      }
                      _insns = match[1];
                      continue ;
                      
                    } else {
                      out(env, Copcodes$ReactTemplate.opPUSHGETGLOBAL);
                      slot_for_const(env, $$const);
                      _insns = match[1];
                      continue ;
                      
                    }
                    break;
                default:
                  exit = 1;
              }
            }
          } else {
            exit = 1;
          }
        }
      } else {
        switch (instr.tag | 0) {
          case 4 : 
              var match$2 = insns[1];
              if (match$2) {
                var match$3 = match$2[0];
                if (typeof match$3 === "number") {
                  if (match$3 !== 1) {
                    exit = 1;
                  } else {
                    out(env, Copcodes$ReactTemplate.opRETURN);
                    out_int(env, instr[0]);
                    _insns = match$2[1];
                    continue ;
                    
                  }
                } else {
                  exit = 1;
                }
              } else {
                exit = 1;
              }
              break;
          case 22 : 
              _remaining = /* :: */[
                instr[1],
                /* :: */[
                  insns[1],
                  remaining
                ]
              ];
              _insns = instr[0];
              continue ;
              default:
            exit = 1;
        }
      }
      if (exit === 1) {
        emit_instr(env, instr);
        _insns = insns[1];
        continue ;
        
      }
      
    } else if (remaining) {
      _remaining = remaining[1];
      _insns = remaining[0];
      continue ;
      
    } else {
      return /* () */0;
    }
  };
}

function subst_strcst(s, sc) {
  switch (sc.tag | 0) {
    case 1 : 
        var ind = sc[0];
        return /* Const_ind */Block.__(1, [/* tuple */[
                    Mod_subst$ReactTemplate.subst_mind(s, ind[0]),
                    ind[1]
                  ]]);
    case 2 : 
        return /* Const_proj */Block.__(2, [Mod_subst$ReactTemplate.subst_constant(s, sc[0])]);
    case 4 : 
        return /* Const_bn */Block.__(4, [
                  sc[0],
                  $$Array.map((function (param) {
                          return subst_strcst(s, param);
                        }), sc[1])
                ]);
    default:
      return sc;
  }
}

function subst_reloc(s, ri) {
  switch (ri.tag | 0) {
    case 0 : 
        var a = ri[0];
        var match = a[/* ci */0][/* ci_ind */0];
        var init = a[/* ci */0];
        var ci_000 = /* ci_ind : tuple */[
          Mod_subst$ReactTemplate.subst_mind(s, match[0]),
          match[1]
        ];
        var ci_001 = /* ci_npar */init[/* ci_npar */1];
        var ci_002 = /* ci_cstr_ndecls */init[/* ci_cstr_ndecls */2];
        var ci_003 = /* ci_cstr_nargs */init[/* ci_cstr_nargs */3];
        var ci_004 = /* ci_pp_info */init[/* ci_pp_info */4];
        var ci = /* record */[
          ci_000,
          ci_001,
          ci_002,
          ci_003,
          ci_004
        ];
        return /* Reloc_annot */Block.__(0, [/* record */[
                    /* ci */ci,
                    /* rtbl */a[/* rtbl */1],
                    /* tailcall */a[/* tailcall */2],
                    /* max_stack_size */a[/* max_stack_size */3]
                  ]]);
    case 1 : 
        return /* Reloc_const */Block.__(1, [subst_strcst(s, ri[0])]);
    case 2 : 
        return /* Reloc_getglobal */Block.__(2, [Mod_subst$ReactTemplate.subst_constant(s, ri[0])]);
    
  }
}

function subst_patches(subst, p) {
  var infos = CArray$ReactTemplate.map((function (param) {
          return /* tuple */[
                  subst_reloc(subst, param[0]),
                  param[1]
                ];
        }), p[/* reloc_infos */0]);
  return /* record */[/* reloc_infos */infos];
}

function subst_to_patch(s, param) {
  return /* tuple */[
          param[0],
          subst_patches(s, param[1]),
          param[2]
        ];
}

function from_val(param) {
  if (typeof param === "number") {
    return /* PBCconstant */0;
  } else if (param.tag) {
    return /* PBCalias */Block.__(1, [Mod_subst$ReactTemplate.from_val(param[0])]);
  } else {
    return /* PBCdefined */Block.__(0, [Mod_subst$ReactTemplate.from_val(param[0])]);
  }
}

function force(param) {
  if (typeof param === "number") {
    return /* BCconstant */0;
  } else if (param.tag) {
    return /* BCalias */Block.__(1, [Mod_subst$ReactTemplate.force(Mod_subst$ReactTemplate.subst_constant, param[0])]);
  } else {
    return /* BCdefined */Block.__(0, [Mod_subst$ReactTemplate.force(subst_to_patch, param[0])]);
  }
}

function subst_to_patch_subst(s, param) {
  if (typeof param === "number") {
    return /* PBCconstant */0;
  } else if (param.tag) {
    return /* PBCalias */Block.__(1, [Mod_subst$ReactTemplate.subst_substituted(s, param[0])]);
  } else {
    return /* PBCdefined */Block.__(0, [Mod_subst$ReactTemplate.subst_substituted(s, param[0])]);
  }
}

function repr_body_code(param) {
  if (typeof param === "number") {
    return /* tuple */[
            /* None */0,
            /* BCconstant */0
          ];
  } else if (param.tag) {
    var match = Mod_subst$ReactTemplate.repr_substituted(param[0]);
    return /* tuple */[
            match[0],
            /* BCalias */Block.__(1, [match[1]])
          ];
  } else {
    var match$1 = Mod_subst$ReactTemplate.repr_substituted(param[0]);
    return /* tuple */[
            match$1[0],
            /* BCdefined */Block.__(0, [match$1[1]])
          ];
  }
}

function to_memory(param) {
  var env = /* record */[
    /* out_buffer */new Array(1024),
    /* out_position */0,
    /* label_table */Caml_array.caml_make_vect(16, /* Label_undefined */Block.__(1, [/* [] */0])),
    /* reloc_info */Curry._1(RelocTable[/* create */0], 91)
  ];
  emit(env, param[0], /* [] */0);
  emit(env, param[1], /* [] */0);
  var code = Bytes.sub_string(env[/* out_buffer */0], 0, env[/* out_position */1]);
  var code$1 = CString$ReactTemplate.hcons(code);
  var fold = function (reloc, npos, accu) {
    return /* :: */[
            /* tuple */[
              reloc,
              $$Array.of_list(npos)
            ],
            accu
          ];
  };
  var reloc = Curry._3(RelocTable[/* fold */11], fold, env[/* reloc_info */3], /* [] */0);
  var reloc$1 = /* record */[/* reloc_infos */CArray$ReactTemplate.of_list(reloc)];
  $$Array.iter((function (lbl) {
          if (lbl.tag) {
            if (lbl[0]) {
              throw [
                    Caml_builtin_exceptions.assert_failure,
                    [
                      "cemitcodes.ml",
                      429,
                      8
                    ]
                  ];
            } else {
              return 0;
            }
          } else {
            return 0;
          }
        }), env[/* label_table */2]);
  return /* tuple */[
          code$1,
          reloc$1,
          param[2]
        ];
}

exports.patch = patch;
exports.from_val = from_val;
exports.force = force;
exports.subst_to_patch_subst = subst_to_patch_subst;
exports.repr_body_code = repr_body_code;
exports.to_memory = to_memory;
/* RelocTable Not a pure module */

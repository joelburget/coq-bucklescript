// Generated by BUCKLESCRIPT VERSION 2.2.2, PLEASE EDIT WITH CARE
'use strict';


var opACC0 = 0;

var opACC1 = 1;

var opACC2 = 2;

var opACC3 = 3;

var opACC4 = 4;

var opACC5 = 5;

var opACC6 = 6;

var opACC7 = 7;

var opACC = 8;

var opPUSH = 9;

var opPUSHACC0 = 10;

var opPUSHACC1 = 11;

var opPUSHACC2 = 12;

var opPUSHACC3 = 13;

var opPUSHACC4 = 14;

var opPUSHACC5 = 15;

var opPUSHACC6 = 16;

var opPUSHACC7 = 17;

var opPUSHACC = 18;

var opPOP = 19;

var opENVACC1 = 20;

var opENVACC2 = 21;

var opENVACC3 = 22;

var opENVACC4 = 23;

var opENVACC = 24;

var opPUSHENVACC1 = 25;

var opPUSHENVACC2 = 26;

var opPUSHENVACC3 = 27;

var opPUSHENVACC4 = 28;

var opPUSHENVACC = 29;

var opPUSH_RETADDR = 30;

var opAPPLY = 31;

var opAPPLY1 = 32;

var opAPPLY2 = 33;

var opAPPLY3 = 34;

var opAPPTERM = 35;

var opAPPTERM1 = 36;

var opAPPTERM2 = 37;

var opAPPTERM3 = 38;

var opRETURN = 39;

var opRESTART = 40;

var opGRAB = 41;

var opGRABREC = 42;

var opCLOSURE = 43;

var opCLOSUREREC = 44;

var opCLOSURECOFIX = 45;

var opOFFSETCLOSUREM2 = 46;

var opOFFSETCLOSURE0 = 47;

var opOFFSETCLOSURE2 = 48;

var opOFFSETCLOSURE = 49;

var opPUSHOFFSETCLOSUREM2 = 50;

var opPUSHOFFSETCLOSURE0 = 51;

var opPUSHOFFSETCLOSURE2 = 52;

var opPUSHOFFSETCLOSURE = 53;

var opGETGLOBAL = 54;

var opPUSHGETGLOBAL = 55;

var opMAKEBLOCK = 56;

var opMAKEBLOCK1 = 57;

var opMAKEBLOCK2 = 58;

var opMAKEBLOCK3 = 59;

var opMAKEBLOCK4 = 60;

var opSWITCH = 61;

var opPUSHFIELDS = 62;

var opGETFIELD0 = 63;

var opGETFIELD1 = 64;

var opGETFIELD = 65;

var opSETFIELD0 = 66;

var opSETFIELD1 = 67;

var opSETFIELD = 68;

var opPROJ = 69;

var opENSURESTACKCAPACITY = 70;

var opCONST0 = 71;

var opCONST1 = 72;

var opCONST2 = 73;

var opCONST3 = 74;

var opCONSTINT = 75;

var opPUSHCONST0 = 76;

var opPUSHCONST1 = 77;

var opPUSHCONST2 = 78;

var opPUSHCONST3 = 79;

var opPUSHCONSTINT = 80;

var opACCUMULATE = 81;

var opMAKESWITCHBLOCK = 82;

var opMAKEACCU = 83;

var opMAKEPROD = 84;

var opBRANCH = 85;

var opADDINT31 = 86;

var opADDCINT31 = 87;

var opADDCARRYCINT31 = 88;

var opSUBINT31 = 89;

var opSUBCINT31 = 90;

var opSUBCARRYCINT31 = 91;

var opMULCINT31 = 92;

var opMULINT31 = 93;

var opDIV21INT31 = 94;

var opDIVINT31 = 95;

var opADDMULDIVINT31 = 96;

var opCOMPAREINT31 = 97;

var opHEAD0INT31 = 98;

var opTAIL0INT31 = 99;

var opISCONST = 100;

var opARECONST = 101;

var opCOMPINT31 = 102;

var opDECOMPINT31 = 103;

var opORINT31 = 104;

var opANDINT31 = 105;

var opXORINT31 = 106;

var opSTOP = 107;

exports.opACC0 = opACC0;
exports.opACC1 = opACC1;
exports.opACC2 = opACC2;
exports.opACC3 = opACC3;
exports.opACC4 = opACC4;
exports.opACC5 = opACC5;
exports.opACC6 = opACC6;
exports.opACC7 = opACC7;
exports.opACC = opACC;
exports.opPUSH = opPUSH;
exports.opPUSHACC0 = opPUSHACC0;
exports.opPUSHACC1 = opPUSHACC1;
exports.opPUSHACC2 = opPUSHACC2;
exports.opPUSHACC3 = opPUSHACC3;
exports.opPUSHACC4 = opPUSHACC4;
exports.opPUSHACC5 = opPUSHACC5;
exports.opPUSHACC6 = opPUSHACC6;
exports.opPUSHACC7 = opPUSHACC7;
exports.opPUSHACC = opPUSHACC;
exports.opPOP = opPOP;
exports.opENVACC1 = opENVACC1;
exports.opENVACC2 = opENVACC2;
exports.opENVACC3 = opENVACC3;
exports.opENVACC4 = opENVACC4;
exports.opENVACC = opENVACC;
exports.opPUSHENVACC1 = opPUSHENVACC1;
exports.opPUSHENVACC2 = opPUSHENVACC2;
exports.opPUSHENVACC3 = opPUSHENVACC3;
exports.opPUSHENVACC4 = opPUSHENVACC4;
exports.opPUSHENVACC = opPUSHENVACC;
exports.opPUSH_RETADDR = opPUSH_RETADDR;
exports.opAPPLY = opAPPLY;
exports.opAPPLY1 = opAPPLY1;
exports.opAPPLY2 = opAPPLY2;
exports.opAPPLY3 = opAPPLY3;
exports.opAPPTERM = opAPPTERM;
exports.opAPPTERM1 = opAPPTERM1;
exports.opAPPTERM2 = opAPPTERM2;
exports.opAPPTERM3 = opAPPTERM3;
exports.opRETURN = opRETURN;
exports.opRESTART = opRESTART;
exports.opGRAB = opGRAB;
exports.opGRABREC = opGRABREC;
exports.opCLOSURE = opCLOSURE;
exports.opCLOSUREREC = opCLOSUREREC;
exports.opCLOSURECOFIX = opCLOSURECOFIX;
exports.opOFFSETCLOSUREM2 = opOFFSETCLOSUREM2;
exports.opOFFSETCLOSURE0 = opOFFSETCLOSURE0;
exports.opOFFSETCLOSURE2 = opOFFSETCLOSURE2;
exports.opOFFSETCLOSURE = opOFFSETCLOSURE;
exports.opPUSHOFFSETCLOSUREM2 = opPUSHOFFSETCLOSUREM2;
exports.opPUSHOFFSETCLOSURE0 = opPUSHOFFSETCLOSURE0;
exports.opPUSHOFFSETCLOSURE2 = opPUSHOFFSETCLOSURE2;
exports.opPUSHOFFSETCLOSURE = opPUSHOFFSETCLOSURE;
exports.opGETGLOBAL = opGETGLOBAL;
exports.opPUSHGETGLOBAL = opPUSHGETGLOBAL;
exports.opMAKEBLOCK = opMAKEBLOCK;
exports.opMAKEBLOCK1 = opMAKEBLOCK1;
exports.opMAKEBLOCK2 = opMAKEBLOCK2;
exports.opMAKEBLOCK3 = opMAKEBLOCK3;
exports.opMAKEBLOCK4 = opMAKEBLOCK4;
exports.opSWITCH = opSWITCH;
exports.opPUSHFIELDS = opPUSHFIELDS;
exports.opGETFIELD0 = opGETFIELD0;
exports.opGETFIELD1 = opGETFIELD1;
exports.opGETFIELD = opGETFIELD;
exports.opSETFIELD0 = opSETFIELD0;
exports.opSETFIELD1 = opSETFIELD1;
exports.opSETFIELD = opSETFIELD;
exports.opPROJ = opPROJ;
exports.opENSURESTACKCAPACITY = opENSURESTACKCAPACITY;
exports.opCONST0 = opCONST0;
exports.opCONST1 = opCONST1;
exports.opCONST2 = opCONST2;
exports.opCONST3 = opCONST3;
exports.opCONSTINT = opCONSTINT;
exports.opPUSHCONST0 = opPUSHCONST0;
exports.opPUSHCONST1 = opPUSHCONST1;
exports.opPUSHCONST2 = opPUSHCONST2;
exports.opPUSHCONST3 = opPUSHCONST3;
exports.opPUSHCONSTINT = opPUSHCONSTINT;
exports.opACCUMULATE = opACCUMULATE;
exports.opMAKESWITCHBLOCK = opMAKESWITCHBLOCK;
exports.opMAKEACCU = opMAKEACCU;
exports.opMAKEPROD = opMAKEPROD;
exports.opBRANCH = opBRANCH;
exports.opADDINT31 = opADDINT31;
exports.opADDCINT31 = opADDCINT31;
exports.opADDCARRYCINT31 = opADDCARRYCINT31;
exports.opSUBINT31 = opSUBINT31;
exports.opSUBCINT31 = opSUBCINT31;
exports.opSUBCARRYCINT31 = opSUBCARRYCINT31;
exports.opMULCINT31 = opMULCINT31;
exports.opMULINT31 = opMULINT31;
exports.opDIV21INT31 = opDIV21INT31;
exports.opDIVINT31 = opDIVINT31;
exports.opADDMULDIVINT31 = opADDMULDIVINT31;
exports.opCOMPAREINT31 = opCOMPAREINT31;
exports.opHEAD0INT31 = opHEAD0INT31;
exports.opTAIL0INT31 = opTAIL0INT31;
exports.opISCONST = opISCONST;
exports.opARECONST = opARECONST;
exports.opCOMPINT31 = opCOMPINT31;
exports.opDECOMPINT31 = opDECOMPINT31;
exports.opORINT31 = opORINT31;
exports.opANDINT31 = opANDINT31;
exports.opXORINT31 = opXORINT31;
exports.opSTOP = opSTOP;
/* No side effect */

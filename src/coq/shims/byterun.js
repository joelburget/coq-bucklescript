import byteMod from './byterun-em';
const byte = byteMod();

const init_coq_vm = byte._init_coq_vm;
const coq_makeaccu = byte._coq_makeaccu;
const offset_tcode = byte._coq_offset_tcode;
const kind_of_closure = byte._coq_kind_of_closure;
const coq_is_accumulate_code = byte._coq_is_accumulate_code;
const coq_int_tcode = byte._coq_int_tcode;
const accumulate_code = byte._accumulate_code;
const coq_closure_arity = byte._coq_closure_arity;
const coq_offset = byte._coq_offset;
const coq_offset_closure = byte._coq_offset_closure;
const coq_offset_closure_fix = byte._coq_offset_closure_fix;
const get_coq_atom_tbl = byte._get_coq_atom_tbl;
const realloc_coq_atom_tbl = byte._realloc_coq_atom_tbl;

export {
  init_coq_vm,
  coq_makeaccu,
  offset_tcode,
  kind_of_closure,
  coq_is_accumulate_code,
  coq_int_tcode,
  accumulate_code,
  coq_closure_arity,
  coq_offset,
  coq_offset_closure,
  coq_offset_closure_fix,
  get_coq_atom_tbl,
  realloc_coq_atom_tbl,
};

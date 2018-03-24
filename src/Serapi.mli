module Stateid : sig
  type t = string
end

module Loc : sig
  type t = ()
end

type coq_object = string

type add_opts = string

type query_opt = string
type query_cmd = string
type print_opt = string
type cmd_tag = int

module Feedback : sig
  type feedback = ()
end

type answer_kind =
    Ack
  | Completed
  | Added     of Stateid.t * Loc.t * [`NewTip | `Unfocus of Stateid.t ]
  | Canceled  of Stateid.t list
  | ObjList   of coq_object list
  | CoqExn    of Loc.t option * (Stateid.t * Stateid.t) option * Printexc.raw_backtrace * exn

type answer =
  | Answer    of cmd_tag * answer_kind
  | Feedback  of Feedback.feedback

type cmd =
  | Add        of add_opts  * string
  | Cancel     of Stateid.t list
  | Exec       of Stateid.t
  | Query      of query_opt * query_cmd
  | Print      of print_opt * coq_object

type t =
  | T
val create : unit -> t
val lock : t -> unit
val try_lock : t -> bool
val unlock : t -> unit

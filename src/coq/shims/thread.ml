type t =
  | Thread_t

let create f x = Thread_t
let exit _thread = ()

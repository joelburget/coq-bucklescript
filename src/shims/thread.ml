type t =
  | Thread_t

let create f x = Thread_t
let exit _thread = ()
let self () = Thread_t
let id Thread_t = 1

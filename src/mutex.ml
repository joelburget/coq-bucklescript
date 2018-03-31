type t =
  | T

let create () = T
let lock _ = ()
let try_lock _ = true
let unlock _ = ()

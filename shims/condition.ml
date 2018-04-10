type t =
  | Condition

let create () = Condition
let wait Condition _mut = ()
let signal Condition = ()
let broadcast Condition = ()

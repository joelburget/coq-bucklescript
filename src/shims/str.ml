type regexp = Js.Re.t

let regexp = Js.Re.fromString

(* XXX this is probably broken -- actually implementing split_delim *)
let split re str =
  Js.log "split called";
  Array.to_list (Js.String.splitByRe re str)

let global_replace regexp templ s =
  Js.log "global_replace called";
  Js.String.replaceByRe regexp templ s

let string_match regexp s start = Js.Option.isSome (Js.String.match_ regexp (Js.String.substr start s))

let split_delim re str =
  Js.log "split_delim called";
  Array.to_list (Js.String.splitByRe re str)

(* XXX this is broken. or global_replace is *)
let replace_first regexp templ s =
  Js.log "replace_first called";
  Js.String.replaceByRe regexp templ s

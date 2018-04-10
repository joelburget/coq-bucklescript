type regexp = string

let regexp = Js.Re.fromString

let split re str = Array.to_list (Js.String.splitByRe re str)

let global_replace = failwith "undefined: global_replace"
let string_match = failwith "undefined: string_match"
let split_delim = failwith "undefined: split_delim"
let replace_first = failwith "undefined: replace_first"

type time = Time

let get_time () = Time
let time_difference _t1 t2 = 0
let fmt_time_difference t1 t2 = Pp.(str "fmt_time_difference")

let intern_state _i _s = failwith "unimplemented: intern_state"
let extern_state _i _s _a = failwith "unimplemented: intern_state"
let raw_extern_state = failwith "unimplemented: raw_extern_state"
let skip_in_segment = failwith "unimplemented: skip_in_segment"
let marshal_in_segment = failwith "unimplemented: marshal_in_segment"

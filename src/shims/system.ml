type time = Time

let get_time () = Time
let time_difference _t1 t2 = 0
let fmt_time_difference t1 t2 = Pp.(str "fmt_time_difference")

let intern_state _i _s = failwith "unimplemented: intern_state"
let extern_state _i _s _a = failwith "unimplemented: intern_state"
let raw_extern_state _ = failwith "unimplemented: raw_extern_state"
let skip_in_segment _ = failwith "unimplemented: skip_in_segment"
let marshal_in_segment _ = failwith "unimplemented: marshal_in_segment"
let find_file_in_path ?(warn=true) _ _ = failwith "unimplemented: find_file_in_path"
let all_subdirs ~unix_path:root = failwith "unimplemented: all_subdirs"
let exists_dir _path = failwith "unimplemented: exists_dir"

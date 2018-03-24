/*
let debug = false;
let debugger_stepping = ref(false);

let format_token = token => {
  switch token {
    | LParenToken => "("
    | RParenToken => ")"
    | QuoteToken => "'"
    | TextToken(text) => text;
  }
};

type tokenizer = {.
  "input": string,
  [@bs.set] "range_start": int,
  [@bs.set] "range_end": int,
  [@bs.set] "tokens": list(token),
  [@bs.meth] "delimiter_reached": token => unit,
  [@bs.meth] "tokenize": unit => list(token)
};

let mkTokenizer = input => [%bs.obj {
  input,
  range_start: 0,
  range_end: 0,
  tokens: [],

  delimiter_reached: delimiter_token => {
    /* if we've accumulated a non-empty range of text, add a TextToken */
    if (range_end > range_start) {
      let text = String.sub(input, range_start, range_end - range_start);
      tokens = [TextToken text, ...tokens];
    };
    /* add the token representing the delimiter, if provided */
    switch delimiter_token {
      | Some token => tokens = [token, ...tokens];
      | None => ()
    };
    /* start a new text token range at the next char */
    range_start = range_end + 1;
    range_end = range_end + 1;
  },

  tokenize: fun () => {
    /* match tokens until we reach the end of the input text */
    let input_length = String.length input;
    while (range_end < input_length) {
      let current_char = input.[range_end];
      switch (current_char) {
        /* parens */
        | '(' => self#delimiter_reached (Some LParenToken);
        | ')' => self#delimiter_reached (Some RParenToken);
        /* quote */
        | '\'' => self#delimiter_reached (Some QuoteToken);
        /* whitespace */
        | ' ' => self#delimiter_reached None;
        | '\t' => self#delimiter_reached None;
        | '\n' => self#delimiter_reached None;
        | '\r' => self#delimiter_reached None;
        /* any other text char becomes part of a text token */
        | _ => {
          /* expand the current token range to include this character */
          range_end = range_end + 1
        }
      }
    };
    List.rev tokens;
  }
}];

let tokenize2 input => {
  let t = new tokenizer input;
  t#tokenize;
};

type tokenize_state = {
  mutable range_start: int,
  mutable range_end: int,
  mutable tokens: list token,
};

/* Convert a string of characters into a list of tokens. */
let tokenize3 input => {
  let state = {
    /* the start and end index of the current token */
    range_start: 0,
    range_end: 0,
    /* the list of tokens we're building */
    tokens: [],
  };

  let delimiter_reached delimiter_token => {
    /* if we've accumulated a non-empty range of text, add a TextToken */
    if (state.range_end > state.range_start) {
      let text = String.sub input state.range_start (state.range_end - state.range_start);
      state.tokens = [TextToken text, ...state.tokens];
    };
    /* add the token representing the delimiter, if provided */
    switch delimiter_token {
      | Some token => state.tokens = [token, ...state.tokens];
      | None => ()
    };
    /* start a new text token range at the next char */
    state.range_start = state.range_end + 1;
    state.range_end = state.range_end + 1;
  };

  /* match tokens until we reach the end of the input text */
  let input_length = String.length input;
  while (state.range_end < input_length) {
    let current_char = input.[state.range_end];
    switch (current_char) {
      /* parens */
      | '(' => delimiter_reached (Some LParenToken);
      | ')' => delimiter_reached (Some RParenToken);
      /* quote */
      | '\'' => delimiter_reached (Some QuoteToken);
      /* whitespace */
      | ' ' => delimiter_reached None;
      | '\t' => delimiter_reached None;
      | '\n' => delimiter_reached None;
      | '\r' => delimiter_reached None;
      /* any other text char becomes part of a text token */
      | _ => {
        /* expand the current token range to include this character */
        state.range_end = state.range_end + 1
      }
    }
  };
  List.rev state.tokens;
};

/* Convert a string of characters into a list of tokens. */
let tokenize input => {
  /* the start and end index of the current token */
  let range_start = ref 0;
  let range_end = ref 0;
  /* the list of tokens we're building */
  let tokens = ref [];

  let delimiter_reached delimiter_token => {
    /* if we've accumulated a non-empty range of text, add a TextToken */
    if (!range_end > !range_start) {
      let text = String.sub input !range_start (!range_end - !range_start);
      tokens := [TextToken text, ...!tokens];
    };
    /* add the token representing the delimiter, if provided */
    switch delimiter_token {
      | Some token => tokens := [token, ...!tokens];
      | None => ()
    };
    /* start a new text token range at the next char */
    range_start := !range_end + 1;
    range_end := !range_end + 1;
  };

  /* match tokens until we reach the end of the input text */
  let input_length = String.length input;
  while (!range_end < input_length) {
    let current_char = input.[!range_end];
    switch (current_char) {
      /* parens */
      | '(' => delimiter_reached (Some LParenToken);
      | ')' => delimiter_reached (Some RParenToken);
      /* quote */
      | '\'' => delimiter_reached (Some QuoteToken);
      /* whitespace */
      | ' ' => delimiter_reached None;
      | '\t' => delimiter_reached None;
      | '\n' => delimiter_reached None;
      | '\r' => delimiter_reached None;
      /* any other text char becomes part of a text token */
      | _ => {
        /* expand the current token range to include this character */
        range_end := !range_end + 1
      }
    }
  };
  List.rev !tokens;
};

type env = {
  table: Hashtbl.t string value,
  outer: option env,
} and value =
  | NumberVal float
  | SymbolVal string
  | ListVal (list value)
  | QuotedVal value
  | CallableVal (list string) value env
  | BuiltinCallableVal string (list value => value) env;

let rec format_val = fun value: string => {
  switch (value) {
   | ListVal x => {
     let formatted_items = List.map format_val x;
     let joined = (String.concat " " formatted_items);
     "(" ^ joined ^ ")";
   }
   | QuotedVal x => "'" ^ (format_val x)
   | NumberVal x => Printf.sprintf "%.12g" x
   | SymbolVal x => x
   | CallableVal args_names body_value _env => {
     let formatted_args = (String.concat " " args_names);
     "(lambda (" ^ formatted_args ^ ") " ^ (format_val body_value) ^ ")";
   }
   | BuiltinCallableVal name _func _env => {
     "#<procedure " ^ name ^ ">"
   }
  }
};

/* Numbers become numbers; every other text token is a symbol. */
let atom text: value => {
  try (NumberVal (float_of_string text)) {
    | Failure "float_of_string" => {
      SymbolVal text
    };
  };
};

/* Read an expression from a sequence of tokens. */
let rec read_from_tokens = fun (remaining_tokens: ref (list token)) => {
  switch !remaining_tokens {
    | [] => failwith "unexpected EOF while reading"
    | [QuoteToken, ...rest] => {
      remaining_tokens := rest;
      QuotedVal (read_from_tokens remaining_tokens);
    }
    | [LParenToken, ...rest] => {
      remaining_tokens := rest;
      let values_list: list value = [];
      read_list_from_tokens remaining_tokens values_list;
    }
    | [RParenToken, ...rest] => failwith "unexpected )"
    | [TextToken text, ...rest] => {
      remaining_tokens := rest;
      atom text
    }
  };
} and read_list_from_tokens = fun remaining_tokens values_list => {
  switch !remaining_tokens {
    | [] => failwith "unexpected EOF while reading list"
    | [RParenToken, ...rest] => {
      remaining_tokens := rest;
      ListVal (List.rev values_list);
    }
    | _ => {
      let value = read_from_tokens remaining_tokens;
      read_list_from_tokens remaining_tokens [value, ...values_list];
    }
  };
};

/* Read a Scheme expression from a string. */
let parse program => {
  let tokens = ref (tokenize program);
  let value = read_from_tokens (tokens);
  if (!tokens != []) {
    let tokens_string = (String.concat " " (List.map format_token !tokens));
    failwith @@ "parsing finished with tokens remaining: " ^ tokens_string;
  };
  value;
};
*/
